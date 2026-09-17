import { cn } from "@/lib/cn";
import { versionHeadline } from "@/lib/version-labels";

interface VersionLike {
  version_number: number;
  kind?: string;
  is_current?: boolean;
  label?: string;
}

interface VersionLabelProps {
  version: VersionLike;
  viewing?: boolean;
  className?: string;
}

export function VersionLabel({ version, viewing = false, className }: VersionLabelProps) {
  const viewingOnly = viewing && !version.is_current;
  const meta = [
    viewingOnly ? "Viewing" : null,
    version.is_current ? "Using" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5",
        className,
      )}
    >
      <span className="font-medium text-ink">{versionHeadline(version)}</span>
      {meta.length > 0 ? <span className="type-caption">{meta.join(" · ")}</span> : null}
    </span>
  );
}
