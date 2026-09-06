import { useCallback, useEffect, useRef, useState } from "react";

import { pcm16ToAudioBuffer } from "../lib/audio";
import { getAuthHeaders, getToken } from "../lib/auth";
import { apiUrl, wsUrl } from "../lib/config";
import { createId, formatTime } from "../lib/format";

import type { CallStatus, Message, Role } from "../lib/types";

// Deepgram STT expects 16 kHz mono PCM.
const STT_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096;

interface VoiceAgentOptions {
  /**
   * Receives the raw PCM16 TTS stream. Return true when something else (the
   * Simli avatar) is playing it, so the browser does not double up the audio.
   */
  onAgentAudio?: (audio: ArrayBuffer) => boolean;
  /** Fires when the caller finishes a turn, for barge-in. */
  onUserSpeech?: () => void;
  /** Fires when the agent modifies the cart during a turn. */
  onCartUpdated?: () => void;
}

export function useVoiceAgent(options: VoiceAgentOptions = {}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mutedRef = useRef(false);

  // Keeps the latest callbacks without re-creating the whole audio graph.
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  // The waveform reads whichever analyser is currently interesting:
  // the agent while it speaks, the microphone otherwise.
  const activeAnalyserRef = useRef<AnalyserNode | null>(null);

  const addMessage = useCallback((role: Role, text: string) => {
    setMessages((current) => [
      ...current,
      { id: createId(), role, text, time: formatTime() },
    ]);
  }, []);

  const teardown = useCallback(() => {
    processorRef.current?.disconnect();
    captureAnalyserRef.current?.disconnect();

    for (const source of playingSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    }

    playingSourcesRef.current.clear();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    websocketRef.current?.close();

    captureContextRef.current?.close();
    playbackContextRef.current?.close();

    processorRef.current = null;
    captureContextRef.current = null;
    playbackContextRef.current = null;
    captureAnalyserRef.current = null;
    playbackAnalyserRef.current = null;
    activeAnalyserRef.current = null;
    streamRef.current = null;
    websocketRef.current = null;

    setIsSpeaking(false);
    setIsThinking(false);
    setIsMuted(false);
    mutedRef.current = false;
  }, []);

  /**
   * Fallback playback for when no avatar is attached. The stream is raw PCM16
   * at 16 kHz, which decodeAudioData cannot parse, so build the buffer by hand.
   */
  const playAudio = useCallback((data: ArrayBuffer) => {
    const context = playbackContextRef.current;
    const analyser = playbackAnalyserRef.current;

    if (!context || !analyser) return;

    if (context.state === "suspended") {
      void context.resume();
    }

    const buffer = pcm16ToAudioBuffer(context, data, STT_SAMPLE_RATE);
    const source = context.createBufferSource();

    source.buffer = buffer;
    source.connect(analyser);

    playingSourcesRef.current.add(source);

    activeAnalyserRef.current = analyser;
    setIsThinking(false);
    setIsSpeaking(true);

    source.onended = () => {
      playingSourcesRef.current.delete(source);

      if (playingSourcesRef.current.size === 0) {
        activeAnalyserRef.current = captureAnalyserRef.current;
        setIsSpeaking(false);
      }
    };

    source.start();
  }, []);

  const stopCall = useCallback(() => {
    teardown();
    setStatus("idle");
  }, [teardown]);

  const startCall = useCallback(async () => {
    if (status !== "idle") return;

    setError(null);
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      const token = getToken();
      const wsPath = token ? `/ws/stt?token=${encodeURIComponent(token)}` : "/ws/stt";
      const websocket = new WebSocket(wsUrl(wsPath));
      websocket.binaryType = "arraybuffer";


      websocketRef.current = websocket;

      await new Promise<void>((resolve, reject) => {
        websocket.onopen = () => resolve();
        websocket.onerror = () =>
          reject(new Error("Could not reach the voice server"));
      });

      websocket.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);

            if (data.transcript) {
              addMessage("user", data.transcript);
              setIsThinking(true);
              // Barge-in: drop whatever the avatar still has queued.
              optionsRef.current.onUserSpeech?.();
            }

            if (data.type === "cart_updated" || data.cart_updated) {
              optionsRef.current.onCartUpdated?.();
            }

            if (data.response) {
              addMessage("agent", data.response);
            }

            if (data.error) {
              setError(String(data.error));
              setIsThinking(false);
            }
          } catch {
            setError("Received an unreadable message from the server");
          }

          return;
        }

        if (event.data instanceof ArrayBuffer) {
          try {
            // The avatar plays the audio itself when it is connected;
            // otherwise fall back to plain playback.
            const handled =
              optionsRef.current.onAgentAudio?.(event.data) ?? false;

            if (handled) {
              setIsThinking(false);
            } else {
              playAudio(event.data);
            }
          } catch {
            setError("Could not play the agent audio");
            setIsThinking(false);
          }
        }
      };

      websocket.onerror = () => {
        setError("The voice connection dropped");
      };

      websocket.onclose = () => {
        teardown();
        setStatus("idle");
      };

      // Capture graph: mic -> analyser -> script processor -> socket.
      const captureContext = new AudioContext({
        sampleRate: STT_SAMPLE_RATE,
      });

      await captureContext.resume();
      captureContextRef.current = captureContext;

      const micSource = captureContext.createMediaStreamSource(stream);
      const captureAnalyser = captureContext.createAnalyser();

      captureAnalyser.fftSize = 512;
      captureAnalyser.smoothingTimeConstant = 0.75;
      captureAnalyserRef.current = captureAnalyser;
      activeAnalyserRef.current = captureAnalyser;

      const processor = captureContext.createScriptProcessor(
        PROCESSOR_BUFFER_SIZE,
        1,
        1,
      );

      processor.onaudioprocess = (event) => {
        if (websocket.readyState !== WebSocket.OPEN) return;
        if (mutedRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);

        for (let i = 0; i < input.length; i++) {
          const sample = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }

        websocket.send(pcm.buffer);
      };

      micSource.connect(captureAnalyser);
      captureAnalyser.connect(processor);

      // ScriptProcessorNode only fires while connected to a destination.
      // A zero gain node keeps the mic from looping back to the speakers.
      const silentGain = captureContext.createGain();

      silentGain.gain.value = 0;

      processor.connect(silentGain);
      silentGain.connect(captureContext.destination);

      processorRef.current = processor;

      // Fallback playback graph, used only when no avatar is connected.
      const playbackContext = new AudioContext();

      await playbackContext.resume();
      playbackContextRef.current = playbackContext;

      const playbackAnalyser = playbackContext.createAnalyser();

      playbackAnalyser.fftSize = 512;
      playbackAnalyser.smoothingTimeConstant = 0.75;
      playbackAnalyserRef.current = playbackAnalyser;

      playbackAnalyser.connect(playbackContext.destination);

      setStatus("live");
    } catch (caught) {
      teardown();
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start the call",
      );
    }
  }, [addMessage, playAudio, status, teardown]);

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;

      mutedRef.current = next;

      streamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = !next));

      return next;
    });
  }, []);

  /** Text fallback for the chat composer. Uses the plain HTTP route. */
  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (!trimmed) return;

      addMessage("user", trimmed);
      setIsThinking(true);
      setError(null);

      try {
        const response = await fetch(apiUrl("/chat/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ message: trimmed }),
        });


        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.cart_updated) {
          optionsRef.current.onCartUpdated?.();
        }

        addMessage("agent", data.response);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not send the message",
        );
      } finally {
        setIsThinking(false);
      }
    },
    [addMessage],
  );

  useEffect(() => teardown, [teardown]);

  return {
    status,
    isMuted,
    isSpeaking,
    isThinking,
    messages,
    error,
    analyserRef: activeAnalyserRef,
    startCall,
    stopCall,
    toggleMute,
    sendText,
    dismissError: useCallback(() => setError(null), []),
  };
}
