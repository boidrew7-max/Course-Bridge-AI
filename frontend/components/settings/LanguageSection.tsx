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
    <div className="flex flex-col gap-2 border-b border-[#e5e0d5] py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm font-medium text-[#4d535c] dark:text-gray-400">{t("settings.language.title")}</span>
      <select
        value={language}
        onChange={(e) => choose(e.target.value)}
        className="rounded-lg border border-transparent bg-[#faf8f3] px-3 py-2 text-right text-sm text-[#303236] outline-none transition hover:border-[#d1c7b8] focus:border-[#0b7f46] focus:bg-white focus:ring-4 focus:ring-[#0b7f46]/10 dark:bg-white/5 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:bg-[#1c1e24] sm:max-w-[280px] sm:flex-1"
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
