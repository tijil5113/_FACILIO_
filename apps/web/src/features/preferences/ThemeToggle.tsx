import { Monitor, Moon, Sun } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { nextTheme } from "@/lib/preferences";
import { usePreferencesStore } from "@/stores/preferences-store";

const labels = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
} as const;

export function ThemeToggle() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <Tooltip label={labels[theme]} side="bottom">
      <IconButton
        label={`${labels[theme]}. Click to change.`}
        onClick={() => {
          setTheme(nextTheme(theme));
        }}
      >
        <Icon size={16} aria-hidden="true" />
      </IconButton>
    </Tooltip>
  );
}
