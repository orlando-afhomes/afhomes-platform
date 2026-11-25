"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { refreshAccessAfterMutation } from "@/data/protected-cache";
import { NotConnectedError } from "@/data/http/client";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      mutationCache: new MutationCache({
        // Only successful access-affecting commands invalidate authority. Atomic validation failures retain drafts.
        onSuccess: (_data, _variables, _context, mutation) => {
          if (mutation.meta?.affectsAccess) return refreshAccessAfterMutation(client);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          // A screen outside the pilot fails the same way every time; show its error state without retrying.
          retry: (failureCount, error) => !(error instanceof NotConnectedError) && failureCount < 3,
        },
      },
    });
    return client;
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
