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

_This deck uses the **minimal** theme — directives override individual slides._

---

## What are directives?

Add `<!-- key: value -->` comments anywhere in a slide.
The parser strips them before rendering — they never appear in output.

Three directives are supported:

| Directive | Effect |
| --- | --- |
| `class` | Layout class: `title`, `section`, `split`, `center`, `blank`, `invert` |
| `bg` | Override background — colour, gradient, or image URL |
| `color` | Override text colour |

---

## class directive

Apply a layout class to one slide without affecting others.

```markdown
<!-- class: title -->

# This slide uses the title layout
```

Multiple classes are not stacked — the last `class` directive wins.
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

<!-- bg: #1a2744 -->
<!-- color: #e8edf8 -->

## bg + color

This slide has a **navy background** and **soft blue-white text**
set via directives — the deck theme is still `minimal`.

```markdown
<!-- bg: #1a2744 -->
<!-- color: #e8edf8 -->

## Your heading
```

---

<!-- bg: linear-gradient(135deg, #f97316, #ec4899) -->
<!-- color: white -->

## Gradient background

`bg` accepts any valid CSS `background` value:
solid colours, `linear-gradient()`, `radial-gradient()`, and image URLs.

```markdown
<!-- bg: linear-gradient(135deg, #f97316, #ec4899) -->
<!-- color: white -->
```

---

<!-- bg: oklch(0.96 0.15 145) -->
<!-- color: oklch(0.15 0.08 145) -->

## oklch colours

Modern `oklch()` colours work too —
perceptually uniform and great for accessible contrast.

```markdown
<!-- bg: oklch(0.96 0.15 145) -->
<!-- color: oklch(0.15 0.08 145) -->
```

---

<!-- bg: #18181b -->
<!-- color: #a1a1aa -->

## Dark slide in a light deck

Directives let you create contrast _within_ a deck
without switching the whole theme.

One dark "interlude" slide while the rest stays `minimal`.

---

## Directive placement

Directives can appear anywhere in a slide — top, bottom, or inline.
All directives on the slide are applied together.

```markdown
Some content here.

<!-- bg: red -->

More content.

<!-- color: white -->

Final content.
```

All three blocks of content are rendered. Both `bg` and `color` are applied.

---

## Multiple directives

Combine `class`, `bg`, and `color` on the same slide:

```markdown
<!-- class: center -->
<!-- bg: oklch(0.13 0 0) -->
<!-- color: oklch(0.93 0 0) -->

## Dark centred slide

A quote, a metric, or a call to action.
```

`class` controls layout; `bg` and `color` control colours. They compose independently.

---

<!-- class: title -->

# Summary

`<!-- class: X -->`
Override layout on this slide.

`<!-- bg: … -->`
Override background — any CSS value.

`<!-- color: … -->`
Override text colour.

**Three directives, endless combinations.**
