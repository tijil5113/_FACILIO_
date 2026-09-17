# FACILIO experience architecture

Shipped product experience. Implementation lives in the application; this document explains the mental model.

Companion: [language-system.md](language-system.md), [navigation-blueprint.md](navigation-blueprint.md).

Grounded in Phase 8A-1 and current code: `app/router.tsx`, `lib/navigation.ts`, dataset workspace tabs, `TransformWorkspace`, `WorkflowBuilder`, `JobsPage` / `RunsPage`, `docs/workflows.md`, `docs/jobs.md`.

---

## 1. Executive decisions (locked)

1. **Primary nav:** Home, Datasets, Cleanups, Activity, Learn, Settings. **Exports and Data Quality leave primary nav.** Runs leave primary nav.
2. **Runs + Jobs:** One user event **Activity**. Database models stay separate. UI composes Job (operations) + WorkflowRun (domain). Default list/detail = `/jobs`. `/runs` remains, unlinked.
3. **Dataset workspace:** Overview, Data, Problems, Clean, History. Quality is a **summary**, Problems is the **action list**. Source/column physics → More / Technical details. Analyze is primary until analyzed; Clean is not the first header CTA.
4. **Quality vs Problems:** Quality = how healthy evidence looks. Problems = what to fix. Same profile. Score never equals business truth.
5. **Clean vs Transform:** L1/L2 primary verb **Clean**. “Transformation” is standard/help. Codes are L3.
6. **Workflow vs Saved cleanup:** Nav **Cleanups**. First teach “saved cleanup.” **Workflow** remains the standard/technical name (routes, APIs, Learn advanced).
7. **Versions:** Keep Vn. Labels: Original, Cleaned version, Using this version, Viewing. CTA **Use this version**. Parent → Previous version. Lineage L3.
8. **Home:** Public `/` is discovery. Application Home remains `/overview` (start/continue). Health compact when healthy. No API/SQLAlchemy/Redis capability grid as the story. `/login` and `/signup` are visual preparation only — authentication is not implemented.
9. **First-run:** Upload or optional labeled sample. **Never auto-apply cleanup.** **8B:** auto-start **analysis** after successful upload (inspect-only) with visible Analyzing state.
10. **Sample:** Real engine via normal upload/profile/transform/workflow/job APIs. Clearly labeled. Deletable. No fake scores.
11. **Help:** Contextual drawer, page-aware. Question first, then actions, Learn more, optional Technical details.
12. **Learn:** `/learn` hub plus one module at a time, with real product CTAs. Not a README dump.
13. **Advanced pattern:** “Technical details” disclosure per page. Not a second app.
14. **Exports:** Hidden until implemented.
15. **System health:** `CompactHealth` always. Full panel in Settings and on **degraded** Home. Home healthy ≠ architecture dashboard.
16. **Guided cleanup execution:** **One composed pipeline, one output version** (Phase 6 `execute_pipeline` semantics), not N Phase 5 versions. Fail/cancel ⇒ no output version.
17. **Manual → reusable:** After a chain of applies, “Use these steps again” walks lineage transformations into `createWorkflow` + steps. Guided run offers the same after success.

---

## 2. Core user mental model

```text
BRING DATA          upload / sample          Dataset + ORIGINAL version
    ↓
UNDERSTAND IT       preview + analysis       Profile on a version (no value rewrites)
    ↓
FIND PROBLEMS       issues + quality         QualityIssues + scores
    ↓
FIX THEM            clean preview            Registry ops; preview APIs
    ↓
REVIEW THE RESULT   new version              DERIVED version; original bytes intact
    ↓
REUSE THE CLEANUP   saved cleanup            Workflow definition + revision
    ↓
SEE WHAT HAPPENED   activity                 WorkflowRun + Job (+ attempts)
```

| Stage | Backend that already powers it |
| --- | --- |
| Bring | `POST /datasets`, storage, V1 ORIGINAL |
| Understand | Preview endpoints, `runDatasetProfile` / get profile |
| Problems | Issues + quality + column profiles |
| Fix | Transformation catalog, preview, apply **or** workflow preview/run |
| Review | Versions, lineage, comparison, quality delta |
| Reuse | Workflow CRUD, steps, validate, revision snapshots |
| Activity | Job + WorkflowRun, cancel, retry, worker |

