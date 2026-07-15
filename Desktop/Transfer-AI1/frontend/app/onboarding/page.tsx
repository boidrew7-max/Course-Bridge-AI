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

const STEPS = ["College", "Target UCs", "Major", "Courses"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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
  const [authChecked, setAuthChecked] = useState(false);

  // An account is required before building a plan — check auth first and
  // bounce to /login if there isn't one, rather than letting anyone into
  // the wizard anonymously. The account already has a name from signup, so
  // pull it here instead of asking again as its own wizard step.
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

  async function handleTranscriptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;

    setTranscriptParsing(true);
    setTranscriptMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-transcript", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setTranscriptMessage(data.error);
      } else if (!data.courses?.length) {
        setTranscriptMessage(data.warning ?? "No courses found in that PDF.");
      } else {
        setNoCourses(false);
        setCourses((prev) => {
          const existing = new Set(prev.split(/[,;\n]/).map((c: string) => c.trim().toUpperCase()).filter(Boolean));
          const merged = [...prev.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean)];
          for (const code of data.courses as string[]) {
            if (!existing.has(code.toUpperCase())) merged.push(code);
          }
          return merged.join(", ");
        });
        setTranscriptMessage(`Added ${data.courses.length} course${data.courses.length === 1 ? "" : "s"} from your transcript — review the list below.`);
      }
    } catch {
      setTranscriptMessage("Something went wrong reading that file. Try again or enter your courses manually.");
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

  // Once college + UC are picked, always use the real ASSIST major list —
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
      <div className="min-h-screen bg-[#faf9f6]">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10 md:px-8">
          <p className="text-sm text-[#7b818b]">Checking your account…</p>
        </main>
      </div>
    );
  }

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
          {/* Step 1 — College */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">Where do you go to school?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">Enter your California community college.</p>
              </div>
              <input
                list="cc-list"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && college.trim()) setStep(2); }}
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
                    onClick={() => { setCollege(cc); setStep(2); }}
                    className="rounded-full border border-[#e5e0d5] bg-white px-3 py-1 text-xs text-[#4d535c] transition hover:border-[#0b7f46] hover:text-[#0b7f46]"
                  >
                    {cc}
                  </button>
                ))}
              </div>

              {college.trim().toLowerCase() === "rancho santiago college" && (
                <div className="rounded-xl border border-[#f0d99b] bg-[#fffaf0] p-4">
                  <p className="text-sm font-semibold text-[#7a5a12]">
                    &quot;Rancho Santiago College&quot; is the district name, not a specific campus —
                    which college do you actually attend?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setCollege("Santa Ana College")}
                      className="rounded-full border border-[#0b7f46] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b7f46] transition hover:bg-[#0b7f46] hover:text-white"
                    >
                      Santa Ana College
                    </button>
                    <button
                      onClick={() => setCollege("Santiago Canyon College")}
                      className="rounded-full border border-[#0b7f46] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b7f46] transition hover:bg-[#0b7f46] hover:text-white"
                    >
                      Santiago Canyon College
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!college.trim() || college.trim().toLowerCase() === "rancho santiago college"}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Target UCs */}
          {step === 2 && (
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
                <button onClick={() => setStep(1)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={ucs.length === 0}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Major */}
          {step === 3 && (
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
                  onKeyDown={(e) => { if (e.key === "Enter" && major.trim()) setStep(4); }}
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
                        onMouseDown={() => { setMajor(m); setMajorFocused(false); setStep(4); }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-[#303236] transition hover:bg-[#f0faf5] hover:text-[#0b7f46]"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {majorFocused && majorQuery && majorMatches.length === 0 && !majorOptionsLoading && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#e5e0d5] bg-white px-4 py-3 text-sm text-[#7b818b] shadow-lg">
                    No major matches &quot;{major}&quot; — you can still type it exactly and continue.
                  </div>
                )}
              </div>
              {majorOptionsLoading && (
                <p className="text-xs text-[#7b818b]">Loading the full major list for {college} → {ucs[0]}…</p>
              )}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!major.trim()}
                  className="rounded-xl bg-[#0b7f46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08683a] disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Courses */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2e22]">What courses have you completed?</h1>
                <p className="mt-1.5 text-sm text-[#7b818b]">Upload your transcript or list your courses in plain text.</p>
              </div>

              <label
                htmlFor="transcript-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d8d8dc] bg-[#faf9f6] px-4 py-6 text-center transition hover:border-[#0b7f46]"
              >
                <input
                  id="transcript-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleTranscriptUpload}
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0b7f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span className="text-sm font-semibold text-[#303236]">
                  {transcriptParsing ? "Reading your transcript…" : "Upload transcript (PDF)"}
                </span>
                <span className="text-xs text-[#7b818b]">We&apos;ll pull your completed courses out automatically</span>
              </label>
              {transcriptMessage && (
                <p className="text-xs text-[#7b818b]">{transcriptMessage}</p>
              )}

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

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="text-sm font-medium text-[#7b818b] transition hover:text-[#303236]">← Back</button>
                <button
                  onClick={finish}
                  disabled={
                    (!noCourses && !courses.trim()) ||
                    hasAp === null ||
                    (hasAp === true && !apCredits.trim())
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
