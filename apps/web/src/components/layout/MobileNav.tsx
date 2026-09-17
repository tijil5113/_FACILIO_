import { X } from "lucide-react";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { useUiStore } from "@/stores/ui-store";

export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);

  return (
    <div className="md:hidden">
      <Drawer
        open={open}
        onClose={closeMobileNav}
        title="Navigation"
        side="left"
        labelledBy="mobile-nav-title"
        initialFocusSelector="[data-mobile-nav-close]"
        className="bg-sidebar"
      >
        <h2 id="mobile-nav-title" className="sr-only">
          Navigation
        </h2>
        <div className="absolute top-3 right-3 z-10">
          <IconButton
            label="Close navigation"
            data-mobile-nav-close=""
            onClick={closeMobileNav}
          >
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <SidebarNav collapsed={false} showCollapse={false} onNavigate={closeMobileNav} />
      </Drawer>
    </div>
  );
}
