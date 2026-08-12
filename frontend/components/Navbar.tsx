"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SettingsPanel from "./settings/SettingsPanel";
import { useTranslation } from "../lib/i18n";

const NAV_LINKS = [
  { href: "/#students", key: "nav.forStudents" },
  { href: "/#counselors", key: "nav.whatYouGet" },
  { href: "/#pricing", key: "nav.pricing" },
  { href: "/#faq", key: "nav.faq" },
] as const;

export default function Navbar() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [hasLocalPlan, setHasLocalPlan] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The full screen menu owns the viewport while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const signedIn = Boolean(email || hasLocalPlan);
  const ctaHref = signedIn ? "/dashboard" : "/onboarding";
  const ctaLabel = signedIn ? t("nav.myPlan") : t("nav.buildMyPlan");

  return (
    <>
      <header
        className="sticky top-0 z-40 transition-colors duration-300"
        style={{
          background: scrolled ? "color-mix(in srgb, var(--cb-surface) 93%, transparent)" : "var(--cb-surface)",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--cb-border)" : "transparent"}`,
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <nav
          aria-label={t("nav.primaryAria")}
          className="cb-container flex items-center justify-between gap-[var(--cb-space-2)]"
          style={{ paddingBlock: "0.875rem" }}
        >
          <Link href="/" className="flex shrink-0 items-center" style={{ minHeight: 44 }}>
            <img src="/coursebridge-logo.png" alt="CourseBridge" width={160} height={36} className="cb-logo cb-nav-logo" />
          </Link>

          <div className="hidden items-center gap-[var(--cb-space-4)] lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="cb-link"
                style={{ fontSize: "var(--cb-fs-body-sm)", fontWeight: 500 }}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-[var(--cb-space-1)]">
            {!signedIn && (
              <Link
                href="/login"
                className="cb-link cb-only-desktop items-center"
                style={{ fontSize: "var(--cb-fs-body-sm)", fontWeight: 500, minHeight: 44, paddingInline: "0.5rem" }}
              >
                {t("nav.logIn")}
              </Link>
            )}

            <Link href={ctaHref} className="cb-btn cb-btn-primary cb-nav-cta">
              {ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("common.settingsAria")}
              title={t("common.settingsAria")}
              className="cb-btn cb-btn-quiet cb-only-desktop"
              style={{ paddingInline: "0.75rem" }}
            >
              <GearIcon />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.openMenu")}
              aria-expanded={menuOpen}
              aria-controls="cb-mobile-menu"
              className="cb-btn cb-btn-quiet cb-only-mobile"
              style={{ paddingInline: "0.75rem" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div
          id="cb-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.primaryAria")}
          className="fixed inset-0 z-50 flex flex-col lg:hidden"
          style={{
            background: "var(--cb-surface)",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div
            className="cb-container flex items-center justify-between"
            style={{ paddingBlock: "0.875rem", borderBottom: "1px solid var(--cb-border)" }}
          >
            <img src="/coursebridge-logo.png" alt="CourseBridge" width={160} height={36} className="cb-logo cb-nav-logo" />
            <button
              type="button"
              autoFocus
              onClick={() => setMenuOpen(false)}
              aria-label={t("nav.closeMenu")}
              className="cb-btn cb-btn-quiet"
              style={{ paddingInline: "0.75rem" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="cb-container flex flex-1 flex-col overflow-y-auto" style={{ paddingBlock: "var(--cb-space-3)" }}>
            <ul className="flex flex-col" style={{ gap: "var(--cb-space-1)", listStyle: "none", margin: 0, padding: 0 }}>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="cb-link flex items-center"
                    style={{
                      minHeight: 52,
                      fontSize: "var(--cb-fs-lead)",
                      fontWeight: 600,
                      fontFamily: "var(--cb-font-heading)",
                      color: "var(--cb-text)",
                    }}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col" style={{ gap: "var(--cb-space-1)", paddingTop: "var(--cb-space-3)" }}>
              <Link
                href={ctaHref}
                onClick={() => setMenuOpen(false)}
                className="cb-btn cb-btn-primary w-full"
              >
                {ctaLabel}
              </Link>
              {!signedIn && (
                <Link href="/login" onClick={() => setMenuOpen(false)} className="cb-btn cb-btn-quiet w-full">
                  {t("nav.logIn")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="cb-btn cb-btn-quiet w-full"
              >
                <GearIcon />
                {t("common.settingsAria")}
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
