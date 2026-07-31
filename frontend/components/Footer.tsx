"use client";

import { useTranslation } from "../lib/i18n";
import { useHasPlan } from "../lib/useHasPlan";

export default function Footer() {
  const { t } = useTranslation();
  const { hasPlan } = useHasPlan();

  return (
    <footer className="border-t border-[#e5e0d5] bg-white dark:border-gray-800 dark:bg-[#14151a]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <img src="/coursebridge-logo.png" alt="CourseBridge" className="h-7 w-auto" />
            <p className="mt-3 text-sm leading-6 text-[#7b818b] dark:text-gray-400">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#a3a9b3] dark:text-gray-500">{t("footer.product")}</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4d535c] dark:text-gray-400">
              <li><a href="/#students" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">{t("nav.forStudents")}</a></li>
              <li><a href="/#counselors" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">{t("nav.whatYouGet")}</a></li>
              <li><a href="/#pricing" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">{t("nav.pricing")}</a></li>
              <li><a href={hasPlan ? "/dashboard" : "/onboarding"} className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">{hasPlan ? t("nav.myPlan") : t("footer.buildMyPlan")}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#e5e0d5] pt-6 text-xs leading-6 text-[#a3a9b3] dark:border-gray-800 dark:text-gray-500">
          {t("footer.disclaimer")}
        </div>
      </div>
    </footer>
  );
}
