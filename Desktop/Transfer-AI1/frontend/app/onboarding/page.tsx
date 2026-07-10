"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

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

const STEPS = ["Name", "College", "Target UCs", "Major", "Courses"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [firstName, setFirstName] = useState("");
  const [college, setCollege] = useState("");
  const [ucs, setUcs] = useState<string[]>([]);
  const [major, setMajor] = useState("");
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [majorFocused, setMajorFocused] = useState(false);
  const [courses, setCourses] = useState("");
  const [noCourses, setNoCourses] = useState(false);
  const [hsMath, setHsMath] = useState("");
  const [honors, setHonors] = useState<boolean | null>(null);
  const [hasAp, setHasAp] = useState<boolean | null>(null);
  const [apCredits, setApCredits] = useState("");
  const [mode, setMode] = useState<"competitive" | "efficiency" | null>(null);

  useEffect(() => {
    if (!college || !ucs[0]) { setMajorOptions([]); return; }
    fetch(`/api/options/majors?college=${encodeURIComponent(college)}&uc=${encodeURIComponent(ucs[0])}`)
      .then((r) => r.json())
      .then((data) => setMajorOptions(data.majors ?? []))
      .catch(() => setMajorOptions([]));
  }, [college, ucs]);

  function toggleUc(value: string) {
    setUcs((prev) => (prev.includes(value) ? prev.filter((u) => u !== value) : [...prev, value]));
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
      honors: honors ?? true,
      apCredits,
      mode: mode ?? "competitive",
    };
    try {
      localStorage.setItem("cb_profile", JSON.stringify(profile));
    } catch {}
    router.push("/");
  }

  const majorPool = majorOptions.length > 0 ? majorOptions : MAJOR_SUGGESTIONS;
  const majorQuery = major.trim().toLowerCase();
  const majorMatches = majorQuery
    ? majorPool.filter((m) => m.toLowerCase().includes(majorQuery))
    : majorPool;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-5 py-10 md:px-8">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  i < step - 1
                    ? "bg-[#0b7f46] text-white"
                    : i === step - 1
                    ? "bg-[#0b7f46] text-white ring-4 ring-[#0b7f46]/20"
                    : "bg-[#e5e0d5] text-[#a3a9b3]"
                }`}
              >
                {i < step - 1 ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  i === step - 1 ? "text-[#1a2e22]" : "text-[#a3a9b3]"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded-full ${i < step - 1 ? "bg-[#0b7f46]" : "bg-[#e5e0d5]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[#e5e0d5] bg-white p-8 shadow-[0_20px_50px_rgba(20,30,25,0.06)]">
          {/* Step 1 — Name */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">What&apos;s your first name?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">So we can personalize your plan.</p>
              </div>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && firstName.trim()) setStep(2); }}
                placeholder="e.g. Jordan"
                className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                autoFocus
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!firstName.trim()}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — College */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">Where do you go to school?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">Enter your California community college.</p>
              </div>
              <input
                list="cc-list"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && college.trim()) setStep(3); }}
                placeholder="e.g. De Anza College"
                className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
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
                    className="rounded-full border border-[#e5e0d5] bg-white px-3 py-1 text-xs text-[#4d535c] transition hover:border-[#0b7f46] hover:text-[#0b7f46]"
                  >
                    {cc}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!college.trim()}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Target UCs */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">Which UCs are you targeting?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">Select all that apply — we&apos;ll build a plan for each.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {UC_OPTIONS.map((uc) => (
                  <button
                    key={uc.value}
                    onClick={() => toggleUc(uc.value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      ucs.includes(uc.value)
                        ? "border-[#0b7f46] bg-[#e7f3ed] text-[#0b7f46]"
                        : "border-[#e5e0d5] bg-white text-[#303236] hover:border-[#0b7f46] hover:text-[#0b7f46]"
                    }`}
                  >
                    {ucs.includes(uc.value) ? "✓ " : ""}
                    {uc.label}
                  </button>
                ))}
              </div>
              {ucs.length > 0 && (
                <p className="text-xs font-medium text-[#0b7f46]">
                  {ucs.length} school{ucs.length > 1 ? "s" : ""} selected
                </p>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={() => setStep(4)}
                  disabled={ucs.length === 0}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Major */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">What do you want to study?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">Enter your intended major.</p>
              </div>
              <div className="relative">
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  onFocus={() => setMajorFocused(true)}
                  onBlur={() => setTimeout(() => setMajorFocused(false), 150)}
                  onKeyDown={(e) => { if (e.key === "Enter" && major.trim()) setStep(5); }}
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                  autoFocus
                  autoComplete="off"
                />
                {majorFocused && majorMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e5e0d5] bg-white shadow-lg">
                    {majorMatches.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onMouseDown={() => { setMajor(m); setMajorFocused(false); setStep(5); }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-[#303236] transition hover:bg-[#f0faf5] hover:text-[#0b7f46]"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {majorFocused && majorQuery && majorMatches.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#e5e0d5] bg-white px-4 py-3 text-sm text-[#7b818b] shadow-lg">
                    No major matches &quot;{major}&quot; — you can still type it exactly and continue.
                  </div>
                )}
              </div>
              {majorOptions.length === 0 && (
                <p className="text-xs text-[#7b818b]">Loading the full major list for {college} → {ucs[0]}…</p>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!major.trim()}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 5 — Courses + preferences */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">What courses have you completed?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">List them in plain text — don&apos;t worry about formatting.</p>
              </div>

              <label className="flex cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={noCourses}
                  onChange={(e) => { setNoCourses(e.target.checked); if (e.target.checked) setCourses(""); }}
                  className="h-4 w-4 rounded accent-[#0b7f46]"
                />
                <span className="text-sm text-[#303236]">I haven&apos;t completed any college courses yet</span>
              </label>

              {!noCourses && (
                <textarea
                  value={courses}
                  onChange={(e) => setCourses(e.target.value)}
                  placeholder="e.g. Calc 1, English 1A, Intro to CS, Econ 1"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#d8d8dc] bg-white px-4 py-3 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                  autoFocus
                />
              )}
              {noCourses && (
                <div className="rounded-xl border border-[#e5e0d5] bg-[#faf9f6] px-4 py-3">
                  <p className="mb-2 text-sm font-medium text-[#303236]">
                    Highest math completed in high school? <span className="font-normal text-[#7b818b]">(optional)</span>
                  </p>
                  <input
                    value={hsMath}
                    onChange={(e) => setHsMath(e.target.value)}
                    placeholder="e.g. Pre-Calculus, Algebra II, Calculus AB"
                    className="w-full rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                  />
                </div>
              )}

              <div className="rounded-xl border border-[#e5e0d5] bg-[#faf9f6] p-4">
                <p className="mb-3 text-sm font-semibold text-[#303236]">Are you open to taking honors courses?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHonors(true)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${honors === true ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    Yes, include them
                  </button>
                  <button
                    onClick={() => setHonors(false)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${honors === false ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    No, skip honors
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#e5e0d5] bg-[#faf9f6] p-4">
                <p className="mb-3 text-sm font-semibold text-[#303236]">Do you have any AP exam credit?</p>
                <div className="mb-3 flex gap-3">
                  <button
                    onClick={() => setHasAp(true)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${hasAp === true ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => { setHasAp(false); setApCredits(""); }}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${hasAp === false ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    No
                  </button>
                </div>
                {hasAp === true && (
                  <textarea
                    value={apCredits}
                    onChange={(e) => setApCredits(e.target.value)}
                    placeholder="e.g. AP Calculus AB (score 4), AP English Language (score 5)"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-[#d8d8dc] bg-white px-3 py-2 text-sm text-[#303236] outline-none transition focus:border-[#0b7f46] focus:ring-4 focus:ring-[#0b7f46]/10"
                  />
                )}
              </div>

              <div className="rounded-xl border border-[#e5e0d5] bg-[#faf9f6] p-4">
                <p className="mb-1 text-sm font-semibold text-[#303236]">Planning mode</p>
                <p className="mb-3 text-xs text-[#7b818b]">Competitive maximizes your transfer strength. Efficiency minimizes workload.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode("competitive")}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${mode === "competitive" ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    🏆 Competitive
                  </button>
                  <button
                    onClick={() => setMode("efficiency")}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${mode === "efficiency" ? "border-[#0b7f46] bg-[#0b7f46] text-white" : "border-[#d8d8dc] bg-white text-[#303236] hover:border-[#0b7f46]"}`}
                  >
                    ⚡ Efficiency
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(4)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={finish}
                  disabled={
                    (!noCourses && !courses.trim()) ||
                    honors === null ||
                    hasAp === null ||
                    (hasAp === true && !apCredits.trim()) ||
                    mode === null
                  }
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Build My Plan →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
