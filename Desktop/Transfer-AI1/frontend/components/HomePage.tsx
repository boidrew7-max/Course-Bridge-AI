import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";

const PAIN_POINTS = [
  "ASSIST.org can be hard to read.",
  "Requirements change by school and major.",
  "One missing prerequisite can delay transfer.",
  "Counselors help, but appointments fill up fast.",
];

const STATS = [
  { n: "116", label: "Community Colleges" },
  { n: "57K+", label: "Courses indexed" },
  { n: "9", label: "UC campuses" },
  { n: "121K+", label: "Articulation agreements" },
];

const HOW_IT_WORKS = [
  {
    number: "1",
    title: "Add your courses",
    body: "Enter your completed courses in plain text — no need to look up exact codes.",
  },
  {
    number: "2",
    title: "Pick a UC and major",
    body: "Choose the UC campus and major you want to transfer into.",
  },
  {
    number: "3",
    title: "Get a clear plan",
    body: "See major requirements, blocked classes, and lighter GE filler options.",
  },
];

const WHAT_YOU_GET = [
  { title: "Major prep tracking", body: "See exactly which lower-division major requirements you've completed and which are still missing." },
  { title: "Prerequisite sequencing", body: "Courses are ordered by prerequisite chains so you never plan a class before you're ready for it." },
  { title: "General education coverage", body: "Track Cal-GETC areas alongside your major prep in one place." },
  { title: "A generated semester plan", body: "A term-by-term schedule built from real ASSIST articulation data for your college, major, and target campus." },
  { title: "TAG eligibility checker", body: "Check your GPA and major against Transfer Admission Guarantee requirements for participating UCs." },
  { title: "Application deadline reminders", body: "Keep TAG, UC application, and financial aid deadlines in view as your plan comes together." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#2f3135]">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 md:px-8 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-[#b8d8c7] bg-[#e7f3ed] px-4 py-1.5 text-sm font-semibold text-[#0b7f46]">
              Built around real transfer planning problems
            </p>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[#1a2e22] sm:text-5xl lg:text-6xl">
              Know exactly what classes you need before you transfer.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5b6169]">
              CourseBridge plans your UC transfer requirements using real ASSIST
              articulation data — personalized to your community college, major, and
              target campus, so nothing falls through the cracks.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="rounded-xl bg-[#0b7f46] px-6 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md"
              >
                Build My Plan
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[#d8d8dc] bg-white px-6 py-3.5 text-center font-semibold text-[#2f3135] transition hover:border-[#0b7f46] hover:text-[#0b7f46]"
              >
                Log In
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-[#eceae4] pt-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-[#0b7f46]">{s.n}</p>
                  <p className="mt-0.5 text-xs text-[#7b818b]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e5e0d5] bg-[#faf9f6] p-6 shadow-[0_20px_50px_rgba(20,30,25,0.06)]">
            <p className="text-sm font-semibold text-[#7b818b]">Product preview</p>
            <h2 className="mt-1 text-xl font-bold text-[#1a2e22]">UC Berkeley · Computer Science</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e5e0d5] bg-white p-4">
                <p className="text-sm font-bold text-[#1a2e22]">Completed</p>
                <p className="mt-2 text-sm text-[#6f7680]">Calculus I</p>
                <p className="text-sm text-[#6f7680]">Intro to Programming</p>
              </div>
              <div className="rounded-2xl border border-[#e5e0d5] bg-white p-4">
                <p className="text-sm font-bold text-[#1a2e22]">Missing</p>
                <p className="mt-2 text-sm text-[#6f7680]">Data Structures</p>
                <p className="text-sm text-[#6f7680]">Linear Algebra</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e5e0d5] bg-white p-4">
              <p className="mb-2 text-sm font-bold text-[#1a2e22]">Recommended next term</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#e7f3ed] px-3 py-1.5 text-sm font-semibold text-[#0b7f46]">Data Structures</span>
                <span className="rounded-lg bg-[#e7f3ed] px-3 py-1.5 text-sm font-semibold text-[#0b7f46]">Linear Algebra</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why CourseBridge */}
      <section id="students" className="border-t border-[#eceae4] bg-[#faf9f6]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <h2 className="text-3xl font-bold text-[#1a2e22]">Why CourseBridge</h2>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
            Transfer planning shouldn&apos;t depend on catching a counselor before
            appointments fill up. Here&apos;s the problem CourseBridge solves.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PAIN_POINTS.map((text) => (
              <div key={text} className="rounded-2xl border border-[#e5e0d5] bg-white p-5 text-[15px] font-medium text-[#4d535c] shadow-sm">
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <h2 className="text-3xl font-bold text-[#1a2e22]">How it works</h2>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
          Three steps, and you&apos;ll have a term-by-term plan built on real
          articulation data.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.number} className="rounded-3xl border border-[#e5e0d5] bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#0b7f46] text-sm font-bold text-white">
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-[#1a2e22]">{step.title}</h3>
              <p className="mt-2 leading-6 text-[#6f7680]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What students get */}
      <section id="counselors" className="border-t border-[#eceae4] bg-[#faf9f6]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <h2 className="text-3xl font-bold text-[#1a2e22]">What students get</h2>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
            Everything you need to plan your transfer with confidence, in one place.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_YOU_GET.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm">
                <h3 className="font-bold text-[#1a2e22]">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f7680]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing (simple, honest placeholder — this is a free demo tool) */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="rounded-3xl border border-[#e5e0d5] bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-[#1a2e22]">Free while in beta</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-[#5b6169]">
            CourseBridge is currently free to use for all California community
            college students while we build it out.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#eceae4] bg-[#0b7f46]">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-8">
          <h2 className="text-3xl font-bold text-white">Ready to see your plan?</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-white/85">
            Answer a few questions about your college, major, and target campus —
            CourseBridge does the rest.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-[#0b7f46] shadow-sm transition hover:bg-[#f0faf5]"
          >
            Build My Plan
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
