import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "https://coursebridge.us";

// Next.js recognizes this file specially and serves it at /sitemap.xml
// automatically — no route handler needed. Only public, unauthenticated
// pages belong here; dashboard/auth pages require login and shouldn't be
// offered to Google as if anyone could land on them directly.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/onboarding`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
