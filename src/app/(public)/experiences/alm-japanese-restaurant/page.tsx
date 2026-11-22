import type { Metadata } from "next";
import { StandardExperiencePage } from "@/panels/public/pages/standard-experience-page";

export const metadata: Metadata = { title: "ALM Japanese Restaurant | AFhomes", description: "A 600 sqm Japanese dining landmark in Alaminos with teppanyaki, a private lounge and signature refreshments." };

export default function Page() {
  return <StandardExperiencePage slug="alm-japanese-restaurant" variant="restaurant" />;
}
