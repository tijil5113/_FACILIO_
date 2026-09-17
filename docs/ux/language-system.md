# FACILIO human language system

Locked language for the shipped UI.

## 1. Voice

- Short sentences. Active voice.
- Spreadsheet-literate, enterprise-professional. Not cute, not intern-phase.
- Goal before mechanism.
- Consequence and **data fate** before confirm.
- One obvious next action.
- Never imply AI. FACILIO is deterministic registered operations.
- Never imply big-data / unbounded scale.
- No Phase 5 / Phase 6 / “transformation engine” / Redis / SQLAlchemy in beginner or standard product copy.
- Technical terms may appear behind **Technical details**, in Learn advanced modules, and in API docs (`docs/*.md`).

## 2. Surface types

| Surface | Standard |
| --- | --- |
| Page title | Noun or short goal. Match nav. |
| Subtitle | One sentence: purpose + data fate if relevant. No architecture. |
| Primary CTA | Verb + object. Matches the page’s one primary goal. |
| Secondary CTA | Next-most-likely, visually quieter. |
| Advanced actions | Rename, delete, archive, technical — not competing with primary. |
| Empty | What / why / do / optional example / optional Learn. |
| Help | Plain answers to the current page. |
| Tooltip | ≤ 2 sentences. No new jargon without explanation. |
| Error | Headline, what happened, data fate, actions, folded technical. |
| Warning | What might happen if they continue. |
| Success | What happened, what changed, what did not, where, next. |
| Confirmation | Irreversible vs reversible. Name the object. |
| Status | Beginner labels from the status map. Persist backend enums in APIs. |
| Advanced details | Identifiers, codes, infra. Read-only unless the control is inherently operational (cancel/retry). |

## 3. Terminology map

Legend: **L1** Guided · **L2** Standard · **L3** Advanced.

