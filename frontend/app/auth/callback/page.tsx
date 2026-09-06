"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "../../../lib/i18n";

function Spinner() {
  return (
    <svg
      className="mx-auto animate-spin text-[var(--cb-accent)]"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

function SigningIn({ label }: { label: string }) {
  return (
    <div className="cb-pop-in text-center">
      <img
        src="/coursebridge-logo.png"
        alt="CourseBridge"
        width={160}
        height={36}
        className="cb-logo mx-auto mb-5 h-9 w-auto"
      />
      <Spinner />
      <p className="mt-3 text-base text-[var(--cb-muted)]">{label}</p>
    </div>
  );
}

function AuthCallbackInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (err) {
      setError(t("authCallback.googleFailed"));
      return;
    }
    if (!token) {
      setError(t("authCallback.missingToken"));
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/store-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error("store failed");
        // /dashboard loads an existing saved plan, or sends to /onboarding
        // itself if this Google account has none yet.
        router.replace("/dashboard");
      } catch {
        setError(t("authCallback.genericError"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router]);

  if (error) {
    return (
      <div className="cb-pop-in text-center">
        <img
          src="/coursebridge-logo.png"
          alt="CourseBridge"
          width={160}
          height={36}
          className="cb-logo mx-auto mb-5 h-9 w-auto"
        />
        <p className="text-base font-semibold text-[var(--cb-danger)]">{error}</p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-[var(--cb-accent)] hover:underline"
        >
          {t("authCallback.backToLogin")}
        </a>
      </div>
    );
  }

  return <SigningIn label={t("authCallback.signingIn")} />;
}

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cb-surface-alt)] px-6">
      <Suspense fallback={<SigningIn label={t("authCallback.signingIn")} />}>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
