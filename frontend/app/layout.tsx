import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../lib/theme";
import { LanguageProvider } from "../lib/i18n";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("cb_theme") || "system";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

const SITE_URL = "https://coursebridge.us";
const SITE_TITLE = "CourseBridge";
const SITE_DESCRIPTION =
  "Plan your UC transfer with a real, personalized semester-by-semester plan built on actual ASSIST articulation data.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/coursebridge-logo.png",
    shortcut: "/coursebridge-logo.png",
    apple: "/coursebridge-logo.png",
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}