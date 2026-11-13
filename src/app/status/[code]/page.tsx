import { notFound } from "next/navigation";
import { StatusLink, StatusPage, type StatusVariant } from "@/shared/components/status/status-page";

const CODES = ["400", "401", "403"] as const;

export function generateStaticParams() {
  return CODES.map((code) => ({ code }));
}

/** Direct page for 400, 401 and 403, for links and redirects. Any other code is a 404. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(CODES as readonly string[]).includes(code)) notFound();
  return (
    <StatusPage variant={code as StatusVariant}>
      {code === "401" ? (
        <StatusLink href="/login" primary>
          Sign in
        </StatusLink>
      ) : (
        <StatusLink href="/" primary>
          Return home
        </StatusLink>
      )}
    </StatusPage>
  );
}
