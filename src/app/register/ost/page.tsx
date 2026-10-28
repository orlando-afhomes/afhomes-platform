import { OstRegistrationPage } from "@/panels/public/pages/ost-registration-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/ost-registration.css";

export default function Page() {
  return (
    <PublicLayout>
      <OstRegistrationPage />
    </PublicLayout>
  );
}
