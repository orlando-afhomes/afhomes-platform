import type { Metadata } from "next";
import { AboutPage } from "@/panels/public/pages/about-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export const metadata: Metadata = { title: "About Us | AFhomes", description: "AFhomes is a hospitality and wellness group: the first largest homestyle hotspring, a Japanese restaurant and a smart wellness hotel." };

export default function Page() {
  return (
    <PublicLayout>
      <AboutPage />
    </PublicLayout>
  );
}
