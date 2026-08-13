"use client";

/**
 * What the advisor is told about the student.
 *
 * The backend merges this over the saved account profile, so it is allowed to
 * be partial or missing entirely. It is prompt context only: it personalises
 * the answer and never grants access to anything, which is why reading it
 * straight out of the browser is safe.
 */
export type ChatContext = {
  firstName?: string;
  college?: string;
  targetUniversity?: string;
  targetUniversities?: string[];
  major?: string;
  completedCourses?: string;
};

/** Shape written to localStorage by the onboarding wizard. */
type StoredProfile = {
  firstName?: string;
  college?: string;
  school?: string;
  major?: string;
  completedCourses?: string;
  planSchools?: string[];
};

/**
 * Builds chat context from the profile onboarding saved locally.
 *
 * This is the only source for a student without an account, and it is fresher
 * than the account row while they are still working through the wizard.
 * Returns undefined when there is nothing worth sending, so signed-in students
 * fall back to what the backend already knows about them.
 */
export function readLocalChatContext(): ChatContext | undefined {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("cb_profile");
  } catch {
    return undefined;
  }
  if (!raw) return undefined;

  let profile: StoredProfile;
  try {
    profile = JSON.parse(raw);
  } catch {
    return undefined;
  }

  const targets = (profile.planSchools ?? []).filter(Boolean);
  if (profile.school && !targets.includes(profile.school)) targets.unshift(profile.school);

  const context: ChatContext = {
    firstName: profile.firstName || undefined,
    college: profile.college || undefined,
    targetUniversity: profile.school || undefined,
    targetUniversities: targets.length ? targets : undefined,
    major: profile.major || undefined,
    completedCourses: profile.completedCourses || undefined,
  };

  return Object.values(context).some(Boolean) ? context : undefined;
}
