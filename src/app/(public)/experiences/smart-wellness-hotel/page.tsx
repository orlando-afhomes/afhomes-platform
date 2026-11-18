import type { Metadata } from "next";
import { HotelPage } from "@/panels/public/pages/experience-pages";

export const metadata: Metadata = { title: "Smart Wellness Hotel | AFhomes", description: "An upscale sanctuary bridging luxury lodging and wellness science. Grand opening November 2026." };

export default function Page() {
  return <HotelPage />;
}
