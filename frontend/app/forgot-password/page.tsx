"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTranslation } from "../../lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.genericError"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("common.networkError"));
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
            <h1 className="text-2xl font-bold text-[#1a2e22]">{t("forgotPassword.title")}</h1>
            <p className="mt-2 text-sm text-[#7b818b]">
              {t("forgotPassword.subtitle")}
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-[#b8d8c7] bg-[#e7f3ed] px-4 py-3 text-sm text-[#0b7f46]">
              {t("forgotPassword.sentNotice")}
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
                  <span className="mb-1.5 block text-sm font-semibold text-[#303236]">{t("auth.emailLabel")}</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#0b7f46] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md disabled:opacity-60"
                >
                  {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-[#7b818b]">
            <Link href="/login" className="font-semibold text-[#0b7f46] hover:underline">
              {t("forgotPassword.backToLogin")}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
