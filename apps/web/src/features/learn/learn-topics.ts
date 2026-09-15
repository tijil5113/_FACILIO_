export interface LearnTopic {
  id: string;
  label: string;
  description: string;
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "home",
    label: "Start here",
    description: "Learn FACILIO overview",
  },
  {
    id: "start",
    label: "FACILIO in 2 minutes",
    description: "The complete journey",
  },
  {
    id: "data",
    label: "Understand your data",
    description: "Datasets, rows, analysis",
  },
  {
    id: "problems",
    label: "Find problems",
    description: "Problems and quality",
  },
  {
    id: "cleaning",
    label: "Clean safely",
    description: "Preview before a new version",
  },
  {
    id: "versions",
    label: "Versions and your original",
    description: "Original stays available",
  },
  {
    id: "cleanups",
    label: "Reusable cleanups",
    description: "Saved steps you can run again",
  },
  {
    id: "activity",
    label: "Activity and results",
    description: "What ran and where it landed",
  },
];

const HASH_TO_SECTION: Record<string, string> = {
  "": "home",
  home: "home",
  start: "start",
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
  data: "data",
  problems: "problems",
  quality: "problems",
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
