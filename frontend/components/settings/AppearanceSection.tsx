"use client";

import { useTheme, type ThemeChoice } from "../../lib/theme";
import { useTranslation } from "../../lib/i18n";
import type { SettingsSectionProps } from "./types";

const OPTIONS: { value: ThemeChoice; labelKey: "settings.appearance.light" | "settings.appearance.dark" }[] = [
  { value: "light", labelKey: "settings.appearance.light" },
  { value: "dark", labelKey: "settings.appearance.dark" },
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
    <div className="space-y-6">
      <div className="border-b border-[#e5e0d5] pb-4 dark:border-gray-800">
        <p className="text-sm font-medium text-[#303236] dark:text-gray-200">{t("settings.appearance.title")}</p>
        <p className="mt-0.5 text-xs text-[#8a8f98] dark:text-gray-500">{t("settings.appearance.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {OPTIONS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              theme === value
                ? "border-[#0b7f46] ring-2 ring-[#0b7f46]/20"
                : "border-[#e5e0d5] hover:border-[#0b7f46]/50 dark:border-gray-700"
            }`}
          >
            <div className={`flex h-24 items-center justify-center gap-2 ${value === "dark" ? "bg-[#14151a]" : "bg-[#faf8f3]"}`}>
              <span className={`h-10 w-10 rounded-full ${value === "dark" ? "bg-[#1c1e24]" : "bg-white"} border ${value === "dark" ? "border-gray-700" : "border-[#e5e0d5]"}`} />
              <span className="flex flex-col gap-1.5">
                <span className={`h-2 w-16 rounded-full ${value === "dark" ? "bg-gray-700" : "bg-[#e5e0d5]"}`} />
                <span className={`h-2 w-10 rounded-full ${value === "dark" ? "bg-gray-800" : "bg-[#efe9dd]"}`} />
              </span>
            </div>
            <p className="px-4 py-3 text-sm font-semibold text-[#303236] dark:bg-[#1c1e24] dark:text-gray-100">{t(labelKey)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
