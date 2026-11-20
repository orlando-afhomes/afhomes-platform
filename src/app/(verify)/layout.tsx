import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

/** Verification sits on a light background, so its own group layout opts the header into the solid style. */
export default function VerifySectionLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout headerVariant="solid">{children}</PublicLayout>;
}
