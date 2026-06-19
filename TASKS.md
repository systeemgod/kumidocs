# Tasks & Feature Ideas

---

### Keyboard Shortcuts Reference

A `?` dialog listing all available keyboard shortcuts.

**Approach**:

- Create a `<ShortcutsDialog>` component
- Bind global `?` key listener (only when no input is focused)
- Standard shortcuts:
  - `Ctrl+S`: Save
  - `Ctrl+K`: Search palette
  - `Ctrl+B` / `Ctrl+I`: Bold / Italic (editor)
  - `Escape`: Close dialogs / cancel editing
  - `g` `h`: Go home
  - `?`: Show shortcuts
- Slide-specific shortcuts (Space, Arrow keys, F for fullscreen)

**Files to touch**:

- New: `src/components/dialogs/shortcuts-dialog.tsx`
- `src/components/layout/app-shell.tsx` (global listener + dialog)

---

## 💡 Longer-Term Ideas

These are larger efforts that could define a future phase:

- **Collaborative editing (CRDT/OT)**: replace edit-lock with real-time multi-cursor editing using Yjs or Automerge
- **Static site export**: use `wget`-style crawl or server-side render to an `/export` directory for hosting on GitHub Pages / Netlify
- **Webhooks on commit**: `POST` to configured URLs after every save (useful for CI/CD triggers)
- **Read-only sharing / public pages**: share a link to a page with no auth required
- **Git blame view**: line-by-line annotation when viewing a file, showing who last changed each line
- **Page templates**: predefined templates (API reference, meeting notes, ADR) selectable on page creation
- **Full-text search in code files**: currently search indexes `.md` only
- **Image optimization**: auto-resize large images on upload, generate thumbnails for the image library grid
- **Tour / onboarding flow**: first-visit interactive walkthrough highlighting key features

---

> **Note**: This file is maintained independently of `SPEC.md`. Tasks here represent ideas
> generated from a codebase review, not a committed roadmap. Feel free to reorder,
> split, merge, or delete entries as priorities evolve.
