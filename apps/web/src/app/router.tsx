import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router";

import { RouteCrash } from "@/app/RouteCrash";
import { AppShell } from "@/components/layout/AppShell";
import { PublicShell } from "@/components/layout/PublicShell";
import { RootLayout } from "@/components/layout/RootLayout";
import { RouteFallback } from "@/components/ui/RouteFallback";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const OverviewPage = lazy(async () => {
  const module = await import("@/features/overview/OverviewPage");
  return { default: module.OverviewPage };
});
const DatasetsPage = lazy(async () => {
  const module = await import("@/pages/DatasetsPage");
  return { default: module.DatasetsPage };
});
const DatasetWorkspacePage = lazy(async () => {
  const module = await import("@/pages/DatasetWorkspacePage");
  return { default: module.DatasetWorkspacePage };
});
const WorkflowsPage = lazy(async () => {
  const module = await import("@/pages/WorkflowsPage");
  return { default: module.WorkflowsPage };
});
const WorkflowBuilderPage = lazy(async () => {
  const module = await import("@/pages/WorkflowBuilderPage");
  return { default: module.WorkflowBuilderPage };
});
const RunsPage = lazy(async () => {
  const module = await import("@/pages/RunsPage");
  return { default: module.RunsPage };
});
const RunDetailPage = lazy(async () => {
  const module = await import("@/pages/RunDetailPage");
  return { default: module.RunDetailPage };
});
const JobsPage = lazy(async () => {
  const module = await import("@/pages/JobsPage");
  return { default: module.JobsPage };
});
const JobDetailPage = lazy(async () => {
  const module = await import("@/pages/JobDetailPage");
  return { default: module.JobDetailPage };
});
const QualityPage = lazy(async () => {
  const module = await import("@/pages/QualityPage");
  return { default: module.QualityPage };
});
const ExportsPage = lazy(async () => {
  const module = await import("@/pages/ExportsPage");
  return { default: module.ExportsPage };
});
const SettingsPage = lazy(async () => {
  const module = await import("@/pages/SettingsPage");
  return { default: module.SettingsPage };
});
const LearnPage = lazy(async () => {
  const module = await import("@/pages/LearnPage");
  return { default: module.LearnPage };
});
const LoginPage = lazy(async () => {
  const module = await import("@/pages/LoginPage");
  return { default: module.LoginPage };
});
const SignupPage = lazy(async () => {
  const module = await import("@/pages/SignupPage");
  return { default: module.SignupPage };
});

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteCrash />,
    children: [
      {
        element: <PublicShell />,
        children: [{ index: true, element: <PublicHomePage /> }],
      },
      { path: "login", element: withSuspense(<LoginPage />) },
      { path: "signup", element: withSuspense(<SignupPage />) },
      { path: "app", element: <Navigate to="/overview" replace /> },
      {
        element: <AppShell />,
        errorElement: <RouteCrash />,
        children: [
          { path: "overview", element: withSuspense(<OverviewPage />) },
          { path: "datasets", element: withSuspense(<DatasetsPage />) },
          {
            path: "datasets/:datasetId",
            element: withSuspense(<DatasetWorkspacePage />),
          },
          { path: "workflows", element: withSuspense(<WorkflowsPage />) },
          {
            path: "workflows/:workflowId",
            element: withSuspense(<WorkflowBuilderPage />),
          },
          { path: "runs", element: withSuspense(<RunsPage />) },
          { path: "runs/:runId", element: withSuspense(<RunDetailPage />) },
          { path: "jobs", element: withSuspense(<JobsPage />) },
          { path: "jobs/:jobId", element: withSuspense(<JobDetailPage />) },
          { path: "learn", element: withSuspense(<LearnPage />) },
          { path: "quality", element: withSuspense(<QualityPage />) },
          { path: "exports", element: withSuspense(<ExportsPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
