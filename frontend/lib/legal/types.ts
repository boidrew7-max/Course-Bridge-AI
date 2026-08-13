/**
 * Shape of a legal document (privacy policy, terms of service).
 *
 * Legal prose does not belong in the flat key-value locale files: it would mean
 * hundreds of keys and the paragraphs would lose their order. Each document is
 * instead written once per language and rendered by components/LegalPage.tsx.
 */
export type LegalSection = {
  heading: string;
  /** Each string is one paragraph. Bullet lists start the line with "- ". */
  body: string[];
};

export type LegalDoc = {
  title: string;
  /** Human-readable "last updated" line, already translated. */
  updated: string;
  /** One or two sentences under the title, before the first section. */
  intro: string;
  sections: LegalSection[];
};

/** Every language the site supports, keyed by the codes used in lib/locales. */
export type LegalDocSet = Record<"en" | "es" | "zh", LegalDoc>;
