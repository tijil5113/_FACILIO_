# FACILIO — VISUAL MASTERY 7

LEARN, HELP, SETTINGS & SECONDARY SURFACES IMPLEMENTATION REPORT

Evidence: `docs/ux/vm7-evidence/`

---

## 1. STATUS

**PASS, with documented screenshot gaps.**

Learn, Help, Settings, 404, missing-dataset recovery, command palette, and secondary copy now use the same product language as Home, Dataset Workspace, Guided Cleanup, Cleanups, and Activity. Gates: frontend Vitest 197, ESLint, Prettier, TypeScript, production build; API Ruff + pytest 132; processing pytest 118.

## 2. INPUT REVIEW

Read Visual Mastery 1–6 intent through shipped UX docs (`design-system.md`, `smart-home.md`, `experience-architecture.md`, `language-system.md`, `navigation-blueprint.md`) and inspected live routes for Learn, Help, Settings, theme, health, technical details, 404, errors, command palette, and terminology. Implementation followed the current product, not a future roadmap.

## 3. PRECONDITION GATE

**PASS.** VM2–VM6 foundation exists: shared primitives, shell, themes, Home, Dataset Workspace, Guided Cleanup, Cleanups, Activity. No blocker. VM7 refined existing Learn/Help/Settings rather than inventing missing primitives.

## 4. BASELINE

Captured before final VM7 polish:

- Frontend: Vitest 197 passed / 28 files; lint, format, typecheck, production build passed after two ESLint test fixes.
- API: Ruff format/check; pytest 132 passed.
- Processing: pytest 118 passed.

Representative live screens: Learn, Help, Settings (healthy), 404, missing dataset, technical details, command palette.

## 5. FILES CHANGED

Primary VM7 surfaces:

- `apps/web/src/features/education/concepts.ts` — shared Learn/Help truth
- `apps/web/src/features/learn/*` — hub, pager, nine modules, diagrams, examples
- `apps/web/src/features/help/*` — question-first contextual drawer
- `apps/web/src/pages/SettingsPage.tsx`, `features/system-health/*`
- `apps/web/src/pages/NotFoundPage.tsx`, `ExportsPage.tsx`, `ErrorBoundary.tsx`, `RouteCrash.tsx`
- `apps/web/src/lib/status-labels.ts`, `features/recovery/error-map.ts`, `features/command-palette/commands.ts`
- Tests: `learn.test.tsx`, `help.test.tsx`, `settings.test.tsx`, `system-status.test.ts`, `not-found.test.tsx`
- Docs: README, experience-architecture, navigation-blueprint, language-system, this report

Deleted: `LearnModules.tsx` (single scrolling wall).

## 6. LEARN ARCHITECTURE

`/learn` is a hub **or** one module, selected by hash (`#start` … `#activity`). Topic nav on desktop; topic select on small screens. Module pager: overview / previous / next. Content lives in `features/learn/modules/*` plus `concepts.ts`. No markdown runtime, no course engine.

## 7. LEARN OVERVIEW

Title: **Learn FACILIO**. Subtitle: understand the ideas and use the product safely. Start card: **Start with FACILIO in a minute**. Journey numbered 01–09. Try-it actions use live routes.

## 8. LEARNING JOURNEY

1. FACILIO in a minute  
2. Bring in your data  
3. Understand your dataset  
4. Understand data quality  
5. Review problems  
6. Clean safely  
7. Understand versions  
8. Reuse a Cleanup  
9. Follow Activity  

Nine modules match current product. No fake extra lessons.

## 9. FACILIO IN A MINUTE

Teaches Bring data → Analyze → Review problems → Preview cleaning → Create cleaned version → Reuse cleaning steps. Remembers: analyze measures; preview does not save; cleaned version is new; original stays.

## 10. EDUCATIONAL VISUAL SYSTEM

Uses established signatures: numbered process spine, Before/After, V1 Original → V2/V3 Cleaned, Problem → suggested action, Cleanup ordered steps, Activity statuses. No stock photos, robots, sparkles, or cloud cartoons.

## 11. MINI DATASETS

Educational tables are labelled **Example / Fictional teaching data. Not analysis of your files.** Example: `" Alice "` / `ACTIVE`, `"Bob"` / `active`, `Missing` / `ACTIVE`.

