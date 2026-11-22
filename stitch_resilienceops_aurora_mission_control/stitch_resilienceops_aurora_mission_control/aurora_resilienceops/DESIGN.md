---
name: Aurora ResilienceOps
colors:
  surface: '#11131a'
  surface-dim: '#11131a'
  surface-bright: '#373941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b22'
  surface-container: '#1d1f26'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#b9cac6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#849490'
  outline-variant: '#3a4a47'
  surface-tint: '#00dec8'
  primary: '#c7fff3'
  on-primary: '#003731'
  primary-container: '#14f1d9'
  on-primary-container: '#00695e'
  inverse-primary: '#006b5f'
  secondary: '#cabeff'
  on-secondary: '#31009a'
  secondary-container: '#4816cb'
  on-secondary-container: '#b9aaff'
  tertiary: '#e2f8ff'
  on-tertiary: '#003641'
  tertiary-container: '#86e5ff'
  on-tertiary-container: '#00677a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#34fde4'
  primary-fixed-dim: '#00dec8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#e6deff'
  secondary-fixed-dim: '#cabeff'
  on-secondary-fixed: '#1c0062'
  on-secondary-fixed-variant: '#4816cb'
  tertiary-fixed: '#aeecff'
  tertiary-fixed-dim: '#36d8fb'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5d'
  background: '#11131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  telemetry-metric:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.03em
  telemetry-value:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  telemetry-timestamp:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.12em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-fidelity cinematic telemetry aesthetic tailored for high-stakes mission-critical operations. Built for cross-functional crisis commanders, supply-chain architects, and autonomous system directors, the interface commands immediate operational focus, calm cognitive processing under stress, and decisive autonomous orchestration.

The visual direction merges **Aerospace Telemetry** with **Luminous Glassmorphic Minimalism**:
- **Atmospheric Canvas:** A deep void canvas anchored by deep navy-black layers, punctuated by diffuse radial aurora blooms of electric teal and spectral violet.
- **Glass Optics:** Tactile frosted instrumentation decks featuring edge refraction, subtle specular top highlights, and restrained ambient edge lighting.
- **Data Precision:** Uncompromising clarity powered by dense micro-telemetry, strict tabular alignments, vector sparklines, and decisive color-coded risk vectors.
- **Human-Machine Teaming:** Visible autonomous agent states signified through ethereal violet intelligence indicators, differentiating automated system actions from manual human interventions.

## Colors

The palette operates in strict dark mode, anchored by deep cosmic void tones with focused luminous accents for system feedback and telemetry signals.

### Foundation & Atmosphere
- **Base Canvas (`#05070D`):** Deep navy-black void providing infinite depth without true flat pitch black.
- **Surface Elevation (`#0B101B` / `#111827`):** Elevated console panels and container backdrops.
- **Aurora Glow Teal (`#14F1D9`):** Primary command accent; illuminates active systems, primary triggers, and forward links.
- **Aurora Atmospheric Violet (`#7C5CFF`):** Secondary accent for autonomous agents, model intelligence, and orbital predictive models.
- **Cyan Vector (`#3DDCFF`):** Tertiary operational data accent for navigation vectors, live data streaming, and telemetry pings.

### Risk Telemetry Palette
- **Safe / Nominal (`#22E3A0`):** Unimpeded supply lines, cleared climate routes, stable nodes.
- **Moderate / Watch (`#FFD166`):** Emerging weather patterns, early inventory variances, cautionary telemetry.
- **High / Alert (`#FF8A3D`):** Active disruptions, dynamic rerouting required, critical capacity warnings.
- **Severe / Critical (`#FF3B5C`):** Route termination, closed terminal, immediate autonomous intervention needed.
- **Agent Intelligence (`#8B7CFF`):** Autonomous orchestration agents, generative resolution scripts, dynamic pipeline updates.

### Opacity & Surface Tokens
- **Panel Surface:** `rgba(11, 16, 27, 0.65)` layered with `backdrop-filter: blur(24px)`.
- **Panel Stroke:** `rgba(255, 255, 255, 0.08)` outer boundary; top inner edge uses `rgba(255, 255, 255, 0.16)`.
- **Atmospheric Bloom:** Linear and radial gradients with `rgba(20, 241, 217, 0.06)` to `rgba(124, 92, 255, 0.06)` with 80px blur.

