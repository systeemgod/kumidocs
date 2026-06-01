---
emoji: 📚
---

# KumiDocs Documentation

Welcome to KumiDocs — a Git-backed wiki and presentation platform built for developer teams. All content lives in a single Git repository. No database, no proprietary format.

## What is KumiDocs?

KumiDocs turns a Git repository into a collaborative wiki. Every page is a Markdown file. Every save is a Git commit. You get full history, branching, and offline access for free.

- **Write** — Markdown pages with a live split-pane editor — see [[Writing Pages]]
- **Present** — Any page becomes a [[Slide Decks|slide deck]] with `slides: true`
- **Collaborate** — Real-time presence and edit locking — see [[Collaboration]]
- **Search** — Full-text fuzzy search across all pages (Ctrl+K)

## Documentation

| Section                                   | What you'll learn                                    |
| ----------------------------------------- | ---------------------------------------------------- |
| [Getting Started](docs/getting-started)   | Install, configure, and run your first instance      |
| [Writing Pages](docs/writing)             | Markdown syntax, frontmatter, images, code blocks    |
| [Slide Decks](docs/slides)                | Turn any page into a presentation                    |
| [Mermaid Diagrams](docs/mermaid)          | Diagrams as code (flowcharts, architecture, etc.)    |
| [AWS Architecture](docs/aws-architecture) | Real-world AWS architecture diagram examples         |
| [Configuration](docs/configuration)       | Environment variables and `.kumidocs.json`           |
| [Collaboration](docs/collaboration)       | Real-time editing, presence, and conflict resolution |

## Quick Example

Create a file `my-first-page.md` in your repo:

```markdown
---
emoji: 🚀
---

# My First Page

Hello from KumiDocs! This is a **Markdown** page with _live editing_.

## Features

- Real-time preview
- Auto-save every 5 seconds
- Full Git history
- Link to other pages with `[[Page Name]]` — try it: [[Writing Pages]]
```

Save it — KumiDocs commits and pushes automatically. The page appears in the sidebar immediately.

## Slide Deck Quick Example

Add `slides: true` to your frontmatter and separate slides with `---`:

```markdown
---
slides: true
theme: corporate
paginate: true
---

<!-- class: title -->

# My Presentation

A KumiDocs slide deck

---

## Slide Two

- Bullet one
- Bullet two

---

<!-- class: section -->

## Chapter Break
```

See [Slide Decks](docs/slides) for the full reference.

## Navigation

- **Sidebar** — file tree with expand/collapse. Right-click for context menu (new page, move, delete).
- **Ctrl+K** — search palette with full-text fuzzy search.
- **`···` menu** — per-page actions: export PDF, copy link, move, delete.
- **Top bar** — instance name, search, user avatar.
