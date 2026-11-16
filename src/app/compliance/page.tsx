import type { Metadata } from "next";
import { CompliancePage } from "@/panels/public/pages/compliance-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export const metadata: Metadata = { title: "Compliance | AFhomes", description: "Step-by-step regulatory milestones of the AFhomes Hotspring & Ecofarm Resort." };

export default function Page() {
  return (
    <PublicLayout>
      <CompliancePage />
    </PublicLayout>
  );
}
