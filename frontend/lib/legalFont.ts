import { Source_Serif_4 } from "next/font/google";

/**
 * Serif used only on /privacy and /terms.
 *
 * The marketing site is deliberately sans-serif. Legal documents read in a
 * different register, and a text serif is the convention readers expect there.
 * Source Serif 4 is drawn for long-form reading at small sizes, which is what
 * these pages are, and it is loaded per route so the rest of the site never
 * pays for it.
 */
export const legalSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-legal",
});
