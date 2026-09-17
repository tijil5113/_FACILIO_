# FACILIO final experience polish (Phase 8F)

Implementation notes for motion, accessibility, responsive layout, and performance. Product capabilities are unchanged.

## Motion

Tokens: `--facilio-duration-instant` (0ms), `--facilio-duration-fast` / `micro` (120ms), `--facilio-duration-control` (160ms), `--facilio-duration-surface` / `--facilio-duration-content` / `--facilio-duration-standard` / `--facilio-duration-base` (200ms), `--facilio-duration-relationship` / `--facilio-duration-deliberate` / `--facilio-duration-emphasized` (280ms), `--facilio-ease`.

Used for orientation (page/drawer enter), selection feedback, and running-status pulse. No ambient loops on completed work. No animation library was added.

Reduced motion: Settings → Reduced, or OS `prefers-reduced-motion` when Motion is System. Settings → Full keeps motion even if the OS prefers reduced. Loading, status text, and focus remain.

## Accessibility

- Skip link, landmarks, visible `:focus-visible`
- Dialogs, Help, and mobile nav trap focus, restore it, and lock body scroll
- SPA route changes focus `#main-content` without scrolling
- Guided Cleanup focuses the stage heading and announces preview / start / complete / failure
- Analysis completion is announced once
- Before/after changes include a non-color “(changed)” / “removed” cue

## Responsive

- Home CTAs stack; first-run hero places actions before the signature visual; How FACILIO works becomes a vertical sequence below `lg`
- Dataset tabs scroll horizontally instead of wrapping
- Data preview may use a wider max width than explanatory pages
- Guided Cleanup stacks; approval CTA stays in flow
- Cleanup builder: Actions / Steps / Configure below `xl`
- Activity: card list below `md`
- Help: full-width panel on small screens

## Performance

- Existing route-level `React.lazy` boundaries
- Activity polling stops on terminal status
- Profile refetch only while `PROFILING`
- Bounded previews unchanged
