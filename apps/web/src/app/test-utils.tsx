import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { appRoutes } from "@/app/router";
import { createQueryClient } from "@/lib/query-client";

export function renderApp(initialEntries: string[] = ["/overview"]) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
