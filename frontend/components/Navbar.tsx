"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SettingsPanel from "./settings/SettingsPanel";
import { useTranslation } from "../lib/i18n";

export default function Navbar() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [hasLocalPlan, setHasLocalPlan] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-[#e5e0d5] bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/coursebridge-logo.png"
            alt="CourseBridge"
            className="h-9 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#students" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            {t("nav.forStudents")}
          </Link>
          <Link href="/#counselors" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            {t("nav.whatYouGet")}
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            {t("nav.pricing")}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={email || hasLocalPlan ? "/dashboard" : "/onboarding"}
            className="rounded-xl bg-[#0b7f46] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md"
          >
            {email || hasLocalPlan ? t("nav.myPlan") : t("nav.buildMyPlan")}
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t("common.settingsAria")}
            title={t("common.settingsAria")}
            className="rounded-xl border border-[#e5e0d5] p-2.5 text-[#4d535c] transition hover:border-[#0b7f46]/50 hover:text-[#0b7f46]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
