/** Canonical product explanations shared by Learn and Help. Keep Help shorter. */

export const SUPPORTED_FORMATS = "CSV, Excel, and JSON";

export const CONCEPTS = {
  product: {
    what: "FACILIO helps you understand a file, review measurable problems, preview cleaning, and keep the original available.",
    journey:
      "Bring data → Analyze → Review problems → Preview cleaning → Create cleaned version → Reuse cleaning steps",
  },
  quality: {
    question: "What does quality mean?",
    summary:
      "FACILIO's quality score summarizes supported measurable checks. It does not prove the data is correct for its real-world purpose.",
    notAssessed:
      "Not assessed means FACILIO did not run that check. It is not 0, and it is not a perfect score.",
    integrity:
      "Integrity is not assessed. FACILIO does not evaluate relationships across datasets, so it does not treat Integrity as 0 or 100.",
  },
  problems: {
    question: "Why did FACILIO flag this?",
    summary:
      "Problems are findings from supported checks. They are worth reviewing. They are not necessarily catastrophic errors.",
    informational:
      "Some findings are informational. FACILIO should not automatically change them.",
  },
  cleaning: {
    question: "What happens to my original version?",
    summary:
      "Review problems, choose steps, preview the combined result, then create a new version. FACILIO does not silently overwrite the original.",
    preview:
      "Preview shows the combined effect of the selected steps. Nothing is saved until you create a cleaned version.",
    order:
      "Steps run from top to bottom. Order can change the result, so preview shows the combined final values.",
  },
  versions: {
    question: "What does Using mean?",
    summary:
      "Viewing is the version on screen. Using is the working default. Other versions, including Original, remain available.",
    original: "V1 Original is the uploaded file. Cleaning never overwrites it.",
    cleaned:
      "V2 and later cleaned versions are new snapshots created from a previous version.",
  },
  cleanups: {
    question: "Why does step order matter?",
    summary:
      "A Cleanup is a saved ordered set of cleaning steps that can be used again. Saving it does not change a dataset.",
    order:
      "Steps run from top to bottom. Changing the order can change the cleaned result.",
  },
  activity: {
    question: "Why does this say Needs attention?",
    summary:
      "Activity shows what FACILIO attempted and what happened: Waiting, Running, Completed, or Needs attention.",
    waiting: "Waiting means FACILIO has the request and has not started it yet.",
    running: "Running means the Cleanup is in progress.",
    completed:
      "Completed means FACILIO finished the run. Check whether a cleaned version was created.",
    needsAttention:
      "Needs attention means the run did not finish as intended, or a created version still needs analysis.",
    partialSuccess:
      "A cleaned version may be created even if FACILIO cannot finish analyzing it afterward. The cleanup succeeded; the analysis needs attention.",
    failedBeforeOutput:
      "If FACILIO fails before creating output, no cleaned version exists. The input version is unchanged.",
  },
  technical: {
    question: "Why are there technical details?",
    summary:
      "Technical details exist for debugging, support, and advanced review. You do not need IDs for ordinary work.",
  },
  limits: {
    formats: `FACILIO supports ${SUPPORTED_FORMATS} files.`,
    size: "The Datasets page shows the upload size limit for this installation. The default local limit is 16 MB.",
    integrity: "Integrity is not assessed in this product.",
    processing:
      "Saved Cleanups need background processing. You can still browse datasets when it is unavailable.",
    storage:
      "Uploaded files are stored on the local deployment. This is not a cloud connector product.",
  },
} as const;