| Internal | Current UI (examples) | Primary (L1) | Standard (L2) | Advanced (L3) | One-sentence explanation | Primary appears | Technical may appear | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dataset | Dataset | File (first-run, upload) | Dataset | Dataset ID | A FACILIO dataset is one uploaded source plus all of its versions. | Nav, headers after first use | IDs | “table” as the product object |
| ingestion | Ingestion | Upload | Upload | Ingestion | Storing the original file and reading its structure without cleaning it. | Upload dialog | Source / Technical details | Ingestion as eyebrow |
| profile / profiling | Profiled, Profiling failed | Analyze / Analysis | Analysis | Profile snapshot | Inspect stored data, compute stats and quality, change no values. | CTAs, empty states | Profile ID, `profile_version` | User “profile” |
| quality | Data quality | How healthy this version looks | Quality score | Dimensions, weights | Evidence-based score from assessed dimensions — not business truth. | Overview, Problems header | Dimension keys | “perfect data”, “AI quality” |
| quality dimension | Completeness, Validity… | Keep dimension names | Dimension | Dimension key | One measurable aspect contributing to the score when assessed. | Quality cards | API keys | Inventing extra dimensions |
| issue | Issues | Problem | Problem / issue | Issue type code | A specific, evidenced finding on a version. | Problems | Issue IDs | “defect”, “violation” without evidence |
| transformation | Transform data | Clean / cleanup step | Transformation | Operation code | One registered, deterministic change that can create a new version. | Clean | Catalog codes | Phase 5, “engine” |
| TRIM_WHITESPACE | Trim whitespace | Remove extra spaces | Trim whitespace | `TRIM_WHITESPACE` | Strip leading/trailing whitespace in selected text. | Guided lists | Catalog | Leading with the code |
| normalize case | Normalize case | Make capitalization consistent | Normalize case | operation code | Apply a chosen case mode to text. | Guided | mode enum | “normalize” without “capitalization” on L1 |
| fill missing | Fill missing values | Fill empty cells | Fill missing values | `FILL_MISSING` | Replace missing cells with a stated strategy. | Guided | strategy tokens | “impute” |
| remove duplicates | Remove duplicate rows | Remove duplicate rows | same | operation code | Drop extra copies of rows. | All levels | — | “dedupe” only as search keyword |
| preview | Preview | Preview | Preview | Ephemeral pipeline preview | Show effects **without** writing a version. | CTAs | — | “dry run” in L1 |
| apply | Apply transformation | Create cleaned version / Apply | Apply | Apply transformation | Persist a new derived version from one operation. | Manual clean | — | “commit”, “mutate” |
| version | V1, Version | Version | Version | Version ID | An immutable snapshot of the dataset. | Selector, history | IDs | “immutable” in L1 headlines |
| ORIGINAL | Original | Original | Original | kind=ORIGINAL | The first version from the uploaded file. Never overwritten. | Badges, safety | — | “source version” in L1 |
| DERIVED | Derived | Cleaned version | Cleaned version | Derived version | A version created by a cleanup or saved-cleanup run. | History | kind=DERIVED | “derived” in L1 |
| is_current | (current) | Using this version | Current version | Current pointer | Which version FACILIO treats as the working default. | Selector | — | “working pointer” |
| viewed version | `?version=` | Viewing | Viewing | version query | The version on screen; may differ from current. | Header | URL param | — |
| parent_version | Parent, Compare with parent | Previous version | Previous version | Parent version | The version this one was created from. | History | Lineage | “parent” in L1 |
| lineage | Version lineage | History | History | Lineage | Ordered versions and how they were created. | History tab | Technical details | “DAG”, “branch” in L1 |
| restore as current | Restore as current | Use this version | Use this version | Set current version | Point current at an existing version; delete nothing. | History CTA | API | “restore” implying undelete |
| workflow | Workflow | Saved cleanup | Workflow | Workflow ID | Named, ordered cleanup steps you can run again. | After first save; nav **Cleanups** | IDs, revision | Pipeline in L1 |
| pipeline | Pipeline catalog | Cleanup steps | Pipeline | execute_pipeline | Linear sequence of operations. | L3 / Learn | Docs | Empty-state “pipelines” |
| step | Step | Step | Step | step ID, position | One operation in a saved cleanup. | Builder | — | — |
| workflow revision | Revision | Saved | Revision | Revision n | Definition version; runs snapshot the revision they used. | L2 subtitle | L3 | Git metaphors |
| workflow run | Run | This cleanup run | Run | Run ID | Domain record of one execution against one input version. | Activity (composed) | Technical details | Dual nav “Runs” as peer to Jobs |
| job | Job | Activity | Activity / job | Job ID | Operational execution: queue, worker, cancel, retry. | Activity | Technical details | Redis in L1 |
| attempt | Attempt | Try n of m | Attempt | JobAttempt | One worker claim at running the job. | L3 | Attempts list | — |
| worker | Worker | (hidden) | (health) | Worker ID | Process that executes queued jobs. | Degraded health | Health advanced | Worker as user concept |
| queue | Queue | Waiting to start | Queue | Redis/RQ | Dispatch channel; PostgreSQL is the record. | Waiting copy | Health | Redis on Home |
| heartbeat | Heartbeat | (hidden) | (hidden) | Heartbeat time | Last worker liveness signal. | L3 | Job detail advanced | Heartbeat on L1 |
| compatibility | Compatibility issues | Doesn’t match this file | Compatibility | WORKFLOW_INCOMPATIBLE | Steps don’t fit this version’s columns/types. | Errors | Codes | “schema mismatch” in L1 |
| validation | INVALID | Needs attention | Validation | Step issues | Whether the definition can run on a chosen input. | Status | Step messages | — |
| schema | projected_schema | Columns | Columns | Schema | Names and types at a point in the step sequence. | Data | L3 | — |
| dtype | dtype, Type | Type | Type | Physical / inferred type | Conservative type used for operations. | Column lists | Column explorer | Raw `dtype` label in L1 |
| cardinality | Cardinality | How unique | Distinctness | Cardinality | How many distinct values vs rows. | L2 columns | L3 | Bare “cardinality” in L1 |
| missingness | Missingness | Missing values | Missing values | Null percentage | Empty/missing cells by column. | Quality | — | “missingness” in L1 |
| null | NULL | (blank) | Blank / missing | null | Missing cell. Empty string is different when shown. | Preview | Technical | SQL NULL as only label |
| no-op | No changes detected, NO CHANGES | Nothing would change | No-op | no_op | Preview found no difference; don’t write a version. | Preview | flag | — |
| source | Source | Original file | Original file | Source metadata | Uploaded bytes; never replaced by cleaning. | History / More | encoding, delimiter | — |
| output version | Output | Cleaned version | Output version | output_version_id | Version created on success only. | Activity success | IDs | Implying output on failure |
| error code | error_code | (folded) | (folded) | CODE | Stable machine identifier. | Advanced | Always available | Codes as the only message |
| Exports | Exports nav | (hidden until built) | Exports | — | Not implemented. | — | Learn/roadmap | Primary nav placeholder |

