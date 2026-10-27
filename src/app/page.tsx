import { PublicHomePage } from "@/panels/public/pages/public-home-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

export default function Home() {
  return (
    <PublicLayout>
      <PublicHomePage />
    </PublicLayout>
  );
}