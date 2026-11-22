import type { Metadata } from "next";
import { StandardExperiencePage } from "@/panels/public/pages/standard-experience-page";

export const metadata: Metadata = { title: "Hotspring & Ecofarm Resort | AFhomes", description: "The first largest homestyle hotspring resort in Laguna: a 60-hectare master-planned destination built phase by phase." };

export default function Page() {
  return <StandardExperiencePage slug="hotspring-ecofarm-resort" variant="resort" />;
}
