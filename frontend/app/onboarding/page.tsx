"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import TransferAIWidget from "../../components/TransferAIWidget";
import { useTranslation } from "../../lib/i18n";

const UC_OPTIONS: { label: string; value: string }[] = [
  { label: "UCLA",             value: "Los Angeles" },
  { label: "UC Berkeley",      value: "Berkeley" },
  { label: "UC San Diego",     value: "San Diego" },
  { label: "UC Irvine",        value: "Irvine" },
  { label: "UC Santa Barbara", value: "Santa Barbara" },
  { label: "UC Davis",         value: "Davis" },
  { label: "UC Santa Cruz",    value: "Santa Cruz" },
  { label: "UC Riverside",     value: "Riverside" },
  { label: "UC Merced",        value: "Merced" },
];

const CC_SUGGESTIONS = [
  "De Anza College", "Mt. SAC", "Santa Monica College", "Diablo Valley College",
  "City College of SF", "Foothill College", "Pasadena City College", "El Camino College",
  "Irvine Valley College", "Los Angeles Valley College", "Cerritos College",
  "Grossmont College", "Palomar College", "Saddleback College",
];

const MAJOR_SUGGESTIONS = [
  "Computer Science", "Business Administration", "Economics", "Psychology", "Biology",
  "Nursing", "Engineering", "Political Science", "Sociology", "Mathematics", "English",
  "Data Science", "Mechanical Engineering", "Electrical Engineering", "Chemistry",
  "Kinesiology", "Communications", "Accounting", "Architecture", "Film & Media Studies",
];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const STEPS = [
    t("onboarding.steps.name"),
    t("onboarding.steps.college"),
    t("onboarding.steps.targetUcs"),
    t("onboarding.steps.major"),
    t("onboarding.steps.courses"),
  ];
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [firstName, setFirstName] = useState("");
  const [college, setCollege] = useState("");
  const [ucs, setUcs] = useState<string[]>([]);
  const [major, setMajor] = useState("");
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [majorOptionsLoading, setMajorOptionsLoading] = useState(false);
  const [majorFocused, setMajorFocused] = useState(false);
  const [courses, setCourses] = useState("");
  const [noCourses, setNoCourses] = useState(false);
  const [hsMath, setHsMath] = useState("");
  const [hasAp, setHasAp] = useState<boolean | null>(null);
  const [apCredits, setApCredits] = useState("");
  const [transcriptParsing, setTranscriptParsing] = useState(false);
  const [transcriptMessage, setTranscriptMessage] = useState("");
  // Feedback here spans three very different outcomes: courses added, nothing
  // found, upload failed: so the message carries its tone rather than all
  // three rendering as the same grey line.
  const [transcriptTone, setTranscriptTone] = useState<"success" | "warning" | "error">("success");
  const [transcriptFileName, setTranscriptFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // An account is required before building a plan: check auth first and
  // bounce to /login if there isn't one, rather than letting anyone into
  // the wizard anonymously. Prefill the name from the account (e.g. email
  // signup already has one), but Google accounts sometimes don't carry a
  // usable name through, so the wizard still asks/confirms it as step 1.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const user = await res.json();
        setFirstName(user.username ?? "");
      } catch {
        router.replace("/login");
        return;
      }
      setAuthChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!college || !ucs[0]) { setMajorOptions([]); setMajorOptionsLoading(false); return; }
    setMajorOptionsLoading(true);
    fetch(`/api/options/majors?college=${encodeURIComponent(college)}&uc=${encodeURIComponent(ucs[0])}`)
      .then((r) => r.json())
      .then((data) => setMajorOptions(data.majors ?? []))
      .catch(() => setMajorOptions([]))
      .finally(() => setMajorOptionsLoading(false));
  }, [college, ucs]);

  function toggleUc(value: string) {
    setUcs((prev) => (prev.includes(value) ? prev.filter((u) => u !== value) : [...prev, value]));
  }

  function handleTranscriptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (file) processTranscript(file);
  }

  function handleTranscriptDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processTranscript(file);
  }

  async function processTranscript(file: File) {
    setTranscriptParsing(true);
    setTranscriptMessage("");
    setTranscriptFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-transcript", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setTranscriptTone("error");
        setTranscriptMessage(data.error);
      } else if (!data.courses?.length) {
        setTranscriptTone("warning");
        setTranscriptMessage(data.warning ?? t("onboarding.step5.noCoursesFound"));
      } else {
        setTranscriptTone("success");
        setNoCourses(false);
        setCourses((prev) => {
          const existing = new Set(prev.split(/[,;\n]/).map((c: string) => c.trim().toUpperCase()).filter(Boolean));
          const merged = [...prev.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean)];
          for (const code of data.courses as string[]) {
            const normalizedCode = code.trim();
            if (!normalizedCode) continue;
            if (!existing.has(normalizedCode.toUpperCase())) {
              merged.push(normalizedCode);
              existing.add(normalizedCode.toUpperCase());
            }
          }
          return merged.join(", ");
        });
        setTranscriptMessage(
          data.courses.length === 1
            ? t("onboarding.step5.addedCourseOne")
            : t("onboarding.step5.addedCourseMany", { n: data.courses.length })
        );
      }
    } catch {
      setTranscriptTone("error");
      setTranscriptMessage(t("onboarding.step5.transcriptError"));
    } finally {
      setTranscriptParsing(false);
    }
  }

  function finish() {
    const profile = {
      firstName: firstName.trim(),
      college,
      school: ucs[0] ?? "",
      planSchools: ucs,
      major,
      completedCourses: noCourses ? "" : courses,
      hsMath: noCourses ? hsMath : "",
      honors: false,
      apCredits,
      mode: "competitive",
    };
    try {
      localStorage.setItem("cb_profile", JSON.stringify(profile));
    } catch {}
    router.push("/dashboard");
  }

  // Once college + UC are picked, always use the real ASSIST major list :
  // never the plain hardcoded suggestions. Falling back to them while the
  // real list is still loading meant the exact same search (e.g. "Economics")
  // could match a plain name one moment and "Economics, B.A." the next,
  // depending purely on network timing.
  const majorPool = college && ucs[0] ? majorOptions : MAJOR_SUGGESTIONS;
  const majorQuery = major.trim().toLowerCase();
  const majorMatches = majorQuery
    ? majorPool.filter((m) => m.toLowerCase().includes(majorQuery))
    : majorPool;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--cb-surface-alt)]">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10 md:px-8">
          <p className="text-sm text-[var(--cb-muted)]">{t("onboarding.checkingAccount")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cb-surface-alt)]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-5 py-10 md:px-8">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  i < step - 1
                    ? "bg-[var(--cb-accent)] text-white"
                    : i === step - 1
                    ? "bg-[var(--cb-accent)] text-white ring-4 ring-[var(--cb-accent)]/20"
                    : "bg-[var(--cb-border)] text-[var(--cb-muted)]"
                }`}
              >
                {i < step - 1 ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  i === step - 1 ? "text-[var(--cb-text)]" : "text-[var(--cb-muted)]"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded-full ${i < step - 1 ? "bg-[var(--cb-accent)]" : "bg-[var(--cb-border)]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[var(--cb-border)] bg-[var(--cb-card)] p-8 shadow-[0_20px_50px_rgba(20,30,25,0.06)]">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("onboarding.step1.title")}</h1>
                <p className="mt-1.5 text-sm text-[var(--cb-muted)]">{t("onboarding.step1.subtitle")}</p>
              </div>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && firstName.trim()) setStep(2); }}
                placeholder={t("onboarding.step1.placeholder")}
                className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                autoFocus
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!firstName.trim()}
                  className="rounded-xl bg-[var(--cb-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] disabled:opacity-40"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: College */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("onboarding.step2.title")}</h1>
                <p className="mt-1.5 text-sm text-[var(--cb-muted)]">{t("onboarding.step2.subtitle")}</p>
              </div>
              <input
                list="cc-list"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && college.trim()) setStep(3); }}
                placeholder={t("onboarding.step2.placeholder")}
                className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                autoFocus
              />
              <datalist id="cc-list">
                {CC_SUGGESTIONS.map((cc) => <option key={cc} value={cc} />)}
              </datalist>
              <div className="flex flex-wrap gap-2">
                {CC_SUGGESTIONS.slice(0, 6).map((cc) => (
                  <button
                    key={cc}
                    onClick={() => { setCollege(cc); setStep(3); }}
                    className="rounded-full border border-[var(--cb-border)] bg-[var(--cb-card)] px-3 py-1 text-xs text-[var(--cb-body)] transition hover:border-[var(--cb-accent)] hover:text-[var(--cb-link)]"
                  >
                    {cc}
                  </button>
                ))}
              </div>

              {college.trim().toLowerCase() === "rancho santiago college" && (
                <div className="rounded-xl border border-[var(--cb-warning-border)] bg-[var(--cb-warning-bg)] p-4">
                  <p className="text-sm font-semibold text-[var(--cb-warning)]">
                    {t("onboarding.step2.districtWarning")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setCollege("Santa Ana College")}
                      className="rounded-full border border-[var(--cb-accent)] bg-[var(--cb-card)] px-3 py-1.5 text-xs font-semibold text-[var(--cb-link)] transition hover:bg-[var(--cb-accent)] hover:text-white"
                    >
                      Santa Ana College
                    </button>
                    <button
                      onClick={() => setCollege("Santiago Canyon College")}
                      className="rounded-full border border-[var(--cb-accent)] bg-[var(--cb-card)] px-3 py-1.5 text-xs font-semibold text-[var(--cb-link)] transition hover:bg-[var(--cb-accent)] hover:text-white"
                    >
                      Santiago Canyon College
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-sm font-medium text-[var(--cb-muted)] transition hover:text-[var(--cb-text)]">{t("common.back")}</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!college.trim() || college.trim().toLowerCase() === "rancho santiago college"}
                  className="rounded-xl bg-[var(--cb-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] disabled:opacity-40"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Target UCs */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("onboarding.step3.title")}</h1>
                <p className="mt-1.5 text-sm text-[var(--cb-muted)]">{t("onboarding.step3.subtitle")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {UC_OPTIONS.map((uc) => (
                  <button
                    key={uc.value}
                    onClick={() => toggleUc(uc.value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      ucs.includes(uc.value)
                        ? "border-[var(--cb-accent)] bg-[var(--cb-accent-tint)] text-[var(--cb-link)]"
                        : "border-[var(--cb-border)] bg-[var(--cb-card)] text-[var(--cb-text)] hover:border-[var(--cb-accent)] hover:text-[var(--cb-link)]"
                    }`}
                  >
                    {ucs.includes(uc.value) ? "✓ " : ""}
                    {uc.label}
                  </button>
                ))}
              </div>
              {ucs.length > 0 && (
                <p className="text-xs font-medium text-[var(--cb-link)]">
                  {ucs.length === 1 ? t("onboarding.step3.selectedOne") : t("onboarding.step3.selectedMany", { n: ucs.length })}
                </p>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-sm font-medium text-[var(--cb-muted)] transition hover:text-[var(--cb-text)]">{t("common.back")}</button>
                <button
                  onClick={() => setStep(4)}
                  disabled={ucs.length === 0}
                  className="rounded-xl bg-[var(--cb-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] disabled:opacity-40"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Major */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("onboarding.step4.title")}</h1>
                <p className="mt-1.5 text-sm text-[var(--cb-muted)]">{t("onboarding.step4.subtitle")}</p>
              </div>
              <div className="relative">
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  onFocus={() => setMajorFocused(true)}
                  onBlur={() => setTimeout(() => setMajorFocused(false), 150)}
                  onKeyDown={(e) => { if (e.key === "Enter" && major.trim()) setStep(5); }}
                  placeholder={t("onboarding.step4.placeholder")}
                  className="w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                  autoFocus
                  autoComplete="off"
                />
                {majorFocused && majorMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] shadow-lg">
                    {majorMatches.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onMouseDown={() => { setMajor(m); setMajorFocused(false); setStep(5); }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-[var(--cb-text)] transition hover:bg-[var(--cb-accent-tint)] hover:text-[var(--cb-link)]"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {majorFocused && majorQuery && majorMatches.length === 0 && !majorOptionsLoading && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-muted)] shadow-lg">
                    {t("onboarding.step4.noMatch", { q: major })}
                  </div>
                )}
              </div>
              {majorOptionsLoading && (
                <p className="text-xs text-[var(--cb-muted)]">{t("onboarding.step4.loadingMajors", { college, uc: ucs[0] })}</p>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="text-sm font-medium text-[var(--cb-muted)] transition hover:text-[var(--cb-text)]">{t("common.back")}</button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!major.trim()}
                  className="rounded-xl bg-[var(--cb-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] disabled:opacity-40"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Courses */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--cb-text)]">{t("onboarding.step5.title")}</h1>
                <p className="mt-1.5 text-sm text-[var(--cb-muted)]">{t("onboarding.step5.subtitle")}</p>
              </div>

              <label
                htmlFor="transcript-upload"
                onDragOver={(e) => { e.preventDefault(); if (!transcriptParsing) setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleTranscriptDrop}
                className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
                  dragActive
                    ? "scale-[1.01] border-[var(--cb-accent)] bg-[var(--cb-accent-tint)]"
                    : transcriptParsing
                      ? "border-[var(--cb-accent)]/40 bg-[var(--cb-surface-alt)]"
                      : "border-[var(--cb-border)] bg-[var(--cb-surface-alt)] hover:border-[var(--cb-accent)] hover:bg-[var(--cb-accent-tint)]"
                }`}
              >
                <input
                  id="transcript-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={transcriptParsing}
                  onChange={handleTranscriptUpload}
                />

                {/* Sweeps across the dropzone while the PDF is being read, so a
                    slow parse reads as progress rather than a frozen page. */}
                {transcriptParsing && (
                  <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-[var(--cb-accent)]/10 to-transparent" />
                )}

                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 ${
                    dragActive ? "scale-110 bg-[var(--cb-accent)]/15" : "bg-[var(--cb-accent)]/10 group-hover:scale-105"
                  }`}
                >
                  {transcriptParsing ? (
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0b7f46" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0b7f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  )}
                </span>

                <span className="text-sm font-semibold text-[var(--cb-text)]">
                  {transcriptParsing
                    ? t("onboarding.step5.readingTranscript")
                    : dragActive
                      ? t("onboarding.step5.dropHere")
                      : t("onboarding.step5.uploadTranscript")}
                </span>
                <span className="text-xs text-[var(--cb-muted)]">
                  {transcriptParsing && transcriptFileName
                    ? transcriptFileName
                    : t("onboarding.step5.autoExtract")}
                </span>
              </label>

              {transcriptMessage && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
                    transcriptTone === "success"
                      ? "border-[var(--cb-accent)]/25 bg-[var(--cb-accent-tint)] text-[var(--cb-link)]"
                      : transcriptTone === "warning"
                        ? "border-amber-500/25 bg-amber-50 text-amber-800"
                        : "border-red-500/25 bg-red-50 text-red-800"
                  }`}
                >
                  <svg className="mt-px shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {transcriptTone === "success" ? (
                      <path d="M20 6 9 17l-5-5" />
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v5M12 16h.01" />
                      </>
                    )}
                  </svg>
                  <span>{transcriptMessage}</span>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={noCourses}
                  onChange={(e) => { setNoCourses(e.target.checked); if (e.target.checked) setCourses(""); }}
                  className="h-4 w-4 rounded accent-[var(--cb-accent)]"
                />
                <span className="text-sm text-[var(--cb-text)]">{t("onboarding.step5.noCoursesYet")}</span>
              </label>

              {!noCourses && (
                <textarea
                  value={courses}
                  onChange={(e) => setCourses(e.target.value)}
                  placeholder={t("onboarding.step5.coursesPlaceholder")}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-4 py-3 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                />
              )}
              {noCourses && (
                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-alt)] px-4 py-3">
                  <p className="mb-2 text-sm font-medium text-[var(--cb-text)]">
                    {t("onboarding.step5.hsMathLabel")} <span className="font-normal text-[var(--cb-muted)]">{t("onboarding.step5.optional")}</span>
                  </p>
                  <input
                    value={hsMath}
                    onChange={(e) => setHsMath(e.target.value)}
                    placeholder={t("onboarding.step5.hsMathPlaceholder")}
                    className="w-full rounded-lg border border-[var(--cb-border)] bg-[var(--cb-card)] px-3 py-2 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                  />
                </div>
              )}

              <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-alt)] p-4">
                <p className="mb-3 text-sm font-semibold text-[var(--cb-text)]">{t("onboarding.step5.apQuestion")}</p>
                <div className="mb-3 flex gap-3">
                  <button
                    onClick={() => setHasAp(true)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${hasAp === true ? "border-[var(--cb-accent)] bg-[var(--cb-accent)] text-white" : "border-[var(--cb-border)] bg-[var(--cb-card)] text-[var(--cb-text)] hover:border-[var(--cb-accent)]"}`}
                  >
                    {t("onboarding.step5.yes")}
                  </button>
                  <button
                    onClick={() => { setHasAp(false); setApCredits(""); }}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${hasAp === false ? "border-[var(--cb-accent)] bg-[var(--cb-accent)] text-white" : "border-[var(--cb-border)] bg-[var(--cb-card)] text-[var(--cb-text)] hover:border-[var(--cb-accent)]"}`}
                  >
                    {t("onboarding.step5.no")}
                  </button>
                </div>
                {hasAp === true && (
                  <textarea
                    value={apCredits}
                    onChange={(e) => setApCredits(e.target.value)}
                    placeholder={t("onboarding.step5.apPlaceholder")}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-[var(--cb-border)] bg-[var(--cb-card)] px-3 py-2 text-sm text-[var(--cb-text)] outline-none transition focus:border-[var(--cb-accent)] focus:ring-4 focus:ring-[var(--cb-accent)]/10"
                  />
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(4)} className="text-sm font-medium text-[var(--cb-muted)] transition hover:text-[var(--cb-text)]">{t("common.back")}</button>
                <button
                  onClick={finish}
                  disabled={
                    (!noCourses && !courses.trim()) ||
                    hasAp === null ||
                    (hasAp === true && !apCredits.trim())
                  }
                  className="rounded-xl bg-[var(--cb-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cb-accent-hover)] disabled:opacity-40"
                >
                  {t("onboarding.step5.buildMyPlan")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <TransferAIWidget />
    </div>
  );
}
