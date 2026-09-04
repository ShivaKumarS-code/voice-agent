import { useCallback, useEffect, useRef, useState } from "react";

import { AvatarStage } from "./components/AvatarStage";
import { ChatPanel } from "./components/ChatPanel";
import {
  BoltIcon,
  LockIcon,
  LogoIcon,
  WaveIcon,
} from "./components/Icons";
import { LoginPage } from "./components/LoginPage";
import { useSimliAvatar } from "./hooks/useSimliAvatar";
import type { AvatarStatus } from "./hooks/useSimliAvatar";
import { useVoiceAgent } from "./hooks/useVoiceAgent";
import { fetchCurrentUser, removeToken } from "./lib/auth";
import type { AuthUser } from "./lib/auth";

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .finally(() => {
        setLoadingAuth(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSendText = useCallback(
    (text: string) => {
      void sendText(text);
    },
    [sendText]
  );

  const endCall = useCallback(() => {
    void avatar.stop();
    stopCall();
  }, [avatar, stopCall]);

  const handleLogout = () => {
    removeToken();
    setCurrentUser(null);
    endCall();
  };

  // While the avatar is talking it owns the audio, so the waveform follows its
  // analyser; the rest of the time it follows the microphone.
  const waveformAnalyser =
    avatar.status === "ready" && avatar.isSpeaking
      ? avatar.analyserRef
      : analyserRef;

  if (loadingAuth) {
    return (
      <div className="app-backdrop flex min-h-screen items-center justify-center bg-[#e8ecef]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading TechMart...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render the dedicated LoginPage (matching reference design)
  if (!currentUser) {
    return <LoginPage onSuccess={(user) => setCurrentUser(user)} />;
  }

  const userInitial = (
    currentUser.full_name?.trim()
      ? currentUser.full_name.trim()[0]
      : currentUser.email[0]
  ).toUpperCase();

  // When authenticated, render the main Voice Agent dashboard
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

          <div className="ml-auto relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-500/25 hover:bg-blue-500 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              title={currentUser.full_name || currentUser.email}
            >
              {userInitial}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl p-3 shadow-xl ring-1 ring-slate-200/80 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser.full_name || currentUser.email.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>

                <div className="border-t border-slate-100 my-2" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            )}
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
              onSend={handleSendText}
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