## 12. MODULE STRUCTURE

Each module answers what it is, why it matters, what FACILIO does, what to remember, and where to try it. Technical details are optional disclosures.

## 13. LEARN NAVIGATION

Desktop topic list + in-module pager (Learn overview, Previous, Next). Mobile topic `<select>`. Hash deep links work (`/learn#quality`).

## 14. TRY-IT ACTIONS

Real routes: Try FACILIO (`/overview?try=1`), Open Datasets, Review Problems, Open Cleanups, View Activity. No fake destinations.

## 15. BRING DATA EDUCATION

CSV (UTF-8), Excel `.xlsx` with sheet choice, JSON as a list of objects. Size: Datasets page shows the installation limit; default local 16 MB. Not a cloud connector.

## 16. ANALYSIS EDUCATION

FACILIO examines measurable properties: structure, inferred types, missing values, duplicates, supported validity/consistency. It does not know business truth (example: missing age vs correct age).

## 17. QUALITY EDUCATION

Dimensions: Completeness, Uniqueness, Validity, Consistency, Integrity. Score summarizes supported checks. Not gamified.

## 18. QUALITY DISCLAIMER

“FACILIO's quality score summarizes supported measurable checks. It does not prove the data is correct for its real-world purpose.”

## 19. INTEGRITY / NOT ASSESSED

Integrity is not assessed. Not assessed is not 0 and not 100. Not-assessed dimensions are excluded from the overall mean.

## 20. QUALITY EXAMPLE

Deterministic example from `packages/processing/tests/test_quality.py`: 1 of 6 cells missing → Completeness 83.3; three distinct rows → Uniqueness 100; overall `round((83.3+100)/2, 1) = 91.7`. Validity/Consistency/Integrity not assessed here.

## 21. PROBLEMS EDUCATION

Problems are findings from supported checks, not necessarily catastrophic. FACILIO shows what, where, evidence, and a suggested action when a safe cleanup exists.

## 22. INFORMATIONAL FINDINGS

Some findings are informational. FACILIO should not automatically change them. Invalid email format is an example in the live product.

## 23. CLEANING EDUCATION

Review → Choose → Preview → Create. FACILIO does not silently overwrite the original or current version.

## 24. COMPOSED PREVIEW EDUCATION

`" Alice "` → trim → `Alice` → lowercase → `alice`. Preview shows the combined final result, not intermediate saves.

## 25. VERSION EDUCATION

V1 Original is the uploaded file. V2+ cleaned versions are new snapshots. Versions remain available.

## 26. VERSION LINEAGE EDUCATION

Vertical diagram: V1 Original → V2 Cleaned → V3 Cleaned. Branching is disclosed as optional and “not Git.”

## 27. VIEWING VS USING EDUCATION

Viewing = version on screen. Using = working default. Use this version does not delete other versions.

## 28. CLEANUP EDUCATION

A Cleanup is a saved ordered set of cleaning steps. Example: Trim name; Lowercase status; Fill missing age. Primary term is Cleanup, not Workflow.

## 29. STEP-ORDER EDUCATION

Steps run top to bottom. Order can change the result.

## 30. ACTIVITY EDUCATION

Waiting, Running, Completed, Needs attention — matching VM6 language.

## 31. PARTIAL-SUCCESS EDUCATION

A cleaned version may be created even if analysis cannot finish afterward. Cleanup succeeded; analysis needs attention. Failure before output leaves the input unchanged.

## 32. TECHNICAL CONCEPT DISCLOSURE

DatasetVersion, Workflow, Job, worker, snapshot appear only in Technical details. Beginner copy does not require them.

## 33. HELP ARCHITECTURE

Right `Drawer`, page-aware from pathname + dataset tab. Structure: question → summary → What you can do → Good to know → Learn more → optional Technical details. No search engine.

## 34. GLOBAL HELP

Context-bar Help control. Discoverable, not dominant. Command: Get Help. Escape closes and restores focus.

## 35. CONTEXTUAL HELP

Contexts: Home, Datasets, Overview, Data, Problems, Clean, Guided Cleanup, History, Cleanups, builder, Activity, Learn, Settings, Quality overview, run records, Exports.

## 36. OVERVIEW HELP

Question: What does quality mean? Matches dataset Overview.

