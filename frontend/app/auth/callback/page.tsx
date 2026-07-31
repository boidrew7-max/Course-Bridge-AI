"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "../../../lib/i18n";

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

  return (
    <div className="text-center">
      {error ? (
        <>
          <p className="text-base font-semibold text-[#9b1c1c]">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm font-semibold text-[#0b7f46] hover:underline">
            {t("authCallback.backToLogin")}
          </a>
        </>
      ) : (
        <p className="text-base text-[#7b818b]">{t("authCallback.signingIn")}</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <Suspense fallback={<p className="text-base text-[#7b818b]">{t("authCallback.signingIn")}</p>}>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
