import { useCallback, useEffect, useRef, useState } from "react";
import { LogLevel, SimliClient } from "simli-client";

import { getAuthHeaders } from "../lib/auth";
import { apiUrl } from "../lib/config";


export type AvatarStatus =
  | "unavailable"
  | "idle"
  | "connecting"
  | "ready"
  | "error";

/** Simli's audio buffer is 3000 samples, so 6000 bytes of PCM16 per chunk. */
const CHUNK_BYTES = 6000;

export function useSimliAvatar() {
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<SimliClient | null>(null);
  const startingRef = useRef(false);

  // Simli's own analyser: taps the remote WebRTC stream so the waveform can
  // follow the avatar's voice without touching playback.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/simli/config"))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.enabled) setStatus("unavailable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const attachAnalyser = useCallback(() => {
    const stream = audioRef.current?.srcObject;

    if (!(stream instanceof MediaStream)) return;
    if (stream.getAudioTracks().length === 0) return;
    if (analyserRef.current) return;

    const context = new AudioContext();
    const analyser = context.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;

    // Not connected to destination on purpose - the <audio> element is
    // already playing this stream, this is a read-only tap.
    context.createMediaStreamSource(stream).connect(analyser);

    analyserContextRef.current = context;
    analyserRef.current = analyser;
  }, []);

  const stop = useCallback(async () => {
    const client = clientRef.current;

    clientRef.current = null;

    analyserRef.current = null;
    analyserContextRef.current?.close();
    analyserContextRef.current = null;

    setIsSpeaking(false);

    if (client) {
      try {
        await client.stop();
      } catch {
        // Already torn down.
      }
    }

    setStatus((current) =>
      current === "unavailable" ? current : "idle",
    );
  }, []);

  const start = useCallback(async () => {
    if (clientRef.current || startingRef.current) return;
    if (!videoRef.current || !audioRef.current) return;

    startingRef.current = true;
    setError(null);
    setStatus("connecting");

    try {
      const response = await fetch(apiUrl("/simli/token"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
      });


      if (response.status === 503) {
        setStatus("unavailable");
        return;
      }

      if (!response.ok) {
        throw new Error(`Session request failed (${response.status})`);
      }

      const { session_token: sessionToken } = await response.json();

      const client = new SimliClient(
        sessionToken,
        videoRef.current,
        audioRef.current,
        null,
        LogLevel.INFO,
        "livekit",
      );

      client.on("speaking", () => setIsSpeaking(true));
      client.on("silent", () => setIsSpeaking(false));

      client.on("start", () => {
        setStatus("ready");
        // The remote tracks land a moment after the connection opens.
        setTimeout(attachAnalyser, 300);
      });

      client.on("stop", () => {
        setStatus("idle");
        setIsSpeaking(false);
      });

      client.on("error", (detail) => setError(String(detail)));

      client.on("startup_error", (message) => {
        setError(String(message));
        setStatus("error");
      });

      clientRef.current = client;

      await client.start();
    } catch (caught) {
      clientRef.current = null;
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start the avatar",
      );
    } finally {
      startingRef.current = false;
    }
  }, [attachAnalyser]);

  /** Forwards raw PCM16 @ 16 kHz from the TTS stream to the avatar. */
  const sendAudio = useCallback((audio: ArrayBuffer) => {
    const client = clientRef.current;

    if (!client) return false;

    const bytes = new Uint8Array(audio);

    for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
      client.sendAudioData(bytes.subarray(offset, offset + CHUNK_BYTES));
    }

    return true;
  }, []);

  /** Cuts the avatar off mid-sentence when the caller starts talking. */
  const interrupt = useCallback(() => {
    clientRef.current?.ClearBuffer();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    status,
    isSpeaking,
    error,
    videoRef,
    audioRef,
    analyserRef,
    start,
    stop,
    sendAudio,
    interrupt,
  };
}
