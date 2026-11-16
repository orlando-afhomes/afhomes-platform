import type { Metadata } from "next";
import { BlogPage } from "@/panels/public/pages/blog-pages";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export const metadata: Metadata = { title: "Blog | AFhomes", description: "News, events and resort highlights from AFhomes." };

export default function Page() {
  return (
    <PublicLayout>
      <BlogPage />
    </PublicLayout>
  );
}
