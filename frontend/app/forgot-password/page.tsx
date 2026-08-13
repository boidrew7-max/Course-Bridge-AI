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
    <div className="flex min-h-screen flex-col bg-[var(--cb-surface)] text-[var(--cb-body)]">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/coursebridge-logo.png" alt="CourseBridge" className="cb-logo mx-auto mb-3 h-9 w-auto" />
            <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("forgotPassword.title")}</h1>
            <p className="mt-2 text-sm text-[var(--cb-muted)]">
              {t("forgotPassword.subtitle")}
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-[var(--cb-accent)]/30 bg-[var(--cb-accent-tint)] px-4 py-3 text-sm text-[var(--cb-link)]">
              {t("forgotPassword.sentNotice")}
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl border border-[var(--cb-danger-border)] bg-[var(--cb-danger-bg)] px-4 py-3 text-sm text-[var(--cb-danger)]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[var(--cb-text)]">{t("auth.emailLabel")}</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--cb-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] hover:shadow-md disabled:opacity-60"
                >
                  {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-[var(--cb-muted)]">
            <Link href="/login" className="font-semibold text-[var(--cb-link)] hover:underline">
              {t("forgotPassword.backToLogin")}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
