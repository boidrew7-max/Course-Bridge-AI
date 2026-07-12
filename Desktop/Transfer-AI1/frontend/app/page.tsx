"use client";

import { useEffect, useState } from "react";
import PlannerClient from "./PlannerClient";
import HomePage from "../components/HomePage";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      let hasLocal = false;
      try {
        hasLocal = !!localStorage.getItem("cb_profile");
      } catch {}
      if (hasLocal) {
        setOnboarded(true);
        setReady(true);
        return;
      }
      // No local profile — a signed-in account still counts as "has a
      // plan" even on a new device / cleared cache. PlannerClient's own
      // hydration effect loads their most recent saved plan (or sends
      // them to onboarding if the account has none yet).
      try {
        const res = await fetch("/api/auth/me");
        setOnboarded(res.ok);
      } catch {
        setOnboarded(false);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return onboarded ? <PlannerClient /> : <HomePage />;
}
