# Tasks & Feature Ideas

> Ordered by estimated impact, not priority — pick whatever excites you.

---

## � Medium Impact

### 7. Keyboard Shortcuts Reference

A `?` dialog listing all available keyboard shortcuts.

**Approach**:

- Create a `<ShortcutsDialog>` component
- Bind global `?` key listener (only when no input is focused)
- Standard shortcuts:
  - `Ctrl+S` — Save
  - `Ctrl+K` — Search palette
  - `Ctrl+B` / `Ctrl+I` — Bold / Italic (editor)
  - `Escape` — Close dialogs / cancel editing
  - `g` `h` — Go home
  - `?` — Show shortcuts
- Slide-specific shortcuts (Space, Arrow keys, F for fullscreen)

**Files to touch**:

- New: `src/components/dialogs/shortcuts-dialog.tsx`
- `src/components/layout/app-shell.tsx` (global listener + dialog)

---

### 8. Tag / Label System

Frontmatter-based tags with a tag cloud page and search filtering.

**Approach**:

- Parse `tags: [api, reference, v2]` from frontmatter
- Index them in MiniSearch (separate field)
- Create `/tags` route showing all tags as a cloud/chip grid, each linking to a filtered search
- Add tag chips to search results and page headers
- Filter search by tag: `GET /api/search?q=&tag=api`

**Files to touch**:

- `src/lib/frontmatter.ts` (parse tags from frontmatter)
- `src/server/search.ts` (index + filter tags)
- `src/pages/tags-page.tsx` (new)
- `src/app.tsx` (register `/tags` route)
- `src/components/layout/sidebar.tsx` (add to overflow menu)

---

## 🛠 Quick Fixes / Polish

### 10. Configurable Rate Limit

The rate limiter is hardcoded at 30 mutations per 10 seconds.

**Approach**:

- Add `KUMIDOCS_RATE_LIMIT` env var + `--rate-limit` flag
- Format: `count/window_ms` (e.g. `60/10000`)
- Fall back to current `30/10000` default

**Files to touch**:

- `src/server/config.ts` (add `rateLimit` option)
- `src/server/router.ts` (pass config to `RateLimiter` constructor)
- `src/server/rate-limit.ts` (accept configurable values)

---

## 💡 Longer-Term Ideas

These are larger efforts that could define a future phase:

- **Collaborative editing (CRDT/OT)** — replace edit-lock with real-time multi-cursor editing using Yjs or Automerge
- **Static site export** — `wget`-style crawl or server-side render to a `/export` directory for hosting on GitHub Pages / Netlify
- **Webhooks on commit** — `POST` to configured URLs after every save (useful for CI/CD triggers)
- **Read-only sharing / public pages** — share a link to a page with no auth required
- **Git blame view** — line-by-line annotation when viewing a file, showing who last changed each line
- **Page templates** — predefined templates (API reference, meeting notes, ADR) selectable on page creation
- **Full-text search in code files** — currently search indexes `.md` only
- **Image optimization** — auto-resize large images on upload, generate thumbnails for the image library grid
- **Tour / onboarding flow** — first-visit interactive walkthrough highlighting key features

---

> **Note**: This file is maintained independently of `SPEC.md`. Tasks here represent ideas
> generated from a codebase review, not a committed roadmap. Feel free to reorder,
> split, merge, or delete entries as priorities evolve.
