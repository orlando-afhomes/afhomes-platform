import type { Metadata } from "next";
import { PublicOffersPage } from "@/panels/public/pages/offers-page";
import "@/panels/public/offers.css";

export const metadata: Metadata = {
  title: "Promo Points Offers | AFhomes",
  description: "Earn Promo Points on eligible approved bills and use them at participating AFhomes outlets.",
};

export default function Page() {
  return <PublicOffersPage />;
}