## 37. PROBLEMS HELP

Question: Why did FACILIO flag this? Distinguishes informational findings.

## 38. GUIDED CLEANUP HELP

Question: What happens to my original version? Suggestion → selection → preview → new version; original preserved.

## 39. HISTORY HELP

Question: What does Using mean? Viewing vs Using; Original stays.

## 40. CLEANUPS HELP

Question: What is a Cleanup? Ordered reusable steps. Builder Help: why step order matters.

## 41. ACTIVITY HELP

Question: Why does this say Needs attention? Partial success and failed-before-output are in Good to know.

## 42. TECHNICAL-DETAIL HELP

“Technical details exist for debugging, support, and advanced review. You do not need IDs for ordinary work.”

## 43. HELP CONTEXT PRESERVATION

Drawer overlays the current page. Learn more links into Learn then close Help. Task context is not a full navigation away.

## 44. SETTINGS ARCHITECTURE

Appearance, Application, System status, About. No Profile, Password, Billing, Team, API keys.

## 45. APPEARANCE

Light / Dark / System. Current selection is obvious. Copy: “System follows your device setting.” Motion: System / Reduced / Full.

## 46. THEME PERSISTENCE

Existing `facilio.preferences` localStorage + Zustand. No second storage mechanism. Tests confirm Dark persists.

## 47. SYSTEM STATUS

Application, Database, Background processing. Deeper than CompactHealth. Refresh status button; no aggressive Settings polling.

## 48. HEALTH TRUTH

Uses `/health`, `/readiness`, and `/operations/health`. Does not infer healthy from `/health` alone if the worker/queue is down. CompactHealth remains “Healthy” when quiet; Settings uses Available / Limited / Unavailable.

## 49. DATABASE STATUS

Human: Database available / saved data isn’t available. No connection strings. `safeTechnicalMessage` strips `DATABASE_URL`, `REDIS_URL`, tokens, `postgres://`.

## 50. BACKGROUND PROCESSING STATUS

Primary language: Background processing. Technical details may show Redis / RQ and worker last seen.

## 51. WORKER STATUS

Authoritative periodic heartbeat (`WORKER_HEARTBEAT_SECONDS * 3`). Not inferred from process existence.

## 52. DEGRADED EXPLANATION

“Background processing is unavailable. You can still browse datasets, but saved Cleanups cannot start right now.”

## 53. HEALTH REFRESH

Refresh status refetches health, readiness, and operations. Tests cover recovery after refresh.

## 54. APPLICATION INFORMATION

FACILIO, version from health or `APP_VERSION` (`0.1.0`), Environment Local/Production. No fabricated semver.

## 55. ABOUT FACILIO

Tagline plus `CONCEPTS.product.what`. Not a marketing manifesto.

## 56. LIMITATIONS

Formats, size limit, Integrity not assessed, background-processing dependency, local storage. Honest current boundaries only.

## 57. 404

“Page not found.” “The page you’re looking for doesn’t exist or may have moved.” Actions: Go Home, Datasets. No joke copy. Native shell.

## 58. GLOBAL ERROR

ErrorBoundary: “This page couldn’t be shown.” What happened, data unchanged, Try again, Go Home, optional Technical details.

## 59. ROUTE ERROR

`RouteCrash` on the shell `errorElement`. Same recovery pattern. A route failure does not invent a new shell.

## 60. MISSING DATASET

“We couldn't find this dataset.” May have been deleted or the link is invalid. No dataset was changed. View datasets. Not a generic browser 404.

## 61. UNSUPPORTED FILE

“FACILIO supports CSV, Excel and JSON files.” Client validation in UploadDialog plus API `UNSUPPORTED_FILE_TYPE`.

## 62. OVERSIZED FILE

`mapRecoveryError` interpolates `maxUploadSizeMb` from the datasets contract: “This file is larger than FACILIO's current {n} MB upload limit.” Default local 16 MB.

## 63. UNSUPPORTED ACTION

Disabled controls use existing DisabledHint / compatibility copy. Builder Help explains empty/disabled steps cannot run. No new fake actions.

## 64. EXPORTS TRUTH

`/exports` is unlinked and states downloading cleaned files is not available. Not advertised as production-ready. VM7 did not implement exports.

