"use client";

import { StatusButton, StatusLink, StatusPage } from "@/shared/components/status/status-page";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage variant="500">
      <StatusButton primary onClick={reset}>
        Try again
      </StatusButton>
      <StatusLink href="/">Return home</StatusLink>
    </StatusPage>
  );
}
