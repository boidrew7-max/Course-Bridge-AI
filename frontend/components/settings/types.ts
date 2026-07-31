export type SettingsUser = {
  id: number;
  email: string;
  username: string;
  college: string;
  major: string;
  target_schools: string;
  onboarded: boolean;
  hasGoogle: boolean;
  theme: string;
  language: string;
  avatar: string;
} | null;

export type SettingsSectionProps = {
  user: SettingsUser;
  setUser: (u: SettingsUser) => void;
  onClose: () => void;
};
