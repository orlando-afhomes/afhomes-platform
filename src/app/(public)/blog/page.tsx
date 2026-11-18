import type { Metadata } from "next";
import { BlogPage } from "@/panels/public/pages/blog-pages";

export const metadata: Metadata = { title: "Blog | AFhomes", description: "News, events and resort highlights from AFhomes." };

export default function Page() {
  return <BlogPage />;
}
