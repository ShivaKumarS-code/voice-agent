import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time throws so one bad component does not blank the page.
 *
 * A class is required here: React exposes no hook equivalent of
 * componentDidCatch. Scoped to the whole app on purpose, since the pieces
 * below it (avatar stage, chat panel, cart) are not independently useful once
 * one of them has fallen over.
 *
 * This does not catch async failures - a rejected fetch, a websocket error, an
 * exception inside a callback. Those already surface through the error banner
 * in App, and are unaffected by this.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack is the useful half of this and React does not put it
    // in the error itself, so log both.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="app-backdrop flex min-h-screen items-center justify-center px-4 py-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
            Something went wrong
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            The page hit an unexpected error. Reloading usually clears it.
          </p>

          {/*
            The message only, never the stack: it is enough to quote in a bug
            report without putting internals on screen.
          */}
          <p className="mt-3 break-words rounded-xl bg-slate-50 px-3 py-2 text-left font-mono text-[11px] text-slate-500 ring-1 ring-slate-200/70">
            {error.message || "Unknown error"}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
