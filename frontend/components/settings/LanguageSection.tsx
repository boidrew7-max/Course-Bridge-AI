"use client";

import { useTranslation } from "../../lib/i18n";
import type { SettingsSectionProps } from "./types";

export default function LanguageSection({ user, setUser }: SettingsSectionProps) {
  const { language, setLanguage, t, options } = useTranslation();

  async function choose(code: string) {
    setLanguage(code);
    if (user) {
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: code }),
        });
        if (res.ok) setUser(await res.json());
      } catch {}
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--cb-border)] pb-4">
        <p className="text-sm font-medium text-[var(--cb-text)]">{t("settings.language.title")}</p>
        <p className="mt-0.5 text-xs text-[var(--cb-muted)]">{t("settings.language.description")}</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => choose(opt.code)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-semibold transition ${
              language === opt.code
                ? "border-[var(--cb-accent)] bg-[var(--cb-accent-tint)] text-[var(--cb-link)]"
                : "border-[var(--cb-border)] text-[var(--cb-body)] hover:border-[var(--cb-accent)]"
            }`}
          >
            {opt.label}
            {language === opt.code && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
