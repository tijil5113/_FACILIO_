import { useEffect } from "react";

import { applyDocumentPreferences } from "@/lib/preferences";
import { usePreferencesStore } from "@/stores/preferences-store";

export function PreferencesSync() {
  const theme = usePreferencesStore((state) => state.theme);
  const motion = usePreferencesStore((state) => state.motion);
  const sidebarCollapsed = usePreferencesStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    applyDocumentPreferences({ theme, motion, sidebarCollapsed });
  }, [theme, motion, sidebarCollapsed]);

  useEffect(() => {
    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      const current = usePreferencesStore.getState();
      applyDocumentPreferences({
        theme: current.theme,
        motion: current.motion,
        sidebarCollapsed: current.sidebarCollapsed,
      });
    };

    themeQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      themeQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  return null;
}
