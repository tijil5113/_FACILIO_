import { NavLink } from "react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { FacilioMark, FacilioWordmark } from "@/components/brand/FacilioMark";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { primaryNav, type NavItem } from "@/lib/navigation";
import { usePreferencesStore } from "@/stores/preferences-store";

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const link = (
          <NavLink
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex min-h-10 items-center gap-2.5 rounded-[var(--facilio-radius-md)] px-2.5 py-2 text-sm text-sidebar-muted transition-colors duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)] hover:bg-sidebar-hover hover:text-sidebar-ink md:min-h-0",
                collapsed && "justify-center px-0",
                isActive && "bg-sidebar-active text-accent",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} aria-hidden="true" />
                {collapsed ? null : <span>{item.label}</span>}
                {isActive ? <span className="sr-only">(current)</span> : null}
              </>
            )}
          </NavLink>
        );

        return (
          <li key={item.to}>
            {collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link}
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar);

  return (
    <nav aria-label="Application" className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center border-b border-line px-4 py-4",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? <FacilioMark size="sm" /> : <FacilioWordmark />}
      </div>
      <div className={cn("flex-1 px-2 py-4", collapsed && "px-1.5")}>
        <NavList items={primaryNav} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <div className={cn("border-t border-line p-2", collapsed && "flex justify-center")}>
        <IconButton
          label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="text-sidebar-muted hover:text-sidebar-ink"
          pressed={collapsed}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </IconButton>
      </div>
    </nav>
  );
}
