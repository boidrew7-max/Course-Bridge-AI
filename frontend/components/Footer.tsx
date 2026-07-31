export default function Footer() {
  return (
    <footer className="border-t border-[#e5e0d5] bg-white dark:border-gray-800 dark:bg-[#14151a]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <img src="/coursebridge-logo.png" alt="CourseBridge" className="h-7 w-auto" />
            <p className="mt-3 text-sm leading-6 text-[#7b818b] dark:text-gray-400">
              Transfer planning for California community college students,
              built on real ASSIST articulation data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#a3a9b3] dark:text-gray-500">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4d535c] dark:text-gray-400">
                <li><a href="/#students" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">For Students</a></li>
                <li><a href="/#counselors" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">What You Get</a></li>
                <li><a href="/#pricing" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#a3a9b3] dark:text-gray-500">Account</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4d535c] dark:text-gray-400">
                <li><a href="/login" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">Log in</a></li>
                <li><a href="/onboarding" className="hover:text-[#0b7f46] dark:hover:text-[#3ba76a]">Build my plan</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#e5e0d5] pt-6 text-xs leading-6 text-[#a3a9b3] dark:border-gray-800 dark:text-gray-500">
          Demo data only. CourseBridge is independent and not affiliated with ASSIST, UC, CSU, or CCSF.
          Always verify requirements through ASSIST.org, official college catalogs, and a counselor.
        </div>
      </div>
    </footer>
  );
}
