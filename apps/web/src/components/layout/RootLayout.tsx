import { Outlet } from "react-router";

import { PreferencesSync } from "@/features/preferences/PreferencesSync";

export function RootLayout() {
  return (
    <>
      <PreferencesSync />
      <Outlet />
    </>
  );
}
