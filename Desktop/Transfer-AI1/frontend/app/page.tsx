"use client";

import { useEffect, useState } from "react";
import PlannerClient from "./PlannerClient";
import HomePage from "../components/HomePage";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    try {
      setOnboarded(!!localStorage.getItem("cb_profile"));
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  return onboarded ? <PlannerClient /> : <HomePage />;
}
