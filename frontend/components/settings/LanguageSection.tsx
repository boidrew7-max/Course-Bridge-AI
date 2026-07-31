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
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98] dark:text-gray-500">
        {t("settings.language.title")}
      </p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => choose(opt.code)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              language === opt.code
                ? "border-[#0b7f46] bg-[#0b7f46]/10 text-[#0b7f46]"
                : "border-[#e5e0d5] text-[#4d535c] hover:border-[#0b7f46]/50 dark:border-gray-700 dark:text-gray-300"
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
