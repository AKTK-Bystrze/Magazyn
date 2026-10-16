import * as React from "react";
import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a QueryClient configured for test isolation with retries disabled.
 *
 * @returns Fresh QueryClient instance for unit testing.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a React component wrapped in QueryClientProvider for tests.
 *
 * @param ui - React element to render.
 * @param client - Optional QueryClient instance; defaults to a new isolated client.
 * @returns RenderResult from React Testing Library.
 */
export function renderWithQueryClient(
  ui: React.ReactElement,
  client: QueryClient = createTestQueryClient()
): RenderResult {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
