import { learnPath } from "@/features/learn/learn-topics";

import type { HelpContent, HelpContextId } from "./help-context";

export const HELP_CONTENT: Record<HelpContextId, HelpContent> = {
  home: {
    id: "home",
    title: "Home",
    summary:
      "Start here. Upload your data or try the sample, then analyze and clean without overwriting the original.",
    actions: [
      "Upload a CSV, XLSX, or JSON file",
      "Try FACILIO with the sample dataset",
      "Open a recent dataset when you have one",
    ],
    goodToKnow: [
      "Upload stores your original file. It does not clean values.",
      "If the data service is unavailable, Home explains that instead of showing empty data.",
    ],
    learnHref: learnPath("start"),
    learnLabel: "FACILIO in 2 minutes",
  },
  datasets: {
    id: "datasets",
    title: "Datasets",
    summary: "This list is every source file you have added to FACILIO.",
    actions: [
      "Upload a file",
      "Open a dataset to analyze and clean it",
      "Try the sample from Home",
    ],
    goodToKnow: [
      "Each dataset keeps its original version.",
      "Cleaning later creates another version instead of replacing the file.",
    ],
    learnHref: learnPath("data"),
    learnLabel: "Understand your data",
  },
  dataset: {
    id: "dataset",
    title: "Dataset",
    summary: "This workspace represents one source of data and its versions.",
    actions: [
      "Analyze the selected version",
      "Review detected problems",
      "Clean it safely",
      "Compare versions",
    ],
    goodToKnow: [
      "Cleaning creates another version instead of overwriting your original.",
      "You can return to the original from History.",
    ],
    learnHref: learnPath("versions"),
    learnLabel: "Versions and your original",
  },
  "dataset-data": {
    id: "dataset-data",
    title: "Data",
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
    learnLabel: "Understand your data",
  },
  problems: {
    id: "problems",
    title: "Problems",
    summary: "Problems are based on checks FACILIO actually performed.",
    actions: [
      "Clean detected problems with Guided Cleanup",
      "Review the data",
      "Analyze again if analysis failed or has not run",
    ],
    goodToKnow: [
      "Some findings have a safe guided cleanup. Others need human review.",
      "FACILIO does not know every business rule.",
      "Not analyzed, no problems, filtered results, and analysis failure are different states.",
    ],
    learnHref: learnPath("problems"),
    learnLabel: "Finding problems",
    technical: ["Issue codes and evidence remain available on each finding."],
  },
  clean: {
    id: "clean",
    title: "Clean",
    summary:
      "Manual Clean lets you preview one registered action before creating a new version.",
    actions: [
      "Choose a step",
      "Preview the effect",
      "Create a cleaned version if you approve",
    ],
    goodToKnow: [
      "Nothing is written until you apply.",
      "Your original stays available.",
      "Guided Cleanup is often faster when problems were detected.",
    ],
    learnHref: learnPath("cleaning"),
    learnLabel: "Cleaning safely",
  },
  "guided-cleanup": {
    id: "guided-cleanup",
    title: "Guided Cleanup",
    summary:
      "Choose the problems you want to address. FACILIO previews the combined result first.",
    actions: [
      "Select or adjust suggested fixes",
      "Preview the combined result",
      "Approve to create one cleaned version",
    ],
    goodToKnow: [
      "Nothing is changed until you explicitly approve.",
      "One guided cleanup creates one cleaned output version.",
      "Conflicting steps must be resolved before preview.",
    ],
    learnHref: learnPath("cleaning"),
    learnLabel: "Cleaning safely",
  },
  history: {
    id: "history",
    title: "History",
    summary: "History contains versions of the dataset. The original remains available.",
    actions: [
      "View a version",
      "Compare a cleaned version with its previous version",
      "Use this version",
    ],
    goodToKnow: [
      '"Use this version" changes which version is current. It does not delete newer versions.',
      "Your original is never overwritten.",
    ],
    learnHref: learnPath("versions"),
    learnLabel: "Versions and your original",
  },
  cleanups: {
    id: "cleanups",
    title: "Cleanups",
    summary: "A Cleanup is reusable instructions. It is not itself cleaned data.",
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
    learnLabel: "Reusable Cleanups",
  },
  "cleanup-builder": {
    id: "cleanup-builder",
    title: "Cleanup builder",
    summary: "Build an ordered list of steps you can preview and run again later.",
    actions: [
      "Add and configure steps",
      "Preview against a selected dataset version",
      "Run when the steps are compatible",
    ],
    goodToKnow: [
      "Preview does not create a version.",
      "A run that cannot finish leaves the input version unchanged.",
      "Disabled or empty steps cannot be executed.",
    ],
    learnHref: learnPath("cleanups"),
    learnLabel: "Reusable Cleanups",
    technical: ["Compatibility and operation codes are available in Technical details."],
  },
  activity: {
    id: "activity",
    title: "Activity",
    summary:
      "Activity shows cleanup execution: waiting, running, done, cancelled, or couldn't finish.",
    actions: [
      "Open an item for details",
      "Filter by status",
      "Return to the dataset or Cleanup",
    ],
    goodToKnow: [
      "Done means a cleaned version was created when one is listed.",
      "Couldn't finish is not the same as cancelled.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Activity and results",
  },
  "activity-detail": {
    id: "activity-detail",
    title: "Activity item",
    summary: "This is one cleanup execution, including whether an output version exists.",
    actions: [
      "Open the cleaned version when one exists",
      "Retry only when FACILIO says retry is allowed",
      "Cancel while it is waiting or running",
    ],
    goodToKnow: [
      "Cancellation is not an error. No cleaned version is created.",
      "Technical details can show job ID, run ID, attempt, and worker information.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Activity and results",
    technical: [
      "Job, run, attempt, heartbeat, and worker identifiers are diagnostic, not beginner content.",
    ],
  },
  learn: {
    id: "learn",
    title: "Learn",
    summary: "Learn teaches how FACILIO works. Help stays with the page you are on.",
    actions: ["Open a topic", "Follow a product action into the real workspace"],
    goodToKnow: [
      "Learn is education. Help is for the current task.",
      "Technical details explain what happened internally on a specific action.",
    ],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
  },
  settings: {
    id: "settings",
    title: "Settings",
    summary:
      "Appearance and system status for this browser. There is no account system in this build.",
    actions: ["Choose theme", "Adjust motion", "Review system status"],
    goodToKnow: [
      "Preferences stay on this device.",
      "System status is the detailed place to understand a degraded service.",
    ],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
    technical: ["Health and readiness checks are live API results."],
  },
  quality: {
    id: "quality",
    title: "Quality overview",
    summary: "This is an advanced summary of measured quality across analyzed datasets.",
    actions: [
      "Open a dataset that needs attention",
      "Analyze datasets that have not been analyzed",
    ],
    goodToKnow: [
      "A quality score is evidence from checks FACILIO ran, not business truth.",
      "Datasets that have not been analyzed do not have a score.",
    ],
    learnHref: learnPath("problems"),
    learnLabel: "Data quality",
  },
  runs: {
    id: "runs",
    title: "Run records",
    summary: "Run records are the technical history of cleanup executions.",
    actions: ["Open a run", "Return to Activity for the human-facing status"],
    goodToKnow: [
      "Activity is the primary place to follow a cleanup. Run records are advanced.",
    ],
    learnHref: learnPath("activity"),
    learnLabel: "Activity and results",
    technical: ["Run IDs correspond to workflow executions."],
  },
  exports: {
    id: "exports",
    title: "Exports",
    summary: "Export formats are planned. This page does not download cleaned files yet.",
    actions: ["Return to a dataset", "Use History to confirm the version you need"],
    goodToKnow: ["FACILIO does not pretend export is available."],
    learnHref: learnPath("versions"),
    learnLabel: "Versions and your original",
  },
  generic: {
    id: "generic",
    title: "Help",
    summary:
      "Use Help for the current page, Learn to understand FACILIO, and Technical details for diagnostics.",
    actions: ["Open Learn FACILIO", "Return to Home"],
    goodToKnow: ["Help does not change your data."],
    learnHref: learnPath("home"),
    learnLabel: "Learn FACILIO",
  },
};
