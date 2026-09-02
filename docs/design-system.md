# Sterna — Design System

**Version:** 1.0  
**Status:** Approved  
**Scope:** Sterna application UI  
**Purpose:** Single source of truth for visual design and implementation.

---

## 1. Principles

Sterna's visual identity should feel:

- natural;
- minimal;
- modern;
- warm;
- photographic;
- exploratory;
- map-centric.

The interface itself should remain restrained because photographs and map content already introduce visual variety.

### Visual hierarchy

1. **Sterna Green** — brand, primary actions, active states, exploration.
2. **Sterna Terracotta** — accent, points of interest, discoveries, notable elements.
3. **Warm neutrals** — backgrounds, surfaces, borders and typography.
4. **Semantic colors** — success, warning, error and information only.

### Core rule

Do not introduce a new brand color, font family, font size, spacing value, border radius or visual token without updating this document first.

If a required UI case is not explicitly covered, reuse the closest existing token instead of inventing a new value.

---

## 2. Brand colors

### 2.1 Sterna Green

Official primary color:

**`#2D5A3D`**

| Token | Value | Usage |
|---|---|---|
| `green-50` | `#F0F7F3` | Very light selected background |
| `green-100` | `#DCECE2` | Light badges and surfaces |
| `green-200` | `#B9D8C3` | Light progress / decoration |
| `green-400` | `#5F936F` | Secondary green elements |
| `green-500` | `#3F724E` | Intermediate state |
| `green-600` | `#2D5A3D` | **Primary Sterna color** |
| `green-700` | `#244A32` | Hover |
| `green-800` | `#1D3B28` | Pressed |
| `green-900` | `#162F20` | Exceptional dark surfaces |

#### Primary usage

Use Sterna Green for:

- primary buttons;
- active navigation;
- selected controls;
- explored areas;
- user position;
- important links and actions;
- progress indicators;
- logo and brand elements.

#### Primary button states

| State | Background | Text |
|---|---|---|
| Default | `#2D5A3D` | `#FFFFFF` |
| Hover | `#244A32` | `#FFFFFF` |
| Pressed | `#1D3B28` | `#FFFFFF` |
| Disabled | `#E7E5E0` | `#A8A29E` |

---

### 2.2 Sterna Terracotta

Official accent color:

**`#C4622D`**

| Token | Value | Usage |
|---|---|---|
| `terra-50` | `#FBF1EC` | Very light accent background |
| `terra-100` | `#F5DED2` | Accent badge / surface |
| `terra-200` | `#EAC0AC` | Decorative accent |
| `terra-300` | `#DFA084` | Light accent |
| `terra-400` | `#D17C56` | Secondary accent |
| `terra-500` | `#C4622D` | **Main Sterna accent** |
| `terra-600` | `#B8572B` | Interactive accent / text with white |
| `terra-700` | `#9E4723` | Pressed accent |
| `terra-800` | `#7E391F` | Exceptional dark accent |

Use Terracotta for:

- points of interest;
- notable discoveries;
- special badges;
- occasional illustration accents;
- secondary progress highlights;
- visual emphasis that must be distinct from the primary green.

Terracotta must **not** replace Sterna Green as the main action or navigation color.

For normal-size white text on a terracotta background, prefer `terra-600` (`#B8572B`) or darker.

---

## 3. Neutral palette

Sterna uses slightly warm neutrals.

| Token | Value | Usage |
|---|---|---|
| `background` | `#F7F5F0` | Main app background |
| `surface` | `#FFFFFF` | Cards, sheets, navigation, modals |
| `surface-subtle` | `#F0EEE8` | Secondary surfaces |
| `border` | `#E7E5E0` | Borders and separators |
| `text-primary` | `#1C1917` | Main text |
| `text-secondary` | `#6F6A64` | Secondary text |
| `text-disabled` | `#A8A29E` | Disabled / muted text |
| `disabled` | `#E7E5E0` | Disabled controls |

The majority of the interface should use neutral colors.

`text-secondary` was `#78716C` until we measured it: 4.40:1 on the background,
just under the 4.5:1 AA threshold, on the colour that carries most of the
secondary text in the app. `#6F6A64` reads the same and gives 4.92:1.

---

## 4. Semantic colors

Semantic colors are functional, not part of the Sterna brand palette.

| State | Main | Light background |
|---|---|---|
| Success | `#2F7D50` | `#EAF5EE` |
| Warning | `#A86500` | `#FFF4E5` |
| Error | `#C53030` | `#FDECEC` |
| Information | `#2F6B8A` | `#EAF3F7` |

Examples:

- successful upload → Success;
- approximate location → Warning;
- failed upload → Error;
- GPS information → Information.

