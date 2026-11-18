import type { Metadata } from "next";
import { VipPage } from "@/panels/public/pages/vip-page";

export const metadata: Metadata = { title: "VIP Privilege Card | AFhomes", description: "Compare the Gold, Silver and Bronze VIP Privilege Cards: fixed discounts, priority reservations and annual stay points." };

export default function Page() {
  return <VipPage />;
}
