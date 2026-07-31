"use client";

import { useEffect, useState } from "react";
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

function SchoolSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#4d535c] dark:text-gray-400">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#d1c7b8] bg-white px-3.5 py-2.5 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10 disabled:opacity-50 dark:border-gray-700 dark:bg-[#1c1e24] dark:text-gray-100"
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
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

export default function ProfileSection({ user, setUser }: SettingsSectionProps) {
  const { t } = useTranslation();
  const authed = !!user;

  const local = readLocalProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(bestOf(user?.username, local.firstName));
  const [college, setCollege] = useState(bestOf(user?.college, local.college));
  const [targetSchool, setTargetSchool] = useState(bestOf(user?.target_schools, local.school));
  const [colleges, setColleges] = useState<string[]>([]);
  const [ucs, setUcs] = useState<string[]>([]);

  useEffect(() => {
    setName(bestOf(user?.username, local.firstName));
    setCollege(bestOf(user?.college, local.college));
    setTargetSchool(bestOf(user?.target_schools, local.school));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!editing) return;
    fetch("/api/options/colleges")
      .then((r) => r.json())
      .then((d) => setColleges(d.colleges ?? []))
      .catch(() => setColleges([]));
  }, [editing]);

  useEffect(() => {
    if (!editing || !college) {
      setUcs([]);
      return;
    }
    fetch(`/api/options/ucs?college=${encodeURIComponent(college)}`)
      .then((r) => r.json())
      .then((d) => setUcs(d.ucs ?? []))
      .catch(() => setUcs([]));
  }, [editing, college]);

  function startEdit() {
    setName(bestOf(user?.username, local.firstName));
    setCollege(bestOf(user?.college, local.college));
    setTargetSchool(bestOf(user?.target_schools, local.school));
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (authed) {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, college, target_schools: targetSchool }),
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
        planSchools: targetSchool ? [targetSchool] : [],
      });
      notifyProfileUpdated();
      setEditing(false);
    } finally {
      setSaving(false);
    }
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

  const displayName = bestOf(user?.username, local.firstName) || "—";
  const displayCollege = bestOf(user?.college, local.college) || "—";
  const displaySchool = bestOf(user?.target_schools, local.school) || "—";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5e0d5] bg-[#faf8f3] p-5 dark:border-gray-700 dark:bg-[#1c1e24]">
        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98] dark:text-gray-500">
                {t("settings.profile.name")}
              </p>
              <p className="mt-0.5 text-base font-semibold text-[#303236] dark:text-gray-100">{displayName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98] dark:text-gray-500">
                {t("settings.profile.currentSchool")}
              </p>
              <p className="mt-0.5 text-base font-semibold text-[#303236] dark:text-gray-100">{displayCollege || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98] dark:text-gray-500">
                {t("settings.profile.transferGoal")}
              </p>
              <p className="mt-0.5 text-base font-semibold text-[#303236] dark:text-gray-100">{displaySchool || "—"}</p>
            </div>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-xl border border-[#d1c7b8] px-4 py-2 text-sm font-semibold text-[#303236] transition hover:border-[#0b7f46] hover:text-[#0b7f46] dark:border-gray-600 dark:text-gray-200"
            >
              {t("settings.profile.edit")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#4d535c] dark:text-gray-400">
                {t("settings.profile.name")}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.profile.namePlaceholder")}
                className="w-full rounded-xl border border-[#d1c7b8] bg-white px-3.5 py-2.5 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10 dark:border-gray-700 dark:bg-[#1c1e24] dark:text-gray-100"
              />
            </label>
            <SchoolSelect
              label={t("settings.profile.currentSchool")}
              value={college}
              options={colleges}
              onChange={(v) => {
                setCollege(v);
                setTargetSchool("");
              }}
            />
            <SchoolSelect
              label={t("settings.profile.transferGoal")}
              value={targetSchool}
              options={ucs}
              onChange={setTargetSchool}
              disabled={!college}
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-[#0b7f46] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#08683a] disabled:opacity-60"
              >
                {saving ? t("settings.profile.saving") : t("settings.profile.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-[#d1c7b8] px-4 py-2 text-sm font-semibold text-[#303236] transition hover:border-[#0b7f46] dark:border-gray-600 dark:text-gray-200"
              >
                {t("settings.profile.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

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
  );
}
