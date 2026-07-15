import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://coursebridge-frontend.up.railway.app";
const SITE_TITLE = "CourseBridge";
const SITE_DESCRIPTION =
  "Plan your UC transfer with a real, personalized semester-by-semester plan built on actual ASSIST articulation data.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    images: [{ url: "/coursebridge-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/coursebridge-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}