---

## 3. Experience levels

One product. Three disclosures.

**L1 Guided:** goals, suggested fixes, safety sentences, Activity statuses.  
**L2 Standard:** dataset, version, quality, workflow, parameters, history.  
**L3 Advanced:** IDs, codes, types, lineage graph semantics, revision, attempts, worker, heartbeat, queue, encoding.

| Concept | Default | How to go deeper | L3 actionable? |
| --- | --- | --- | --- |
| Dataset | L2 (L1 “file” on upload) | Open dataset | Rename/delete L2 |
| Analysis | L1 Analyze | Dimension cards, profile meta | Re-analyze |
| Quality score | L1 number + caveat | Dimensions | Read-only |
| Problems | L1 | Evidence, codes | Preview fix |
| Clean | L1 display names | Parameters | Codes read-only; params actionable |
| Version | L1 Original / Cleaned / Using | History list | Use this version |
| Lineage | L2 history | Technical details | Read-only |
| Saved cleanup | L1 | Builder config | Revision, snapshots |
| Compatibility | L1 sentence | Per-step issues | Edit steps |
| Activity | L1 status | Job/run IDs, attempts | Cancel/Retry |
| Health | L1 compact | Settings full panel | Retry fetch |
| Source file | L2 “original file” | encoding, delimiter | Read-only |

---

## 4–5. Language

See [language-system.md](language-system.md). Implementation must obey that map.

---

## 6–7. Information architecture and nav

See [navigation-blueprint.md](navigation-blueprint.md).

**Overview** is **Home** (repositioned). **Datasets** stay. **Workflows** relabel **Cleanups**. **Runs+Jobs** → **Activity**. **Quality** unlinked rollup. **Exports** hidden. **Settings** stay. **Learn** future.

---

## 8. Activity model (Runs + Jobs)

**CURRENT truth** (`docs/jobs.md`): WorkflowRun = domain execution; Job = queue/claim/attempts/heartbeat/cancel/retry. One job ↔ one run. Retries add attempts, not extra runs or extra outputs.

**LOCKED UX:** User thinks **“FACILIO ran my saved cleanup.”** One Activity item.

Do **not** merge SQLAlchemy models.

### List (Jobs API)

Show: cleanup name, dataset name, beginner status, step progress label, started/queued time, output version if any. Do not lead with UUID. Link to `/jobs/:id`.

### Detail (compose `getJob` + `getWorkflowRun` in the UI)

**Beginner:** status sentence, progress, dataset, input version, output version or “none,” Cancel/Retry/Open cleaned version, data-fate callout (already strong on `JobDetailPage`).

**Standard:** step timeline using **display names** (catalog map from `operation_code`), duration, quality before→after, snapshot revision.

**Advanced disclosure:** Job ID, Run ID, attempts, worker, heartbeat, queue/execution ms, error codes, raw operation codes.

### Controls

| Control | When | Uses |
| --- | --- | --- |
| Cancel | QUEUED or RUNNING | `cancelJob` |
| Retry | FAILED and `retryable` | `retryJob` |
| Run cleanup again | FAILED not retryable / user wants new run | `runWorkflow` |
| Open cleaned version | output_version_id | Dataset `?version=` |
| Historical snapshot | Always on the run | Existing `workflow_snapshot` / step snapshots — show as “Steps that ran” not live definition |

### Routes

`/jobs` = Activity. `/runs` unlinked. Optional later: from run detail, “View activity” via job id if exposed; if run payload lacks job id, keep run page as advanced.

---

## 9. Home architecture

**CURRENT:** Tagline, long platform paragraph, stats including derived versions/jobs, full `SystemHealthPanel`, capability cards (API, SQLAlchemy, Redis/RQ, Phase 6), upcoming Exports, quick nav chips.

### Hierarchy — first-run (empty)

