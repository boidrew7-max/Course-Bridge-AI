"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import { useTranslation } from "../lib/i18n";
import type { LegalDocSet } from "../lib/legal/types";

/**
 * Renders a legal document in whichever language the reader has selected,
 * falling back to English. Uses the site's existing design tokens so these
 * pages need no styling of their own.
 */
export default function LegalPage({ doc, fontClass = "" }: { doc: LegalDocSet; fontClass?: string }) {
  const { language } = useTranslation();
  const content = doc[language as keyof LegalDocSet] ?? doc.en;

  return (
    <div style={{ background: "var(--cb-surface)", minHeight: "100vh" }}>
      <Navbar />

      <main className={`cb-section cb-legal ${fontClass}`}>
        <div className="cb-container" style={{ maxWidth: "48rem" }}>
          <h1 className="cb-h2">{content.title}</h1>
          <p
            style={{
              margin: "var(--cb-space-1) 0 0",
              fontSize: "var(--cb-fs-body-sm)",
              color: "var(--cb-muted)",
            }}
          >
            {content.updated}
          </p>
          <p className="cb-lead" style={{ marginTop: "var(--cb-space-3)" }}>
            {content.intro}
          </p>

          {content.sections.map((section) => (
            <section key={section.heading} style={{ marginTop: "var(--cb-space-5)" }}>
              <h2 className="cb-h3">{section.heading}</h2>
              {renderBody(section.body)}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/**
 * Paragraphs render as <p>. Runs of consecutive "- " lines collapse into a
 * single <ul>, so a document can mix prose and lists without extra markup.
 */
function renderBody(body: string[]) {
  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = [];

  for (const line of body) {
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  return blocks.map((block, i) =>
    block.type === "p" ? (
      <p
        key={i}
        style={{
          margin: "var(--cb-space-2) 0 0",
          maxWidth: "var(--cb-measure)",
          color: "var(--cb-muted)",
        }}
      >
        {block.text}
      </p>
    ) : (
      <ul
        key={i}
        // No flex here: it strips list-item display and the markers vanish.
        style={{
          margin: "var(--cb-space-2) 0 0",
          // Tailwind's preflight strips list-style from every ul, so set it back.
          listStyle: "disc",
          paddingLeft: "1.5rem",
          maxWidth: "var(--cb-measure)",
          color: "var(--cb-muted)",
        }}
      >
        {block.items.map((item) => (
          <li key={item} style={{ marginBottom: "var(--cb-space-1)" }}>
            {item}
          </li>
        ))}
      </ul>
    ),
  );
}
