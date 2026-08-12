"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../lib/i18n";
import type { SettingsSectionProps } from "./types";

type LocalProfile = {
  firstName?: string;
  college?: string;
  school?: string;
  major?: string;
  completedCourses?: string;
  planSchools?: string[];
  planText?: string;
  avatar?: string;
  [key: string]: unknown;
};

function readLocalProfile(): LocalProfile {
  try {
    const raw = localStorage.getItem("cb_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalProfile(patch: Partial<LocalProfile>) {
  try {
    const current = readLocalProfile();
    const next = { ...current, ...patch };
    localStorage.setItem("cb_profile", JSON.stringify(next));
  } catch {}
}

function notifyProfileUpdated() {
  try {
    window.dispatchEvent(new CustomEvent("cb:profile-updated"));
  } catch {}
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Backend fields default to "" for users who signed up but never explicitly
// saved a profile (e.g. completed onboarding, which only writes cb_profile
// to localStorage). "" is a real value to ?? but not one we want to show
// over a known-good local value, so every field here prefers whichever
// source is actually non-empty rather than whichever source merely exists.
function bestOf(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (v && v.trim()) return v;
  }
  return "";
}

// Downscales/crops an image file to a square JPEG data URL so avatars stay
// small regardless of the source photo's resolution (a phone photo can be
// 10+ MB: this keeps what we actually store/send in the few-hundred-KB
// range, well under the backend's 500KB cap on the avatar field).
//
// Reads via FileReader (data: URL) rather than URL.createObjectURL (blob:
// URL): the app's CSP img-src allows 'self' data: https: but not blob:,
// and data: URLs work here just as well for a one-shot local decode.
function fileToSquareDataUrl(file: File, size = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas unavailable"));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("invalid image"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#e5e0d5] py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="shrink-0 text-sm font-medium text-[#4d535c] dark:text-gray-400 sm:w-40">{label}</span>
      <div className="sm:max-w-[280px] sm:flex-1">{children}</div>
    </div>
  );
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-transparent bg-[#faf8f3] px-3 py-2 text-right text-sm text-[#303236] outline-none transition hover:border-[#d1c7b8] focus:border-[#0b7f46] focus:bg-white focus:ring-4 focus:ring-[#0b7f46]/10 dark:bg-white/5 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:bg-[#1c1e24]"
    />
  );
}

function SelectField({
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-transparent bg-[#faf8f3] px-3 py-2 text-right text-sm text-[#303236] outline-none transition hover:border-[#d1c7b8] focus:border-[#0b7f46] focus:bg-white focus:ring-4 focus:ring-[#0b7f46]/10 disabled:opacity-50 dark:bg-white/5 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:bg-[#1c1e24]"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default function ProfileSection({ user, setUser }: SettingsSectionProps) {
  const { t } = useTranslation();
  const authed = !!user;

  const local = readLocalProfile();
  const initialName = bestOf(user?.username, local.firstName);
  const initialCollege = bestOf(user?.college, local.college);
  const initialSchool = bestOf(user?.target_schools, local.school);
  const initialAvatar = bestOf(user?.avatar, local.avatar);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(initialName);
  const [college, setCollege] = useState(initialCollege);
  const [targetSchool, setTargetSchool] = useState(initialSchool);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [avatarError, setAvatarError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [colleges, setColleges] = useState<string[]>([]);
  const [ucs, setUcs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(bestOf(user?.username, local.firstName));
    setCollege(bestOf(user?.college, local.college));
    setTargetSchool(bestOf(user?.target_schools, local.school));
    setAvatar(bestOf(user?.avatar, local.avatar));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetch("/api/options/colleges")
      .then((r) => r.json())
      .then((d) => setColleges(d.colleges ?? []))
      .catch(() => setColleges([]));
  }, []);

  useEffect(() => {
    if (!college) {
      setUcs([]);
      return;
    }
    fetch(`/api/options/ucs?college=${encodeURIComponent(college)}`)
      .then((r) => r.json())
      .then((d) => setUcs(d.ucs ?? []))
      .catch(() => setUcs([]));
  }, [college]);

  const dirty =
    name !== initialName || college !== initialCollege || targetSchool !== initialSchool || avatar !== initialAvatar;

  const avatarInitials = useMemo(() => initialsFor(name || "?"), [name]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError(t("settings.profile.photoError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t("settings.profile.photoError"));
      return;
    }
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      setAvatar(dataUrl);
    } catch {
      setAvatarError(t("settings.profile.photoError"));
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (authed) {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, college, target_schools: targetSchool, avatar }),
        });
        if (res.ok) {
          const updated = await res.json();
          setUser(updated);
        }
      }
      writeLocalProfile({
        firstName: name,
        college,
        school: targetSchool,
        avatar,
        planSchools: targetSchool ? [targetSchool] : [],
      });
      notifyProfileUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setName(initialName);
    setCollege(initialCollege);
    setTargetSchool(initialSchool);
    setAvatar(initialAvatar);
    setAvatarError("");
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem("cb_profile");
    } catch {}
    window.location.href = "/";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          title={t("settings.profile.dropPhoto")}
          className={`group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#0b7f46] text-lg font-bold text-white outline-none transition ${
            dragOver ? "ring-4 ring-[#0b7f46]/30" : ""
          }`}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            avatarInitials
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#303236] dark:text-gray-100">{name || "Not set"}</p>
          {user?.email && <p className="truncate text-sm text-[#7b818b] dark:text-gray-500">{user.email}</p>}
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-[#0b7f46] transition hover:underline dark:text-[#3ba76a]"
            >
              {t("settings.profile.changePhoto")}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar("")}
                className="text-xs font-semibold text-[#8a8f98] transition hover:text-[#b5432e] dark:text-gray-500"
              >
                {t("settings.profile.removePhoto")}
              </button>
            )}
          </div>
        </div>
      </div>
      {avatarError && <p className="text-xs text-[#b5432e]">{avatarError}</p>}

      <div>
        <FieldRow label={t("settings.profile.name")}>
          <TextField value={name} onChange={setName} placeholder={t("settings.profile.namePlaceholder")} />
        </FieldRow>
        <FieldRow label={t("settings.profile.currentSchool")}>
          <SelectField
            value={college}
            options={colleges}
            placeholder={t("settings.profile.currentSchool")}
            onChange={(v) => {
              setCollege(v);
              setTargetSchool("");
            }}
          />
        </FieldRow>
        <FieldRow label={t("settings.profile.transferGoal")}>
          <SelectField
            value={targetSchool}
            options={ucs}
            placeholder={t("settings.profile.transferGoal")}
            onChange={setTargetSchool}
            disabled={!college}
          />
        </FieldRow>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="rounded-xl bg-[#0b7f46] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#08683a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? t("settings.profile.saving") : t("settings.profile.save")}
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={cancel}
            className="text-sm font-semibold text-[#4d535c] transition hover:text-[#0b7f46] dark:text-gray-400"
          >
            {t("settings.profile.cancel")}
          </button>
        )}
        {saved && <span className="text-sm font-medium text-[#0b7f46] dark:text-[#3ba76a]">{t("settings.profile.saved")}</span>}
      </div>

      <div className="border-t border-[#e5e0d5] pt-5 dark:border-gray-800">
        {authed ? (
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-[#b5432e] transition hover:text-[#8f331f]"
          >
            {t("settings.profile.logout")}
          </button>
        ) : (
          <p className="text-sm text-[#4d535c] dark:text-gray-400">
            {t("settings.profile.guestNotice")}{" "}
            <Link href="/login" className="font-semibold text-[#0b7f46] hover:underline">
              {t("settings.profile.logIn")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