1. Product name  
2. **Headline (goal):** Turn messy data into data you can trust.  
3. One sentence: Upload a file, see problems, clean with preview, keep the original.  
4. **Primary:** Upload a file  
5. **Secondary (8B):** Try FACILIO with sample data  
6. Optional: Understand / Clean / Reuse as *explanations*, not three competing primaries  
7. Compact health only if not healthy; else omit or tiny  
8. No capability grid  

### Hierarchy — returning

1. Continue: last dataset, last activity, cleanups needing attention  
2. Stats **user cares about:** datasets, cleanups, activity waiting/failed (not “transformations applied” as hero)  
3. Quality needing attention (reuse `getQualityOverview`)  
4. Upload secondary  
5. Compact health  

### Hierarchy — degraded

1. Actionable warning (API/DB/queue/worker)  
2. What the user can still do (upload may fail if DB down — say so)  
3. Technical health expandable  
4. Rest of Home if usable  

**8A-3:** Remove architecture cards and infra sentences from Home; retitle toward goal; keep stats if cheap; **do not** build sample or tour. **8B:** sample, continue-work layout, auto-analyze messaging.

---

## 10. First-run experience

Not a mandatory tour.

| Step | Automatic? | Never automatic |
| --- | --- | --- |
| Land public Home | `/` is the public landing | Forced modal tour |
| Open FACILIO | User → `/overview` | Treat public Home as the workspace |
| Upload or sample | User | Silent demo as “your” data |
| Analysis | **8B: start after upload**, visible | Hidden analysis |
| Open Problems | Prompt after analysis | Skip problems |
| Preview fix | User | Apply without preview |
| Create version | User | Any cleanup apply |
| Safety explanation | Contextual after first version | Nag every click |
| Save cleanup | Optional | Creating a workflow without consent |

Skip: ignore sample, dismiss tips, use Upload only.

---

## 11. Sample / demo

| Question | Decision |
| --- | --- |
| Source | Bundled CSV/XLSX in the repo, messy on purpose (missing, spaces, dupes) |
| Label | Name prefix e.g. `Sample: Customers` + badge Sample |
| Persist | Yes, normal dataset row — otherwise quality/jobs would be fake |
| Delete/reset | User can delete like any dataset; 8B may offer “Reset sample” (re-upload) |
| APIs | Real upload, profile, issues, transform, workflow, jobs |
| Scores/progress | Real only |
| Workflows/jobs | Allowed if user proceeds; still real |

Never screenshot-only. Never hard-coded quality.

---

## 12. Dataset workspace

**CURRENT tabs:** Overview, Preview, Columns, Quality, Issues, History, Source + header Transform (primary), Analyze, Rename, Delete + version `<select>`.

**LOCKED grouping:**

| Future | Contains | Tab? |
| --- | --- | --- |
| **Overview** | Row/column summary, quality hero + caveat, “N problems”, next CTA | Yes, default |
| **Data** | Preview grid + column list (ingestion types or explorer) | Yes |
| **Problems** | Issues list + dimension snapshot / missing values as supporting | Yes |
| **Clean** | Open clean workspace (dialog or page section) | Yes — entry, not hidden behind Transform |
| **History** | Timeline, use this version, compare previous, original-file summary | Yes |
| **More** | Full source metadata, technical IDs | Not a peer tab; History link or disclosure |

**Quality vs Issues:** Quality score on Overview. Problems tab owns the list. Do not make Quality and Issues equal tabs.

**Columns vs Data:** Columns live in Data. Full `ColumnExplorer` may be “Column details” in Data.

**History vs selector:** Keep URL `?version=`. Selector shows **Viewing: Vn — Original|Cleaned** and **Using: Vn**. History is the explainer.

**Analyze:** Header primary when `NOT_PROFILED` or failed. After READY, primary becomes Review problems.

**Rename/Delete:** Overflow or secondary. Delete remains confirm-danger (`DeleteDialog` already good).

---

## 13. Dataset header / version context

Always visible:

