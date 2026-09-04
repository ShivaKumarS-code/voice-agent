import { useCallback } from "react";

import { AvatarStage } from "./components/AvatarStage";
import { ChatPanel } from "./components/ChatPanel";
import {
  BoltIcon,
  LockIcon,
  LogoIcon,
  ShieldIcon,
  WaveIcon,
} from "./components/Icons";
import { useSimliAvatar } from "./hooks/useSimliAvatar";
import type { AvatarStatus } from "./hooks/useSimliAvatar";
import { useVoiceAgent } from "./hooks/useVoiceAgent";

const features = [
  {
    Icon: BoltIcon,
    title: "Real-time conversation",
    body: "Natural, low-latency interactions",
  },
  {
    Icon: WaveIcon,
    title: "Human-like responses",
    body: "Powered by a knowledge-grounded agent",
  },
  {
    Icon: LockIcon,
    title: "Order aware",
    body: "Returns, refunds and warranty lookups",
  },
];

const avatarPillCopy: Record<AvatarStatus, string> = {
  unavailable: "Voice only",
  idle: "Avatar idle",
  connecting: "Connecting",
  ready: "Live avatar",
  error: "Avatar error",
};

function App() {
  const avatar = useSimliAvatar();

  const {
    status,
    isMuted,
    isSpeaking,
    isThinking,
    messages,
    error,
    analyserRef,
    startCall,
    stopCall,
    toggleMute,
    sendText,
    dismissError,
  } = useVoiceAgent({
    onAgentAudio: avatar.sendAudio,
    onUserSpeech: avatar.interrupt,
  });

  const beginCall = useCallback(() => {
    // Both connections are independent, so open them together.
    void avatar.start();
    void startCall();
  }, [avatar, startCall]);

  const endCall = useCallback(() => {
    void avatar.stop();
    stopCall();
  }, [avatar, stopCall]);

  // While the avatar is talking it owns the audio, so the waveform follows its
  // analyser; the rest of the time it follows the microphone.
  const waveformAnalyser =
    avatar.status === "ready" && avatar.isSpeaking
      ? avatar.analyserRef
      : analyserRef;

  // The card is vertically centered and scrolls normally once it is taller
  // than the viewport.
  return (
    <div className="app-backdrop flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      {/* min-w-0 so wide content can never inflate the card past 100% width */}
      <div className="w-full max-w-[84rem] min-w-0 rounded-3xl bg-white p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60 sm:p-6">
        {/* Top bar */}
        <header className="flex items-center gap-3 pb-4 sm:pb-5">
          <LogoIcon className="h-6 w-6 shrink-0 text-blue-600" />

          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            TechMart Voice Agent
          </h1>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200/70">
              <span
                className={`h-2 w-2 rounded-full ${
                  avatar.status === "ready"
                    ? "bg-emerald-500"
                    : avatar.status === "connecting"
                      ? "bg-amber-500"
                      : avatar.status === "error"
                        ? "bg-red-400"
                        : "bg-slate-300"
                }`}
              />

              <span className="text-xs font-medium text-slate-600">
                {avatarPillCopy[avatar.status]}
              </span>
            </div>

            <div
              title="Secure session"
              className="hidden h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:grid"
            >
              <ShieldIcon className="h-5 w-5" />
            </div>
          </div>
        </header>

        {(error || avatar.error) && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100"
          >
            <span className="flex-1">{error ?? avatar.error}</span>

            <button
              type="button"
              onClick={dismissError}
              className="shrink-0 font-medium text-red-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stage + chat */}
        {/*
          The row height is fixed on desktop so an empty transcript cannot
          collapse the chat column and shrink the avatar stage with it. It is
          clamped against the viewport rather than pinned to one value: the
          header, feature strip and page padding come to ~17rem, so anything
          taller than that budget would put the page into scroll.
        */}
        <div className="grid gap-4 lg:h-[clamp(24rem,calc(100vh-17rem),40rem)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-stretch">
          <AvatarStage
            status={status}
            isMuted={isMuted}
            isSpeaking={isSpeaking || avatar.isSpeaking}
            isThinking={isThinking}
            analyserRef={waveformAnalyser}
            avatarStatus={avatar.status}
            videoRef={avatar.videoRef}
            audioRef={avatar.audioRef}
            onStart={beginCall}
            onStop={endCall}
            onToggleMute={toggleMute}
          />

          <div className="h-[30rem] min-h-0 lg:h-full">
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              onSend={sendText}
            />
          </div>
        </div>

        {/* Feature strip */}
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 sm:gap-6">
          {features.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-center gap-3 sm:justify-center">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {title}
                </p>

                <p className="truncate text-xs text-slate-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
