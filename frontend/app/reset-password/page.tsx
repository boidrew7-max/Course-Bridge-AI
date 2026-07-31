"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-base font-semibold text-[#9b1c1c]">
          This reset link is missing or invalid.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-[#0b7f46] hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <img src="/coursebridge-logo.png" alt="CourseBridge" className="mx-auto mb-3 h-9 w-auto" />
        <h1 className="text-2xl font-bold text-[#1a2e22]">Set a new password</h1>
      </div>

      {done ? (
        <div className="rounded-xl border border-[#b8d8c7] bg-[#e7f3ed] px-4 py-3 text-sm text-[#0b7f46]">
          Password updated. Redirecting you to log in…
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-[#f3c6c6] bg-[#fff0f0] px-4 py-3 text-sm text-[#9b1c1c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#303236]">New password</span>
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#303236]">Confirm password</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0b7f46] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Reset password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#2f3135]">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-8">
        <Suspense fallback={<p className="text-base text-[#7b818b]">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
