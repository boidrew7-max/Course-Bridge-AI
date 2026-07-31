"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../lib/i18n";
import { SETTINGS_SECTIONS } from "./registry";
import type { SettingsUser } from "./types";

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState(SETTINGS_SECTIONS[0].id);
  const [user, setUser] = useState<SettingsUser>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      fetch("/api/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setUser(data))
        .catch(() => setUser(null));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock background scroll while open — otherwise a wheel/trackpad scroll
  // over the modal can chain through to the page behind it once the modal's
  // own content hits its top/bottom.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) return null;

  const Active = SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? SETTINGS_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.title")}
        className={`relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-200 dark:bg-[#16171c] sm:h-[min(680px,88vh)] sm:w-auto sm:max-w-5xl sm:min-w-[900px] sm:flex-row sm:rounded-3xl sm:border sm:border-[#e5e0d5] sm:dark:border-gray-700 ${
          visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-2 opacity-0 scale-95"
        }`}
      >
        <nav className="flex shrink-0 gap-1 overflow-x-auto overscroll-contain border-b border-[#e5e0d5] p-4 dark:border-gray-700 sm:w-60 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-5">
          <p className="hidden px-3 pb-4 text-xl font-bold text-[#303236] dark:text-gray-100 sm:block">
            {t("settings.title")}
          </p>
          {SETTINGS_SECTIONS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                activeId === id
                  ? "bg-[#0b7f46]/10 text-[#0b7f46]"
                  : "text-[#4d535c] hover:bg-[#faf8f3] dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              <Icon />
              {t(labelKey)}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10">
          <div className="mb-6 sm:hidden">
            <p className="text-lg font-bold text-[#303236] dark:text-gray-100">{t("settings.title")}</p>
          </div>
          <div className="mx-auto max-w-xl">
            <h2 className="mb-6 text-2xl font-bold text-[#303236] dark:text-gray-100">{t(Active.labelKey)}</h2>
            <Active.Component user={user} setUser={setUser} onClose={onClose} />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("settings.close")}
          className="absolute right-4 top-4 rounded-full p-2 text-[#8a8f98] transition hover:bg-[#faf8f3] hover:text-[#303236] dark:hover:bg-white/10 dark:hover:text-gray-100 sm:right-6 sm:top-6"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
