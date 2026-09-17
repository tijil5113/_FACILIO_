# Smart Home, sample demo, and first-use guidance (Phase 8B)

Experience layer on the existing ingestion, profiling, and quality engine. There is no parallel demo engine.

## Smart Home states

Authoritative state comes from the datasets list plus API health — not from `localStorage`.

| State | Source | Primary goal |
| --- | --- | --- |
| Loading | Datasets query pending, no cached list | Skeleton Home. Do not flash first-run copy. |
| Degraded | Health fetch failed **or** datasets list failed | Recover. No Upload / Try FACILIO CTAs. Compact explanation + Technical details (system health). |
| Empty | Zero datasets | First-run Welcome: Upload your data (existing dialog) and Try FACILIO. Signature transformation illustration. How FACILIO works. |
| Sample-only | Every listed dataset has `is_sample` | Continue exploring the sample **and** Upload my data. Sample is labeled example/fictional data. |
| Returning | At least one non-sample dataset | Compact Welcome back. Continue working from real datasets. Try FACILIO is not a primary CTA. |
| Limited | Worker/queue unavailable while workspace still loads | First-run and sample-only add a calm callout after the primary actions. Returning Home keeps CompactHealth in the shell and does not lead with a full-width unavailable banner. Upload/analyze remain. |

Partial failure: returning Home still renders datasets if the jobs or workflows list fails. Those sections show a retry callout.

## Sample architecture

- Allowlisted identifiers only: `customers` and `CUSTOMER_CLEANUP`.
- Endpoint: `POST /api/v1/samples/<sample_id>/import`.
- Server maps the identifier to `sample-data/facilio-demo-customers.csv`.
- Bytes are ingested through `DatasetService.create_from_upload` (same path as user uploads).
- Result is a normal `Dataset` with ORIGINAL V1, source bytes preserved, `is_sample=true`, `sample_key=CUSTOMER_CLEANUP`.
- Clients cannot pass filesystem paths, URLs, or filenames that reach path resolution.

## Duplicate policy

If a dataset with `sample_key=CUSTOMER_CLEANUP` exists, import returns that dataset. It does not create another copy. After the user deletes it, Try FACILIO may create a new sample. There is no Reset sample control in this phase.

## Auto-analysis

Analysis is read-only. Cleaning is never automatic.

- After Try FACILIO and after a normal upload, the UI navigates to the dataset with `?analyze=1`.
- The workspace calls the existing `POST /datasets/:id/profile` (or version profile) once when the version is not already analyzed.
- Already analyzed versions are not re-profiled.
- Failure leaves the dataset in place; the user can retry analysis.

Progress labels are stage names (Uploading, Adding dataset, Analyzing). No fake percentages or sleeps.

## First-use guidance

Optional cues are stored only in `localStorage` under `facilio.onboarding.*` (`home`, `problems`, `history`, `cleanups`, `activity`). Dismissing a cue writes `1`. Clearing browser storage can show cues again; it does not change whether Home is empty. A future “Show me around” (Phase 8E) may reset these keys.

## Home queries

Empty Home: health (shell) + datasets list + workspace summary. Jobs and cleanups are not fetched.

Returning Home: workspace summary / datasets list (includes `profile_status`, `issue_count`, version fields) + jobs page 1 (`page_size=5`). Cleanups are linked, not listed. No per-dataset profile requests.

## Known limitations

- Dataset list order is `created_at` descending, not last-opened.
- `issue_count` is the current version’s profile issue total when analyzed; it is not a live subscription.
- Needs attention uses that list field and is limited to the first page of datasets (20).
- Reset sample is not implemented.
- Guided cleanup, Learn, Help, and motion are part of the shipped product.