- Dataset name  
- Format badge  
- **Viewing** version: `V2 — Cleaned version` or `V1 — Original`  
- If viewing ≠ current: note “Using V1”  
- Analysis state: Not analyzed / Analyzing / Analyzed  
- Quality if assessed, else “—”  
- Safety chip: **Original kept** (tooltip: uploaded file is never overwritten)  
- One primary CTA (see CTA table)

User must always know original vs cleaned.

---

## 14. Quality + Problems

- **Score:** “How healthy this version looks (measured checks).” Caveat always near the number.  
- **Not assessed:** dashed / “Not analyzed” — never 0.  
- **Dimensions:** keep names; L1 one-line; L2 explanation + evidence_summary (already on `DimensionCards`).  
- **Problems:** severity, title, evidence, suggested display_name. CTA **Preview this fix**.  
- **Guided cleanup (8C)** consumes the same issues + `suggested_operations`.  
- Score may go up, down, or stay after a fix (`QualityDeltaBlock` copy is the right ethic — promote it to Overview).

---

## 15. Guided cleanup architecture

**Do not implement in 8A-3.**

### Steps

1. Choose dataset + version (default: current)  
2. Show detected problems (issues API)  
3. User selects which to fix (maps to registered ops + params)  
4. FACILIO fills catalog defaults; user can edit L2  
5. **One** preview of the whole plan (`preview_pipeline` / `previewWorkflow`)  
6. Explicit approve  
7. **One** derived version on success (`execute_pipeline` / job)  
8. Result + original kept  
9. “Use this cleanup again” → persist/name workflow  

### Execution model — **B (composed), not A (N applies)**

**Why:** `docs/workflows.md` — one user intent should not pollute lineage with intermediate versions; fail must not look like partial success. Guided cleanup is one intent: “fix what I selected.”

**Why not A:** Four Phase 5 applies ⇒ V2–V5, current pointer dance, mismatch with Activity (no job unless workflow).

**8C without new engine:** Create a **draft workflow**, add steps, preview, run (job). If the user saves, patch name and keep. If they decline reuse, archive/delete definition; **runs/versions remain**. Optional later ad-hoc pipeline API to avoid draft clutter.

**Never** apply selected ops silently in a loop.

---

## 16. Manual cleaning → saved cleanup

**One-off:** `previewTransformation` / `applyTransformation` — one version per apply (Phase 5, correct).

**Guided:** composed pipeline (above).

**Saved cleanup:** Workflow.

**Bridge:** “You cleaned this with N steps” [Use these steps again]  
Walk viewed version → parents until ORIGINAL; collect `transformation.operation` + `parameters` in chronological order; skip workflow-created versions as a **single** step (don’t explode pipeline internals unless L3). Then `createWorkflow` + `addWorkflowStep`.

If the chain includes a workflow-produced version, treat that node as “saved cleanup X (revision n)” rather than flattening unless the user asks.

**Metadata today:** `Transformation.parameters_json`, lineage API, `operation_code` on version summaries. Confirm 8C against `TransformationRecord` in the lineage response.

---

## 17–18. Workflow experience and builder disclosure

**Intro copy:** “Save cleanup steps and use them again on matching data.”

**When to say Workflow:** Cleanups page subtitle, Learn, Technical details, APIs.

**Empty:** Purpose + New cleanup + optional sample path (8B) + Learn (8D).

**Create paths:** New cleanup; from guided/manual bridge; Duplicate.

**List:** Name, status (Needs attention/Ready/Draft/Archived), step count, last activity status, updated. Hide Revision by default (L3).

**Builder — one builder, three layers:**

- **L1:** Ordered cards with display names (“1. Remove extra spaces”). Add via “Add step” → picker.  
- **L2:** Column/strategy form (`OperationForm`).  
- **L3:** operation code, type constraints, compatibility list, revision, snapshots.  

**Add step:** **Do not immediately add on catalog click** in the future UX. Picker → optional configure → Add. (Current `onAdd` on click is the problem.) 8A-3 may only change copy; **behavior change is 8C/later** unless a tiny 8A-3 safety fix is explicitly scheduled — **locked: change add-step behavior with builder work, not as a drive-by in 8A-3 copy-only.**

