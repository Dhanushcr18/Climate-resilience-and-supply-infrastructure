---
name: Calm Logistics Utility
colors:
  surface: '#f8f9fd'
  surface-dim: '#d8dade'
  surface-bright: '#f8f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f8'
  surface-container: '#eceef2'
  surface-container-high: '#e7e8ec'
  surface-container-highest: '#e1e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#424654'
  inverse-surface: '#2e3134'
  inverse-on-surface: '#eff1f5'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0d56ce'
  primary: '#0047b0'
  on-primary: '#ffffff'
  primary-container: '#1f5fd6'
  on-primary-container: '#dee4ff'
  inverse-primary: '#b2c5ff'
  secondary: '#2b58bd'
  on-secondary: '#ffffff'
  secondary-container: '#7097ff'
  on-secondary-container: '#002d7a'
  tertiary: '#005a32'
  on-tertiary: '#ffffff'
  tertiary-container: '#0d7544'
  on-tertiary-container: '#9cf8ba'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a0'
  secondary-fixed: '#dae1ff'
  secondary-fixed-dim: '#b3c5ff'
  on-secondary-fixed: '#001849'
  on-secondary-fixed-variant: '#003fa3'
  tertiary-fixed: '#9af6b8'
  tertiary-fixed-dim: '#7ed99e'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522d'
  background: '#f8f9fd'
  on-background: '#191c1f'
  surface-variant: '#e1e2e6'
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-page:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-page-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-section:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-default:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-semibold:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-default:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for mission-critical disaster logistics and relief dispatch. The target audience comprises municipal dispatchers, relief coordinators, and fleet managers operating under acute cognitive fatigue during floods, infrastructure failures, and landslides.

The aesthetic philosophy is uncompromised functional minimalism:
- **Atmosphere:** Calm, grounded, clinical, and human. The interface acts as a silent tool rather than an attention-seeking dashboard.
- **Visual Discipline:** Strictly zero decorative flair. No gradients, neon accents, glowing rings, frosted glass layers, or speculative sci-fi motifs. 
- **Clarity over Cleverness:** High-contrast structural boundaries, dense data layouts, and deterministic states. Every visual asset must resolve a logistical question: route status, asset location, fuel sufficiency, or hazard proximity.

## Colors

The palette relies on deliberate chromatic containment. Backgrounds and surfaces remain neutral to allow critical route statuses and hazards to command immediate attention.

### Core Canvas & Controls
- **Page Canvas:** `#F7F8FA`
- **Surface & Cards:** `#FFFFFF`
- **Subtle Surface (Sidebars, Tables Headers):** `#F0F2F5`
- **Primary Borders & Rules:** `#E3E6EB`
- **Muted Borders:** `#EDF0F3`
- **Primary Action (Blue):** `#1F5FD6`
- **Action Hover:** `#184BB0`
- **Action Active / Selected Tint:** `#EBF2FD`
- **Text Primary:** `#14171A`
- **Text Secondary / Metadata:** `#535A63`
- **Text Disabled:** `#9CA3AF`

### Semantic Hazard Spectrum
Semantic colors are reserved strictly for environmental hazards, route status indicators, and operational triage. They are never used for standard UI chrome and must always be paired with explicit textual labels or distinct structural iconography:
- **Low Risk (Passable / Stable):** `#2E8B57` (Sea Green) | Tint: `#EAF5EE`
- **Moderate Risk (Caution / Degraded):** `#E0A100` (Amber) | Tint: `#FCF6E8`
- **High Risk (Impassable Near / Severe Delay):** `#E8590C` (Orange) | Tint: `#FDF1EB`
- **Critical / Blocked (Active Hazard / Route Cut):** `#C92A2A` (Deep Red) | Tint: `#FAECEC`

## Typography

The type system prioritizes immediate legibility and optical stability in data tables, map overlays, and operational feeds.

- **Typefaces:** IBM Plex Sans serves as the primary system face for all headlines, UI labels, and body text. JetBrains Mono is strictly reserved for operational unit tags, route waypoints, and vehicle codes (e.g., `TRK-001`, `MED-44A`).
- **Formatting Rules:** Sentence case is mandatory across all headers, inputs, actions, and status badges. Never use spaced-out all-caps or uppercase display transformations.
- **Tabular Figures:** All numeric displays (timestamps, payload weights, distance calculations, and coordinates) must employ OpenType tabular figures (`font-variant-numeric: tabular-nums; tnum: 1`) to prevent optical shifting across live updates.

## Layout & Spacing

The interface utilizes a dense, grid-disciplined layout built around a strict 8px base rhythm (with 4px for micro-alignment). 

