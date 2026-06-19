---
slides: true
theme: minimal
paginate: true
emoji: 💬
---

<!-- class: title -->

# Per-Slide Directives

HTML comments that control individual slides.
Stripped from the rendered output.

_This deck uses the **minimal** theme; directives override individual slides._

---

## What are directives?

Add `<!-- key: value -->` comments anywhere in a slide.
The parser strips them before rendering; they never appear in output.

| Directive            | Aliases | Effect                                                                 |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| `class`              |         | Layout class: `title`, `section`, `split`, `center`, `blank`, `invert` |
| `background`         | `bg`    | CSS background shorthand: colour, gradient, or image URL               |
| `backgroundColor`    |         | Individual `background-color`                                          |
| `backgroundImage`    |         | Individual `background-image`                                          |
| `backgroundPosition` |         | Individual `background-position`                                       |
| `backgroundRepeat`   |         | Individual `background-repeat`                                         |
| `backgroundSize`     |         | Individual `background-size`                                           |
| `backgroundFilter`   |         | CSS filter applied to the background (e.g. `brightness(0.5)`)          |
| `color`              |         | Override text colour                                                   |

All directives accept the Marp-style `_` prefix (e.g. `_class`, `_background`)
to limit the effect to a single slide, though in KumiDocs everything is
already per-slide, so the prefix is optional.

---

## class directive

Apply a layout class to one slide without affecting others.

```markdown
<!-- class: title -->

# This slide uses the title layout
```

Multiple classes are not stacked; the last `class` directive wins.
Place directives anywhere in the slide: top, middle, or bottom.

---

<!-- class: section -->

## section via directive

This slide uses `<!-- class: section -->` while the deck theme stays `minimal`.

```markdown
<!-- class: section -->

## section via directive
```

---

<!-- background: #1a2744 -->
<!-- color: #e8edf8 -->

## background + color

This slide has a **navy background** and **soft blue-white text**
set via directives; the deck theme is still `minimal`.

```markdown
<!-- background: #1a2744 -->
<!-- color: #e8edf8 -->

## Your heading
```

The shorthand `bg` also works; it's an alias for `background`.

---

<!-- background: linear-gradient(135deg, #f97316, #ec4899) -->
<!-- color: white -->

## Gradient background

`background` (or `bg`) accepts any valid CSS `background` value:
solid colours, `linear-gradient()`, `radial-gradient()`, and image URLs.

```markdown
<!-- background: linear-gradient(135deg, #f97316, #ec4899) -->
<!-- color: white -->
```

---

<!-- background: oklch(0.96 0.15 145) -->
<!-- color: oklch(0.15 0.08 145) -->

## oklch colours

Modern `oklch()` colours work too:
perceptually uniform and great for accessible contrast.

```markdown
<!-- background: oklch(0.96 0.15 145) -->
<!-- color: oklch(0.15 0.08 145) -->
```

---

<!-- background: #18181b -->
<!-- color: #a1a1aa -->

## Dark slide in a light deck

Directives let you create contrast _within_ a deck
without switching the whole theme.

One dark "interlude" slide while the rest stays `minimal`.

---

## Individual background-\* directives

For fine-grained control, use the individual directives:

```markdown
<!-- backgroundImage: url(/images/photo.jpg) -->
<!-- backgroundSize: contain -->
<!-- backgroundPosition: left top -->
<!-- backgroundRepeat: no-repeat -->
```

These override only their specific CSS property on top of the theme's
background. Use `background` (or `bg`) when you want to replace everything.

---

<!-- backgroundFilter: brightness(0.6) sepia(0.3) -->

## Background filter

`backgroundFilter` applies a CSS filter to the background layer
Useful for toning down a photo behind text:

```markdown
<!-- backgroundImage: url(/images/hero.jpg) -->
<!-- backgroundSize: cover -->
<!-- backgroundFilter: brightness(0.6) sepia(0.3) -->
<!-- color: white -->
```

Any [CSS filter function](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function)
works: `brightness()`, `contrast()`, `blur()`, `sepia()`, `grayscale()`, etc.

---

## Directive placement

Directives can appear anywhere in a slide: top, bottom, or inline.
All directives on the slide are applied together.

```markdown
Some content here.

<!-- background: red -->

More content.

<!-- color: white -->

Final content.
```

All three blocks of content are rendered. Both `background` and `color` are applied.

---

## Multiple directives

Combine `class`, `background`, and `color` on the same slide:

```markdown
<!-- class: center -->
<!-- background: oklch(0.13 0 0) -->
<!-- color: oklch(0.93 0 0) -->

## Dark centred slide

A quote, a metric, or a call to action.
```

`class` controls layout; `background` and `color` control colours. They compose independently.

---

<!-- class: title -->

# Summary

| Directive            | Aliases | Purpose                                       |
| -------------------- | ------- | --------------------------------------------- |
| `class`              |         | Layout override                               |
| `background`         | `bg`    | Shorthand: replaces all background properties |
| `backgroundColor`    |         | Individual colour override                    |
| `backgroundImage`    |         | Individual image override                     |
| `backgroundPosition` |         | Position override                             |
| `backgroundRepeat`   |         | Repeat override                               |
| `backgroundSize`     |         | Size override                                 |
| `backgroundFilter`   |         | CSS filter on background                      |
| `color`              |         | Text colour override                          |