**Reorder:** Keep keyboard up/down; drag optional.  
**Disable/delete:** Keep; confirm delete (exists for steps; **workflow delete must confirm** — currently missing).  
**Input:** Dataset + version; do not silently assume first dataset without a visible selection (current `useEffect` first item).  
**Preview / Run:** Keep; labels Preview / Run cleanup. Disable reasons in plain language (needs attention, nothing would change, archived).

---

## 19. Version experience

| Idea | Language |
| --- | --- |
| V1, V2 | Keep |
| Original | Original |
| Later | Cleaned version (plus short operation summary) |
| is_current | Using this version |
| URL version | Viewing |
| parent | Previous version |
| Restore | Use this version |
| Branch | L3: “You can use an older version without deleting later ones.” |

Safety: persistent compact **Original kept**, not a wall of warnings. Full sentence on first cleaned version success and on Source/History.

---

## 20–25. Trust, CTA, empty, success, error, status

See [language-system.md](language-system.md) and CTA table in [navigation-blueprint.md](navigation-blueprint.md).

---

## 26–28. Help, Learn, onboarding

### Help

- Entry: context bar **Help**.
- Desktop: right drawer. Mobile: full-height panel.
- Page-aware from route and dataset tab.
- No search.
- Links to the matching Learn module.
- Structure: question → short answer → What you can do → Good to know → Learn more → Technical details.  

### Learn (8D) `/learn`

Not a copied README.

| Module | Goal | Product CTA |
| --- | --- | --- |
| FACILIO in a minute | Bring → analyze → review → preview → create → reuse | Try FACILIO |
| Bring in your data | CSV, Excel, JSON and the upload limit | Open Datasets |
| Understand your dataset | Analyze measures; it does not rewrite | Open Datasets |
| Understand data quality | Score ≠ correctness; Integrity not assessed | Try FACILIO |
| Review problems | Findings with evidence; some are informational | Try FACILIO |
| Clean safely | Review → Choose → Preview → Create | Try FACILIO |
| Understand versions | Original, Viewing, Using; lineage | Try FACILIO |
| Reuse a Cleanup | Ordered steps you can run again | Open Cleanups |
| Follow Activity | Waiting, Running, Completed, Needs attention | View Activity |

### Contextual onboarding (not a blocking tour)

| Trigger | Message | Action | Dismiss | Reappear |
| --- | --- | --- | --- | --- |
| First Home | What FACILIO does | Upload | Yes | Never if dismissed |
| First upload success | Original stored; next analyze | Analyze (or 8B auto) | — | — |
| First analysis done | See problems | Problems | Yes | Never |
| First Problems | Preview doesn’t save | Preview fix | Yes | Never |
| First version created | Original kept | View History | Yes | Never |
| First cleanup page | Recipe vs one-off | New / Learn | Yes | Never |
| First Activity queued | You can leave | View activity | Yes | Never |

Store dismissals in existing **local** preferences (`preferences-store`), not a backend user model (none exists).

---

## 29–32. Commands, advanced, health, exports

See navigation blueprint. Health: Compact always; full in Settings; degraded Home. Exports remain unlinked and unavailable.

---

## 33–35. Responsive, a11y, motion

Responsive + a11y gates: navigation blueprint.

**Motion (8F only):** Teach origin/change/relationship/progress/success.

| Kind | Use | Reduced |
| --- | --- | --- |
| Fast micro | Button, dialog | Instant |
| Standard | Page enter (exists `--facilio-duration-*`) | Instant / fade 0 |
| Educational | Version appears on timeline; before→after; job state | Text + live region |

Never fake progress. Prefer `aria-live` already used for save/job progress.

---

## 36. Recruiter demo (2–3 min, future)

1. Home explains FACILIO in one sentence.  
2. Try sample (real ingest).  
3. Analysis completes (real).  
4. Problems with evidence.  
5. Preview a fix.  
6. Create cleaned version.  
7. Header shows Viewing cleaned / Original kept; History shows V1 Original.  
8. Use these steps again → named cleanup (or guided save).  
9. Run → Activity waiting/running/done.  
10. Optional Technical details / Settings health.

