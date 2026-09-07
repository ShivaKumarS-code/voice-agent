import React, { useState } from "react";
import { loginUser, registerUser } from "../lib/auth";
import type { AuthUser } from "../lib/auth";
import { LockIcon, LogoIcon } from "./Icons";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { user } = await loginUser(email, password);
        onSuccess(user);
        onClose();
      } else {
        const { user } = await registerUser(email, password, fullName);
        onSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-slate-200/80 relative transform transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3 ring-1 ring-blue-100 shadow-sm">
            <LogoIcon className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login"
              ? "Sign in to access your personal AI assistant"
              : "Sign up to start voice agent sessions"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100 flex items-start gap-2">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full rounded-xl border-0 py-2.5 px-3.5 text-slate-900 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-xl border-0 py-2.5 px-3.5 text-slate-900 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border-0 py-2.5 px-3.5 text-slate-900 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer mode switch */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          {mode === "login" ? (
            <p className="text-xs text-slate-600">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
