import { BookOpen, Database, GitBranch, Home, Settings, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
}

export interface NavSection {
  id: "primary";
  heading: string;
  items: NavItem[];
}

export const primaryNav: NavItem[] = [
  {
    label: "Home",
    to: "/overview",
    icon: Home,
    description: "Start here: understand and clean data",
  },
  {
    label: "Datasets",
    to: "/datasets",
    icon: Database,
    description: "Upload and work with your data",
  },
  {
    label: "Cleanups",
    to: "/workflows",
    icon: GitBranch,
    description: "Saved cleanup steps you can reuse",
  },
  {
    label: "Activity",
    to: "/jobs",
    icon: Timer,
    description: "See whether a cleanup finished",
  },
  {
    label: "Learn",
    to: "/learn",
    icon: BookOpen,
    description: "Understand how FACILIO works",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    description: "Appearance and system status",
  },
];

export const navSections: NavSection[] = [
  { id: "primary", heading: "", items: primaryNav },
];

export const allNavItems: NavItem[] = primaryNav;

export const pageTitles: Record<string, string> = {
  "/overview": "Home",
  "/datasets": "Datasets",
  "/workflows": "Cleanups",
  "/runs": "Run records",
  "/jobs": "Activity",
  "/learn": "Learn",
  "/quality": "Quality overview",
  "/exports": "Exports",
  "/settings": "Settings",
};

export function titleForPath(pathname: string): string {
  if (pathname.startsWith("/datasets/") && pathname !== "/datasets/") {
    return "Dataset";
  }
  if (pathname.startsWith("/workflows/") && pathname !== "/workflows/") {
    return "Cleanup";
  }
  if (pathname.startsWith("/runs/") && pathname !== "/runs/") {
    return "Run record";
  }
  if (pathname.startsWith("/jobs/") && pathname !== "/jobs/") {
    return "Activity";
  }
  return pageTitles[pathname] ?? "FACILIO";
}
