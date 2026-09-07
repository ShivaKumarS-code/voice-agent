import { useEffect, useRef, useState } from "react";

import { BoxIcon, LockIcon, SendIcon, TruckIcon, UserIcon } from "./Icons";
import type { Message } from "../lib/types";

interface ChatPanelProps {
  messages: Message[];
  isThinking: boolean;
  onSend: (text: string) => void;
}

// Openers for the things the agent can actually do, phrased the way a customer
// would say them so the transcript reads like their own words afterwards.
const SUGGESTIONS = [
  {
    Icon: BoxIcon,
    label: "Products",
    prompt: "What products do you have?",
  },
  {
    Icon: TruckIcon,
    label: "My orders",
    prompt: "Show me my orders",
  },
  {
    Icon: LockIcon,
    label: "Checkout",
    prompt: "I'd like to place my order",
  },
];

export function ChatPanel({ messages, isThinking, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;

    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isThinking]);

  const submit = (text: string) => {
    if (!text.trim()) return;

    onSend(text);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-slate-50 ring-1 ring-slate-200/70">
      {/* Agent header */}
      <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3.5">
        <div className="relative">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-blue-100">
            <UserIcon className="h-6 w-6 text-blue-500" />
          </div>

          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-50 bg-emerald-500" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">Ava</p>
          <p className="truncate text-xs text-slate-500">
            TechMart Support Specialist
          </p>
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-200/60">
            Hi, I'm Ava from TechMart support. Start the call or type below and
            I'll help with orders, returns, warranties and more.
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? "rounded-xl rounded-br-sm bg-blue-100 text-slate-800"
                    : "rounded-xl rounded-tl-sm bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/60"
                }`}
              >
                {message.text}
              </div>

              <span className="mt-1 px-1 text-[11px] text-slate-400">
                {message.time}
              </span>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex w-fit items-center gap-1.5 rounded-xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/60">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200/70 p-3">
        {/*
          Three chips sharing the row evenly, so they fit the panel at any width
          without wrapping onto a second row and eating the transcript.
        */}
        <div
          role="group"
          aria-label="Suggested messages"
          className="mb-2 flex gap-2"
        >
          {SUGGESTIONS.map(({ Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              // The prompt is the message; the label is only the shorthand on
              // the chip, so screen readers hear what will actually be sent.
              aria-label={prompt}
              title={prompt}
              onClick={() => submit(prompt)}
              disabled={isThinking}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-blue-600 ring-1 ring-slate-200/80 transition hover:bg-blue-50 hover:ring-blue-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200/60 disabled:hover:bg-white cursor-pointer"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="composer" className="sr-only">
            Message Ava
          </label>

          <input
            id="composer"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-1 ring-slate-200/80 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500 text-white transition hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:bg-blue-200"
          >
            <SendIcon className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
