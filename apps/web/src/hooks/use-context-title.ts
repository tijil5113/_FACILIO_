import { useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

export function useContextTitle(title: string | null): void {
  const setContextTitle = useUiStore((state) => state.setContextTitle);

  useEffect(() => {
    setContextTitle(title);
    return () => {
      setContextTitle(null);
    };
  }, [setContextTitle, title]);
}
