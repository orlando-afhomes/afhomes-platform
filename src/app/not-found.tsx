import { StatusLink, StatusPage } from "@/shared/components/status/status-page";

export default function NotFound() {
  return (
    <StatusPage variant="404">
      <StatusLink href="/" primary>
        Return home
      </StatusLink>
      <StatusLink href="/admin">Administration</StatusLink>
    </StatusPage>
  );
}
