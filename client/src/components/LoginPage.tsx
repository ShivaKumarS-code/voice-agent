import React, { useState } from "react";
import { loginUser, registerUser } from "../lib/auth";
import type { AuthUser } from "../lib/auth";
import { LogoIcon } from "./Icons";

interface LoginPageProps {
  onSuccess: (user: AuthUser) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { user } = await loginUser(email, password);
        onSuccess(user);
      } else {
        const { user } = await registerUser(email, password, fullName);
        onSuccess(user);
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
    <div className="app-backdrop flex min-h-screen w-full max-w-full items-center justify-center p-3 sm:p-6 lg:p-10 font-sans overflow-x-hidden">
      {/* Main Split Card */}
      <div className="w-full max-w-[62rem] min-h-0 sm:min-h-[38rem] bg-white rounded-2xl sm:rounded-[2rem] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        
        {/* Left Side: Form */}
        <div className="p-5 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <LogoIcon className="h-6 w-6 text-slate-900" />
              <span className="text-xl font-bold tracking-tight text-slate-900 lowercase">
                techmart
              </span>
            </div>


            {/* Header Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                {mode === "login" ? "Welcome Back!" : "Get Started"}
              </h1>
              <p className="text-sm font-medium text-slate-400">
                {mode === "login"
                  ? "Please enter your details"
                  : "Create an account to start using TechMart Voice Agent"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100 flex items-start gap-2">
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-xl bg-slate-100/80 border-0 py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@mail.com"
                  className="w-full rounded-xl bg-slate-100/80 border-0 py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl bg-slate-100/80 border-0 py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 rounded-full bg-[#18181b] py-3.5 px-4 text-sm font-semibold text-white shadow-lg hover:bg-black active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          </div>


          {/* Bottom Mode Switch */}
          <div className="mt-6 pt-4 text-center border-t border-slate-100">
            {mode === "login" ? (
              <p className="text-xs text-slate-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-bold text-slate-900 hover:underline"
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
                  className="font-bold text-slate-900 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Side: E-Commerce Product Image */}
        <div className="hidden md:block relative bg-slate-900 overflow-hidden">
          <img
            src="/login-bg.png"
            alt="TechMart E-Commerce Products"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle overlay gradient for rich contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        </div>
      </div>
    </div>
  );
}
