import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

/**
 * Renders a component with the providers the app assumes are present.
 *
 * Every screen sits under React Query, so a component test without it fails on a provider error
 * rather than on the behaviour under test. Retries are off so a rejected request surfaces
 * immediately instead of stalling the test.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...rtlRender(ui, { wrapper: Providers, ...options }) };
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
