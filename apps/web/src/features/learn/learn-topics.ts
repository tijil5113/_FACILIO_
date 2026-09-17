export interface LearnTopic {
  id: string;
  label: string;
  description: string;
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "home",
    label: "Learn overview",
    description: "Start here",
  },
  {
    id: "start",
    label: "FACILIO in a minute",
    description: "The product in one pass",
  },
  {
    id: "bring",
    label: "Bring in your data",
    description: "CSV, Excel, and JSON",
  },
  {
    id: "data",
    label: "Understand your dataset",
    description: "Rows, columns, and analysis",
  },
  {
    id: "quality",
    label: "Understand data quality",
    description: "Scores from supported checks",
  },
  {
    id: "problems",
    label: "Review problems",
    description: "Findings worth reviewing",
  },
  {
    id: "cleaning",
    label: "Clean safely",
    description: "Preview, then a new version",
  },
  {
    id: "versions",
    label: "Understand versions",
    description: "Original, Viewing, and Using",
  },
  {
    id: "cleanups",
    label: "Reuse a Cleanup",
    description: "Saved ordered steps",
  },
  {
    id: "activity",
    label: "Follow Activity",
    description: "What FACILIO attempted",
  },
];

export const LEARN_JOURNEY = LEARN_TOPICS.filter((topic) => topic.id !== "home");

const HASH_TO_SECTION: Record<string, string> = {
  "": "home",
  home: "home",
  start: "start",
  bring: "bring",
  data: "data",
  problems: "problems",
  quality: "quality",
  cleaning: "cleaning",
  versions: "versions",
  cleanups: "cleanups",
  activity: "activity",
};

const SECTION_TO_TOPIC: Record<string, string> = {
  home: "home",
  start: "start",
  bring: "bring",
  data: "data",
  problems: "problems",
  quality: "quality",
  cleaning: "cleaning",
  versions: "versions",
  cleanups: "cleanups",
  activity: "activity",
};

export function sectionIdFromHash(hash: string): string {
  const key = hash.replace(/^#/, "").trim();
  return HASH_TO_SECTION[key] ?? "home";
}

export function topicIdForSection(sectionId: string): string {
  return SECTION_TO_TOPIC[sectionId] ?? "home";
}

export function learnPath(sectionId: string): string {
  if (sectionId === "home") {
    return "/learn";
  }
  return `/learn#${sectionId}`;
}

export function adjacentTopics(topicId: string): {
  previous: LearnTopic | null;
  next: LearnTopic | null;
} {
  const index = LEARN_JOURNEY.findIndex((topic) => topic.id === topicId);
  if (index < 0) {
    return { previous: null, next: LEARN_JOURNEY[0] ?? null };
  }
  return {
    previous: LEARN_JOURNEY[index - 1] ?? null,
    next: LEARN_JOURNEY[index + 1] ?? null,
  };
}
