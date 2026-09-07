import { useEffect, useRef } from "react";

import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon } from "./Icons";
import { Waveform } from "./Waveform";
import type { AvatarStatus } from "../hooks/useSimliAvatar";
import { IDLE_VIDEO_URL } from "../lib/config";
import type { CallStatus } from "../lib/types";

interface AvatarStageProps {
  status: CallStatus;
  isMuted: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  avatarStatus: AvatarStatus;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}

const statusCopy: Record<CallStatus, string> = {
  idle: "Offline",
  connecting: "Connecting",
  live: "Live",
};

// Only the states that need explaining. A plain idle stage just loops.
const avatarNotice: Partial<Record<AvatarStatus, string>> = {
  unavailable: "Voice only — no avatar configured",
  connecting: "Bringing the avatar online",
  error: "Avatar unavailable — voice still works",
};

export function AvatarStage({
  status,
  isMuted,
  isSpeaking,
  isThinking,
  analyserRef,
  avatarStatus,
  videoRef,
  audioRef,
  onStart,
  onStop,
  onToggleMute,
}: AvatarStageProps) {
  const isLive = status === "live";
  const hasAvatar = avatarStatus === "ready";
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const notice = avatarNotice[avatarStatus];

  // No point decoding the loop while the live stream is on screen.
  useEffect(() => {
    const node = idleVideoRef.current;

    if (!node) return;

    if (hasAvatar) {
      node.pause();
    } else {
      // Muted playback is allowed to autoplay; ignore it if the browser says no.
      void node.play().catch(() => undefined);
    }
  }, [hasAvatar]);

  return (
    // Taller than wide on phones so the floating control bar clears the
    // avatar's face; back to 4/3 from tablets up, and free-height on desktop
    // where the grid row sets it.
    <div className="relative aspect-[4/5] w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-slate-900 sm:aspect-[4/3] lg:aspect-auto lg:h-full">
      {/* Idle loop, standing in for the avatar until the live stream starts. */}
      <video
        ref={idleVideoRef}
        src={IDLE_VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          hasAvatar ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Simli renders the lip-synced avatar into these elements. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          hasAvatar ? "opacity-100" : "opacity-0"
        }`}
      />

      {/*
        Simli's audio sink. Taken out of flow deliberately: Tailwind's preflight
        forces `display:block` on audio without adding it to the max-width:100%
        rule, so an unstyled one is an in-flow 300px block that pushes the card
        wider than a phone viewport.
      */}
      <audio ref={audioRef} autoPlay className="pointer-events-none absolute h-0 w-0" />

      {/* Sits above the control bar so the two never overlap. */}
      {notice && !hasAvatar && (
        <p className="absolute bottom-16 sm:bottom-20 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-950/60 px-3 py-1.5 text-center text-xs text-slate-200 backdrop-blur-sm truncate">
          {notice}
        </p>
      )}

      {/* Live badge */}
      <div className="absolute left-3 top-3 sm:left-4 sm:top-4 flex items-center gap-1.5 sm:gap-2 rounded-full bg-slate-950/70 px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          {isLive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}

          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isLive
                ? "bg-emerald-400"
                : status === "connecting"
                  ? "bg-amber-400"
                  : "bg-slate-500"
            }`}
          />
        </span>

        <span className="text-[11px] sm:text-xs font-medium text-white">
          {statusCopy[status]}
        </span>
      </div>

      {/* Only during a call — typed messages already show dots in the chat panel */}
      {isThinking && isLive && (
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
          <span className="ml-1 text-[11px] sm:text-xs font-medium text-white">Thinking</span>
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 flex w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 items-center gap-2 sm:gap-3 rounded-full bg-slate-950/70 p-2 sm:p-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!isLive}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={isMuted}
          className={`grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-40 ${
            isMuted
              ? "bg-white text-slate-900"
              : "bg-white/12 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? (
            <MicOffIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : (
            <MicIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <Waveform
            analyserRef={analyserRef}
            isSpeaking={isSpeaking}
            active={isLive && (isSpeaking || !isMuted)}
          />
        </div>

        <button
          type="button"
          onClick={isLive ? onStop : onStart}
          disabled={status === "connecting"}
          aria-label={isLive ? "End call" : "Start call"}
          className={`grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-40 ${
            isLive
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-500 hover:bg-emerald-600"
          }`}
        >
          {isLive ? (
            <PhoneOffIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : (
            <PhoneIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          )}
        </button>
      </div>
    </div>
  );
}
