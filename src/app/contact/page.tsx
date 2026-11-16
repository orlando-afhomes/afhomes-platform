import type { Metadata } from "next";
import { ContactPage } from "@/panels/public/pages/faq-contact-pages";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export const metadata: Metadata = { title: "Contact | AFhomes", description: "Phone, email, offices and a contact form for AFhomes." };

export default function Page() {
  return (
    <PublicLayout>
      <ContactPage />
    </PublicLayout>
  );
}
