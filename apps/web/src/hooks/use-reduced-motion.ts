import { useEffect, useState } from "react";

import { usePreferencesStore } from "@/stores/preferences-store";

export function useReducedMotion(): boolean {
  const motion = usePreferencesStore((state) => state.motion);
  const [osReduced, setOsReduced] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setOsReduced(query.matches);
    };
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  if (motion === "reduced") {
    return true;
  }
  if (motion === "full") {
    return false;
  }
  return osReduced;
}
