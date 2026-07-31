import en from "./en";
import es from "./es";
import zh from "./zh";
import type { Dictionary } from "./en";

// Adding a language: create locales/<code>.ts exporting a Dictionary
// (see es.ts for the pattern), then register it here.
export const LOCALES: Record<string, Dictionary> = { en, es, zh };

export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
];

export const DEFAULT_LANGUAGE = "en";
export type { Dictionary };
