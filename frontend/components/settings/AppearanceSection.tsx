"use client";

import type { ReactElement } from "react";
import { useTheme, type ThemeChoice } from "../../lib/theme";
import { useTranslation } from "../../lib/i18n";
import type { SettingsSectionProps } from "./types";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const OPTIONS: { value: ThemeChoice; icon: () => ReactElement; labelKey: "settings.appearance.light" | "settings.appearance.dark" | "settings.appearance.system" }[] = [
  { value: "light", icon: SunIcon, labelKey: "settings.appearance.light" },
  { value: "dark", icon: MoonIcon, labelKey: "settings.appearance.dark" },
  { value: "system", icon: SystemIcon, labelKey: "settings.appearance.system" },
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
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98] dark:text-gray-500">
        {t("settings.appearance.title")}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
              theme === value
                ? "border-[#0b7f46] bg-[#0b7f46]/10 text-[#0b7f46]"
                : "border-[#e5e0d5] text-[#4d535c] hover:border-[#0b7f46]/50 dark:border-gray-700 dark:text-gray-300"
            }`}
          >
            <Icon />
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
