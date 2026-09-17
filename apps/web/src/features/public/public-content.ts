export const PUBLIC_PRODUCT = "FACILIO";

export const PUBLIC_HEADLINE = "Understand messy data.\nClean it with confidence.";

export const PUBLIC_SUPPORT =
  "FACILIO helps you inspect CSV, Excel and JSON datasets, find measurable quality problems, preview safe cleaning changes and create traceable cleaned versions without losing the original.";

export const PUBLIC_PRIMARY_CTA = "Open FACILIO";
export const PUBLIC_SECONDARY_CTA = "Try the sample";
export const PUBLIC_SIGN_IN = "Sign in";
export const PUBLIC_CREATE_ACCOUNT = "Create account";

export const PUBLIC_CAPABILITIES = [
  {
    title: "Understand your data",
    detail:
      "Inspect structure, types, and a preview of the current version. Values do not change during analysis.",
  },
  {
    title: "Find measurable problems",
    detail:
      "Missing values, duplicates, and supported consistency checks — findings, not business truth.",
  },
  {
    title: "Preview changes",
    detail:
      "See the cleaned result before anything is saved. Preview does not create a version.",
  },
  {
    title: "Create cleaned versions",
    detail: "Approval creates a new version. V1 Original stays available.",
  },
  {
    title: "Reuse cleaning steps",
    detail: "Save an ordered Cleanup and run it again on compatible data.",
  },
  {
    title: "Follow activity",
    detail: "Waiting, running, completed, or needs attention — outcomes stay truthful.",
  },
] as const;

export const PUBLIC_SAFETY_HEADLINE = "See the change before you make it.";

export const PUBLIC_SAFETY_SUPPORT =
  "Preview is not a saved result. A cleaned version appears only after you approve. The original file remains.";

export const PUBLIC_SAFETY_STEPS = [
  { key: "v1", label: "V1 Original", detail: "The uploaded file, kept as-is." },
  { key: "preview", label: "Preview", detail: "Proposed values. Nothing stored yet." },
  { key: "v2", label: "V2 Cleaned", detail: "A new version after approval." },
] as const;

export const PUBLIC_FINAL_HEADLINE = "Ready to understand your data?";

export const PUBLIC_FINAL_SUPPORT =
  "Open the workspace, or try the bundled customer sample. FACILIO does not overwrite your original file.";

export const PUBLIC_FOOTER_BLURB =
  "A local workspace for inspecting, cleaning, and versioning tabular data.";

export const EXAMPLE_DISCLAIMER = "Example. Illustrative data, not a user file.";

export const EXAMPLE_COLUMNS = ["customer_name", "status"] as const;

export const EXAMPLE_ROWS = [
  {
    id: "alice",
    before: ['" Alice "', "ACTIVE"],
    after: ["Alice", "active"],
    problem: "Extra spaces",
    cleaned: true,
  },
  {
    id: "bob",
    before: ["Bob", "active"],
    after: ["Bob", "active"],
    problem: "Inconsistent capitalization",
    cleaned: true,
  },
  {
    id: "missing",
    before: ["(missing)", "ACTIVE"],
    after: ["(missing)", "active"],
    problem: "Missing value",
    cleaned: false,
  },
] as const;

export const EXAMPLE_FINDINGS = [
  "extra spaces",
  "inconsistent capitalization",
  "missing value",
] as const;

export const INTERACTIVE_STAGES = [
  { id: "before", label: "Before" },
  { id: "problems", label: "Problems" },
  { id: "preview", label: "Preview" },
  { id: "after", label: "After" },
] as const;

export type InteractiveStage = (typeof INTERACTIVE_STAGES)[number]["id"];
