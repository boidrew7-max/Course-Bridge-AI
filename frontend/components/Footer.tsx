"use client";

import { useTranslation } from "../lib/i18n";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[#e5e0d5] bg-white">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <img src="/coursebridge-logo.png" alt="CourseBridge" className="h-7 w-auto" />
            <p className="mt-3 text-sm leading-6 text-[#7b818b]">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#a3a9b3]">{t("footer.product")}</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4d535c]">
                <li><a href="/#students" className="hover:text-[#0b7f46]">{t("nav.forStudents")}</a></li>
                <li><a href="/#counselors" className="hover:text-[#0b7f46]">{t("nav.whatYouGet")}</a></li>
                <li><a href="/#pricing" className="hover:text-[#0b7f46]">{t("nav.pricing")}</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#a3a9b3]">{t("footer.account")}</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4d535c]">
                <li><a href="/login" className="hover:text-[#0b7f46]">{t("footer.login")}</a></li>
                <li><a href="/onboarding" className="hover:text-[#0b7f46]">{t("footer.buildMyPlan")}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#e5e0d5] pt-6 text-xs leading-6 text-[#a3a9b3]">
          {t("footer.disclaimer")}
        </div>
      </div>
    </footer>
  );
}
