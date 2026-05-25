---
slides: true
theme: corporate
paginate: true
emoji: 🗂️
---

<!-- class: title -->

# Slide Layouts

Six layout classes — add `<!-- class: NAME -->` to any slide.

_This page is itself a slide deck — click through to see each layout._

---

## Default Layout

No `<!-- class -->` directive needed.

Content flows top-to-bottom with `px-8 py-6` padding.
Standard heading sizes apply.

```markdown
## Your heading

- Bullet point
- Another point
```

Use the default layout for most content slides.

---

<!-- class: title -->

# title layout

Full-height centred · `h1` enlarged to **3.5 rem**

```markdown
<!-- class: title -->

# Your Big Title

Subtitle or tagline here
```

Ideal for the **first** and **last** slides of a deck.

---

<!-- class: section -->

## section layout

Chapter divider · `h2` enlarged to **3.5 rem / 800 weight**

```markdown
<!-- class: section -->

## Chapter Two
```

---

## section

Use `section` before a group of related slides.

```markdown
<!-- class: section -->

## The Slide System
```

The heading is the only content — keep it short and punchy.

---

<!-- class: center -->

## center layout

Everything vertically and horizontally centred.
Normal heading sizes.

```markdown
<!-- class: center -->

## Key Stat

**94%** customer satisfaction
```

Great for quotes, key metrics, or calls to action.

---

<!-- class: split -->

## split layout

Two equal columns — content splits at the **second** `##`.

## Right column

The split happens at the second `##` heading.
Everything before it goes left; everything after goes right.

```markdown
<!-- class: split -->

## Left Column

Left content here.

## Right Column

Right content here.
```

---

<!-- class: split -->

## When to use split

- Comparing two options
- Before / After
- Pros / Cons
- Two code snippets side by side

## Tips

- Keep both columns roughly equal in length
- Use bullet lists for scannable comparisons
- Avoid very long paragraphs in split layout

---

## blank layout

<!-- class: blank -->

Zero padding — content fills edge to edge.

```markdown
<!-- class: blank -->

![Full-bleed image](/images/your-image.png){width=960px height=540px}
```

Use for full-bleed images or custom-positioned content.

---

<!-- class: invert -->

## invert layout

Swaps `--slide-bg` and `--slide-fg`.
The foreground colour becomes the background and vice versa.

```markdown
<!-- class: invert -->

## Inverted Slide

High contrast without changing the deck theme.
```

Works with all built-in themes.

---

<!-- class: title -->

# Layout Reference

| Class | Height | Alignment | Heading size |
| --- | --- | --- | --- |
| _(none)_ | auto | top | normal |
| `title` | full | centre | h1 = 3.5rem |
| `section` | full | centre | h2 = 3.5rem |
| `center` | full | centre | normal |
| `split` | auto | top | normal |
| `blank` | auto | top | normal, p-0 |
| `invert` | auto | top | normal |

**Next:** [Themes Demo](docs/slides/themes)
