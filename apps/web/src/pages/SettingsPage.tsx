import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";
import { SystemHealthPanel } from "@/features/system-health/SystemHealthPanel";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/config";
import type { MotionPreference, ThemePreference } from "@/lib/preferences";
import { useHealthQuery } from "@/hooks/use-system-status";
import { usePreferencesStore } from "@/stores/preferences-store";

export function SettingsPage() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const sidebarCollapsed = usePreferencesStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = usePreferencesStore((state) => state.setSidebarCollapsed);
  const motion = usePreferencesStore((state) => state.motion);
  const setMotion = usePreferencesStore((state) => state.setMotion);
  const health = useHealthQuery();
  const applicationVersion = health.data?.version ?? APP_VERSION;
  const environment = import.meta.env.MODE === "production" ? "Production" : "Local";

  return (
    <div className="page-enter mx-auto content-readable space-y-8">
      <PageHeader
        title="Settings"
        description="Appearance, system status, and product information for this browser."
      />

      <section aria-labelledby="appearance-heading" className="space-y-4">
        <div>
          <h2 id="appearance-heading" className="type-section text-ink">
            Appearance
          </h2>
          <p className="type-body mt-1 text-ink-secondary">
            Theme preference is stored on this device.
          </p>
        </div>
        <SegmentedControl<ThemePreference>
          legend="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
        />
        <p className="text-sm text-ink-secondary">
          {theme === "system"
            ? "System follows your device setting."
            : theme === "dark"
              ? "Dark is selected for this browser."
              : "Light is selected for this browser."}
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
        <p className="text-sm text-ink-secondary">
          Reduced motion removes non-essential movement. Loading, status, and focus remain
          available.
        </p>
      </section>

      <section
        aria-labelledby="application-heading"
        className="space-y-4 border-t border-line pt-8"
      >
        <div>
          <h2 id="application-heading" className="type-section text-ink">
            Application
          </h2>
          <p className="type-body mt-1 text-ink-secondary">
            Local interface preferences. There is no account in this build.
          </p>
        </div>
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
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="type-meta text-ink-muted uppercase">Application</dt>
            <dd className="mt-1 text-sm text-ink">{APP_NAME}</dd>
          </div>
          <div>
            <dt className="type-meta text-ink-muted uppercase">Version</dt>
            <dd className="mt-1 font-mono text-sm text-ink">{applicationVersion}</dd>
          </div>
          <div>
            <dt className="type-meta text-ink-muted uppercase">Environment</dt>
            <dd className="mt-1 text-sm text-ink">{environment}</dd>
          </div>
        </dl>
      </section>

      <div className="border-t border-line pt-8">
        <SystemHealthPanel />
      </div>

      <section
        aria-labelledby="about-heading"
        className="space-y-4 border-t border-line pt-8"
      >
        <div>
          <h2 id="about-heading" className="type-section text-ink">
            About FACILIO
          </h2>
          <p className="type-body mt-2 text-ink-secondary">{APP_TAGLINE}</p>
          <p className="type-body mt-2 text-ink-secondary">{CONCEPTS.product.what}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-ink">Current boundaries</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
            <li>{CONCEPTS.limits.formats}</li>
            <li>{CONCEPTS.limits.size}</li>
            <li>{CONCEPTS.limits.integrity}</li>
            <li>{CONCEPTS.limits.processing}</li>
            <li>{CONCEPTS.limits.storage}</li>
          </ul>
        </div>
        <TechnicalDetails>
          <p>
            Preferences stay in this browser. Health uses live application, database, and
            worker checks. Connection strings and secrets are not shown.
          </p>
        </TechnicalDetails>
      </section>
    </div>
  );
}