**Balance rule:** After upload, the object is a **dataset** (it can have many versions). First-run copy may say **file**. Do not call a multi-version dataset “a file” in History.

## 4. Status language (UI labels)

Backend enums **do not change**. UI maps:

### Dataset `status`

| Backend | UI |
| --- | --- |
| pending | Waiting |
| processing | Working |
| ready | Ready |
| failed | Couldn’t finish |

### Profile status

| Backend | UI |
| --- | --- |
| NOT_PROFILED | Not analyzed |
| PROFILING | Analyzing |
| READY | Analyzed |
| FAILED | Analysis didn’t finish |

### Workflow `status`

| Backend | UI |
| --- | --- |
| DRAFT | Draft |
| READY | Ready |
| INVALID | Needs attention |
| ARCHIVED | Archived |

### Job / run execution

| Backend | Beginner UI | Notes |
| --- | --- | --- |
| QUEUED | Waiting | |
| RUNNING | Running | |
| SUCCEEDED | Completed | Output version is the evidence of success. |
| FAILED | Needs attention | |
| CANCEL_REQUESTED | Stopping | Not cancelled yet |
| CANCELLED | Cancelled | |

Do not map SUCCEEDED to “Success” if no output version exists; that must not happen if the engine is correct — if it does, treat as error.

### Job progress

Keep real step progress. Do not animate fake percentages. Copy may say “Step 2 of 4” from `progress` fields.

## 5. Trust patterns (verbatim targets)

**Upload.** “FACILIO stores your original file. Upload does not clean or rewrite values.”

**Analyze.** “Analysis does not change your data. It measures what’s there.”

**Preview.** “Preview doesn’t save changes.”

**Apply (one operation).** “FACILIO will create a new version. Your original stays unchanged.”

**Run saved cleanup.** “This runs in the background. If it finishes, FACILIO adds one cleaned version. Your original stays unchanged.”

**Cancel.** “FACILIO will stop after the current step. No cleaned version is created. Your input version stays as it is.”

**Failure (transform/workflow/job).** “No cleaned version was created. Your input data is unchanged.”

**Use this version.** “You’ll work from this version next. Other versions, including the original, are kept.”

**Delete dataset.** “This permanently removes the dataset and its stored original file. This cannot be undone.”

**Delete workflow.** “This removes the saved cleanup definition. Past activity and dataset versions are not deleted.”

## 6. Error structure

1. Human headline  
2. What happened  
3. What happened to my data  
4. What I can do (buttons)  
5. Technical details (collapsed): `code`, request id if present  

### Categories → headline direction

| Category | Headline direction | Data fate | Actions |
| --- | --- | --- | --- |
| Upload format/size/empty | “This file can’t be uploaded” | Nothing stored (or staging for sheets) | Choose another file / pick sheet |
| Sheet required | “Choose a worksheet” | Staging kept | Select sheet |
| Analysis failed | “Analysis didn’t finish” | File unchanged | Try again |
| Transformation preview/apply | Specific (column, type, no-op) | Unchanged / no new version | Change settings, pick column |
| Compatibility | “This cleanup doesn’t match this file” | Unchanged | Other version / edit cleanup |
| Queue unavailable | “Can’t start in the background right now” | Unchanged | Retry, check status |
| Job failed | “This cleanup didn’t finish” | No output version | Open details; Retry if retryable |
| Retry not allowed | “This can’t be retried” | Unchanged | Run the cleanup again |
| Not found | “We can’t find that” | — | Back to list |
| Network | “FACILIO couldn’t reach the server” | Unknown until retry | Retry |
| Database | “Saved data isn’t available” | — | Retry |
| Unexpected UI | “Something went wrong” | — | Reload |

