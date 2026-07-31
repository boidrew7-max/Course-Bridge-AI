"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TransferAIWidget from "./TransferAIWidget";
import { useTranslation } from "../lib/i18n";

export default function HomePage() {
  const { t } = useTranslation();

  const STATS = [
    { n: "116", label: t("home.stats.communityColleges") },
    { n: "57K+", label: t("home.stats.coursesIndexed") },
    { n: "9", label: t("home.stats.ucCampuses") },
    { n: "121K+", label: t("home.stats.articulationAgreements") },
  ];

  const PAIN_POINTS = [
    t("home.painPoints.0"),
    t("home.painPoints.1"),
    t("home.painPoints.2"),
    t("home.painPoints.3"),
  ];

  const HOW_IT_WORKS = [
    { number: "1", title: t("home.how.step1.title"), body: t("home.how.step1.body") },
    { number: "2", title: t("home.how.step2.title"), body: t("home.how.step2.body") },
    { number: "3", title: t("home.how.step3.title"), body: t("home.how.step3.body") },
  ];

  const WHAT_YOU_GET = [
    { title: t("home.get.feature1.title"), body: t("home.get.feature1.body") },
    { title: t("home.get.feature2.title"), body: t("home.get.feature2.body") },
    { title: t("home.get.feature3.title"), body: t("home.get.feature3.body") },
    { title: t("home.get.feature4.title"), body: t("home.get.feature4.body") },
    { title: t("home.get.feature5.title"), body: t("home.get.feature5.body") },
    { title: t("home.get.feature6.title"), body: t("home.get.feature6.body") },
  ];

  return (
    <div className="min-h-screen bg-white text-[#2f3135]">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 md:px-8 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-[#b8d8c7] bg-[#e7f3ed] px-4 py-1.5 text-sm font-semibold text-[#0b7f46]">
              {t("home.badge")}
            </p>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[#1a2e22] sm:text-5xl lg:text-6xl">
              {t("home.heroTitle")}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5b6169]">
              {t("home.heroBody")}
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/onboarding"
                className="rounded-xl bg-[#0b7f46] px-6 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md"
              >
                {t("home.buildMyPlan")}
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#4d535c] transition hover:text-[#0b7f46]"
              >
                {t("home.alreadyHavePlan")}
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
            <p className="text-sm font-semibold text-[#7b818b]">{t("home.preview.label")}</p>
            <h2 className="mt-1 text-xl font-bold text-[#1a2e22]">UC Berkeley · Computer Science</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e5e0d5] bg-white p-4">
                <p className="text-sm font-bold text-[#1a2e22]">{t("home.preview.completed")}</p>
                <p className="mt-2 text-sm text-[#6f7680]">{t("home.preview.calc1")}</p>
                <p className="text-sm text-[#6f7680]">{t("home.preview.introProgramming")}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e0d5] bg-white p-4">
                <p className="text-sm font-bold text-[#1a2e22]">{t("home.preview.missing")}</p>
                <p className="mt-2 text-sm text-[#6f7680]">{t("home.preview.dataStructures")}</p>
                <p className="text-sm text-[#6f7680]">{t("home.preview.linearAlgebra")}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e5e0d5] bg-white p-4">
              <p className="mb-2 text-sm font-bold text-[#1a2e22]">{t("home.preview.recommendedNextTerm")}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#e7f3ed] px-3 py-1.5 text-sm font-semibold text-[#0b7f46]">{t("home.preview.dataStructures")}</span>
                <span className="rounded-lg bg-[#e7f3ed] px-3 py-1.5 text-sm font-semibold text-[#0b7f46]">{t("home.preview.linearAlgebra")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why CourseBridge */}
      <section id="students" className="border-t border-[#eceae4] bg-[#faf9f6]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <h2 className="text-3xl font-bold text-[#1a2e22]">{t("home.why.title")}</h2>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
            {t("home.why.body")}
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
        <h2 className="text-3xl font-bold text-[#1a2e22]">{t("home.how.title")}</h2>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
          {t("home.how.body")}
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
          <h2 className="text-3xl font-bold text-[#1a2e22]">{t("home.get.title")}</h2>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-[#5b6169]">
            {t("home.get.body")}
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
          <h2 className="text-2xl font-bold text-[#1a2e22]">{t("home.pricing.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-[#5b6169]">
            {t("home.pricing.body")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#eceae4] bg-[#0b7f46]">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-8">
          <h2 className="text-3xl font-bold text-white">{t("home.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-white/85">
            {t("home.cta.body")}
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-[#0b7f46] shadow-sm transition hover:bg-[#f0faf5]"
          >
            {t("home.buildMyPlan")}
          </Link>
        </div>
      </section>

      <Footer />
      <TransferAIWidget />
    </div>
  );
}
