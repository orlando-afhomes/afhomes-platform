"use client";

import { StatusButton, StatusPage } from "@/shared/components/status/status-page";

// Replaces the root layout when it fails, so it supplies its own html and body.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <StatusPage variant="500">
          <StatusButton primary onClick={reset}>
            Try again
          </StatusButton>
        </StatusPage>
      </body>
    </html>
  );
}
