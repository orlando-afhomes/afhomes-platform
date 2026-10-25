import { PublicHomePage } from "@/panels/public/pages/public-home-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";

export default function Home() {
  return (
    <PublicLayout>
      <PublicHomePage />
    </PublicLayout>
  );
}