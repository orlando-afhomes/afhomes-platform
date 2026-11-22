import type { Metadata } from "next";
import { ExperienceDetailPage } from "@/panels/public/pages/experience-detail-page";
import "@/panels/public/experience/exp-hero.css";
import "@/panels/public/experience/exp-overview.css";

export const metadata: Metadata = {
  title: "Experiences | AFhomes",
  description: "Destinations and experiences from AFhomes.",
};

// New experience addresses are content-driven, so this route resolves at request time.
export const instant = false;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ExperienceDetailPage slug={slug} />;
}
