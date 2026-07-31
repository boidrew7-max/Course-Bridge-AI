"use client";

import type { ReactElement } from "react";
import { useTheme, type ThemeChoice } from "../../lib/theme";
import { useTranslation } from "../../lib/i18n";
import type { SettingsSectionProps } from "./types";

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const OPTIONS: { value: ThemeChoice; icon: () => ReactElement; labelKey: "settings.appearance.system" | "settings.appearance.light" | "settings.appearance.dark" }[] = [
  { value: "system", icon: SystemIcon, labelKey: "settings.appearance.system" },
  { value: "light", icon: SunIcon, labelKey: "settings.appearance.light" },
  { value: "dark", icon: MoonIcon, labelKey: "settings.appearance.dark" },
];

export default function AppearanceSection({ user, setUser }: SettingsSectionProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  async function choose(value: ThemeChoice) {
    setTheme(value);
    if (user) {
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: value }),
        });
        if (res.ok) setUser(await res.json());
      } catch {}
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#e5e0d5] py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-[#4d535c] dark:text-gray-400">{t("settings.appearance.title")}</span>
        <div className="inline-flex shrink-0 gap-0.5 rounded-lg bg-[#faf8f3] p-1 dark:bg-white/5">
          {OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              title={t(labelKey)}
              aria-label={t(labelKey)}
              onClick={() => choose(value)}
              className={`flex items-center justify-center rounded-md p-2 transition ${
                theme === value
                  ? "bg-white text-[#0b7f46] shadow-sm dark:bg-[#1c1e24] dark:text-[#3ba76a]"
                  : "text-[#8a8f98] hover:text-[#4d535c] dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
