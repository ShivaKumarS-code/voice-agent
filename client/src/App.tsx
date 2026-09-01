import { useRef, useState } from "react";

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const websocket = new WebSocket("ws://localhost:8000/ws/stt");

    websocket.binaryType = "arraybuffer";

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.transcript) {
        setTranscript(data.transcript);
      }
    };

    websocket.onclose = () => {
      setIsListening(false);
    };

    websocketRef.current = websocket;

    await new Promise<void>((resolve) => {
      websocket.onopen = () => resolve();
    });

    const audioContext = new AudioContext({
      sampleRate: 16000,
    });

    const source = audioContext.createMediaStreamSource(stream);

    const processor = audioContext.createScriptProcessor(
      1024,
      1,
      1
    );

    processor.onaudioprocess = (event) => {
      if (websocket.readyState !== WebSocket.OPEN) return;

      const input = event.inputBuffer.getChannelData(0);

      const pcm = new Int16Array(input.length);

      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = sample < 0
          ? sample * 32768
          : sample * 32767;
      }

      websocket.send(pcm.buffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    processorRef.current = processor;
    streamRef.current = stream;

    setTranscript("");
    setIsListening(true);
  };

  const stopListening = () => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();

    streamRef.current?.getTracks().forEach((track) => {
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
          <div className="mb-8">
            <p className="text-sm font-medium text-blue-400">
              Voice Agent
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Speech to Text
            </h1>

            <p className="mt-2 text-slate-400">
              Speak naturally and see the transcription in real time.
            </p>
          </div>

          <div className="min-h-32 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Transcript
            </p>

            <p className="mt-4 text-lg text-slate-200">
              {transcript || (
                <span className="text-slate-600">
                  Your transcript will appear here...
                </span>
              )}
            </p>
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`mt-6 w-full rounded-xl px-5 py-3 font-medium transition ${
              isListening
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isListening ? "Stop Listening" : "Start Talking"}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isListening ? "bg-green-400" : "bg-slate-600"
              }`}
            />

            <span className="text-sm text-slate-500">
              {isListening ? "Listening..." : "Not listening"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;