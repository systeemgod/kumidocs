# Tasks & Feature Ideas

> **Source**: Independent review of the current codebase (Phases 1-4 complete).
> These are suggestions **not** following the predefined Phase 5 in `SPEC.md`.
> Ordered by estimated impact, not priority — pick whatever excites you.

---

## 🔥 High Impact

### 1. Mermaid / Diagram Rendering

The #1 missing feature for a developer wiki. Every team needs architecture diagrams, flowcharts, sequence diagrams, Gantt charts, and mind maps inline in their docs.

**Update**: Turns out this is almost zero-effort — the infrastructure is already in place!

- **`mermaid` v11.15.0** is already a transitive dependency (bundled by **streamdown**)
- **`@streamdown/mermaid@1.0.2`** is the official plugin that plugs mermaid into streamdown's code block rendering — **now installed** ✅
- **Architecture diagrams** (`architecture-beta` blocks) supported natively by Mermaid v11.1.0+

**Remaining work** (just 2 files, ~4 lines each):

- `src/components/editor/markdown-viewer.tsx` — add `import { mermaid } from "@streamdown/mermaid"` + add `mermaid` to the `plugins` prop
- `src/components/editor/slide-streamdown.tsx` — same changes
- Optionally enable mermaid controls via the `controls` prop (`controls={{ mermaid: true }}`)
- For PDF export: streamdown's built-in mermaid component handles this (SVG renders in DOM, `html2canvas-pro` captures it naturally)

**Architecture diagram syntax** (`architecture-beta`):

```
architecture-beta
    group api(cloud)[API]
    service db(database)[Database] in api
    service server(server)[Server] in api
    db:R -- L:server
```

Uses `group`, `service`, `edge` (`L/R/T/B` sides, `<`/`>` arrows), and `junction` nodes.
Icons support `logos:*` prefix for 200k+ Iconify icons.
Config knobs: `nodeSeparation`, `idealEdgeLengthMultiplier`, `edgeElasticity`, `numIter`, `randomize`.

**Files to touch**:

- `src/components/editor/markdown-viewer.tsx` (add plugin import + plugins prop)
- `src/components/editor/slide-streamdown.tsx` (add plugin import + plugins prop)

---

### 2. In-Page Table of Contents (TOC)

Long documentation pages need quick navigation. A floating/sticky TOC showing `#` / `##` / `###` headings with smooth-scroll anchors.

**Approach**:

- `rehypeHeadingIdsPlugin` already generates `id` attributes on headings
- Create a `TocSidebar` component that extracts headings from the rendered MarkdownViewer
- Options:
  - **Right-side floating panel** — collapsible, sticky on scroll, highlights active heading via `IntersectionObserver`
  - **Left-side collapsible** — integrated into the sidebar as a secondary panel
- Respect heading hierarchy: indent `##` under `#`, `###` under `##`
- Handle pages with `slides: true` gracefully (no TOC for slide decks)

**Files to touch**:

- `src/pages/file-page.tsx` (conditionally render TOC)
- `src/components/editor/markdown-viewer.tsx` (expose heading data)
- New: `src/components/editor/toc-sidebar.tsx`

---

### 3. Wiki-Links / Backlinks (Obsidian-style)

Support `[[Page Name]]` or `[[path/to/page]]` syntax that auto-resolves to existing pages. Display backlinks in a panel so users discover related content organically.

**Approach**:

- **Wiki-link resolution**: Add a pre-processing step (or a `remark` plugin) that:
  1. Scans for `[[target|display text]]` and `[[target]]` patterns
  2. Resolves `target` against the file tree (fuzzy match by title, fallback to path)
  3. Renders as `<a>` links to the resolved page, or a "dead link" style if unresolved
- **Backlinks panel**: Add to `PageInfoPanel` (alongside commit history):
  1. Scan all `.md` files in the index for references to the current page
  2. Display as a list of clickable page titles
  3. Update on page save / rename / delete
