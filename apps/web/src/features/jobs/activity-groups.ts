export type ActivityGroupId = "today" | "yesterday" | "earlier";

export interface ActivityGroup<T> {
  id: ActivityGroupId;
  label: string;
  items: T[];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function groupIdFor(iso: string, now: Date): ActivityGroupId {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "earlier";
  }
  const day = startOfDay(date);
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (day === today) {
    return "today";
  }
  if (day === yesterday) {
    return "yesterday";
  }
  return "earlier";
}

export function groupActivityByDate<T>(
  items: T[],
  timestamp: (item: T) => string | null | undefined,
  now = new Date(),
): ActivityGroup<T>[] {
  const buckets: Record<ActivityGroupId, T[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const item of items) {
    const value = timestamp(item);
    buckets[groupIdFor(value ?? "", now)].push(item);
  }
  const labels: Record<ActivityGroupId, string> = {
    today: "Today",
    yesterday: "Yesterday",
    earlier: "Earlier",
  };
  return (["today", "yesterday", "earlier"] as const)
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, label: labels[id], items: buckets[id] }));
}