## 65. DEAD ROUTE AUDIT

See §134. `/quality` and `/runs` remain unlinked advanced routes. `/exports` honest unavailable. No accidental stale Phase UI.

## 66. DEAD CONTROL AUDIT

Command palette, nav, and Help point at real routes. Exports is not in primary nav. Get Help opens the drawer.

## 67. COMMAND PALETTE

Get Help, Learn FACILIO, Go to Settings, Open Datasets/Cleanups/Activity, Learn about quality/versions/cleanups. Human labels. Quality overview and Open run records remain advanced.

## 68. TECHNICAL DETAILS STANDARDIZATION

Shared `TechnicalDetails` on errors, health, Activity, Problems, versions, Learn, Settings.

## 69. TECHNICAL DETAIL SAFETY

Health messages filtered for secrets. Errors show codes/IDs/operation, not stack traces or env vars. Copy diagnostics remain sanitizing.

## 70. TERMINOLOGY AUDIT

See §133. Beginner UI: Cleanup, Activity, Dataset, Problems, Quality. Workflow/Job/pipeline kept as technical.

## 71. STATUS LANGUAGE AUDIT

Waiting, Running, Completed, Needs attention via `jobStatusLabel`. SUCCEEDED → Completed; FAILED → Needs attention. Not mixed with Done/Finished.

## 72. VERSION LANGUAGE AUDIT

Original, Cleaned, Viewing, Using consistent through Learn, Help, History, Settings About.

## 73. CLEANUP LANGUAGE AUDIT

Primary UI: Cleanup. Workflow remains API/route/technical name.

## 74. DATA LANGUAGE AUDIT

Dataset, Rows, Columns, Problems, Quality.

## 75. MICROCOPY AUDIT

Specific actions: Start with FACILIO in a minute, Refresh status, Go Home, Try again, View datasets. Avoided generic Continue/Execute in these surfaces.

## 76. DIALOG COPY

Existing Delete Cleanup / Delete dataset dialogs name the object and consequence. VM7 did not add vague “Are you sure?” dialogs.

## 77. TOOLTIP DISCIPLINE

Help and Learn carry primary explanation. Tooltips remain secondary.

## 78. EMPTY-STATE CONSISTENCY

Exports, Quality overview, missing dataset, 404 answer what is empty/missing, why, and what to do.

## 79. LOADING CONSISTENCY

Settings health uses Skeleton + “Checking system status…”. RouteFallback unchanged. No new spinner family.

## 80. ERROR CONSISTENCY

Human explanation → recovery action → Help/Learn link → Technical details.

## 81. SUCCESS / WARNING CONSISTENCY

Theme change has no giant success surface. Activity “Needs attention” is warning-worthy. Integrity not assessed uses neutral, not warning-as-failure.

## 82. 1440 QA

**PASS.** Learn three-column (app nav + topic nav + module) readable. Process diagram is a vertical spine so six steps no longer wrap mid-flow.

## 83. 1280 QA

**PASS** (layout). Same grid; content `min-w-0`. Dedicated 1280 PNG not captured; 1440 evidence applies.

## 84. 1024 QA

**PASS** (layout). Topic nav remains until `lg`; below that, topic select. Dedicated PNG not captured.

## 85. 768 QA

**PASS** (layout). Mobile chrome + topic select. Dedicated PNG not captured.

## 86. 430 QA

**PASS** via 390 capture (aliased). Single column.

## 87. 390 QA

**PASS.** Learn, Help, Settings captured.

## 88. MOBILE LEARN

Topic select, title, concept, example, next action. Navigation via hamburger remains reachable.

## 89. MOBILE HELP

Full-height focused drawer. Close control, question-first copy.

## 90. MOBILE SETTINGS

Single column. Theme radios, status stacked (not a tiny three-column dashboard).

## 91. ACCESSIBILITY — LEARN

Logical headings, labelled lists/tables, diagram `aria-label` / `sr-only` text, named links, keyboard topic nav and pager.

## 92. DIAGRAM ACCESSIBILITY

Process, lineage, and composed preview have textual equivalents. Decorative arrows/`↓` are `aria-hidden`.

## 93. ACCESSIBILITY — HELP

Dialog labelled by title, focus to close control, Escape, focus restore to Help trigger, tab trap in Drawer.

