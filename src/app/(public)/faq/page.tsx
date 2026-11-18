import type { Metadata } from "next";
import { FaqPage } from "@/panels/public/pages/faq-contact-pages";

export const metadata: Metadata = { title: "FAQ | AFhomes", description: "Answers about AFhomes, the resort, accommodations, the VIP Privilege Loyalty Program and official payment channels." };

export default function Page() {
  return <FaqPage />;
}
