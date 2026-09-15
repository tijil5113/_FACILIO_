# FACILIO navigation and surface blueprint

Primary navigation and surfaces as shipped. `/runs` and `/quality` remain unlinked advanced routes. `/exports` remains unlinked and unfinished.

## 1. Final primary navigation

**CURRENT** (`apps/web/src/lib/navigation.ts`): Workspace = Overview, Datasets, Workflows, Runs, Data Quality. Operations = Jobs, Exports. System = Settings.

**PROPOSED primary (desktop + mobile):**

1. **Home** → `/overview`
2. **Datasets** → `/datasets`
3. **Cleanups** → `/workflows` (user-facing name for workflows)
4. **Activity** → `/jobs` (composed run+job UX; not two nav items)
5. **Learn** → `/learn` — **only after 8D has content**. Do not add an empty Learn item in 8A-3.
6. **Settings** → `/settings`

**Not in primary nav:**

| Current | Decision |
| --- | --- |
| Data Quality `/quality` | **KEEP BUT REMOVE FROM PRIMARY NAV.** Reach from Home (“Needs attention”), dataset Problems, command palette, direct URL. Optional Datasets subview later. |
| Runs `/runs` | **MERGE VISUALLY into Activity.** Keep route for deep links and technical users (command: “Open run records”). |
| Jobs `/jobs` | **KEEP AS PRIMARY via Activity label.** Same route. |
| Exports `/exports` | **HIDE UNTIL IMPLEMENTED.** Remove from `workspaceNav`/`operationsNav`. Mention in Learn/roadmap or Settings “Coming later” only if needed. Route may 404 or stay unlinked. |

**Section headings:** Stop using “Workspace / Operations / System” as user-facing IA. Use a single list, Settings last. Collapsed icon nav keeps accessible names.

## 2. Route migration (no backend rewrite)

