import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/providers";
import { appRoutes } from "@/app/router";

export function App() {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}
