import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

/**
 * The private correction link carries a runtime token, so the header cannot know the current page at build
 * time. This group keeps the header's active-page hook out of the route and leaves every other page unchanged.
 */
export default function CorrectionLinkLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout trackActive={false}>{children}</PublicLayout>;
}