Use API `message` in “what happened” when it is already human (`COLUMN_NOT_FOUND` messages are). Do not show the code as the title.

## 7. Empty-state templates

Never use one sentence for all empty kinds.

| Kind | Pattern |
| --- | --- |
| True empty | Purpose + why + primary action + optional sample + optional Learn |
| Not analyzed | “Analysis hasn’t run” + Analyze |
| No problems | “No problems detected on this version” + not a quality 100 claim + View data |
| Filtered empty | “No problems match these filters” + Clear filters |
| Failed to load | Error pattern + Retry |
| Upcoming | Not in primary nav. If shown: “Not available in this build.” |

### Copy targets (replace 8A-1 strings)

| Current (bad) | Better |
| --- | --- |
| “Manage and inspect data sources used by FACILIO workflows.” | “Upload a spreadsheet or JSON file. FACILIO keeps the original and helps you find problems.” |
| “Persisted sources and their current immutable versions…” | “Your uploaded data and cleaned versions.” |
| “Design reusable transformation pipelines and execute them against any compatible dataset version.” | “Save cleanup steps and use them again on matching data.” |
| “A workflow is a definition. A run is one execution against one immutable version.” | “A saved cleanup is the recipe. Activity is one time you used it.” |
| “Reusable linear pipelines built on the Phase 5 transformation engine.” | “Saved cleanups you can preview and run.” |
| “Domain records of pipeline executions. Operational scheduling lives on Jobs.” | *(Remove from primary UI.)* “Every time a saved cleanup runs.” |
| “Platform execution of queued workflow runs. PostgreSQL stores history; Redis only dispatches work.” | *(Health/advanced only.)* |
| “No pipeline executions yet” / “No jobs yet” | “Nothing has run yet. Run a saved cleanup to see it here.” |
| “No datasets in this workspace” | “No data yet.” |
| “Dataset not profiled” / “Analysis is separate from upload…” | “Not analyzed yet. Analysis doesn’t change values — it finds problems you can fix.” |
| “Transform data” (primary) | “Clean data” (after analysis); before analysis primary is “Analyze data” |
| “Apply transformation” | “Create cleaned version” |
| “Restore as current” | “Use this version” |
| “Prepare fix: …” | “Preview this fix” |
| “Intelligent Data Operations Platform” as the only Home story | Keep as product line; Home headline becomes goal language (see architecture). |
| Capability cards: Versioned API, SQLAlchemy, Redis/RQ | Not on Home. Settings/Learn/advanced health. |

## 8. Success patterns

Always answer: happened / changed / did not change / where / next.

| Event | Direction |
| --- | --- |
| Upload | Stored original. Not cleaned. Open dataset. Next: analysis (8B may start it). |
| Analysis | Measurements ready. Data unchanged. Next: Problems. |
| One-step clean | New version Vn. Original unchanged. Viewing new version. Next: review / save cleanup. |
| Workflow created | Recipe saved. Data unchanged until Run. Next: Preview or Run. |
| Preview ready | No version written. Next: Run or Apply. |
| Workflow started | Waiting/running in Activity. Original unchanged. Next: View activity. |
| Activity done | Output version exists. Original unchanged. Next: Open cleaned version. |
| Use this version | Current pointer moved. Nothing deleted. |

No toast-only for upload, apply, or run start. Inline confirmation + next CTA. Toasts may duplicate, not replace.

## 9. Writing examples (bad → better)

| Bad | Better |
| --- | --- |
| Configure, preview, then apply / Working from V2. A new immutable version is created on apply. | Preview first. Creating a cleaned version won’t change V1 (original). |
| Job queued / The workflow is executing in a worker process. This page did not wait for completion. | Cleanup started. You can leave this page. Follow it in Activity. |
| Equal weighting of assessed dimensions only. | Score uses only the checks FACILIO could measure, equally. It is not a guarantee the data is correct for your business. |
| Projected quality is computed on the ephemeral result. Nothing is persisted. | This preview is not saved. Quality shown here is an estimate for the result if you run it. |
