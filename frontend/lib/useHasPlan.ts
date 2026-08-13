"use client";

import { useEffect, useState } from "react";

// Shared by every "Build my plan" entry point (Navbar, Home, Footer) so
// a signed-in user (or a guest with a local plan) is sent back to their
// existing plan at /dashboard instead of restarting the onboarding wizard.
export function useHasPlan() {
  const [hasLocalPlan, setHasLocalPlan] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHasLocalPlan(!!localStorage.getItem("cb_profile"));
    } catch {}
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setEmail(user.email ?? null);
        }
      } catch {}
    })();
  }, []);

  return { hasPlan: !!email || hasLocalPlan, email };
}