Do not use semantic colors only for decoration.

---

## 5. Color usage rules

A typical Sterna screen should roughly contain:

- **80–90% neutral surfaces**
- **10–15% Sterna Green**
- **less than 5% Terracotta**

This is a direction, not a mathematical constraint.

### Do

- keep brand colors intentional;
- use green to communicate primary interaction and exploration;
- use terracotta sparingly to create contrast;
- allow photography to provide most of the visual color variety.

### Do not

- add a third brand color;
- use a different color for every category;
- recolor components arbitrarily per screen;
- use Terracotta as the main navigation color;
- communicate essential information using color alone.

---

## 6. Map styling

The map is the central visual element of Sterna.

It should remain sufficiently neutral for observations, photos, explored areas and points of interest to remain visually dominant.

### Basemap direction

| Element | Reference color |
|---|---|
| Terrain / land | `#E8E3D9` |
| Main roads | `#FFFFFF` |
| Secondary roads | `#F7F5F0` |
| Water | `#BFD8DF` |
| Parks / nature | `#DDE7D8` |
| Boundaries | `#D4CEC4` |
| Main labels | `#4F4A45` |
| Secondary labels | `#78716C` |

These basemap values define a visual direction rather than immutable implementation constants. They may be slightly adjusted according to the tile source, zoom level and readability requirements.

Brand-related map colors remain fixed.

### Explored areas

Base color:

**`#2D5A3D`**

Recommended overlay:

```css
rgba(45, 90, 61, 0.22)
```

Optional outline:

```css
rgba(45, 90, 61, 0.70)
```

### Points of interest

Use:

**`#C4622D`**

Points of interest represent places to discover or special exploration targets.

### Current user position

Use:

**`#2D5A3D`**

The position must also use shape, outline or another non-color cue to distinguish it from other map elements.

### Observation markers

Prefer:

- photo thumbnails when useful;
- a white outline;
- a subtle shadow;
- neutral supporting UI.

Do not assign a full brand-like palette to observation categories.

---

## 7. Categories

Initial categories:

- Landscape;
- Monument;
- Food;
- Animal;
- Plant;
- Culture;
- Other.

Categories are primarily distinguished by:

1. icon;
2. label;
3. optionally shape or supporting visual treatment.

They should **not** each receive a permanent unique color.

### Analytics category visualization exception

Category-specific colors may be used inside analytical category breakdowns only,
such as the profile's "Discoveries by category" section. These colors are
visualization aids, not global category tokens: keep them muted, apply them only
to the icon treatment and progress indicator, and keep labels and counts
neutral. Do not propagate this palette to navigation, filters, discovery cards,
maps or other product surfaces.

| Category | Icon / indicator | Soft background |
|---|---|---|
| Landscape | `#2F6B8A` | `#EAF3F7` |
| Monument | `#7E6552` | `#F1E9E4` |
| Food | `#B8572B` | `#FBF1EC` |
| Animal | `#3F7A78` | `#E8F2F1` |
| Plant | `#3F724E` | `#F0F7F3` |
| Culture | `#756B8F` | `#F1EEF7` |
| Other | `#9C7A32` | `#FBF4E2` |

### Inactive category

| Property | Value |
|---|---|
| Background | `#FFFFFF` |
| Border | `#E7E5E0` |
| Icon | `#6F6A64` |
| Text | `#1C1917` |

### Active category

| Property | Value |
|---|---|
| Background | `#F0F7F3` |
| Border | `#2D5A3D` |
| Icon | `#2D5A3D` |
| Text | `#2D5A3D` |

---

## 8. Typography

Sterna uses two font families.

### 8.1 Outfit — Primary UI font

**Outfit** is the default font for the Sterna interface.

Use it for:

- screen titles;
- body text;
- buttons;
- forms;
- navigation;
- labels;
- statistics;
- map UI;
- functional headings;
- metadata and general interface copy.

```css
font-family: "Outfit", sans-serif;
```

Allowed weights:

- 400 — Regular
- 500 — Medium
- 600 — Semi Bold
- 700 — Bold

Avoid unnecessary additional weights.

---

### 8.2 Fraunces — Editorial accent font

**Fraunces** is reserved for high-emphasis editorial and exploratory content.

Use it for:

- welcome / hero messaging;
- discovery titles when visually emphasized;
- points of interest;
- milestones and exploration achievements;
- selected high-emphasis editorial moments.

```css
font-family: "Fraunces", serif;
```

Do not use Fraunces for:

- functional screen titles;
- buttons;
- navigation;
- input fields;
- long body text;
- small labels;
- dense functional UI.

Fraunces should remain relatively rare so that it keeps its visual identity.

