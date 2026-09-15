import { createBrowserRouter, RouterProvider } from "react-router";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/providers";
import { appRoutes } from "@/app/router";

const router = createBrowserRouter(appRoutes);

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}
