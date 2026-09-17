import { CONCEPTS } from "@/features/education/concepts";
import { learnPath } from "@/features/learn/learn-topics";

import type { HelpContent, HelpContextId } from "./help-context";

export const HELP_CONTENT: Record<HelpContextId, HelpContent> = {
  home: {
    id: "home",
    title: "Home",
    question: "What should I do here?",
    summary:
      "Start here. Upload your data or try the sample, then analyze and clean without overwriting the original.",
    actions: [
      "Upload a CSV, Excel, or JSON file",
      "Try FACILIO with the sample dataset",
      "Open a recent dataset when you have one",
    ],
    goodToKnow: [
      "Upload stores your original file. It does not clean values.",
      "If the data service is unavailable, Home explains that instead of showing empty data.",
    ],
    learnHref: learnPath("start"),
    learnLabel: "FACILIO in a minute",
  },
  datasets: {
    id: "datasets",
    title: "Datasets",
    question: "What files can I add?",
    summary: CONCEPTS.limits.formats,
    actions: [
      "Upload a file",
      "Open a dataset to analyze and clean it",
      "Try the sample from Home",
    ],
    goodToKnow: ["Each dataset keeps its original version.", CONCEPTS.limits.size],
    learnHref: learnPath("bring"),
    learnLabel: "Bring in your data",
  },
  dataset: {
    id: "dataset",
    title: "Overview",
    question: CONCEPTS.quality.question,
    summary: CONCEPTS.quality.summary,
    actions: [
      "Analyze the selected version",
      "Review detected problems",
      "Clean it safely",
      "Open History to compare versions",
    ],
    goodToKnow: [
      CONCEPTS.quality.notAssessed,
      CONCEPTS.quality.integrity,
      "Cleaning creates another version instead of overwriting your original.",
    ],
    learnHref: learnPath("quality"),
    learnLabel: "Understand data quality",
  },
  "dataset-data": {
    id: "dataset-data",
    title: "Data",
    question: "Is this a live spreadsheet?",
    summary:
      "This is a preview of the selected version. It is stored data, not a live spreadsheet.",
    actions: [
      "Review columns and values",
      "Analyze if this version has not been analyzed",
    ],
    goodToKnow: [
      "Previewing data does not change it.",
      "Blank cells and empty text are shown distinctly when FACILIO can tell them apart.",
    ],
    learnHref: learnPath("data"),
    learnLabel: "Understand your dataset",
  },
  problems: {
    id: "problems",
    title: "Problems",
    question: CONCEPTS.problems.question,
    summary: CONCEPTS.problems.summary,
    actions: [
      "Clean detected problems with Guided Cleanup",
      "Review the data",
      "Analyze again if analysis failed or has not run",
    ],
    goodToKnow: [
      CONCEPTS.problems.informational,
      "FACILIO does not know every business rule.",
      "Not analyzed, no problems, filtered results, and analysis failure are different states.",
    ],
    learnHref: learnPath("problems"),
    learnLabel: "Review problems",
    technical: [
      "Issue codes and evidence remain available on each finding. You do not need them for ordinary review.",
    ],
  },
  clean: {
    id: "clean",
    title: "Clean",
    question: CONCEPTS.cleaning.question,
    summary:
      "Manual Clean lets you preview one registered action before creating a new version.",
    actions: [
      "Choose a step",
      "Preview the effect",
      "Create a cleaned version if you approve",
    ],
    goodToKnow: [
      CONCEPTS.cleaning.preview,
      "Your original stays available.",
      "Guided Cleanup is often faster when problems were detected.",
    ],
    learnHref: learnPath("cleaning"),
    learnLabel: "Clean safely",
  },
  "guided-cleanup": {
    id: "guided-cleanup",
    title: "Guided Cleanup",
    question: CONCEPTS.cleaning.question,
    summary: CONCEPTS.cleaning.summary,
    actions: [
      "Select or adjust suggested fixes",
      "Preview the combined result",
      "Approve to create one cleaned version",
    ],
    goodToKnow: [
      "Nothing is changed until you explicitly approve.",
      "One guided cleanup creates one cleaned output version.",
      CONCEPTS.cleaning.order,
    ],
    learnHref: learnPath("cleaning"),
    learnLabel: "Clean safely",
  },
  history: {
    id: "history",
    title: "History",
    question: CONCEPTS.versions.question,
    summary: CONCEPTS.versions.summary,
    actions: [
      "View a version",
      "Compare a cleaned version with its previous version",
      "Use this version",
    ],
    goodToKnow: [
      '"Use this version" changes which version is current. It does not delete newer versions.',
      CONCEPTS.versions.original,
    ],
    learnHref: learnPath("versions"),
    learnLabel: "Understand versions",
  },
  cleanups: {
    id: "cleanups",
    title: "Cleanups",
    question: "What is a Cleanup?",
    summary: CONCEPTS.cleanups.summary,
    actions: [
      "Create a new Cleanup",
      "Open a saved Cleanup",
      "Run it against compatible data",
    ],
    goodToKnow: [
      "Running a Cleanup against compatible data creates a result version.",
      "Deleting a Cleanup does not delete datasets or versions already created.",
    ],
    learnHref: learnPath("cleanups"),
    learnLabel: "Reuse a Cleanup",
  },
  "cleanup-builder": {
    id: "cleanup-builder",
    title: "Cleanup builder",
    question: CONCEPTS.cleanups.question,
    summary: CONCEPTS.cleanups.order,
    actions: [
      "Add and configure steps",
      "Preview against a selected dataset version",
      "Run when the steps are compatible",
    ],
    goodToKnow: [
      "Preview does not create a version.",
      "A run that cannot finish leaves the input version unchanged.",
      "Disabled or empty steps cannot run.",
    ],
    learnHref: learnPath("cleanups"),
    learnLabel: "Reuse a Cleanup",
    technical: ["Compatibility and operation codes are available in Technical details."],
  },
  activity: {
    id: "activity",
    title: "Activity",
    question: CONCEPTS.activity.question,
    summary: CONCEPTS.activity.summary,
    actions: [
      "Open an item for details",
      "Filter by status",
      "Return to the dataset or Cleanup",
    ],
    goodToKnow: [
      CONCEPTS.activity.partialSuccess,
      CONCEPTS.activity.failedBeforeOutput,
      "Waiting is not the same as Running.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Follow Activity",
  },
  "activity-detail": {
    id: "activity-detail",
    title: "Activity item",
    question: CONCEPTS.activity.question,
    summary:
      "This is one Cleanup run, including whether a cleaned version exists and whether analysis needs attention.",
    actions: [
      "Open the cleaned version when one exists",
      "Retry only when FACILIO says retry is allowed",
      "Cancel while it is waiting or running",
    ],
    goodToKnow: [
      CONCEPTS.activity.partialSuccess,
      "Cancellation is not an error. No cleaned version is created.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Follow Activity",
    technical: [
      "Job, run, attempt, heartbeat, and worker identifiers are diagnostic, not beginner content.",
    ],
  },
  learn: {
    id: "learn",
    title: "Learn",
    question: "How is this different from Help?",
    summary: "Learn teaches how FACILIO works. Help stays with the page you are on.",
    actions: ["Open a topic", "Follow a product action into the real workspace"],
    goodToKnow: [
      "Learn is education. Help is for the current task.",
      CONCEPTS.technical.summary,
    ],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
  },
  settings: {
    id: "settings",
    title: "Settings",
    question: "What can I change here?",
    summary:
      "Appearance and system status for this browser. There is no account system in this build.",
    actions: ["Choose theme", "Adjust motion", "Review system status"],
    goodToKnow: [
      "System follows your device setting.",
      "System status is the detailed place to understand a limited service.",
    ],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
    technical: [CONCEPTS.technical.summary],
  },
  quality: {
    id: "quality",
    title: "Quality overview",
    question: CONCEPTS.quality.question,
    summary: CONCEPTS.quality.summary,
    actions: [
      "Open a dataset that needs attention",
      "Analyze datasets that have not been analyzed",
    ],
    goodToKnow: [CONCEPTS.quality.notAssessed, CONCEPTS.quality.integrity],
    learnHref: learnPath("quality"),
    learnLabel: "Understand data quality",
  },
  runs: {
    id: "runs",
    title: "Run records",
    question: "Should I use this instead of Activity?",
    summary: "Run records are the technical history of Cleanup executions.",
    actions: ["Open a run", "Return to Activity for the everyday status"],
    goodToKnow: [
      "Activity is the primary place to follow a Cleanup. Run records are advanced.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Follow Activity",
    technical: ["Run IDs correspond to Cleanup executions."],
  },
  exports: {
    id: "exports",
    title: "Exports",
    question: "Can I download a cleaned file?",
    summary: "Export formats are not available in this version of FACILIO.",
    actions: ["Return to a dataset", "Use History to confirm the version you need"],
    goodToKnow: ["FACILIO does not pretend export is available."],
    learnHref: learnPath("versions"),
    learnLabel: "Understand versions",
  },
  generic: {
    id: "generic",
    title: "Help",
    question: "Where should I look?",
    summary:
      "Use Help for the current page, Learn to understand FACILIO, and Technical details for diagnostics.",
    actions: ["Open Learn FACILIO", "Return to Home"],
    goodToKnow: ["Help does not change your data."],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
  },
};
