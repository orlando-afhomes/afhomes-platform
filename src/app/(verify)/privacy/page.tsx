import type { Metadata } from "next";
import { PrivacyPage } from "@/panels/public/pages/privacy-page";

export const metadata: Metadata = { title: "Privacy Policy | AFhomes", description: "How AFhomes collects, uses, shares and keeps personal information under the Data Privacy Act of 2012." };

export default function Page() {
  return <PrivacyPage />;
}
