# FACILIO design system

Visual Mastery 2 foundation. Feature surfaces inherit these primitives; they do not redefine color, type, spacing, or chrome.

## Art direction

Quiet confidence. Precise, calm, paper and charcoal, olive as identity rather than decoration. Improve hierarchy, density, and states. Do not add glass, neon, gradients, or extra cards.

## Tokens

CSS variables in `apps/web/src/styles/index.css`, mapped into Tailwind `@theme`.

| Role                   | Token                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| App / page             | `--facilio-canvas`                                                                                                                     |
| Content surface        | `--facilio-surface`                                                                                                                    |
| Overlay / raised       | `--facilio-raised`                                                                                                                     |
| Grouped / zebra        | `--facilio-subtle`                                                                                                                     |
| Interactive / selected | `--facilio-surface-interactive`, `--facilio-surface-selected`                                                                          |
| Text                   | `--facilio-ink`, `--facilio-ink-secondary`, `--facilio-ink-muted`, `--facilio-ink-disabled`                                            |
| Border                 | `--facilio-line`, `--facilio-line-strong`                                                                                              |
| Accent                 | `--facilio-accent`, `--facilio-accent-hover`, `--facilio-accent-active`, `--facilio-accent-soft`                                       |
| Focus                  | `--facilio-focus`                                                                                                                      |
| Status                 | `--facilio-success`, `--facilio-warning`, `--facilio-danger`, `--facilio-info` and `*-soft`                                            |
| Change                 | `--facilio-change-before`, `--facilio-change-after`, `--facilio-change-after-bg`, `--facilio-change-removed`, `--facilio-change-added` |

Light is warm paper. Dark is olive-charcoal, not pure black. Do not use raw hex in feature UI except visualization that cannot be semantic.

**Exceptions:** dataset/preview cell interpretation, charts, and engine-driven severity colors may stay explicit when the value is the meaning.

## Typography

IBM Plex Sans (400/500/600) and IBM Plex Mono (400/500). Roles:

| Class                                | Use                        |
| ------------------------------------ | -------------------------- |
| `.type-display`                      | Application Home headline  |
| `.type-hero`                         | Public Home headline only  |
| `.type-page-title`                   | Page / object title (22px) |
| `.type-section` / `.type-card-title` | 14px medium                |
| `.type-body` / `.type-body-sm`       | Interface copy             |
| `.type-label`                        | Form labels                |
| `.type-meta` / `.type-caption`       | Metadata                   |
| `.type-table-header`                 | Uppercase mono headers     |
| `.type-table-cell`                   | Table values               |
| `.type-data`                         | Technical / tabular values |
| `.type-mono`                         | IDs and codes              |
| `.type-button`                       | Controls                   |

Monospace is for identifiers, table headers, and technical details — not every dataset cell.

## Spacing

4 / 8 / 12 / 16 / 20 / 24 / 32 / 48. Page gutter 16 mobile, 32 desktop (`.page-gutter`). Section gap 24–32. Control gap 8. Form gap 12–16. Table cell 8/12.

## Content width

| Class                                  | Width | Use                    |
| -------------------------------------- | ----- | ---------------------- |
| `.content-readable`                    | 42rem | Learn, Settings, prose |
| `.content-page` / `.content-standard`  | 72rem | Collections            |
| `.content-workspace` / `.content-wide` | 80rem | Dataset workspace      |
| `.content-fluid`                       | none  | Data tables, builder   |

## Radius and elevation

sm 2 / md 4 / lg 6 (dialogs only). Most surfaces use border + contrast. Shadow is for dialogs, toasts, and tooltips.

## Buttons

Primary (ink fill), secondary (surface + line), ghost, danger. Sizes 32 / 36. One primary per context. `ButtonLink` for navigation that is an action. Icon buttons are 40px on touch, 32px on desktop, and require `label`.

## Forms

`Field` = label, control, helper **or** error in one slot. `Input`, `Select`, `Textarea` share `.facilio-control`. Checkbox is 16px with adjacent label. Native selects inherit the same height and border.

## Tables

`.facilio-table-wrap` + `.facilio-table`, or the `Table` primitive. Header 11px mono uppercase. Default row ~32px. Hover on rows. Sticky headers remain a table concern, not cards.

## Status, badges, versions

Prefer `StatusIndicator` (dot + text). Badges are rare (Sample, Failed, Draft, high impact). `VersionLabel` renders `V2 — Cleaned` plus Viewing/Using as metadata, not a row of pills.

## Overlays

`Dialog` (sm 400 / md 512 / lg 640), `Drawer` (Help right 440, mobile nav left 288). Focus trap, Escape, restore focus, overlay click. Command palette reuses Dialog.

## Motion

| Category | Token | Duration | Use |
| --- | --- | --- | --- |
| Instant | `--facilio-duration-instant` | 0ms | Reduced-motion floor |
| Micro | `--facilio-duration-fast` / `micro` | 120ms | Hover, press, focus-adjacent |
| Control | `--facilio-duration-control` | 160ms | Dropdown, tooltip, disclosure |
| Content / overlay | `--facilio-duration-standard` / `surface` / `content` | 200ms | Tabs, section enter, dialog overlay |
| Relationship | `--facilio-duration-emphasized` / `relationship` | 280ms | Before→After, V1→V2, lineage |

Ease `--facilio-ease` / `--facilio-ease-enter` (`cubic-bezier(0.2, 0.8, 0.2, 1)`). Reduced motion (Settings or OS, unless Full) zeroes durations. Loading, status text, and focus remain. Public signature visual then shows the final composition.

## Shell

**Public:** compact sticky header, main, minimal footer. Logo returns to `/`.

**Application:** Sidebar mark + wordmark (logo returns to `/overview`), workspace nav, quieter Settings, collapse control. Context bar: object or page title, health (quiet when healthy), Help, Commands. Theme lives in Settings and the command palette. Mobile: hamburger + Commands + Help; navigation is a left drawer.

**Auth:** product-story column + form column. No application chrome. Authentication UI is presentational; the backend is not implemented.

## Accessibility

Visible `:focus-visible` (2px accent). Status is never color-only. Form errors use `aria-invalid` and `role="alert"`. Dialogs and drawers trap focus. Reduced motion does not remove state.
