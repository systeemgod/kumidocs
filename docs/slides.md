---
emoji: 🎬
description: Build slide presentations from Markdown. Learn frontmatter settings, layouts, directives, themes, and PDF export.
---

# Slide Decks

Any KumiDocs page becomes a slide deck by adding `slides: true` to the frontmatter. Slides are split on `---` (triple dash) separators.

## Minimal Example

```markdown
---
slides: true
---

# First Slide

Some content here.

---

## Second Slide

More content.
```

## Frontmatter Options

```yaml
---
slides: true
theme: corporate    # built-in or custom theme name
paginate: true      # show "N / Total" badge
---
```

| Key | Default | Description |
| --- | --- | --- |
| `slides` | `false` | Enable slide deck rendering |
| `theme` | `default` | Deck-wide theme — see [Themes](docs/slides/themes) |
| `paginate` | `false` | Show slide number badge |

## Canvas

Each slide renders on a **960 × 540** canvas that scales to fill the viewer. On wide screens it fills the width; on narrow screens it scales down proportionally.

## Separators

Slides are split on `---` lines. A `---` inside a fenced code block is not treated as a separator.

```markdown
---
slides: true
---

# Slide 1

---

# Slide 2

Code blocks with --- inside are safe:

```markdown
---
This is inside a fence, not a slide separator.
```

---

# Slide 3
```

## Viewing Modes

The slide viewer supports three modes, toggled from the controls bar:

| Mode | Description |
| --- | --- |
| **Scroll** | All slides stacked vertically. Default in the editor. |
| **Paginate** | One slide at a time with prev/next navigation. |
| **Spotlight** | Full-screen black overlay, click to advance. |

Keyboard navigation works in all modes: **← ↑** previous, **→ ↓ Space** next.

## Controls Bar

The controls bar at the bottom of the viewer shows:

- Slide counter and prev/next buttons
- Maximize / Minimize toggle
- Spotlight mode button
- PDF export button (camera icon)
- Scroll / Paginate mode toggle

## Layouts

Add `<!-- class: NAME -->` anywhere in a slide to apply a layout:

| Class | Description |
| --- | --- |
| _(none)_ | Default flow layout — content stacks top to bottom |
| `title` | Full-height centred, `h1` at 3.5 rem |
| `section` | Full-height centred, `h2` at 3.5 rem / bold |
| `center` | Full-height centred, normal heading sizes |
| `split` | Two equal columns split at the second `##` |
| `blank` | Zero padding — full-bleed content |
| `invert` | Swaps background and foreground colours |

See the [Layouts Demo](docs/slides/layouts) — a live slide deck showing every layout.

## Per-Slide Directives

Override individual slides with HTML comment directives:

| Directive | Example | Effect |
| --- | --- | --- |
| `class` | `<!-- class: title -->` | Apply layout class |
| `bg` | `<!-- bg: #1a2744 -->` | Override background |
| `color` | `<!-- color: white -->` | Override text colour |

The `bg` directive accepts any CSS `background` value: hex colours, `oklch()`, `linear-gradient()`, image URLs.

See the [Directives Demo](docs/slides/directives) — a live slide deck showing every directive.

## Themes

Five built-in themes:

| Name | Background | Foreground |
| --- | --- | --- |
| `default` | App light/dark | App light/dark |
| `dark` | Near-black | Light grey |
| `corporate` | Navy `#1a2744` | Soft blue-white |
| `minimal` | Off-white | Near-black |
| `gradient` | Indigo→pink diagonal | White |

Custom themes can be defined in `.kumidocs.json`. See [Themes](docs/slides/themes) and [Custom Themes](docs/slides/custom-themes).

## PDF Export

Click the camera icon in the controls bar to export the deck as PDF. Each slide becomes one landscape page at 960 × 540 resolution. Overlays and custom theme elements are included.

## Full Example

```markdown
---
slides: true
theme: corporate
paginate: true
emoji: 📊
description: Q3 results presentation
---

<!-- class: title -->

# Q3 Results

Finance Team · October 2025

---

<!-- class: section -->

## Revenue

---

<!-- class: split -->

## This Quarter

- Revenue: **$2.4M** (+18%)
- Customers: **340** (+45)
- Churn: **2.1%** (↓ 0.3pp)

## vs Last Quarter

- Revenue: $2.0M
- Customers: 295
- Churn: 2.4%

---

<!-- bg: linear-gradient(135deg, #1a2744, #2d4a8a) -->
<!-- color: #e8edf8 -->

## Key Win

We closed **Acme Corp** in September.
$180k ARR, 3-year contract.

---

<!-- class: title -->

# Thank You

Questions?
```
