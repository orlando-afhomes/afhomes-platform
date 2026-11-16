import type { Metadata } from "next";
import { RestaurantPage } from "@/panels/public/pages/experience-pages";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export const metadata: Metadata = { title: "ALM Japanese Restaurant | AFhomes", description: "A 600 sqm Japanese dining landmark in Alaminos with teppanyaki, a private lounge and signature refreshments." };

export default function Page() {
  return (
    <PublicLayout>
      <RestaurantPage />
    </PublicLayout>
  );
}