---

## 9. Type scale

Do not create arbitrary font sizes.

| Token | Font | Size | Line height | Weight |
|---|---|---:|---:|---:|
| `display` | Fraunces | 36 px | 44 px | 700 |
| `screen-title` | Outfit | 30 px | 36 px | 700 |
| `section-title` | Outfit | 22 px | 28 px | 600 |
| `heading` | Outfit | 18 px | 24 px | 600 |
| `body-lg` | Outfit | 16 px | 24 px | 400 |
| `body` | Outfit | 14 px | 20 px | 400 |
| `label` | Outfit | 14 px | 20 px | 600 |
| `button` | Outfit | 15 px | 20 px | 600 |
| `caption` | Outfit | 12 px | 16 px | 500 |

### Rules

- Normal reading text should generally be `14 px` or `16 px`.
- `12 px` is reserved for secondary information.
- `11 px` is reserved for very compact metadata or navigation labels.
- Important information must not be smaller than `12 px`.
- Do not use arbitrary values such as `9.5 px`, `17 px` or `23 px`.

---

## 10. Spacing

Sterna uses a **4 px base grid**.

Preferred spacing values:

```text
4
8
12
16
20
24
32
40
48
```

Use these values consistently for:

- padding;
- margins;
- gaps;
- component spacing;
- section spacing.

Avoid arbitrary spacing values unless a technical constraint requires them.

---

## 11. Border radius

| Token | Value |
|---|---:|
| `radius-sm` | 8 px |
| `radius-md` | 12 px |
| `radius-lg` | 16 px |
| `radius-xl` | 20 px |
| `radius-2xl` | 24 px |
| `radius-full` | 999 px |

Recommended usage:

- inputs → `12 px`;
- standard buttons → `16 px`;
- prominent / large mobile CTAs → `20 px`;
- cards → `16 px`;
- bottom sheets → `24 px`;
- chips → `12 px` or `radius-full`.

Avoid mixing excessively square and excessively rounded components without reason.

---

## 12. Buttons

### Primary

| Property | Value |
|---|---|
| Font | Outfit |
| Size | 15 px |
| Weight | 600 |
| Background | `#2D5A3D` |
| Text | `#FFFFFF` |
| Radius | `16 px` |

### Secondary

| Property | Value |
|---|---|
| Background | `#FFFFFF` |
| Border | `#2D5A3D` |
| Text | `#2D5A3D` |

### Destructive

| Property | Value |
|---|---|
| Background | `#C53030` |
| Text | `#FFFFFF` |

### Accent action

Use only when a secondary but visually important action must be Terracotta.

| Property | Value |
|---|---|
| Background | `#B8572B` |
| Text | `#FFFFFF` |

Do not use accent actions as the default CTA style.

---

## 13. Navigation

### Active item

- icon: `#2D5A3D`;
- text: `#2D5A3D`;
- Outfit;
- 11 px;
- 600 weight.

### Inactive item

- icon: `#6F6A64`;
- text: `#6F6A64`.

Active state should not rely only on color. Icon shape, weight or another visual cue may also be used.

---

## 14. Icons

Standard sizes:

| Token | Size |
|---|---:|
| `icon-sm` | 16 px |
| `icon-md` | 20 px |
| `icon-lg` | 24 px |
| `icon-xl` | 32 px |

Use one consistent icon family and visual style whenever possible.

Avoid mixing:

- outline and filled icon systems without purpose;
- emojis;
- 3D icons;
- unrelated icon libraries on the same screen.

---

## 15. Shadows

Shadows must remain subtle.

Use them only to communicate elevation or separation, for example:

- cards above the background;
- map markers;
- floating controls;
- modals;
- bottom sheets.

Avoid:

- large glow effects;
- strong colored shadows;
- decorative shadows with no elevation meaning.

---

## 16. Photography

Photography is a central part of Sterna.

Photos are allowed to be much more colorful than the surrounding interface.

Do not apply a permanent Sterna Green or Terracotta filter to user photos.

Avoid systematic:

- color overlays;
- artificial saturation;
- brand gradients;
- decorative filters.

The UI around photography should remain neutral so that the content remains dominant.

---

## 17. Logo

### Green logo

Use the Sterna logo in `#2D5A3D` on:

- white;
- warm off-white;
- light neutral surfaces.

### White logo

Use the white logo on:

- `#2D5A3D`;
- sufficiently dark photography where contrast is guaranteed.

Do not:

- stretch the logo;
- rotate it;
- recolor it arbitrarily;
- add 3D effects;
- add decorative shadows.

---

## 18. Authentication screens

### Welcome screen

