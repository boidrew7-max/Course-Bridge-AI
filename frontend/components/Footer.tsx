"use client";

import { useTranslation } from "../lib/i18n";

export default function Footer() {
  const { t } = useTranslation();

  const columns = [
    {
      heading: t("footer.product"),
      links: [
        { href: "/#students", label: t("nav.forStudents") },
        { href: "/#counselors", label: t("nav.whatYouGet") },
        { href: "/#pricing", label: t("nav.pricing") },
        { href: "/#faq", label: t("nav.faq") },
      ],
    },
    {
      heading: t("footer.account"),
      links: [
        { href: "/login", label: t("footer.login") },
        { href: "/onboarding", label: t("footer.buildMyPlan") },
      ],
    },
    {
      heading: t("footer.legal"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
      ],
    },
  ];

  return (
    <footer
      style={{
        background: "var(--cb-surface)",
        borderTop: "1px solid var(--cb-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="cb-container" style={{ paddingBlock: "var(--cb-space-5)" }}>
        <div className="flex flex-col gap-[var(--cb-space-4)] md:flex-row md:justify-between">
          <div style={{ maxWidth: "22rem" }}>
            <img src="/coursebridge-logo.png" alt="CourseBridge" width={160} height={32} className="cb-logo h-8 w-auto" />
            <p style={{ margin: "var(--cb-space-2) 0 0", fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-muted)" }}>
              {t("footer.tagline")}
            </p>
          </div>

          <div className="flex flex-col gap-[var(--cb-space-4)] sm:flex-row sm:gap-[var(--cb-space-6)]">
            {columns.map((column) => (
              <div key={column.heading}>
                <h2
                  style={{
                    fontSize: "var(--cb-fs-body-sm)",
                    fontWeight: 600,
                    color: "var(--cb-text)",
                    letterSpacing: "normal",
                  }}
                >
                  {column.heading}
                </h2>
                <ul style={{ listStyle: "none", margin: "var(--cb-space-1) 0 0", padding: 0 }}>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="cb-link flex items-center"
                        style={{ minHeight: 44, fontSize: "var(--cb-fs-body-sm)" }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p
          style={{
            margin: "var(--cb-space-4) 0 0",
            paddingTop: "var(--cb-space-3)",
            borderTop: "1px solid var(--cb-border)",
            fontSize: "var(--cb-fs-body-sm)",
            color: "var(--cb-muted)",
          }}
        >
          {t("footer.disclaimer")}
        </p>
        <p style={{ margin: "var(--cb-space-1) 0 0", fontSize: "var(--cb-fs-body-sm)", color: "var(--cb-muted)" }}>
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
