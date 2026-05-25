---
emoji: ✏️
description: Complete guide to writing KumiDocs pages — frontmatter, Markdown syntax, images, tables, code blocks, and callouts.
---

# Writing Pages

KumiDocs pages are plain Markdown files with optional YAML frontmatter. The editor is a split-pane view: raw Markdown on the left, live preview on the right.

## Frontmatter

Add a frontmatter block at the top of any page to set metadata:

```yaml
---
emoji: 🚀
description: Shown in search results and page previews.
slides: true        # turn this page into a slide deck
theme: corporate    # slide deck theme (slides only)
paginate: true      # show slide numbers (slides only)
---
```

| Key | Type | Purpose |
| --- | --- | --- |
| `emoji` | string | Icon shown in sidebar, browser tab, and page header |
| `description` | string | Shown in search results |
| `slides` | boolean | Render this page as a slide deck |
| `theme` | string | Slide deck theme — see [Themes](docs/slides/themes) |
| `paginate` | boolean | Show `N / Total` badge on each slide |

## Markdown Syntax

KumiDocs renders [GitHub Flavored Markdown](https://github.github.com/gfm/) (GFM). All standard GFM features are supported.

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

The first `# ` heading in the body is used as the page title.

### Emphasis

```markdown
**bold**, _italic_, ~~strikethrough~~, `inline code`
```

**bold**, _italic_, ~~strikethrough~~, `inline code`

### Lists

```markdown
- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item
   1. Nested ordered
```

- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item
   1. Nested ordered

### Links

```markdown
[KumiDocs](https://github.com/foorack/kumidocs)
[Relative page link](docs/getting-started)
```

### Blockquotes

```markdown
> This is a blockquote.
> It can span multiple lines.

> **Note**: You can bold text inside a blockquote.
```

> This is a blockquote.
> It can span multiple lines.

> **Note**: You can bold text inside a blockquote.

### Tables

```markdown
| Column A | Column B | Column C |
| --- | --- | --- |
| Value 1 | Value 2 | Value 3 |
| Value 4 | Value 5 | Value 6 |
```

| Column A | Column B | Column C |
| --- | --- | --- |
| Value 1 | Value 2 | Value 3 |
| Value 4 | Value 5 | Value 6 |

Column alignment:

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| A    |   B    |     C |
```

| Left | Center | Right |
| :--- | :----: | ----: |
| A    |   B    |     C |

### Code Blocks

Fenced code blocks with syntax highlighting. Specify the language after the opening fence:

````markdown
```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

Supported languages include: `typescript`, `javascript`, `python`, `rust`, `go`, `bash`, `json`, `yaml`, `sql`, `css`, `html`, and many more.

### Task Lists

```markdown
- [x] Completed task
- [ ] Incomplete task
- [x] Another done item
```

- [x] Completed task
- [ ] Incomplete task
- [x] Another done item

### Horizontal Rule

```markdown
---
```

---

## Images

### Basic Image

```markdown
![Alt text](/images/your-image.png)
```

### Uploading Images

Drag and drop an image onto the editor, or use the image upload button in the toolbar. KumiDocs:

1. Hashes the file (SHA-256)
2. Saves it to `images/<sha256>.<ext>` in your repo
3. Commits and pushes
4. Inserts the Markdown reference at your cursor

Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 25 MB.

### Image Sizing

KumiDocs supports `{key=value}` attribute blocks after images for inline sizing:

```markdown
![Logo](/images/logo.png){width=200px}
![Banner](/images/banner.png){max-width=100%}
![Thumbnail](/images/thumb.png){width=150px height=150px}
```

Supported properties: `width`, `height`, `max-width`, `min-width`, `max-height`, `min-height`.

### Image Library

Access all uploaded images at `/images` (sidebar **⋯** → **Image library**). The library shows:

- Image preview
- File size
- Which pages reference the image
- Delete button (blocked if any page still references the image)

## Editor Shortcuts

| Shortcut | Action |
| --- | --- |
| **Ctrl+S** | Save (creates a Git commit + push) |
| **Ctrl+K** | Open search palette |

## Saving and History

Every save creates a Git commit with the message:

```
docs(path/to/file.md): save by Your Name
```

Auto-save fires 5 seconds after your last keystroke:

```
docs(path/to/file.md): auto-save by Your Name
```

View the full commit history using the **History** panel (clock icon in the page header). You can view diffs between any two commits.

## PDF Export

Export any page as PDF from the **⋯** overflow menu in view mode. KumiDocs renders the page offscreen at full width and tiles it into an A4 PDF. Slide decks export as one landscape page per slide.

## Code Files

KumiDocs can also view and edit code files (`.ts`, `.js`, `.py`, `.go`, etc.) via the `/code/<path>` route. The editor uses CodeMirror with:

- Syntax highlighting (language auto-detected from extension)
- Line numbers
- Code folding
- GitHub light/dark theme
- Ctrl+S save (same commit flow as Markdown)
