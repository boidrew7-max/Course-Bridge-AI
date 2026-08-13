"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTranslation } from "../../lib/i18n";

function ResetPasswordForm() {
  const { t } = useTranslation();
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
      setError(t("resetPassword.passwordsDontMatch"));
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
        setError(data.error || t("common.genericError"));
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-base font-semibold text-[var(--cb-danger)]">
          {t("resetPassword.invalidLink")}
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-[var(--cb-link)] hover:underline">
          {t("resetPassword.requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <img src="/coursebridge-logo.png" alt="CourseBridge" className="cb-logo mx-auto mb-3 h-9 w-auto" />
        <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("resetPassword.title")}</h1>
      </div>

      {done ? (
        <div className="rounded-xl border border-[var(--cb-accent)]/30 bg-[var(--cb-accent-tint)] px-4 py-3 text-sm text-[var(--cb-link)]">
          {t("resetPassword.done")}
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
              <span className="mb-1.5 block text-sm font-semibold text-[var(--cb-text)]">{t("resetPassword.newPassword")}</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[var(--cb-text)]">{t("resetPassword.confirmPassword")}</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--cb-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] hover:shadow-md disabled:opacity-60"
            >
              {loading ? t("auth.pleaseWait") : t("resetPassword.submit")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--cb-surface)] text-[var(--cb-body)]">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-8">
        <Suspense fallback={<p className="text-base text-[var(--cb-muted)]">{t("resetPassword.loading")}</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
