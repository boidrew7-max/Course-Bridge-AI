import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";
import privacy from "../../lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What CourseBridge collects, what it does not, who else sees it, and how to have your data deleted.",
};

export default function PrivacyPage() {
  return <LegalPage doc={privacy} />;
}
