import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SystemHealthPanel } from "@/features/system-health/SystemHealthPanel";
import type { MotionPreference, ThemePreference } from "@/lib/preferences";
import { usePreferencesStore } from "@/stores/preferences-store";

export function SettingsPage() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const sidebarCollapsed = usePreferencesStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = usePreferencesStore((state) => state.setSidebarCollapsed);
  const motion = usePreferencesStore((state) => state.motion);
  const setMotion = usePreferencesStore((state) => state.setMotion);

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Local interface preferences for this browser. Account and security settings are not part of this build."
      />

      <Card as="section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-sm font-medium text-ink">
          Appearance
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-secondary">
          Theme preference is stored on this device and applied before the first paint
          when possible.
        </p>
        <SegmentedControl<ThemePreference>
          legend="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Card>

      <Card as="section" aria-labelledby="navigation-heading">
        <h2 id="navigation-heading" className="text-sm font-medium text-ink">
          Navigation
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-secondary">
          Collapsed mode keeps icon navigation with accessible names. Preference is local
          only.
        </p>
        <SegmentedControl<"expanded" | "collapsed">
          legend="Sidebar"
          value={sidebarCollapsed ? "collapsed" : "expanded"}
          onChange={(value) => {
            setSidebarCollapsed(value === "collapsed");
          }}
          options={[
            { value: "expanded", label: "Expanded" },
            { value: "collapsed", label: "Collapsed" },
          ]}
        />
      </Card>

      <Card as="section" aria-labelledby="motion-heading">
        <h2 id="motion-heading" className="text-sm font-medium text-ink">
          Motion
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-secondary">
          Reduced motion removes non-essential movement. Loading, status, and focus remain
          available. System follows the operating system. Full keeps motion even if the
          system prefers reduced movement.
        </p>
        <SegmentedControl<MotionPreference>
          legend="Motion"
          value={motion}
          onChange={setMotion}
          options={[
            { value: "system", label: "System" },
            { value: "reduced", label: "Reduced" },
            { value: "full", label: "Full" },
          ]}
        />
      </Card>

      <SystemHealthPanel />
    </div>
  );
}
