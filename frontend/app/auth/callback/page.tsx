"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (err) {
      setError("Google sign-in failed. Please try again or use email/password.");
      return;
    }
    if (!token) {
      setError("Missing sign-in token.");
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
        setError("Something went wrong finishing sign-in. Please try again.");
      }
    })();
  }, [params, router]);

  return (
    <div className="text-center">
      {error ? (
        <>
          <p className="text-base font-semibold text-[#9b1c1c]">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm font-semibold text-[#0b7f46] hover:underline">
            Back to login
          </a>
        </>
      ) : (
        <p className="text-base text-[#7b818b]">Signing you in…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <Suspense fallback={<p className="text-base text-[#7b818b]">Signing you in…</p>}>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