- A full-screen photograph may be used for the unauthenticated entry screen.
- The photograph may extend edge-to-edge behind the layout.
- Interactive content must respect the device safe areas.
- A light overlay or gradient is allowed only to preserve text and CTA readability.
- The primary CTA uses Sterna Green; the secondary CTA uses a neutral or white surface.
- The main application bottom navigation is not shown.

### Login / Register

- Use the warm neutral page background and restrained, functional forms.
- Inputs use white or neutral surfaces with the standard border token.
- Focus states use Sterna Green; semantic colors are reserved for validation errors.
- Authentication screen titles use Outfit; Fraunces remains reserved for editorial and exploratory moments.
- Login and Register share the same structure, input treatment, CTA dimensions and link styles.

---

## 19. Accessibility

Sterna UI must preserve sufficient contrast and readability on mobile.

Requirements:

- essential information must not rely on color alone;
- interactive states should combine color with shape, icon, border, label or weight when appropriate;
- important text must remain readable at mobile sizes;
- touch targets must be large enough for smartphone interaction;
- disabled states must remain distinguishable;
- semantic states should use both color and textual/iconographic information where necessary.

---

## 20. AI agent rules

Any AI agent creating or modifying Sterna UI must follow this design system.

### MUST

- read this document before making UI changes;
- use existing design tokens;
- use `#2D5A3D` as the primary action color;
- use `#C4622D` only as a controlled accent;
- use Outfit for functional UI;
- use Fraunces only for selected display typography;
- use the defined type scale;
- use the 4 px spacing grid;
- use the defined radius scale;
- keep the basemap visually restrained;
- keep photography visually dominant.

### MUST NOT

- invent new brand colors;
- add a third brand color;
- assign one color to every category;
- invent new font families;
- invent arbitrary font sizes;
- invent arbitrary spacing values;
- invent arbitrary border radii;
- use Terracotta as the primary navigation or CTA color;
- use Fraunces for buttons, forms or dense functional UI;
- use important text below 12 px;
- communicate essential state using only color.

### Exception rule

If the design system does not cover a required UI case:

1. reuse the closest existing token whenever possible;
2. do not create a new visual token silently;
3. update this document explicitly before introducing a genuinely new token.

---

## 21. Core implementation tokens

```text
BRAND_PRIMARY           #2D5A3D
BRAND_PRIMARY_HOVER     #244A32
BRAND_PRIMARY_PRESSED   #1D3B28
BRAND_PRIMARY_LIGHT     #F0F7F3

BRAND_ACCENT            #C4622D
BRAND_ACCENT_ACTION     #B8572B
BRAND_ACCENT_LIGHT      #FBF1EC

BACKGROUND              #F7F5F0
SURFACE                 #FFFFFF
SURFACE_SUBTLE          #F0EEE8
BORDER                  #E7E5E0

TEXT_PRIMARY            #1C1917
TEXT_SECONDARY          #6F6A64
TEXT_DISABLED           #A8A29E

SUCCESS                 #2F7D50
WARNING                 #A86500
ERROR                   #C53030
INFO                    #2F6B8A

FONT_UI                 Outfit
FONT_DISPLAY            Fraunces
```

---

## 22. Recommended CSS variables

```css
:root {
  /* Brand */
  --color-primary: #2D5A3D;
  --color-primary-hover: #244A32;
  --color-primary-pressed: #1D3B28;
  --color-primary-light: #F0F7F3;

  --color-accent: #C4622D;
  --color-accent-action: #B8572B;
  --color-accent-light: #FBF1EC;

  /* Surfaces */
  --color-background: #F7F5F0;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F0EEE8;
  --color-border: #E7E5E0;

  /* Text */
  --color-text-primary: #1C1917;
  --color-text-secondary: #6F6A64;
  --color-text-disabled: #A8A29E;

  /* Semantic */
  --color-success: #2F7D50;
  --color-warning: #A86500;
  --color-error: #C53030;
  --color-info: #2F6B8A;

  /* Typography */
  --font-ui: "Outfit", sans-serif;
  --font-display: "Fraunces", serif;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 999px;
}
```

Application code should reference tokens instead of repeating raw values whenever practical.

Example:

```css
.primary-button {
  background: var(--color-primary);
  color: var(--color-surface);
}
```

Prefer this over:

```css
.primary-button {
  background: #2D5A3D;
  color: #FFFFFF;
}
```

---

## 23. Maintenance

This document is the visual source of truth for Sterna.

Changes to the design system should be intentional and reviewed.

When a visual rule changes:

1. update this document;
2. update the implementation tokens;
3. update affected components;
4. keep Figma/mockups and application code aligned.

The design system should evolve when necessary, but visual decisions must not drift independently between screens or contributors.
