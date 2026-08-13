"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TransferAIWidget from "./TransferAIWidget";
import { useTranslation } from "../lib/i18n";
import type { Dictionary } from "../lib/locales";
import { useReveal } from "../lib/useReveal";

export default function HomePage() {
  const { t } = useTranslation();
  useReveal();

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

  const GAIN_POINTS = [
    t("home.gainPoints.0"),
    t("home.gainPoints.1"),
    t("home.gainPoints.2"),
    t("home.gainPoints.3"),
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

  const FAQS = [
    { q: t("home.faq.q1"), a: t("home.faq.a1") },
    { q: t("home.faq.q2"), a: t("home.faq.a2") },
    { q: t("home.faq.q3"), a: t("home.faq.a3") },
    { q: t("home.faq.q4"), a: t("home.faq.a4") },
    { q: t("home.faq.q5"), a: t("home.faq.a5") },
  ];

  return (
    <div style={{ background: "var(--cb-surface)" }}>
      <Navbar />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="cb-section cb-section-alt">
        <div className="cb-container">
          <div className="grid items-center gap-[var(--cb-space-5)] lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="cb-h1" style={{ maxWidth: "18ch" }}>
                {t("home.heroTitle")}
              </h1>

              <p className="cb-lead" style={{ marginTop: "var(--cb-space-3)" }}>
                {t("home.heroBody")}
              </p>

              <div style={{ marginTop: "var(--cb-space-4)" }}>
                <Link href="/onboarding" className="cb-btn cb-btn-primary w-full sm:w-auto">
                  {t("home.buildMyPlan")}
                </Link>
              </div>

              {/* Trust element: counts from the articulation data the plans are built on. */}
              <dl
                className="grid grid-cols-2 sm:grid-cols-4"
                style={{
                  gap: "var(--cb-space-3)",
                  marginTop: "var(--cb-space-5)",
                  paddingTop: "var(--cb-space-4)",
                  borderTop: "1px solid var(--cb-border)",
                }}
              >
                {STATS.map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd style={{ margin: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--cb-font-heading)",
                          fontSize: "var(--cb-fs-stat)",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          color: "var(--cb-link)",
                        }}
                      >
                        {s.n}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: "0.25rem",
                          fontSize: "var(--cb-fs-body-sm)",
                          color: "var(--cb-muted)",
                        }}
                      >
                        {s.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <PlanPreview t={t} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Problem vs solution */}
      <section id="students" className="cb-section">
        <div className="cb-container">
          <h2 className="cb-h2 cb-reveal">{t("home.why.title")}</h2>
          <p className="cb-lead cb-reveal">{t("home.why.body")}</p>

          <div className="mt-[var(--cb-space-5)] grid gap-[var(--cb-space-3)] md:grid-cols-2">
            <ComparisonCard title={t("home.without.title")} points={PAIN_POINTS} />
            <ComparisonCard title={t("home.with.title")} points={GAIN_POINTS} accent />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- How it works */}
      <section className="cb-section cb-section-alt">
        <div className="cb-container">
          <h2 className="cb-h2 cb-reveal">{t("home.how.title")}</h2>
          <p className="cb-lead cb-reveal">{t("home.how.body")}</p>

          <ol
            className="mt-[var(--cb-space-5)] flex flex-col gap-[var(--cb-space-5)]"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={step.number}
                className={`cb-reveal grid items-center gap-[var(--cb-space-3)] md:grid-cols-2 md:gap-[var(--cb-space-6)] ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div
                    aria-hidden="true"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: "var(--cb-radius-pill)",
                      background: "var(--cb-accent)",
                      color: "var(--cb-on-accent)",
                      fontFamily: "var(--cb-font-heading)",
                      fontWeight: 700,
                      marginBottom: "var(--cb-space-2)",
                    }}
                  >
                    {step.number}
                  </div>
                  <h3 className="cb-h3">{step.title}</h3>
                  <p style={{ margin: "var(--cb-space-1) 0 0", maxWidth: "var(--cb-measure)", color: "var(--cb-muted)" }}>
                    {step.body}
                  </p>
                </div>
                <StepFigure index={i} t={t} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- What you get */}
      <section id="counselors" className="cb-section">
        <div className="cb-container">
          <h2 className="cb-h2 cb-reveal">{t("home.get.title")}</h2>
          <p className="cb-lead cb-reveal">{t("home.get.body")}</p>

          <ul
            className="mt-[var(--cb-space-5)] grid gap-[var(--cb-space-2)] sm:grid-cols-2 lg:grid-cols-3"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {WHAT_YOU_GET.map((f) => (
              <li key={f.title} className="cb-card cb-reveal flex h-full flex-col">
                <h3 className="cb-h3">{f.title}</h3>
                <p style={{ margin: "var(--cb-space-1) 0 0", color: "var(--cb-muted)" }}>{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ Pricing */}
      <section id="pricing" className="cb-section cb-section-alt">
        <div className="cb-container">
          <h2 className="cb-h2 cb-reveal">{t("home.pricing.title")}</h2>
          <p className="cb-lead cb-reveal">{t("home.pricing.body")}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- FAQ */}
      <section id="faq" className="cb-section">
        <div className="cb-container">
          <h2 className="cb-h2 cb-reveal">{t("home.faq.title")}</h2>
          <p className="cb-lead cb-reveal">{t("home.faq.body")}</p>

          <div className="mt-[var(--cb-space-4)]" style={{ maxWidth: "48rem" }}>
            {FAQS.map((item, i) => (
              <FaqRow key={item.q} question={item.q} answer={item.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Final CTA */}
      <section className="cb-section cb-band-accent">
        <div className="cb-container" style={{ textAlign: "center" }}>
          <h2 className="cb-h2" style={{ marginInline: "auto", maxWidth: "20ch" }}>
            {t("home.cta.title")}
          </h2>
          <Link
            href="/onboarding"
            className="cb-btn cb-btn-invert w-full sm:w-auto"
            style={{ marginTop: "var(--cb-space-4)" }}
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

/* ------------------------------------------------------------------ pieces */

type Translate = (key: keyof Dictionary, params?: Record<string, string | number>) => string;

function ComparisonCard({
  title,
  points,
  accent = false,
}: {
  title: string;
  points: string[];
  accent?: boolean;
}) {
  return (
    <div
      className="cb-card cb-reveal"
      style={
        accent
          ? {
              borderColor: "var(--cb-accent)",
              background: "color-mix(in srgb, var(--cb-accent) 6%, var(--cb-card))",
            }
          : undefined
      }
    >
      <h3 className="cb-h3">{title}</h3>
      <ul
        className="flex flex-col"
        style={{ gap: "var(--cb-space-1)", listStyle: "none", margin: "var(--cb-space-2) 0 0", padding: 0 }}
      >
        {points.map((point) => (
          <li key={point} className="flex gap-[var(--cb-space-1)]" style={{ color: "var(--cb-muted)" }}>
            <span aria-hidden="true" style={{ color: "var(--cb-link)", flexShrink: 0 }}>
              {accent ? "✓" : "•"}
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Illustrative figure beside each step, built from the same tokens as the page. */
function StepFigure({ index, t }: { index: number; t: Translate }) {
  const rows = [
    [t("home.preview.calc1"), t("home.preview.introProgramming")],
    ["UC Berkeley", "Computer Science"],
    [t("home.preview.dataStructures"), t("home.preview.linearAlgebra")],
  ][index];

  return (
    <div className="cb-card" aria-hidden="true" style={{ background: "var(--cb-surface-alt)" }}>
      <div className="flex flex-col" style={{ gap: "var(--cb-space-1)" }}>
        {rows.map((row) => (
          <div
            key={row}
            style={{
              background: "var(--cb-card)",
              border: "1px solid var(--cb-border)",
              borderRadius: "var(--cb-radius-btn)",
              padding: "0.75rem 1rem",
              fontSize: "var(--cb-fs-body-sm)",
              color: "var(--cb-body)",
            }}
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanPreview({ t }: { t: Translate }) {
  const cell = {
    background: "var(--cb-card)",
    border: "1px solid var(--cb-border)",
    borderRadius: "var(--cb-radius-btn)",
    padding: "var(--cb-space-2)",
  } as const;

  return (
    <div
      className="cb-card"
      role="img"
      aria-label={t("home.preview.label")}
      style={{ background: "var(--cb-surface-alt)", padding: "var(--cb-space-3)", boxShadow: "var(--cb-shadow)" }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--cb-font-heading)",
          fontSize: "var(--cb-fs-h3)",
          fontWeight: 700,
          color: "var(--cb-text)",
        }}
      >
        UC Berkeley, Computer Science
      </p>

      <div className="grid gap-[var(--cb-space-2)] sm:grid-cols-2" style={{ marginTop: "var(--cb-space-3)" }}>
        <div style={cell}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-text)" }}>
            {t("home.preview.completed")}
          </p>
          <p style={{ margin: "var(--cb-space-1) 0 0", fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-muted)" }}>
            {t("home.preview.calc1")}
            <br />
            {t("home.preview.introProgramming")}
          </p>
        </div>
        <div style={cell}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-text)" }}>
            {t("home.preview.missing")}
          </p>
          <p style={{ margin: "var(--cb-space-1) 0 0", fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-muted)" }}>
            {t("home.preview.dataStructures")}
            <br />
            {t("home.preview.linearAlgebra")}
          </p>
        </div>
      </div>

      <div style={{ ...cell, marginTop: "var(--cb-space-2)" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-text)" }}>
          {t("home.preview.recommendedNextTerm")}
        </p>
        <div className="flex flex-wrap" style={{ gap: "var(--cb-space-1)", marginTop: "var(--cb-space-1)" }}>
          {[t("home.preview.dataStructures"), t("home.preview.linearAlgebra")].map((course) => (
            <span
              key={course}
              style={{
                borderRadius: "var(--cb-radius-btn)",
                background: "var(--cb-accent)",
                color: "var(--cb-on-accent)",
                padding: "0.375rem 0.75rem",
                fontSize: "var(--cb-fs-body-sm)",
                fontWeight: 600,
              }}
            >
              {course}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqRow({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div style={{ borderTop: "1px solid var(--cb-border)" }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-[var(--cb-space-2)] text-left"
          style={{
            minHeight: 64,
            padding: "var(--cb-space-2) 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            font: "inherit",
            fontFamily: "var(--cb-font-heading)",
            fontSize: "var(--cb-fs-h3)",
            fontWeight: 600,
            color: "var(--cb-text)",
          }}
        >
          {question}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              color: "var(--cb-muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform var(--cb-motion) var(--cb-ease)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h3>
      {open && (
        <p
          id={panelId}
          style={{
            margin: "0 0 var(--cb-space-3)",
            maxWidth: "var(--cb-measure)",
            color: "var(--cb-muted)",
          }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}
