# Sample data

Synthetic fixtures for FACILIO ingestion development and demonstrations.

| File | Format | Notes |
| --- | --- | --- |
| `facilio-demo-customers.csv` | CSV | Canonical Phase 8B Try FACILIO sample. Fictional customers. Imported only through the allowlisted sample API. |
| `customers.csv` | CSV | Smaller ingestion fixture: missing cells, mixed date strings, inconsistent capitalization, a duplicate row |
| `orders.xlsx` | Excel | Multiple sheets (`Customers`, `Orders`, `Archive`) so sheet selection can be demonstrated |
| `products.json` | JSON | Array of objects; nested `tags` arrays are stored as JSON text, not flattened |

### Canonical demo (`facilio-demo-customers.csv`)

Fictional identities and `@example.com` addresses only. Scores are never stored in this file; they come from the profiler.

| Intentional issue | Expected engine signal |
| --- | --- |
| Duplicate full row (`C-1001` Ada Lovelace) | `DUPLICATE_ROWS` |
| Leading space on `customer_name` (` Alan Turing`) | `LEADING_TRAILING_WHITESPACE` on `customer_name` |
| Leading space on `email` | `LEADING_TRAILING_WHITESPACE` on `email` |
| Blank `customer_name`, `email`, `city`, `lifetime_value` | `MISSING_VALUES` on those columns |
| `status` values `active` / `Active` / `ACTIVE` / `Inactive` | `CASE_VARIATION` on `status` |
| `signup_date` ISO, slash, and long-month strings | `MIXED_DATE_FORMATS` on `signup_date` |

HIGH_CARDINALITY may also appear on identifier-like columns; that is a real profiler observation, not a scripted demo claim.

Try FACILIO: Home → Try FACILIO → `POST /api/v1/samples/customers/import` → real dataset + ORIGINAL V1 → auto-analysis via the existing profile API → Problems.

These files are intentionally imperfect so quality analysis has structure to inspect. Phase 4 profiles them without cleaning or rewriting values. Phase 5 transformations create new immutable versions; the original files stay unchanged.

Do not add personal information or large binary fixtures here. Invalid parser fixtures belong under package tests, not this directory.