| Current route | Current purpose | Future user-facing purpose | Nav | Future label | Redirect? | Backend change? | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` → `/overview` | Architecture home | Home: start / continue | Primary | Home | No | No | 8A-3 copy; 8B first-run |
| `/overview` | Stats + health + capabilities | Home | Primary | Home | No | No | 8A-3, 8B |
| `/datasets` | List + upload | Your data | Primary | Datasets | No | No | 8A-3 |
| `/datasets/:id` | 7-tab workspace | Dataset workspace | Context | Dataset name in chrome | No | No | 8A-3 IA labels; 8C clean |
| `/workflows` | Catalog | Saved cleanups | Primary | Cleanups | No | No | 8A-3 copy |
| `/workflows/:id` | Builder | Cleanup editor | Context | Cleanup name | No | No | 8A-3 disclosure; 8C guided |
| `/jobs` | Job list | Activity list | Primary | Activity | No | No | 8A-3 shell + copy |
| `/jobs/:id` | Job detail | Activity detail (compose run) | — | Activity | No | Optional later compose API | 8A-3 labels; 8E recovery |
| `/runs` | Run list | Advanced activity / duplicate | Hidden / command | Run records | No | No | 8A-3 hide from nav |
| `/runs/:id` | Run detail | Advanced or redirect-to-job later | Deep link | Run | Optional later to job | No | Later polish |
| `/quality` | Global rollup | Needs-attention list | Unlinked primary | Quality overview | No | No | 8A-3 unlinked |
| `/exports` | Placeholder | Hidden | Hidden | — | No | No | 8A-3 unlink |
| `/settings` | Theme, nav, motion | Same + optional health details | Primary | Settings | No | No | 8A-3 health move |
| `/learn` | None | Learn center | Primary after 8D | Learn | New route 8D | No | 8D |
| `*` | 404 | 404 + Home | — | — | No | No | 8A-3 copy only if needed |

**8A-3 must not create `/learn` as an empty primary destination.**

## 3. Context bar

**CURRENT:** Eyebrow “Workspace” + `titleForPath` (Overview, Dataset, Workflow, Run, Job…).

**PROPOSED:**

- Home / Datasets / Cleanups / Activity / Settings as titles on list pages.
- On detail pages: **object name**, not type-only (“Customers.xlsx” not “Dataset”).
- Help control (8E content; 8A-3 may add a disabled or “Coming” control **only if** it does not look broken — prefer adding the entry in 8E).
- Command trigger: label **Commands** (`⌘K`), not “Search” (it does not search data).
- CompactHealth remains.

## 4. CTA hierarchy (one primary per page)

| Page | Primary | Secondary | Advanced |
| --- | --- | --- | --- |
| Home empty | Upload a file | Try sample data (8B) | System status |
| Home returning | Continue (most recent dataset or activity) | Upload | Settings |
| Home degraded | Understand/fix status | Continue if possible | Technical health |
| Datasets empty | Upload a file | Try sample (8B) | — |
| Datasets list | Upload a file | Open row | — |
| Dataset not analyzed | Analyze data | View data | Rename, Delete |
| Dataset analyzed with problems | Review problems | Clean data | Rename, Delete |
| Dataset analyzed no problems | View data | Clean data (optional) | Rename, Delete |
| Problems | Preview this fix (per row) or Clean data | Filters | Technical evidence |
| Clean (manual) | Preview then Create cleaned version | Close | Operation codes |
| History | Use this version (if not current) | Open originating activity | Lineage IDs |
| Cleanups empty | New cleanup | Learn (8D) | — |
| Cleanups list | New cleanup | Open | Archive filter |
| Builder | Preview | Run | Duplicate, Archive, Delete, revision |
| Activity waiting/running | Cancel (if allowed) | Open cleanup | Technical details |
| Activity done | Open cleaned version | Open dataset | Run/Job IDs |
| Activity failed | Retry if retryable else Run cleanup again | Open cleanup | Error code |
| Settings | (none) | Theme, motion | Full health |
| Learn | Continue module | Open product CTA | Advanced reference |

## 5. Command palette

**CURRENT:** Go to nav items, New workflow → `/workflows`, Open Jobs, theme, collapse nav. No upload.

**PROPOSED names (match language system):**

- Upload a file → `/datasets` + intent flag later; 8A-3 can navigate to Datasets
- Go to Home / Datasets / Cleanups / Activity / Settings
- Open quality overview → `/quality`
- Open run records → `/runs` (technical)
- New cleanup → `/workflows` (8A-3); create dialog can wait
- View activity → `/jobs`
- Open Learn → when route exists
- Toggle theme, collapse navigation

Keep keyword aliases: workflow, job, pipeline, transform.

## 6. Component / surface reuse

| Module | Current | Future | Disposition |
| --- | --- | --- | --- |
| `OverviewPage` | Architecture + stats + `SystemHealthPanel` + capabilities | Home | **REUSE WITH MODIFICATION** |
| `SystemHealthPanel` | Full infra on Home | Settings / degraded Home / expandable | **DEPRECATE FROM PRIMARY Home**; **KEEP ADVANCED** |
| `CompactHealth` | Context bar | Stay | **REUSE AS-IS** |
| `navigation.ts` / `SidebarNav` / `MobileNav` | 3 sections, Exports, Runs, Quality | Proposed nav | **REUSE WITH MODIFICATION** |
| `ContextBar` | Type titles, Search | Names + Commands | **REUSE WITH MODIFICATION** |
| `PageHeader` | Title + description + actions | Enforce one primary in `actions` | **REUSE WITH MODIFICATION** |
| `EmptyState` | Generic; `upcoming` default true | Typed empty kinds | **REUSE WITH MODIFICATION** |
| `Callout` | Info/warn/danger; no success | Add success tone later; 8A-3 copy | **REUSE WITH MODIFICATION** |
| `Dialog` | Trap + sr-only title | Fix duplicate headings; transform size | **REUSE WITH MODIFICATION** |
| `DatasetsPage` / `DatasetTable` / `UploadDialog` | List + ingest | Same journey, copy | **REUSE WITH MODIFICATION** |
| `DatasetWorkspacePage` | 7 tabs, Transform primary | 5-group hierarchy | **REUSE WITH MODIFICATION** / **COMPOSE** |
| `PreviewGrid` | Preview tab | Data | **REUSE AS-IS** |
| `ColumnExplorer` | Columns tab | Data (secondary) / Advanced | **REUSE WITH MODIFICATION** |
| `QualityHero` / `DimensionCards` / `MissingnessChart` | Quality tab | Overview + Problems header / Advanced | **COMPOSE INTO** Overview/Problems |
| `IssuesPanel` | Issues tab | Problems | **REUSE WITH MODIFICATION** (default expand/fix CTA) |
| `TransformWorkspace` | Dialog “Transform data” | Clean surface | **REUSE WITH MODIFICATION** |
| `HistoryPanel` | History tab | History | **REUSE WITH MODIFICATION** |
| Source `Card` | Source tab | History → Original file / More | **MOVE UNDER ADVANCED** |
| `WorkflowsPage` | Pipeline catalog | Cleanups | **REUSE WITH MODIFICATION** |
| `WorkflowBuilder` | Dense IDE | Disclosure layers | **REUSE WITH MODIFICATION** |
| `RunsPage` / `RunDetailPage` | Dual history | Advanced / compose into Job detail | **DEPRECATE FROM PRIMARY UX** |
| `JobsPage` / `JobDetailPage` | Ops console | Activity | **REUSE WITH MODIFICATION** / **COMPOSE** run fields |
| `QualityPage` | Global quality | Unlinked rollup | **KEEP ADVANCED** / Home widget |
| `ExportsPage` | Placeholder | Unlinked | **DEPRECATE FROM PRIMARY UX** |
| `SettingsPage` | Theme/nav/motion | + health details | **REUSE WITH MODIFICATION** |
| `CommandPalette` / `commands.ts` | Nav-centric | Goal commands | **REUSE WITH MODIFICATION** |
| `NotFoundPage` / `ErrorBoundary` / `RouteFallback` | Exist | Language only | **REUSE WITH MODIFICATION** |
| `SegmentedControl` | Tabs including 7 dataset | Fewer options; keyboard | **REUSE WITH MODIFICATION** |

## 7. API reuse and gaps

Existing clients in `apps/web/src/services/*` already cover upload, profile, issues, catalog, preview/apply, versions, lineage, set current, workflows CRUD/steps/validate/preview/run, runs list/detail, jobs list/detail/cancel/retry, health/readiness/operations health, workspace stats.

| UX need | Supported now? | Gap | Minimal future API | Phase |
| --- | --- | --- | --- | --- |
| Relabel UI | Yes | — | — | 8A-3 |
| Activity list | `listJobs` + job fields (workflow, dataset, progress, status) | Run-only fields on list incomplete | Optional join; not required | 8A-3 UI compose `getJob` |
| Activity detail | `getJob` + `getWorkflowRun` | Two fetches | UI compose; later one endpoint optional | 8A-3 / later |
| Guided multi-step one version | Workflow preview/run | Ad-hoc pipeline without catalog row | Optional `pipeline/preview`+`apply`; **8C may use draft workflow** | 8C |
| Save manual steps as cleanup | Lineage + `Transformation.parameters_json` via lineage payload | Confirm lineage includes parameters (`TransformationRecord`) | If missing in GET lineage, extend lineage DTO | 8C if needed |
| Sample data | Upload API | Bundled file + demo flag | Marker: naming and/or `description` / client tag; optional `source: demo` later | 8B |
| Auto-analyze after upload | `runDatasetProfile` | Product policy not API | — | 8B |
| Help/Learn content | None | CMS not required | Static frontend routes | 8E / 8D |
| Exports | None | Real export | Out of Phase 8 UX architecture | Future product |
| Do not change job/run models for UX | — | — | **Locked: no merge of DB models** | All |

**Walk lineage for “use these steps again”:** `getLineage` returns nodes with `transformation` (`TransformationRecord`: operation + parameters). Client can walk `parent_version_id` from the viewed version to ORIGINAL, collect transformations in order, `createWorkflow` + `addWorkflowStep`. **No new API required if lineage parameters are present.** If the UI lineage omits parameters, that is a small DTO gap for 8C.

## 8. Responsive architecture (intent, not pixels)

| Surface | Narrow priority | Disclosure |
| --- | --- | --- |
| Dataset workspace | Segment: Overview / Data / Problems first; Clean and History next | No 7-tab equal strip; dropdown “More” for original file |
| Tables | Horizontal scroll **plus** stacked card for first columns (name, status) on Activity/Datasets | Don’t only `min-w-[720px]` |
| Clean dialog | Single column: problem/operation → config → preview → apply | Preview not below fold without jump link |
| Builder | Step list first; catalog in “Add step” sheet; config in sheet | Not three columns stacked as three long pages without wayfinding |
| Activity | Status, name, dataset; rest in detail | |
| Help | Full-screen sheet | 8E |
| Learn | Linear modules | 8D |
| Nav | Existing drawer; **must focus-trap** | 8A-3 a11y |

## 9. Accessibility gates (mandatory for Phase 8 UI work)

- Keyboard can complete upload, analyze, preview, apply, run, cancel, retry, reorder steps (existing up/down; keep).
- Visible focus on all controls.
- Dataset and job rows are **links** (or contain a link), not clickable `tr` only.
- Dialog/drawer: one title, focus trap, restore focus; mobile nav included.
- Status via `aria-live` for analyze, save, job progress (partially exists).
- Form errors associated (`aria-describedby` / `aria-invalid`).
- Status not color-only (text labels — already mostly true).
- Reduced motion: existing preference honored; no educational motion without equivalent.
- Tables: captions, row headers.
- Heading hierarchy: no duplicate `h2` with `sr-only` Dialog title when visible title exists.
- Command palette remains a dialog listbox.

These are implementation gates, not 8A-2 code changes.
