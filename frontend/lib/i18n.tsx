"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LOCALES, DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type Dictionary } from "./locales";

type LanguageContextValue = {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: keyof Dictionary, params?: Record<string, string | number>) => string;
  options: typeof LANGUAGE_OPTIONS;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cb_language");
      if (stored && LOCALES[stored]) setLanguageState(stored);
    } catch {}
  }, []);

  function setLanguage(code: string) {
    if (!LOCALES[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem("cb_language", code);
    } catch {}
  }

  function t(key: keyof Dictionary, params?: Record<string, string | number>): string {
    const dict = LOCALES[language] ?? LOCALES[DEFAULT_LANGUAGE];
    let value = dict[key] ?? LOCALES[DEFAULT_LANGUAGE][key] ?? String(key);
    if (params) {
      for (const [name, val] of Object.entries(params)) {
        value = value.replaceAll(`{${name}}`, String(val));
      }
    }
    return value;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, options: LANGUAGE_OPTIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}
