---
emoji: 🖌️
---

# Custom Slide Themes

Custom themes let you brand your slide decks with company colours, logos, footer bars, and slide counters. They are defined in `.kumidocs.json` under the `slideThemes` key.

## Minimal Example

```json
{
  "slideThemes": {
    "my-brand": {
      "bg": "#0f172a",
      "fg": "#f8fafc"
    }
  }
}
```

Use it in any deck:

```yaml
---
slides: true
theme: my-brand
---
```

## SlideThemeDef Reference

```typescript
interface SlideThemeDef {
  bg?: string; // CSS background value for the canvas
  fg?: string; // Sets --slide-fg (text colour)
  contentPadding?: {
    // Reserve space for overlay elements (px on 960×540)
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  elements?: SlideThemeElement[]; // Overlay elements, rendered in z-order
  layouts?: Record<string, SlideThemeDef>; // Per-layout-class overrides
}
```

All fields are optional. A theme can be as simple as a background colour or as complex as a fully branded template with logo, footer bar, and slide counter.

## Overlay Elements

The `elements` array lets you place rectangles, text, and images over every slide.

### Rectangle

```json
{
  "type": "rect",
  "fill": "#e00",
  "left": 0,
  "right": 0,
  "bottom": 0,
  "height": 40
}
```

| Field                            | Type   | Description                                  |
| -------------------------------- | ------ | -------------------------------------------- |
| `fill`                           | string | CSS colour                                   |
| `left`, `right`, `top`, `bottom` | number | Distance from edge in px (on 960×540 canvas) |
| `width`, `height`                | number | Size in px                                   |

Setting both `left: 0` and `right: 0` spans the full width. Setting both `top: 0` and `bottom: 0` spans the full height.

### Text

```json
{
  "type": "text",
  "content": "{{slideNum}} / {{slideTotal}}",
  "centerX": true,
  "bottom": 12,
  "color": "#fff",
  "fontSize": 13
}
```

| Field                            | Type                                | Description                               |
| -------------------------------- | ----------------------------------- | ----------------------------------------- |
| `content`                        | string                              | Text content; supports template variables |
| `color`                          | string                              | CSS colour                                |
| `fontSize`                       | number                              | Font size in px                           |
| `bold`                           | boolean                             | Bold text                                 |
| `align`                          | `"left"` \| `"center"` \| `"right"` | Text alignment                            |
| `left`, `right`, `top`, `bottom` | number                              | Distance from edge                        |
| `centerX`, `centerY`             | boolean                             | Centre on that axis                       |

### Image

```json
{
  "type": "image",
  "src": "/images/logo.png",
  "width": 120,
  "right": 16,
  "top": 14,
  "opacity": 0.9
}
```

| Field                            | Type    | Description                                     |
| -------------------------------- | ------- | ----------------------------------------------- |
| `src`                            | string  | Image URL (use `/images/…` for uploaded images) |
| `opacity`                        | number  | 0 to 1 opacity                                  |
| `width`, `height`                | number  | Size in px                                      |
| `left`, `right`, `top`, `bottom` | number  | Distance from edge                              |
| `centerX`, `centerY`             | boolean | Centre on that axis                             |

## Template Variables

Use these in `text.content`:

| Variable              | Output                         |
| --------------------- | ------------------------------ |
| `{{slideNum}}`        | Current slide number           |
| `{{slideTotal}}`      | Total slide count              |
| `{{title}}`           | First `#` heading on the slide |
| `{{date}}`            | Today's date in `YYYY-MM-DD`   |
| `{{date:DD/MM/YYYY}}` | Date in custom format          |

## contentPadding

When you have a footer bar, set `contentPadding.bottom` to prevent slide content from overlapping it:

```json
{
  "bg": "#fff",
  "fg": "#111",
  "contentPadding": { "bottom": 40 },
  "elements": [
    { "type": "rect", "fill": "#1a2744", "left": 0, "right": 0, "bottom": 0, "height": 40 },
    {
      "type": "text",
      "content": "{{slideNum}} / {{slideTotal}}",
      "centerX": true,
      "bottom": 12,
      "color": "#fff",
      "fontSize": 13
    }
  ]
}
```

## Per-Layout Overrides

Use `layouts` to apply a completely different style to specific layout classes. The `layouts` entry **fully replaces** the base theme for that layout class.

```json
{
  "bg": "#fff",
  "fg": "#111",
  "layouts": {
    "title": {
      "bg": "#1a2744",
      "fg": "#e8edf8",
      "elements": [
        { "type": "rect", "fill": "#e00", "left": 0, "right": 0, "bottom": 0, "height": 6 }
      ]
    },
    "section": {
      "bg": "#1a2744",
      "fg": "#e8edf8"
    }
  }
}
```

The `"default"` key in `layouts` matches slides with no `<!-- class -->` directive.

## Full Example: Corporate Brand

```json
{
  "slideThemes": {
    "acme-corp": {
      "bg": "#ffffff",
      "fg": "#1a1a2e",
      "contentPadding": { "bottom": 48, "top": 12 },
      "elements": [
        {
          "type": "rect",
          "fill": "#003087",
          "left": 0,
          "right": 0,
          "top": 0,
          "height": 6
        },
        {
          "type": "rect",
          "fill": "#f5f5f5",
          "left": 0,
          "right": 0,
          "bottom": 0,
          "height": 48
        },
        {
          "type": "text",
          "content": "ACME Corp · Confidential",
          "left": 24,
          "bottom": 16,
          "color": "#666",
          "fontSize": 12
        },
        {
          "type": "text",
          "content": "{{slideNum}} / {{slideTotal}}",
          "right": 24,
          "bottom": 16,
          "color": "#666",
          "fontSize": 12
        }
      ],
      "layouts": {
        "title": {
          "bg": "#003087",
          "fg": "#ffffff",
          "elements": [
            {
              "type": "rect",
              "fill": "#e8002d",
              "left": 0,
              "right": 0,
              "bottom": 0,
              "height": 8
            }
          ]
        }
      }
    }
  }
}
```

## Dark / Light Detection

KumiDocs automatically determines whether slide text should be dark or light based on the `bg` value. It uses `isBgDark(bg)`, a luminance heuristic. If your custom background is dark, the `.dark` CSS class is applied to the canvas, triggering dark-mode typography tokens.

You don't need to do anything special: just set `fg` to the appropriate text colour for your background.
