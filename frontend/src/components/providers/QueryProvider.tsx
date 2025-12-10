import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createQueryClient } from "@/lib/config/query";

/**
 * QueryProvider wraps the application with React Query's QueryClientProvider.
 * Creates a new QueryClient instance per component tree to ensure SSR compatibility.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance for each component tree
  // This ensures SSR compatibility and prevents shared state issues
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
