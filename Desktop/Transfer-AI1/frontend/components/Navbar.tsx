"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setEmail(user.email ?? null);
        }
      } catch {}
    })();
  }, []);

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    try { localStorage.removeItem("cb_profile"); } catch {}
    setEmail(null);
    // Full reload (not router.push) so app/page.tsx re-runs its auth/local
    // check from a clean slate — otherwise the already-mounted dashboard
    // component keeps showing the plan that was in memory before logout.
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e0d5] bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/coursebridge-logo.png"
            alt="CourseBridge"
            className="h-9 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#students" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            For Students
          </Link>
          <Link href="/#counselors" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            For Counselors
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
            Pricing
          </Link>
          {email ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]"
              title={email}
            >
              Log out
            </button>
          ) : (
            <Link href="/login" className="text-sm font-medium text-[#4d535c] transition hover:text-[#0b7f46]">
              Login
            </Link>
          )}
        </div>

        <Link
          href="/onboarding"
          className="shrink-0 rounded-xl bg-[#0b7f46] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08683a] hover:shadow-md"
        >
          Build My Plan
        </Link>
      </nav>
    </header>
  );
}
