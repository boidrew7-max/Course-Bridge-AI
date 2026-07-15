"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, username };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      // /dashboard checks for an existing saved plan (or sends to the
      // wizard if none yet) — don't force the wizard here directly, that
      // would restart returning users who already have a plan.
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#2f3135]">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/coursebridge-logo.png" alt="CourseBridge" className="mx-auto mb-3 h-9 w-auto" />
            <h1 className="text-2xl font-bold text-[#1a2e22]">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-[#7b818b]">
              {mode === "login"
                ? "Log in to pick up your transfer plan where you left off."
                : "Save your plan, college, and target school to come back to anytime."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-[#f3c6c6] bg-[#fff0f0] px-4 py-3 text-sm text-[#9b1c1c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#303236]">Name (optional)</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Jordan"
                  className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#303236]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#303236]">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0b7f46] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e5e0d5]" />
            <span className="text-xs font-medium text-[#a3a9b3]">or</span>
            <div className="h-px flex-1 bg-[#e5e0d5]" />
          </div>

          <a
            href="/api/auth/google/start"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm font-semibold text-[#303236] transition hover:border-[#0b7f46] hover:text-[#0b7f46]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </a>

          <p className="mt-8 text-center text-sm text-[#7b818b]">
            {mode === "login" ? (
              <>
                New to CourseBridge?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className="font-semibold text-[#0b7f46] hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="font-semibold text-[#0b7f46] hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
