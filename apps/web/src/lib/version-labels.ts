interface VersionLike {
  version_number: number;
  kind?: string;
  is_current?: boolean;
  label?: string;
}

export function versionTrustLabel(version: VersionLike): string {
  if (version.kind === "ORIGINAL" || version.version_number === 1) {
    return "Original";
  }
  return "Cleaned version";
}

export function versionHeadline(version: VersionLike): string {
  return `V${String(version.version_number)} — ${versionTrustLabel(version)}`;
}

export function versionSelectLabel(
  version: VersionLike,
  options: { viewing: boolean },
): string {
  const parts = [versionHeadline(version)];
  if (options.viewing) {
    parts.push("Viewing");
  }
  if (version.is_current) {
    parts.push("Using");
  }
  return parts.join(" · ");
}
