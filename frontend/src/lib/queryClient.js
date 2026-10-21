/**
 * React Query client factory with SelfVibe defaults.
 */
import { QueryClient } from "@tanstack/react-query";

/**
 * Create a QueryClient. Called once per browser session from Providers.
 * @returns {QueryClient}
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // data stays fresh for 1 minute
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        // Do not retry client errors (4xx) — they will fail the same way again
        retry: (failureCount, error) => {
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
