import { useMemo } from "react";

import { allNavItems } from "@/lib/navigation";
import { toggleResolvedTheme } from "@/lib/preferences";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useUiStore } from "@/stores/ui-store";

export type CommandGroup = "Navigation" | "Appearance" | "Workspace";

export interface CommandItem {
  id: string;
  label: string;
  group: CommandGroup;
  keywords: string;
  perform: () => void;
}

export function useCommands(
  navigate: (to: string) => void,
  pathname = "",
): CommandItem[] {
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const theme = usePreferencesStore((state) => state.theme);
  const sidebarCollapsed = usePreferencesStore((state) => state.sidebarCollapsed);

  return useMemo(() => {
    const navigationCommands: CommandItem[] = allNavItems.map((item) => ({
      id: `nav:${item.to}`,
      label: `Go to ${item.label}`,
      group: "Navigation",
      keywords: `${item.label} ${item.description}`,
      perform: () => {
        navigate(item.to);
      },
    }));

    return [
      ...navigationCommands,
      {
        id: "upload",
        label: "Upload a file",
        group: "Workspace",
        keywords: "dataset ingest csv xlsx json",
        perform: () => {
          navigate("/datasets?upload=1");
        },
      },
      {
        id: "try-facilio",
        label: "Try FACILIO",
        group: "Workspace",
        keywords: "sample demo customers try",
        perform: () => {
          navigate("/overview?try=1");
        },
      },
      {
        id: "help:open",
        label: "Open Help",
        group: "Workspace",
        keywords: "help context recover what now",
        perform: () => {
          useUiStore.getState().openHelp();
        },
      },
      {
        id: "learn:facilio",
        label: "Learn FACILIO",
        group: "Workspace",
        keywords: "learn education understand quality versions cleanups",
        perform: () => {
          navigate("/learn");
        },
      },
      {
        id: "learn:quality",
        label: "Learn about quality",
        group: "Workspace",
        keywords: "quality score completeness uniqueness validity",
        perform: () => {
          navigate("/learn#quality");
        },
      },
      {
        id: "learn:versions",
        label: "Learn about versions",
        group: "Workspace",
        keywords: "original cleaned version history",
        perform: () => {
          navigate("/learn#versions");
        },
      },
      {
        id: "learn:cleanups",
        label: "Learn about cleanups",
        group: "Workspace",
        keywords: "workflow saved steps reuse",
        perform: () => {
          navigate("/learn#cleanups");
        },
      },
      ...(pathname.match(/^\/datasets\/[^/]+$/)
        ? [
            {
              id: "cleanup:current",
              label: "Clean current dataset",
              group: "Workspace" as const,
              keywords: "guided cleanup problems fix",
              perform: () => {
                navigate(`${pathname}?tab=cleanup`);
              },
            },
          ]
        : []),
      {
        id: "cleanup:new",
        label: "New cleanup",
        group: "Workspace",
        keywords: "create pipeline workflow builder",
        perform: () => {
          navigate("/workflows");
        },
      },
      {
        id: "nav:quality",
        label: "Quality overview",
        group: "Navigation",
        keywords: "quality data issues completeness",
        perform: () => {
          navigate("/quality");
        },
      },
      {
        id: "nav:runs",
        label: "Open run records",
        group: "Navigation",
        keywords: "runs workflow run technical",
        perform: () => {
          navigate("/runs");
        },
      },
      {
        id: "theme:toggle",
        label: "Toggle theme",
        group: "Appearance",
        keywords: "dark light appearance",
        perform: () => {
          setTheme(toggleResolvedTheme(theme));
        },
      },
      {
        id: "nav:toggle",
        label: sidebarCollapsed ? "Expand navigation" : "Collapse navigation",
        group: "Workspace",
        keywords: "sidebar navigation collapse expand",
        perform: () => {
          toggleSidebar();
        },
      },
    ];
  }, [navigate, pathname, setTheme, sidebarCollapsed, theme, toggleSidebar]);
}

export function filterCommands(commands: CommandItem[], query: string): CommandItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return commands;
  }
  return commands.filter((command) => {
    return `${command.label} ${command.keywords}`.toLowerCase().includes(normalized);
  });
}