## 94. ACCESSIBILITY — SETTINGS

Theme/motion/sidebar are labelled radiogroups. Status uses text labels plus tone (non-color). Refresh labelled.

## 95. ACCESSIBILITY — ERRORS

404/missing dataset/global errors use headings. RecoveryMessage associates explanation with the failure. Technical details optional.

## 96. REDUCED MOTION

Existing preference zeroes duration tokens. Learn connectors remain understandable without animation.

## 97. MOTION

Restrained: Help open, page-enter, disclosures. No educational spectacle.

## 98. LIGHT THEME

Learn, Help, Settings, 404, missing dataset inspected in Light.

## 99. DARK THEME

Learn overview, Help, Settings, workspace Help inspected in Dark. Mini datasets and diagrams use tokens (`bg-surface`, `border-line`).

## 100. SYSTEM THEME

System option explained and stored. Resolve uses `prefers-color-scheme`. Existing persistence path.

## 101. PERFORMANCE

No documentation framework, markdown engine, diagram library, animation library, or search dependency. Learn chunk ~27 kB / 7.6 kB gzip.

## 102. LEARN CONTENT MAINTAINABILITY

Topics in `learn-topics.ts`, modules as separate files, shared `CONCEPTS`. Not one 2,000-line page.

## 103. HELP CONTENT REUSE

Help pulls summaries from `CONCEPTS` and stays shorter. Learn modules expand the same source.

## 104. CONTENT-DRIFT PREVENTION

`concepts.ts` is the shared source for quality disclaimer, Integrity, viewing/using, Cleanup, Activity, limits.

## 105. DOCUMENTATION RECONCILIATION

Updated README product walkthrough, experience-architecture primary nav + Help/Learn, navigation-blueprint CURRENT nav, exports truth. Historical 8D/8E notes left as history where they do not contradict shipped nav.

## 106. README TRUTH

README states FACILIO does not export, authenticate, schedule, or use an LLM. Formats CSV/XLSX/JSON, 16 MB, Integrity `NOT_ASSESSED`, worker required for saved Cleanups.

## 107. FIRST-TIME LEARNING TEST

**PASS.** Overview + nine modules answer what FACILIO does, files, Analyze, Quality, Problem, Clean, Original survival, Cleanup, Activity.

## 108. CONTEXTUAL HELP TEST

**PASS.** Home, Overview, Problems, Guided Cleanup, History, Cleanups, Activity each open a relevant question without leaving the page.

## 109. QUALITY EDUCATION TEST

**PASS.** Does not teach score = correctness percentage. Integrity not assessed explained.

## 110. VERSION EDUCATION TEST

**PASS.** Original, Cleaned, Viewing, Using.

## 111. CLEANUP EDUCATION TEST

**PASS.** Cleanup, ordered steps, reuse.

## 112. ACTIVITY EDUCATION TEST

**PASS.** Four statuses + partial success.

## 113. DEGRADED SETTINGS TEST

**PASS** (automated). Worker unavailable → Unavailable + consequence. Live worker was running during screenshots; healthy live shot captured.

## 114. HEALTH RECOVERY TEST

**PASS** (automated). Refresh after worker returns shows “Saved Cleanups can start in the background.”

## 115. DATABASE-DOWN TEST

**PASS** (automated). Copy has no `DATABASE_URL` / `postgres://`.

## 116. REDIS-DOWN TEST

**PASS** (automated via operations/queue unavailable). Consequence language is background processing, not a Redis admin console. Live Redis-down not simulated against the running stack.

## 117. UNKNOWN ROUTE TEST

**PASS.** `/this-page-does-not-exist` → polished 404.

## 118. MISSING DATASET TEST

**PASS.** Invalid UUID route → specific not-found.

## 119. UNSUPPORTED FILE TEST

**PASS** (automated + UploadDialog copy). Live OS file picker not driven in this session.

## 120. OVERSIZED FILE TEST

**PASS** (automated with configured MB). Live oversized blob not uploaded in this session.

## 121. COMMAND PALETTE TEST

**PASS.** Get Help, Learn FACILIO, Go to Settings, Open Datasets/Cleanups/Activity present and wired.

## 122. DEAD UI AUDIT