## Typography

The typography hierarchy balances technical telemetry with instantaneous operational legibility:
- **Headlines (Space Grotesk):** Gives the console its aerospace forward-leaning character. Used for deck names, operational sectors, system diagnostics, and major status headlines.
- **Interface Copy (Inter):** Highly legible humanist-neutral grotesque for operational logs, incident briefs, advisory descriptions, and form labels.
- **Telemetry & Metrics (JetBrains Mono):** Reserved for quantitative readouts, UTC/Zulu timestamps, coordinate vectors, risk scores, sensor outputs, and tabular financial values. Ensure `font-variant-numeric: tabular-nums` is active globally across all monospace applications.

## Layout & Spacing

The layout model implements a structured, dynamic 12-column density grid designed for information-dense operations rooms and multi-display consoles.

### Grid System
- **Desktop (1440px+):** 12-column fluid grid. Gutters: `1.5rem` (`24px`), Section Margins: `2rem` (`32px`). Designed to support persistent tripartite views: Left Command Tree (3 cols), Central 3D Globe / Telemetry Canvas (6 cols), and Right Incident Diagnostics & Agent Orchestration (3 cols).
- **Tablet (768px - 1439px):** 8-column adaptive layout. Gutters: `1rem` (`16px`), Margins: `1.5rem` (`24px`). Side panels collapse into layered floating dock sheets.
- **Mobile (< 768px):** 4-column single-stack view with bottom navigation telemetry tray. Gutters: `0.75rem` (`12px`), Margins: `1rem` (`16px`).

### Layout Cadence
- Spatial rhythm adheres strictly to an 8px base grid with 4px sub-intervals for dense data clusters.
- High-density components (data tables, sparkline blocks, node statuses) use `space-xs` and `space-sm` internal padding to ensure high information density.
- Section boundaries and module cards leverage `space-lg` to create intentional separation between disparate climate and logistics data domains.

## Elevation & Depth

Visual hierarchy uses optical glass layers, specular edge highlights, and atmospheric glows to build a functional multi-tier z-axis.

### The Depth Scale
- **Tier 0 (Deep Ground):** Canvas background `#05070D` layered with subtle ambient radial gradients: `radial-gradient(circle at 15% 20%, rgba(20, 241, 217, 0.04), transparent 45%)` and `radial-gradient(circle at 85% 80%, rgba(124, 92, 255, 0.05), transparent 50%)`.
- **Tier 1 (Base Consoles & Panels):** Frosted glass surface using `background: rgba(11, 16, 27, 0.65)`, `backdrop-filter: blur(20px)`, outer stroke `1px solid rgba(255, 255, 255, 0.07)`, and an inset top hairline `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.
- **Tier 2 (Elevated Decks & Active Modules):** Focused interactive panels. `background: rgba(17, 24, 39, 0.75)`, `backdrop-filter: blur(28px)`, outer border `1px solid rgba(20, 241, 217, 0.25)`, soft drop shadow `0 16px 36px -8px rgba(0, 0, 0, 0.6)`, and ambient glow `0 0 20px -4px rgba(20, 241, 217, 0.15)`.
- **Tier 3 (Modals, Overlays & Autonomous Interventions):** Critical response interfaces and agent confirmation dialogues. `background: rgba(15, 23, 42, 0.9)`, border `1px solid rgba(124, 92, 255, 0.4)`, shadow `0 24px 60px -12px rgba(0, 0, 0, 0.85)`, accompanied by a deep atmospheric backdrop blackout `rgba(5, 7, 13, 0.8)`.

### Specular & Glow Rules
Shadows must avoid muddiness; they must use dark charcoal foundations tinted with the ambient primary and secondary hue. Status borders glow under critical focus using an outer spread: `box-shadow: 0 0 12px 0 var(--status-color-alpha)`.

## Shapes

The interface embraces a precise, instrument-grade architectural corner radius (`roundedness: 1` / soft precision).

- **Standard Containers & Modules:** `0.25rem` (`4px`) to `0.5rem` (`8px`) corner radius. Maintains sharp structural alignment suited to aerospace hardware and financial terminals.
- **Cards & Primary Glass Panels:** `rounded-lg` (`0.5rem` / `8px`) provides balanced framing without wasting screen corners.
- **Dialogs & Overlay Canvas:** `rounded-xl` (`0.75rem` / `12px`) soft container framing.
- **Pills, Badges & Toggles:** High-visibility indicators, live pulse dots, and telemetry tag filters use full-radius pill styling (`9999px`) to create clear contrast against angular structural grid panels.

## Components

### Buttons
- **Primary Trigger (Autonomous Execute / Intervene):** Solid luminous teal background (`#14F1D9`), text in `#05070D` (Space Grotesk, 600 weight), subtle outer glow `0 0 16px rgba(20, 241, 217, 0.3)`. On hover: brightness boost, glow increases to 24px spread.
- **Agent Action (AI Suggestion):** Violet base (`#7C5CFF`), text in pure white, inner top highlight, glow `0 0 16px rgba(124, 92, 255, 0.35)`.
- **Secondary / Telemetry Action:** Glass background (`rgba(255, 255, 255, 0.04)`), 1px stroke (`rgba(255, 255, 255, 0.12)`), text in `#E2E8F0`. Hover state triggers teal-accented border and `rgba(20, 241, 217, 0.08)` surface fill.
- **Destructive / Abort:** Border and accent in `#FF3B5C` with translucent alert fill `rgba(255, 59, 92, 0.1)`.

