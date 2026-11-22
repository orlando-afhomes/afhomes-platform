import { ExperiencesPage } from "@/panels/admin/pages/experiences-page";

// The staff identity is resolved by the client-side prototype auth gate.
export const instant = false;

export default function Page() {
  return <ExperiencesPage />;
}
