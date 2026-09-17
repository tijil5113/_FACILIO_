export const WELCOME_EYEBROW = "Welcome to FACILIO";

export const WELCOME_HEADLINE = "Turn messy data into data you can understand and trust.";

export const WELCOME_SUPPORT =
  "Bring in CSV, Excel, or JSON. FACILIO shows what’s inside, finds quality problems, previews safe fixes, and creates a cleaned version while the original stays available.";

export const PRIMARY_UPLOAD_LABEL = "Upload your data";
export const TRY_FACILIO_LABEL = "Try FACILIO";
export const SAMPLE_UPLOAD_LABEL = "Upload my data";
export const RETURNING_UPLOAD_LABEL = "Upload another dataset";

export const JOURNEY_STAGES = [
  {
    title: "Bring data",
    detail: "Upload CSV, Excel, or JSON. FACILIO stores the original file.",
  },
  {
    title: "Understand",
    detail: "Analysis reads structure and measurable quality. Values do not change.",
  },
  {
    title: "Find problems",
    detail: "Missing values, duplicates, and inconsistencies FACILIO can detect.",
  },
  {
    title: "Clean safely",
    detail: "Preview first, then approve a cleaned version. The original stays.",
  },
  {
    title: "Reuse",
    detail: "Save useful cleaning steps and run them again on compatible data.",
  },
] as const;

export const TRUST_POINTS = [
  "Original preserved",
  "Preview before cleaning",
  "Measured quality",
  "No automatic cleaning without approval",
] as const;

export const ILLUSTRATIVE_DISCLAIMER = "Illustration. Not your data.";

export const ILLUSTRATIVE_PAIRS = [
  { id: "trim", problem: "Extra spaces", before: '" Alice "', after: '"Alice"' },
  { id: "case", problem: "Inconsistent case", before: "ACTIVE", after: "active" },
  { id: "missing", problem: "Missing value", before: "blank", after: "540" },
] as const;

export const ILLUSTRATIVE_VERSIONS = {
  before: { version_number: 1, kind: "ORIGINAL" as const },
  after: { version_number: 2, kind: "DERIVED" as const },
};

export const SIGNATURE_VISUAL_LABEL =
  "Illustration of messy values becoming a cleaned version. FACILIO keeps the original and creates another version after you approve. These values are examples, not your data.";