No fake shortcuts.

---

## 37. Beginner journey (happy path)

Home → Upload → (8B analyze) → Overview/Problems → Preview fix → Create version → optional save cleanup → Activity.

**Need not visit:** `/runs`, job attempts, Source encoding, lineage L3, `/quality` as a place, operation codes, full health.

**Still available:** Technical details, Settings, `/jobs/:id` advanced, command “Open run records.”

---

## 38. Technical user journey

Target: **≤ 2 interactions** from a dataset to preview, columns, dimensions, transform params, versions, lineage, workflow config. **≤ 2** from Activity to IDs/attempts/error codes. **1** from Settings or CompactHealth to full health.

Do not remove keyboard command palette, version query param, or APIs.

---

## 39–41. Reuse, routes, APIs

See [navigation-blueprint.md](navigation-blueprint.md).

---

## 42. UX state model

### Dataset / version

`EMPTY_WORKSPACE` · `UPLOADING` · `SHEET_SELECT` · `UPLOAD_FAILED` · `READY_NOT_ANALYZED` · `ANALYZING` · `PROFILE_FAILED` · `ANALYZED_WITH_PROBLEMS` · `ANALYZED_NO_PROBLEMS` · `CLEAN_CONFIG` · `CLEAN_PREVIEW` · `CLEAN_NOOP` · `CLEAN_APPLYING` · `CLEAN_SUCCESS` · `LOAD_FAILED` · `NOT_FOUND`

### Cleanup definition

`DRAFT` · `NEEDS_ATTENTION` · `READY` · `PREVIEWING` · `PREVIEW_READY` · `PREVIEW_NOOP` · `STARTING` · `ARCHIVED`

### Activity

`WAITING` · `RUNNING` · `STOPPING` · `DONE` · `FAILED` · `CANCELLED` · `LOAD_FAILED`

Implementation must design each, not only READY/DONE.

---

## 43. Future usability measurement (not implemented)

If analytics are added later (opt-in, no PII/file contents): time to first upload; time to first analysis; time to first cleaned version; % opening Problems; preview→apply rate; first cleanup created; Help opens; error→recovery click; drop-off Home without CTA.

**Telemetry does not exist today. Do not claim it does.**

---

## 44. Five-second test targets (future PASS)

| Page | Where | For | Do | Next | Help |
| --- | --- | --- | --- | --- | --- |
| Home | FACILIO Home | Understand and clean data | Upload or continue | Upload / continue | Help |
| Datasets | Datasets | Your files | Upload / open | Upload if empty | Help |
| Dataset | This dataset, version Vn | Understand / fix | Primary CTA | Analyze or Problems | Help |
| Problems | Problems on this version | What’s wrong | Preview fix | Preview | Help |
| Clean | Clean this version | Preview then new version | Preview | Create version | Help |
| Cleanups | Saved cleanups | Reuse steps | New / open | New if empty | Help |
| Builder | This cleanup | Edit steps, preview, run | Preview/Run | Preview | Help |
| Activity | Activity | What ran | Open item | Open if running | Help |
| Learn | Learn FACILIO | How it works | Start module | Module CTA | — |
| Settings | Settings | Appearance / status | Change prefs | — | Help |
| Mobile | Same labels | Same goals | Same primary | Same | Help sheet |

---

## 45. Human acceptance tests (future)

**A Beginner:** “Upload this customer file, find what’s wrong, clean it, keep the original.” No coaching.  
**Pass:** Upload, see problems, preview, new version, can show original.  
**Fail:** Asks what a job is; overwrites original; skips preview.  
**Record:** Path, tab used, language confusion.

**B Reuse:** “Make this cleanup reusable for another file.”  
**Pass:** Saved cleanup exists without the facilitator saying “workflow.”  
**Fail:** Rebuilds steps from memory only; creates empty workflow.

**C Activity:** “Check if it finished and open the result.”  
**Pass:** Uses Activity (or in-flow result), opens cleaned version.  
**Fail:** Needs Runs vs Jobs explained.

