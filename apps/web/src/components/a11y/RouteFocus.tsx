import { useEffect } from "react";
import { useLocation } from "react-router";

export function RouteFocus() {
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!(main instanceof HTMLElement)) {
      return;
    }
    if (!main.hasAttribute("tabindex")) {
      main.tabIndex = -1;
    }
    main.focus({ preventScroll: true });
  }, [location.pathname]);

  return null;
}
