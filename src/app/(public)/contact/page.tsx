import type { Metadata } from "next";
import { ContactPage } from "@/panels/public/pages/faq-contact-pages";
import "@/panels/public/contact/contact-page.css";
import "@/panels/public/contact/contact-maps.css";

export const metadata: Metadata = { title: "Contact | AFhomes", description: "Phone, email, offices and a contact form for AFhomes." };

export default function Page() {
  return <ContactPage />;
}
