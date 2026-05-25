---
slides: true
theme: default
paginate: true
emoji: 🎨
description: Live demo of all five built-in KumiDocs slide themes — default, dark, corporate, minimal, and gradient.
---

<!-- class: title -->

# Slide Themes

Five built-in themes — set once in frontmatter,
applied to every slide in the deck.

_This deck uses the **default** theme._

---

## Choosing a Theme

Set the `theme` key in your frontmatter:

```yaml
---
slides: true
theme: corporate
---
```

The theme applies to every slide in the file. Individual slides can override the background and text colour using [per-slide directives](docs/slides/directives).

---

## default

The default theme inherits your app's light/dark mode.

```yaml
theme: default
```

- Works in both light and dark mode
- Relies on your Tailwind prose colours
- Slides look at home inside KumiDocs
- Best for everyday wiki-style content

_Tip: slide canvases are isolated from the site's dark mode toggle — a `dark` deck stays dark even if the site is in light mode._

---

<!-- class: section -->

## dark theme

---

## dark

> Near-black canvas with light text.
> Always dark, regardless of the user's OS preference.

```yaml
theme: dark
```

- `oklch(0.13 0 0)` background
- `oklch(0.93 0 0)` foreground
- Great for projectors and dark rooms
- Strong contrast for code-heavy slides

---

<!-- class: section -->

## corporate theme

---

## corporate

```yaml
theme: corporate
```

- Deep navy background: `#1a2744`
- Soft blue-white foreground: `#e8edf8`
- Professional, boardroom-ready look
- Pair with a custom logo overlay — see [Custom Themes](docs/slides/custom-themes)

---

<!-- class: section -->

## minimal theme

---

## minimal

```yaml
theme: minimal
```

- Off-white background: `oklch(0.96 0.005 240)`
- Near-black foreground: `oklch(0.18 0.01 240)`
- Clean, distraction-free reading experience
- Great for documentation and tutorial decks

---

<!-- class: section -->

## gradient theme

---

## gradient

```yaml
theme: gradient
```

Cyan → yellow-green diagonal gradient (`72.44deg`).

- Fixed dark foreground `#1a2020` — always readable
- Eye-catching for pitch decks and demos
- Works well with the `title` and `section` layouts

---

## Dark / Light Isolation

Slide canvases are fully isolated from the site's light/dark toggle.

| Theme | Behaviour |
| --- | --- |
| `default` | Follows site dark mode |
| `dark` | Always dark |
| `corporate` | Always dark (navy) |
| `minimal` | Always light (off-white) |
| `gradient` | Always has gradient |
| custom | Determined by `isBgDark(bg)` heuristic |

This means a `corporate` deck looks the same for every viewer regardless of their OS preference.

---

<!-- class: title -->

# Theme Reference

| Name | Background | Foreground |
| --- | --- | --- |
| `default` | App bg | App fg |
| `dark` | Near-black | Light grey |
| `corporate` | Navy `#1a2744` | `#e8edf8` |
| `minimal` | Off-white | Near-black |
| `gradient` | Indigo→pink | Dark `#1a2020` |

**Next:** [Per-Slide Directives](docs/slides/directives) · [Custom Themes](docs/slides/custom-themes)