### Status Badges & Chips
- Monospace uppercase typography (`label-caps`), padding `2px 8px`, border radius `9999px`.
- Composed of an ambient background tint (12% opacity), crisp border (30% opacity), text match, and an optional 6px pulsing vector node dot.
- *Examples:*
  - `CRITICAL`: Fill `rgba(255, 59, 92, 0.12)`, Border `#FF3B5C`, Text `#FF3B5C`.
  - `AUTONOMOUS`: Fill `rgba(139, 124, 255, 0.14)`, Border `#8B7CFF`, Text `#8B7CFF`.

### Input Fields & Search Bars
- Glass baseline `rgba(11, 16, 27, 0.8)`, border `1px solid rgba(255, 255, 255, 0.12)`, text `#F8FAFC`.
- Focus state: border activates to `#14F1D9` with subtle box-shadow `0 0 0 1px #14F1D9, 0 0 12px rgba(20, 241, 217, 0.2)`. Placeholder text in `#64748B`. Integrated leading icons and keyboard shortcut badges (`JetBrains Mono`).

### Cards & Telemetry Pods
- Multi-layered frosted container with top-hairline highlight.
- Header region contains module title (`Space Grotesk`, `headline-sm`), uppercase telemetry identifier tag (`JetBrains Mono`, `label-caps`), and contextual action trigger.
- Body supports embedded SVG sparklines rendered with dual stop gradient strokes (`#14F1D9` to `#3DDCFF`), filled with translucent vertical decay (`opacity: 0.15` to `0`).

### Checkboxes, Radio Buttons & Toggles
- Checkboxes: 16x16px squares with 2px radius, dark navy fill, 1px border `rgba(255, 255, 255, 0.2)`. Active state fills with `#14F1D9` and check icon rendered in void black (`#05070D`).
- Switches / Toggles: Pill track in `rgba(255, 255, 255, 0.1)`, thumb `12px` solid `#94A3B8`. Active state shifts track to `rgba(20, 241, 217, 0.3)` and thumb to glowing `#14F1D9`.

### Specialized Telemetry Displays
- **Live Vector Sparkline:** Precision inline metric charts with crosshair data tracker and JetBrains Mono tooltips displaying coordinate variance, delta percentages, and confidence bands.
- **Agent Orchestration Feed:** Chronological monospace audit trail detailing autonomous actions (e.g., *"[ROUTE_DIVERSIFIED] Cape of Good Hope corridor active via AutoPilot.04"*), marked with dedicated `#8B7CFF` intelligence pips.