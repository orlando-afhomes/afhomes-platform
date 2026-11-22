import type { Metadata } from "next";
import { StandardExperiencePage } from "@/panels/public/pages/standard-experience-page";

export const metadata: Metadata = { title: "Smart Wellness Hotel | AFhomes", description: "An upscale sanctuary bridging luxury lodging and wellness science. Grand opening November 2026." };

export default function Page() {
  return <StandardExperiencePage slug="smart-wellness-hotel" variant="hotel" />;
}