**D Recovery:** Incompatible file/version.  
**Pass:** Understands mismatch, data unchanged, edits cleanup or picks another version.

**E Version safety:** “View the original.”  
**Pass:** V1 Original visible, bytes not replaced.

**F Mobile:** Inspect + clean at narrow width.  
**Pass:** Complete without horizontal-only dead ends on primary actions.

---

## 46. Implementation dependencies

```text
8A-2 (this spec)
    → 8A-3 Global foundation (nav, copy, empty/error/status, hide Exports, Activity label, a11y primitives)
        → 8B Home first-run + sample + auto-analyze
        → 8C Guided cleanup + add-step behavior + bridge
        → 8E Help content + error recovery (can start after 8A-3 patterns)
        → 8D Learn (after journeys exist so CTAs work)
        → 8F Motion + remaining responsive polish
```

**Must lock before 8A-3:** nav, terminology, Activity, Exports, health placement, CTA rules (this document).  
**Must lock before 8B:** sample rules, auto-analyze.  
**Must lock before 8C:** composed execution, draft workflow approach.  
**Must lock before 8D/8E:** Help/Learn IA (this document).

---

## 47. Locked decisions checklist

Implementation **must** obey §1 plus: no fake metrics; no model merge; no silent apply; Dialog/delete confirms for dataset **and** workflow; original-file preservation; immutable versions; existing tests remain valid; themes/reduced motion/command palette kept; progressive disclosure not a second product.

---

## 48. Phase 8A-3 implementation scope

**In 8A-3:**

- Nav structure/labels: Home, Datasets, Cleanups, Activity, Settings; unlink Quality, Runs, Exports  
- Human copy on existing pages (headers, empty, jobs/runs descriptions, Overview capabilities removal or move)  
- CTA visual hierarchy on dataset header (Analyze vs Clean) **without** building Guided Cleanup  
- Status label map on chips  
- Empty-state copy kinds  
- Success/error callout copy toward the five-part pattern (without a full Help CMS)  
- Activity: relabel Jobs pages; do not delete Runs routes  
- Advanced: a consistent “Technical details” disclosure **where copy already dumps infra** (Job heartbeat can start moving)  
- Shared a11y: row links, dialog title duplication, mobile nav focus trap, command label  
- Workflow **delete confirmation** (safety)  
- Command names aligned with language  

**Wait:**

- Sample engine, tour, auto-analyze (8B)  
- Guided Cleanup flow (8C)  
- Add-step picker change (with 8C/builder)  
- Help body content (8E)  
- Learn (8D)  
- Educational motion (8F)  
- New pipeline APIs  
- Merging job/run backends  
- Implementing Exports  

---

## 49. Risks and trade-offs

| Trade-off | Choice | Why |
| --- | --- | --- |
| “File” vs “dataset” | File on first-run; dataset once versions exist | Accuracy of immutability |
| “Cleanup” vs “workflow” | Nav Cleanups; API workflow | Beginners vs honesty |
| Activity on `/jobs` not `/activity` | No new route in 8A-3 | Avoid churn; jobs payload is the right list |
| Dual fetch job+run | UI compose | No model merge |
| Auto-analyze | 8B yes, 8A-3 no | Inspect-only but still work/cost |
| Draft workflow for guided | Reuse engine | Avoid partial versions; slight catalog clutter |
| Hide Quality nav | Rollup still at `/quality` | Detached Quality confused first-run |
| Technical users extra click | Technical details | Necessary for L1 |
| Recruiter wants infra on Home | Settings/Learn | 8A-1: Home failed 5-second test |

---

## 50. Conclusion

FACILIO already behaves like a trustworthy operations product. Phase 8 must **present the core journey** — bring data, understand, find problems, fix with preview, keep the original, reuse, watch activity — **without weakening** versions, quality, the registry, workflows, jobs, or tests.

8A-3 starts that presentation (language, nav, hierarchy). It does not ship the demo, guided cleanup, or Learn.

---

*Phase 8A-2 specification. Application code is unchanged by this document.*