### Layout Model
- **Split-Screen Ergonomics:** Desktop displays leverage a persistent 360px–420px modular master-detail sidebar docked alongside an edge-to-edge GIS navigation map canvas. 
- **Form Factor Adaptations:**
  - **Desktop (1024px+):** Fixed operational panels alongside fluid map/data regions. 24px outer margins, 16px to 24px column gutters.
  - **Tablet (768px – 1023px):** Collapsible secondary panels into slide-out drawers; sticky bottom transport controls.
  - **Mobile (<768px):** Single-column stacked triage view. The map defaults to the top 40% of viewport height with a thumb-accessible lower bottom-sheet holding asset lists and route waypoints.
- **Touch & Click Targets:** All interactive controls (buttons, map controls, list items, filters) enforce a minimum interactive bounding box of 44×44px, even when the visible container is compact.

## Elevation & Depth

Visual hierarchy in this design system is established entirely through planar containment, contrast, and hairline boundaries—not drop shadows or layered blurs.

### Depth Mechanisms
- **Zero Heavy Shadows:** Standard diffuse shadows, blurred drop shadows, and colored glows are completely forbidden.
- **Structural Outlines:** Depth and element separation are created using uniform 1px solid borders (`#E3E6EB`) over distinct background tones (`#FFFFFF` surfaces against `#F7F8FA` application backdrops).
- **Z-Index Layering:**
  - `Level 0 (Canvas):` Base map canvas and `#F7F8FA` application backdrops.
  - `Level 1 (Panels & Cards):` Surface `#FFFFFF` bordered with 1px `#E3E6EB`.
  - `Level 2 (Popovers & Filter Dropdowns):` Surface `#FFFFFF` with a crisp 1px `#D0D5DD` border and an ultra-subtle grounding shadow: `0 2px 4px rgba(20, 23, 26, 0.06)`.
  - `Level 3 (Emergency Modals & Critical Overlays):` Surface `#FFFFFF`, 1px `#14171A` border, backed by a flat `#14171A` scrim at 40% opacity.

## Shapes

Shapes reflect precision tools and engineered control systems. Roundedness is functional and compact, softening density while maintaining crisp structural alignment.

- **Cards and Panels:** 8px corner radius (`rounded-md`).
- **Interactive Controls (Inputs, Buttons, Dropdowns):** 6px corner radius.
- **Status Pills and Micro Badges:** 4px corner radius. Rounded pill shapes are deliberately omitted to preserve structural cohesion with the rectangular 8px layout grid.
- **Dividers & Strokes:** 1px solid without corner feathering.

## Components

### Buttons
- **Primary:** Background `#1F5FD6`, text `#FFFFFF`, border none, 6px radius. Height 40px (desktop) / 44px (field/touch). Hover state `#184BB0`. Active state `#143F96`.
- **Secondary:** Background `#FFFFFF`, text `#14171A`, 1px border `#E3E6EB`, 6px radius. Hover state `#F7F8FA` with border `#D0D5DD`.
- **Destructive / Abort:** Background `#FFFFFF`, text `#C92A2A`, 1px border `#C92A2A`. Hover state `#FAECEC`.
- **Icon Buttons:** 44×44px hit container, 20px clean outline icon (stroke width 1.75px), transparent background, hover `#F0F2F5`.

### Status Badges & Chips
- Status badges use a paired background tint, 1px border, and high-contrast text. Never rely on color alone; always pair with an icon or direct status string.
  - *Passable:* Background `#EAF5EE`, border `#B4DFC4`, text `#2E8B57`.
  - *Caution:* Background `#FCF6E8`, border `#F5DA99`, text `#946C00`.
  - *Impassable / Blocked:* Background `#FAECEC`, border `#F1ABAB`, text `#C92A2A`.
- Fleet & Cargo tags: JetBrains Mono text, background `#F0F2F5`, border `#E3E6EB`, text `#535A63`.

### Input Fields & Controls
- **Text Inputs:** Height 40px (min 44px touch region). Background `#FFFFFF`, 1px border `#E3E6EB`, 6px radius. Placeholder text `#9CA3AF`. Text `#14171A`. Focus state: 1px border `#1F5FD6` with a crisp 2px outer outline in `#EBF2FD`.
- **Checkboxes & Radios:** 18×18px bounding box centered in a 44×44px hit area. Unchecked border 1.5px `#535A63`, checked background `#1F5FD6`.

### Cards & Dispatch Units
- White background (`#FFFFFF`), 1px solid border (`#E3E6EB`), 8px radius, 16px internal padding.
- Card headers feature an explicit 1px divider (`#E3E6EB`) separating convoy identifiers, real-time timestamps, and action trays.

### Critical Alert Banner
- Full-width callout for flash floods, washed-out bridges, and active roadblocks.
- Background `#FAECEC`, 1px left accent border 4px solid `#C92A2A`, top/right/bottom border 1px `#F1ABAB`. Headline in `#C92A2A` semibold, body text in `#14171A`.