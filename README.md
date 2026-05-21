# KumiDocs

A developer-focused wiki and documentation platform. Zero database — all content lives in a single Git repository. Inspired by Docmost. Target audience: small development teams (3–20 concurrent users).

## Features

- **Markdown pages** with YAML frontmatter, live split-pane editor, and Streamdown rendering
- **Slide decks** — mark any page with `slides: true`; built-in viewer with scroll, paginate, spotlight, and fullscreen modes
- **Code file editor** — syntax highlighting via CodeMirror with language auto-detection
- **Git-backed** — every save is a commit + push; full history, background pull/rebase loop
- **Real-time presence** — WebSocket-based edit lock, viewer avatars, and live reload
- **Full-text search** — in-memory MiniSearch index, fuzzy, Ctrl+K palette
- **Image library** — drag-and-drop upload, SHA-256 named, usage tracking, safe delete
- **Slide themes** — 5 built-in themes + custom themes via `.kumidocs.json`
- **PDF export** — Markdown pages (A4) and slide decks (landscape) via `html2canvas-pro` + `jspdf`
- **SSO** — any reverse-proxy that forwards an email header (e.g. oauth2-proxy with GitHub/Google/OIDC)

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Frontend | React + TypeScript (SPA) |
| Styling | Tailwind CSS + shadcn/ui + @tailwindcss/typography |
| Icons | @fluentui/react-icons + lucide-react |
| Markdown | streamdown (remark/rehype pipeline) |
| Code editor | @uiw/react-codemirror |
| Search | MiniSearch |
| Real-time | WebSocket (Bun native) |
| Git | isomorphic-git |

## Quick Start

### Development

```bash
bun install
bun dev
```

The dev server starts on port `5864` by default. Without an SSO proxy, KumiDocs will prompt for an email address stored as a local cookie.

Set `KUMIDOCS_REPO_PATH` to the absolute path of any git repository to use as the content store:

```bash
KUMIDOCS_REPO_PATH=/path/to/your/repo bun dev
```

### Production (Docker Compose)

Copy `compose.yaml` to your deployment and set the required environment variables:

```bash
# Required
SSO_PROXY_CLIENT_ID=your_oauth_client_id
SSO_PROXY_CLIENT_SECRET=your_oauth_client_secret

# Optional overrides
KUMIDOCS_INSTANCE_NAME=MyDocs
SSO_PROXY_PROVIDER=github         # github | google | oidc | ...
SSO_PROXY_REDIRECT_URL=https://docs.example.com/oauth2/callback
SSO_PROXY_COOKIE_SECURE=true
SSO_PROXY_COOKIE_DOMAIN=example.com
```

The compose stack runs KumiDocs on port `5864` (internal) behind oauth2-proxy on port `5865` (public).

Mount your content repository at `/repo` (or change `KUMIDOCS_REPO_PATH` in `compose.yaml`):

```yaml
volumes:
  - /path/to/your/content-repo:/repo
```

Then start:

```bash
docker compose up -d
```

## Configuration

All options can be set as environment variables or CLI flags:

| Environment variable | CLI flag | Default | Description |
|---|---|---|---|
| `KUMIDOCS_REPO_PATH` | `--repo` | `cwd` | Absolute path to the git repository |
| `KUMIDOCS_PORT` | `--port` | `5864` | HTTP/WS listen port |
| `KUMIDOCS_AUTH_HEADER` | `--auth-header` | `X-Auth-Request-User` | Header containing email or JWT |
| `KUMIDOCS_AUTO_SAVE_DELAY` | `--auto-save-delay` | `5000` | Auto-save debounce in ms |
| `KUMIDOCS_INSTANCE_NAME` | `--instance-name` | `KumiDocs` | Displayed in the top bar |
| `KUMIDOCS_PULL_INTERVAL` | `--pull-interval` | `60000` | Background git pull interval in ms |

## Content Repository Layout

```
README.md              → home page
.kumidocs.json         → instance config + editor permissions + custom slide themes
images/                → uploaded images (SHA-256.ext naming)
**/*.md                → doc pages and slide decks
**/*.{ts,js,...}       → code files
```

### `.kumidocs.json`

```json
{
  "instanceName": "MyDocs",
  "editors": ["alice@example.com", "bob@example.com"],
  "slideThemes": {
    "my-corp": {
      "bg": "#1a2744",
      "fg": "#e8edf8"
    }
  }
}
```

Any authenticated user can view. Only users listed in `editors` can create, edit, or delete pages.

### Page Frontmatter

```yaml
---
emoji: 📄
description: Shown in search results
slides: true      # mark as slide deck
theme: corporate  # built-in or custom theme name
paginate: true    # show N/total badge on each slide
---
```

## Building

```bash
bun run build      # outputs to dist/
bun start          # runs the production build
```
