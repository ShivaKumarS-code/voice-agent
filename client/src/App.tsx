import { useRef, useState } from "react";

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const websocket = new WebSocket("ws://localhost:8000/ws/stt");

      websocket.binaryType = "arraybuffer";

      websocket.onmessage = async (event) => {
        // JSON messages from the backend
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);

            console.log("WebSocket message:", data);

            // STT transcript
            if (data.transcript) {
              console.log("Transcript:", data.transcript);
              setTranscript(data.transcript);
            }

            // Agent response
            if (data.response) {
              console.log("Agent response:", data.response);
              setAgentResponse(data.response);
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }

          return;
        }

        // Binary audio from ElevenLabs
        if (event.data instanceof ArrayBuffer) {
          try {
            console.log(
              "Received TTS audio:",
              event.data.byteLength,
              "bytes"
            );

            const audioContext = audioContextRef.current;

            if (!audioContext) {
              console.error("AudioContext not available");
              return;
            }

            if (audioContext.state === "suspended") {
              await audioContext.resume();
            }

            const audioBuffer = await audioContext.decodeAudioData(
              event.data.slice(0)
            );

            const source = audioContext.createBufferSource();

            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            source.start();

            console.log("Playing TTS audio");
          } catch (error) {
            console.error("Failed to decode/play TTS audio:", error);
          }
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocket.onclose = () => {
        console.log("WebSocket closed");
        setIsListening(false);
      };

      websocketRef.current = websocket;

      // Wait for WebSocket connection
      await new Promise<void>((resolve, reject) => {
        websocket.onopen = () => {
          console.log("WebSocket connected");
          resolve();
        };

        websocket.onerror = () => {
          reject(
            new Error("WebSocket connection failed")
          );
        };
      });

      // --------------------------------
      // IMPORTANT:
      // Keep STT at 16 kHz
      // --------------------------------
      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      await audioContext.resume();

      audioContextRef.current = audioContext;

      const source =
        audioContext.createMediaStreamSource(stream);

      // Keep the working STT configuration
      const processor =
        audioContext.createScriptProcessor(
          4096,
          1,
          1
        );

      processor.onaudioprocess = (event) => {
        if (
          websocket.readyState !==
          WebSocket.OPEN
        ) {
          return;
        }

        const input =
          event.inputBuffer.getChannelData(0);

        const pcm =
          new Int16Array(input.length);

        for (
          let i = 0;
          i < input.length;
          i++
        ) {
          const sample = Math.max(
            -1,
            Math.min(1, input[i])
          );

          pcm[i] =
            sample < 0
              ? sample * 32768
              : sample * 32767;
        }

        websocket.send(pcm.buffer);
      };

      source.connect(processor);

      processor.connect(
        audioContext.destination
      );

      processorRef.current = processor;
      streamRef.current = stream;

      setTranscript("");
      setAgentResponse("");
      setIsListening(true);
    } catch (error) {
      console.error(
        "Failed to start listening:",
        error
      );
    }
  };

  const stopListening = () => {
    processorRef.current?.disconnect();

    audioContextRef.current?.close();

    streamRef.current
      ?.getTracks()
      .forEach((track) => {
        track.stop();
      });

    websocketRef.current?.close();

    processorRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    websocketRef.current = null;

    setIsListening(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-400">
              Voice Agent
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Voice Assistant
            </h1>

            <p className="mt-2 text-slate-400">
              Speak naturally and talk with the AI
              agent in real time.
            </p>
          </div>

          {/* User */}
          <div className="min-h-32 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              You
            </p>

            <p className="mt-4 text-lg text-slate-200">
              {transcript || (
                <span className="text-slate-600">
                  Your speech will appear here...
                </span>
              )}
            </p>
          </div>

          {/* Agent */}
          <div className="mt-4 min-h-32 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Agent
            </p>

            <p className="mt-4 text-lg text-slate-200">
              {agentResponse || (
                <span className="text-slate-600">
                  The agent response will appear
                  here...
                </span>
              )}
            </p>
          </div>

          {/* Button */}
          <button
            onClick={
              isListening
                ? stopListening
                : startListening
            }
            className={`mt-6 w-full rounded-xl px-5 py-3 font-medium transition ${
              isListening
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isListening
              ? "Stop Listening"
              : "Start Talking"}
          </button>

          {/* Status */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isListening
                  ? "bg-green-400"
                  : "bg-slate-600"
              }`}
            />

            <span className="text-sm text-slate-500">
              {isListening
                ? "Listening..."
                : "Not listening"}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;