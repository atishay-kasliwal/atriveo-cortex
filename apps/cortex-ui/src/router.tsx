import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isRetryableApiError } from "./lib/api/cortex-fetch";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // A short staleTime lets a quick re-render reuse the in-flight result
        // instead of firing duplicate requests (which compounded the 500/503s).
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        // Only retry genuinely transient failures (500/503/connection), and back
        // off so a momentary DB/Worker hiccup gets time to recover instead of
        // hammering the same broken state.
        retry: (failureCount, error) =>
          failureCount < 3 && isRetryableApiError(error),
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