- Add a server endpoint `GET /api/backlinks?path=` or compute from the existing search index

**Files to touch**:

- New: `src/components/editor/remark-wikilinks-plugin.ts`
- `src/components/layout/page-info-panel.tsx` (backlinks section)
- `src/server/search.ts` or new `src/server/backlinks.ts`
- `src/lib/api.ts` (new `getBacklinks` function)

---

### 4. Production Docker Compose

The current `compose.yaml` uses dev-mode (`bun --hot src/index.ts`) and `network_mode: host`. A production-ready setup.

**Approach**:

- Build step: `docker build` that runs `bun install && bun run build`
- Use the built `dist/index.js` as the entrypoint
- Replace `network_mode: host` with proper `ports:` mapping
- Add health checks (`curl -f http://localhost:5864/api/me || exit 1`)
- Run as non-root user
- OAuth2-proxy should talk to kumidocs over an internal network, not host networking

**Files to touch**:

- New: `Dockerfile`
- `compose.yaml` (production-ready rewrite, keep dev hints in comments)

---

## 👍 Medium Impact

### 5. Branch Selector in Top Bar

Let users switch git branches from the UI without leaving the browser.

**Approach**:

- Server endpoint: `GET /api/git/branches` → list local branches, detect current
- Server endpoint: `POST /api/git/checkout` → `{ branch, create?: boolean }`
  - Stash dirty state if needed
  - `git checkout` + reload filestore + rebuild search index + broadcast
- UI: Dropdown in the top bar showing current branch, click to switch
- Handle edge cases: dirty working tree, uncommitted changes in the editor

**Files to touch**:

- `src/server/api-git.ts` (new file)
- `src/server/router.ts` (register new routes)
- `src/components/layout/top-bar.tsx` (branch dropdown)
- `src/lib/api.ts` (new API functions)

---

### 6. Spell Check in the Editor

Basic spellcheck for the textarea-based Markdown editor.

**Approach**:

- Quick win: enable native `spellcheck` attribute on the textarea (already possible, just not set)
- Deeper integration: right-click misspelled words → suggestions via a popover
- Use the browser's native spellcheck API (`SpellCheckRequest`/`SpellCheckCorrection`) or a lightweight dictionary

**Files to touch**:

- `src/components/editor/use-markdown-editor.ts` (add `spellcheck` prop)
- `src/components/editor/markdown-editor.tsx` (pass through to textarea)

---

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

### 9. `kumidocs_email` Cookie Security

The `kumidocs_email` cookie fallback is convenient for local dev but a security risk if accidentally exposed in production.

**Approach**:

- Add a `KUMIDOCS_DEV_MODE` env var (default `false`)
- When `false`, reject the `kumidocs_email` cookie auth path
- Log a warning on startup if no production auth header is configured
- Optionally: add a startup check that pings the SSO proxy

**Files to touch**:

- `src/server/auth.ts` (guard `cookieEmail` behind dev-mode check)
- `src/server/config.ts` (add `devMode` option)

---

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

### 11. Breadcrumb Click to Navigate

Breadcrumbs are currently display-only. Make each segment clickable.

**Approach**:

- Each breadcrumb segment links to `/p/<path-to-segment>.md`
- The last segment (current page) is plain text, not a link
- Use `<Link>` from react-router-dom

**Files to touch**:

- `src/pages/file-page.tsx` (wrap breadcrumb segments in `<Link>`)

---

### 12. Slide Deck: Drag to Reorder Slides

In scroll mode, allow drag-and-drop reordering of slides.

**Approach**:

- Use HTML5 Drag and Drop API (or a lightweight library like `@dnd-kit`)
- On reorder, rearrange the `---`-separated slide blocks in the editor content
- Commit on reorder (or mark as dirty)

**Files to touch**:

- `src/components/editor/slide-viewer.tsx` (drag handlers on slide wrappers)
- `src/pages/use-file-page.ts` (handle reorder + save)

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