**PASS** within phase. No TODO-visible UI on Learn/Help/Settings/404. `/exports` honest. Advanced `/quality` and `/runs` unlinked.

## 123. BEGINNER TEST

**PASS.** Learn/Help/Settings do not require Flask, pandas, Redis, RQ, SQLAlchemy, DatasetVersion, or Pydantic.

## 124. RECRUITER TEST

**PASS.** Secondary surfaces match primary product quality. No unfinished Help or unstyled Settings.

## 125. PROFESSOR TEST

**PASS.** Quality formula, Integrity, composed preview, partial success, and heartbeat health are accurate.

## 126. TECHNICAL REVIEWER TEST

**PASS.** Technical details on Settings, Activity, Learn, errors. Primary UI stays human.

## 127. PREMIUM TEST

**PASS.** Learn hub, Help drawer, and Settings use the same tokens, type, and shell as Home and Dataset Workspace.

## 128. EDUCATION TEST

**PASS.** Modules teach with examples and diagrams, not feature lists.

## 129. HELP TEST

**PASS.** Help answers the question likely asked on that page.

## 130. SETTINGS TEST

**PASS.** Only real settings/status. No fake SaaS account controls.

## 131. RESTRAINT TEST

**PASS.** No course progress, fake badges, giant illustration, or health dashboard of gauges.

## 132. PRODUCT-TRUTH TEST

**PASS.** Does not imply: Quality = correctness; Cleaned = perfect; Problem = fatal; Suggestion = automatic; Preview = persisted; Original deleted; Cleanup = AI; Waiting = Running; job failure = no output always; Integrity not assessed = 0; worker process = healthy; Exports implemented.

## 133. COPY AUDIT RESULTS

| Term | Verdict |
| --- | --- |
| workflow | KEEP in APIs/types/routes; HUMANIZE in L1 to Cleanup |
| pipeline | KEEP in processing/docs; not beginner Learn headings |
| execute | KEEP in engine; UI says Run / Approve / Create |
| job | KEEP in Technical details; UI says Activity |
| transformation | KEEP in APIs; UI says step / cleanup |
| profile | KEEP in APIs; UI says Analyze / analysis |
| artifact | KEEP in storage/docs; not beginner UI |
| registry | KEEP in technical details |
| immutable | KEEP in Technical details (DatasetVersion) |

## 134. ROUTE AUDIT RESULTS

| Route | Class |
| --- | --- |
| `/overview`, `/datasets`, `/datasets/:id`, `/workflows`, `/workflows/:id`, `/jobs`, `/jobs/:id` | PRIMARY PRODUCT |
| `/learn`, `/settings` | SECONDARY PRODUCT |
| `/quality`, `/runs`, `/runs/:id` | TECHNICAL / ADVANCED (unlinked) |
| `/exports` | SECONDARY — honest unavailable |
| `*` | SECONDARY — 404 |

No unexplained dead public route.

## 135. FRONTEND TEST RESULTS

**PASS.** Vitest: 28 files, 197 tests.

## 136. ESLINT / PRETTIER

**PASS.**

## 137. TYPESCRIPT

**PASS.**

## 138. PRODUCTION BUILD

**PASS.** `tsc -b && vite build`.

## 139. API RUFF

**PASS.**

## 140. API TEST RESULTS

**PASS.** pytest 132.

## 141. PROCESSING TEST RESULTS

**PASS.** pytest 118.

## 142. OPERATIONS REGRESSION

**PASS.** Existing health/readiness/operations/worker tests remain. No new backend behavior added solely for screenshots.

## 143. SCREENSHOT EVIDENCE

Captured in `docs/ux/vm7-evidence/`:

1. Learn overview Light  
2. Learn overview Dark  
3. FACILIO in a minute  
4. Bring data  
5. Quality  
6. Problems  
7. Cleaning  
8. Composed preview (cleaning module)  
9. Versions  
10. Lineage (same versions capture)  
11. Cleanups  
12. Activity  
13. Learn mobile 390  
14. Help Overview  
15. Help Problems  
16. Help Guided Cleanup  
17. Help History  
18. Help Cleanups  
19. Help Activity  
20. Help mobile  
21. Settings  
22. Appearance (Settings)  
23. System status healthy  
24. Worker unavailable — **tests only** (live worker was available)  
25. Recovered — **tests only**  
26. Technical details (Settings disclosure)  
27. 404  
28. Missing dataset  
29. Unsupported file — **tests + upload copy**; live picker not driven  
30. Oversized file — **tests**  
31. Global/route error — **tests** (`ErrorBoundary` / `RouteCrash`)  
32. Command palette  
33. 1440 secondary  
34. 1024 — layout PASS, dedicated PNG not captured  
35. 768 — layout PASS, dedicated PNG not captured  
36. 430 aliased from 390  
37. Settings 390  

