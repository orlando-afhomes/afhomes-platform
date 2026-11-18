import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

export default function PublicSectionLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
