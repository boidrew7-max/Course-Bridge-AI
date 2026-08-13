import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";
import terms from "../../lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms covering your use of CourseBridge, including what the plans are and are not.",
};

export default function TermsPage() {
  return <LegalPage doc={terms} />;
}