## 144. KNOWN LIMITATIONS

- Live worker-unavailable and Redis-down screenshots were not taken against the running stack; automated Settings tests cover those states.
- OS file-picker unsupported/oversized flows were not driven in the browser; unit/integration coverage exists.
- Global error UI was not crash-triggered live.
- Dedicated PNGs for 1280/1024/768 were not captured.
- `/quality` and `/runs` remain advanced unlinked surfaces (intentional).

## 145. REMAINING SECONDARY-SURFACE VISUAL DEBT

- Help drawer sits on the right; 1440 screenshots crop it unless the full PNG is viewed.
- Dataset workspace tab still labelled **Clean** while Help title is **Guided Cleanup** (VM4/VM5 IA; not renamed in VM7).
- Run records Help still exists for an advanced route.

## 146. ACCEPTANCE CHECKLIST

### Learn

- [x] Native to FACILIO
- [x] Beginner path obvious
- [x] FACILIO in a minute
- [x] Bring Data accurate
- [x] Analysis accurate
- [x] Quality accurate
- [x] Integrity Not assessed accurate
- [x] Problems accurate
- [x] Cleaning accurate
- [x] Composed preview explained
- [x] Versions accurate
- [x] Viewing vs Using
- [x] Cleanups accurate
- [x] Activity accurate
- [x] Partial success accurate
- [x] Examples clearly educational
- [x] No fake progress
- [x] No unsupported claims
- [x] Real product routes

**PASS**

### Help

- [x] Global Help discoverable
- [x] Contextual Help
- [x] Overview / Problems / Guided / History / Cleanups / Activity relevant
- [x] Simple first, technical secondary
- [x] Task context preserved
- [x] Mobile Help
- [x] Focus management

**PASS**

### Settings

- [x] Restrained
- [x] Appearance Light/Dark/System
- [x] Persistence
- [x] System status truthful (live healthy + tests for degraded)
- [x] Database safe
- [x] Background processing truthful
- [x] Worker heartbeat authoritative
- [x] Degraded consequence
- [x] Refresh
- [x] About truthful
- [x] No fake account/billing
- [x] No secret exposure

**PASS**

### Secondary surfaces

- [x] 404
- [x] Missing dataset
- [x] Unsupported file (copy + tests)
- [x] Oversized file (copy + tests)
- [x] Global/route error (copy + tests)
- [x] Technical details standardized
- [x] Command palette
- [x] Dead controls/routes audited
- [x] Exports not falsely advertised
- [x] Empty/loading/error consistency

**PASS**

### Responsive / accessibility

- [x] 1440
- [x] 1280/1024/768 layout
- [x] 430/390
- [x] Learn/Help/Settings mobile
- [x] Keyboard, focus, diagram a11y, Help restore
- [x] Settings controls, non-color health
- [x] Reduced motion, Light, Dark, System

**PASS**

### Engineering

- [x] No new feature family
- [x] No fake documentation / heavy docs deps
- [x] Shared content maintainable
- [x] Health/worker/error safety preserved
- [x] Frontend tests, ESLint, Prettier, TypeScript, build
- [x] API Ruff + tests, processing tests, operations regression

**PASS**

## 147. PHASE BOUNDARY

No AI assistant was introduced.  
No documentation search engine was introduced.  
No authentication/account system was introduced.  
No billing/team settings were introduced.  
No export functionality was introduced.  
No new data-processing capability was introduced.  
No product semantics were changed merely for education.  
Visual Mastery 8 was not started.

## 148. NEXT STATE

Visual Mastery 7 implementation complete.  
FACILIO now has an integrated Learn experience, contextual Help, truthful Settings and professionally finished secondary surfaces.  
Do not begin Visual Mastery 8 until this implementation has been reviewed and approved.
