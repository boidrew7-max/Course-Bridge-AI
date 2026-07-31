import type { ReactElement } from "react";
import ProfileSection from "./ProfileSection";
import AppearanceSection from "./AppearanceSection";
import LanguageSection from "./LanguageSection";
import type { SettingsSectionProps } from "./types";

// Add a new settings section (Notifications, Privacy, Account, Subscription,
// AI preferences, ...) by adding one entry here and one Component file next
// to ProfileSection.tsx — no other wiring needed.
export type SettingsSection = {
  id: string;
  labelKey: "settings.nav.profile" | "settings.nav.appearance" | "settings.nav.language";
  icon: () => ReactElement;
  Component: (props: SettingsSectionProps) => ReactElement;
};

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AppearanceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "profile", labelKey: "settings.nav.profile", icon: ProfileIcon, Component: ProfileSection },
  { id: "appearance", labelKey: "settings.nav.appearance", icon: AppearanceIcon, Component: AppearanceSection },
  { id: "language", labelKey: "settings.nav.language", icon: LanguageIcon, Component: LanguageSection },
];
