---
name: F1 2026 Season Sheets
description: The season kept the way a timekeeper kept it — ruled paper sheets on a dark bench, every figure in tabular ink, each car written in its team colour.
colors:
  bench: "#1B1F24"
  bench-2: "#242A31"
  bench-3: "#2E353D"
  bench-ink: "#E6ECF1"
  bench-ink-bright: "#F2F5F8"
  bench-ink-muted: "#93A1AF"
  sheet: "#DDE4EA"
  sheet-2: "#D2DBE3"
  panel: "#E7EDF2"
  panel-2: "#EEF3F7"
  rule: "#9DB3CF"
  rule-soft: "rgba(157,179,207,0.55)"
  rule-faint: "rgba(157,179,207,0.3)"
  ink: "#14181D"
  ink-2: "#39424C"
  ink-3: "#5C6772"
  ink-4: "#737C86"
  ink-5: "#A9B3BC"
  record-red: "#D62828"
  red-soft: "rgba(214,40,40,0.10)"
  red-rule: "rgba(214,40,40,0.35)"
  green: "#1B7F4B"
  purple: "#6A2FC9"
  amber: "#B7791F"
  gold: "#9A7B1F"
  yellow: "#C9A400"
  team-mercedes: "#27F4D2"
  team-ferrari: "#E80020"
  team-mclaren: "#FF8000"
  team-red-bull: "#3671C6"
  team-racing-bulls: "#6692FF"
  team-alpine: "#FF87BC"
  team-aston-martin: "#229971"
  team-haas: "#B6BABD"
  team-williams: "#64C4FF"
  team-audi: "#FF0000"
  team-cadillac: "#D4AF37"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  data:
    fontFamily: "Courier Prime, Courier New, Courier, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  hairline: "1px"
  sheet: "2px"
  round: "50%"
spacing:
  "2xs": "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "28px"
  "2xl": "32px"
components:
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "26px 28px 30px"
  sheet-band:
    backgroundColor: "{colors.sheet-2}"
    textColor: "{colors.ink-3}"
    typography: "{typography.data}"
    padding: "12px 28px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  tab:
    backgroundColor: "{colors.bench-2}"
    textColor: "{colors.bench-ink-muted}"
    typography: "{typography.label}"
    rounded: "2px 2px 0 0"
    padding: "9px 16px 8px"
  tab-hover:
    backgroundColor: "{colors.bench-3}"
    textColor: "{colors.bench-ink}"
  tab-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    padding: "11px 16px 8px"
  button-secondary:
    backgroundColor: "rgba(20,24,29,0.07)"
    textColor: "rgba(20,24,29,0.82)"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: "8px 14px"
  chip-filter:
    backgroundColor: "rgba(20,24,29,0.035)"
    textColor: "rgba(20,24,29,0.74)"
    rounded: "{rounded.sheet}"
    padding: "6px 14px"
  chip-filter-selected:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "6px 14px"
  select:
    backgroundColor: "rgba(20,24,29,0.07)"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: "8px 36px 8px 12px"
  scrub-button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "34px"
  scrub-button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  tooltip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "10px 12px"
---

# Design System: F1 2026 Season Sheets

## Overview

**Creative North Star: "The Timekeeper's Lap Chart"**

The dashboard is a stack of ruled timing sheets laid on a dark bench. The bench is the only dark surface; everything the visitor reads sits on pale blue-grey paper ruled in a printed blue, written in near-black ink, with every numeral set in a typewriter monospace so columns of figures line up as they would on a hand-kept lap chart. Index tabs sit on the sheet's top edge and the active tab is physically joined to the paper. Each sheet opens with a stamped provenance band (sources, fetch time) because the pipeline behind the numbers is part of what is on display.

Hierarchy is done by size and rule weight, not by boxes or colour: the standings billing runs from a 44px leader down to a 13.5px tail; sections are separated by a single ruled line; panels are the same paper one shade lighter. Colour is reserved for meaning. Record red belongs to the leader trace, the stopwatch hand, active filters and focus rings; the eleven team colours are ink (strokes, text, bars, dots) after a lightness clamp so they read on paper, and appear as fills only as ten-percent tints behind a selected chip. The only motion is a fade-up on a tab's first visit, an ink draw-on for chart lines, and 150–200ms state transitions.

It deliberately refuses the broadcast-graphics dashboard: no dark cards, no glow, no gradient fills, no textures, no nested cards, no stat-tile grid. It also dropped the previous Outfit / near-black theme entirely; the translucent white-alpha vocabulary that theme used survives only as names (`--w015`…`--w90`) that now resolve to translucent ink on paper.

**Key Characteristics:**
- One dark bench, pale sheets, printed rules, ink: four materials and nothing else.
- Courier Prime for every numeral and data cell, `tabular-nums` everywhere.
- Barlow Condensed uppercase for headings, labels, tabs and driver names; Barlow for prose.
- Team colour is ink, never a fill; record red is rationed to the record and the cursor.
- Size-only hierarchy and single ruled lines instead of containers.
- 2px radii on sheets and panels; circles only for the stopwatch button and headshots.
- Motion is first-visit only; reduced-motion collapses everything.

## Colors

A three-layer material palette (bench, sheet, ink) with one record accent and a set of ink-clamped team colours used strictly as data identity.

### Primary
- **Record Red** (`record-red`): the timekeeper's red pen. Winner's trace on the lap chart, stopwatch hand and lap cursor, top-two ranks in the billing, active filter chips (as `red-soft` fill with a red border), focus rings, text selection, range-input accent. It marks the record and the current instant; nothing decorative.

### Secondary
- **Team liveries** (`team-*`): the eleven broadcast colours (`TC_RAW`) pass through `inkify()`, which darkens a livery by uniformly scaling its sRGB channels (preserving hue) until it clears ~3.1:1 against the sheet — the data-graphic contrast bar — so pale liveries (Williams blue, McLaren papaya, Mercedes teal) read as ink on paper; dark ones (Ferrari, Audi) pass unchanged. The target is the sheet's own luminance, not white, and results are cached. The clamped value (`TC`) is what draws lap-chart traces, car numbers, driver names, constructor bars, replay dots and chip borders. OpenF1 `teamColour` values are wrapped in `inkify()` at the point of use. A ten-percent tint (`TB` map, or `${tc}1a`) is the only fill a team colour may make, behind a selected driver chip.

### Tertiary
- **Sector semantics**: `purple` overall best, `green` personal best, `yellow` local yellow / sector-yellow; `green` also carries positive point deltas and the "fresh" freshness dot, `amber` the aging one, `red` the stale one. `gold` is the Cadillac ink surrogate and podium accent.

### Neutral
- **Bench** (`bench`, `bench-2`, `bench-3`): the desk under the sheets. Page background, inactive tabs (`bench-2`) with their border (`bench-3`) and hover (`bench-3`). Text on the bench uses `bench-ink` (header, stamp), `bench-ink-bright` (title, stamp emphasis) and `bench-ink-muted` (subtitle, inactive tab text).
- **Sheet** (`sheet`, `sheet-2`): the paper. Main tab surface and active tab; `sheet-2` is the provenance band and scrollbar track.
- **Panel** (`panel`, `panel-2`): paper one and two shades lighter, for inset panels, hover rows and tooltips. Never a card-on-card: a panel sits on the sheet, nothing sits on a panel.
- **Rules** (`rule`, `rule-soft`, `rule-faint`): the printed blue lines. Section rules, table heads and the band edge use `rule`; panel borders `rule-soft`; row dividers and ledger separators `rule-faint`.
- **Ink ramp** (`ink` … `ink-5`): primary text, secondary values, captions, tick labels, disabled. `--fg` aliases `ink`.
- **Translucent ink** (`--w015` … `--w90`, rgba of ink at 0.025–0.97): the legacy alpha vocabulary App.jsx inline styles use for chip fills (`--w02`–`--w04`), hairline borders (`--w06`–`--w10`), and secondary text (`--w30`–`--w60`). New CSS should prefer the named ink and rule tokens; the ramp exists so the old hierarchy survived the flip to paper.

### Named Rules
**The Ink, Not Fill Rule.** A team colour may be a stroke, a glyph, a bar, a dot or text. It may fill an area only at ten-percent alpha behind a selected chip. Never a solid block, never a gradient.

**The Red Pen Rule.** Record red marks the record (leader, winner, fastest) and the current instant (cursor, hand, active filter, focus). If a screen shows red on more than the record and the cursor, something is misfiled.

**The Clamp Before Use Rule.** Every colour that arrives from data (`TC_RAW`, OpenF1 `teamColour`) goes through `inkify()` before it touches paper. Raw liveries are never rendered.

## Typography

**Display Font:** Barlow Condensed 500/600/700 (with Barlow, system-ui)
**Body Font:** Barlow 400–700 (with system-ui, Segoe UI)
**Label/Mono Font:** Courier Prime 400/700 (with Courier New, monospace)

**Character:** A condensed grotesque for the headings and names a timekeeper would block-capital, a typewriter monospace for every figure so columns align by nature, and a plain grotesque for the few sentences of prose. Nothing is set in a system display face; the heading and label faces are always the condensed.

### Hierarchy
- **Display** (700, 44px, line-height 1, uppercase): the championship leader's name in the billing (`t1`); 34px under 768px. Tiers step 44 → 28 → 20 → 16 → 13.5px (`t1`–`t5`) with points figures 26 → 12px alongside.
- **Headline** (700, 34px, line-height 0.95, uppercase): the page title on the bench (26px on mobile), with a 13px 600 `0.18em`-tracked subtitle.
- **Title** (700, 22px, line-height 1, uppercase, `0.02em`): every sheet section heading (`.sheet-h`), followed by a 12px Courier subline (`.sheet-sub`) in `ink-3`. Podium names 18px; billing names 16–28px; all same face.
- **Body** (400–500, 14px, line-height 1.45): prose in quotes, notes under the chart, table cells; 12–13px inside dense tables and controls.
- **Data** (400/700, 12px Courier, `tabular-nums`): every numeral, time, gap, points figure, provenance stamp, tick label (9–11px) and table value. Bold for the figure that matters, regular for its unit or context.
- **Label** (600, 12px condensed, `0.08em`, uppercase): ledger keys, table heads, tab labels (14px, `0.06em`). Inline-styled labels in App.jsx use 9–11px with 1–1.5px tracking in `--w30`/`--w40`.

### Named Rules
**The Courier Numeral Rule.** If it is a number, it is Courier Prime with tabular figures. No exceptions for large figures; the 26px points total is Courier too.

**The Condensed Capitals Rule.** Headings, driver and team names, tab labels and column heads are Barlow Condensed uppercase. Body Barlow is for sentences, never for a heading.

## Layout

A single centred column, max width 1280px, with 32px side gutters (14px under 768px). Vertical order on every tab: bench header (`padding 22px 32px 0`) → index tab bar (18px above the sheet) → one sheet (`26px 28px 30px` padding; `18px 16px 22px` on mobile) whose provenance band bleeds to the sheet edges with negative margins. Sections inside a sheet are separated by `.rule-h` (1px rule, `22px 0 18px`), not by spacing alone.

The first viewport is a 62/38 grid (`minmax(0,62fr) minmax(0,38fr)`, 32px gap): lap chart with readout, stopwatch scrubber and ledger on the left, standings billing on the right. It collapses to one column at 1024px. Secondary grids are `.g2` (two columns, 32px gap), `.g3` (12px) and `.g4` (16px); all stack at 768px, `.g4` goes to two columns first then one at 480px. The podium is a three-column ruled strip that stacks with bottom rules on mobile.

Spacing rhythm is 4 / 8 / 12 / 16 / 22 / 28 / 32px. Row padding inside ruled lists is 5px (billing), 7–12px (rows), 14px (entries). Wide tables and grids scroll horizontally inside `.tbl-wrap`, `.compare-grid-wrap` and `.tire-bars` rather than reflowing. The LapChart SVG switches to a compact mode below 640px (fewer lap labels, smaller car numbers) and the scrubber's lap counter narrows at 480px.

## Elevation & Depth

Depth is material, not lighting. The sheet is the one lifted object: it casts a single soft shadow onto the bench (`0 18px 40px -22px rgba(0,0,0,.7), 0 2px 0 rgba(0,0,0,.25)`) so it reads as paper lying on a desk. Inside the sheet, depth is tonal: panels are one paper shade lighter, hover rows go to `panel`, and everything else is ruled lines. Tooltips are the only floating element and carry a small drop shadow; nothing glows, nothing blurs, no surface has a gradient (the one gradient in the build is the tab bar's scroll fade into the bench).

### Shadow Vocabulary
- **Sheet on bench** (`box-shadow: 0 18px 40px -22px rgba(0,0,0,.7), 0 2px 0 rgba(0,0,0,.25)`): the main sheet only.
- **Tooltip** (`box-shadow: 0 6px 18px -4px rgba(0,0,0,0.35)`): chart hover tooltips on `panel-2` with a `rule` or team-ink border.
- **Stopwatch cap** (`box-shadow: 0 1px 2px rgba(0,0,0,.35)`): the red dot on the scrubber hand.

### Named Rules
**The One Sheet Rule.** Exactly one surface is lifted: the sheet. Panels inside it are flat and tonal; a panel inside a panel is a defect.

## Shapes

Paper geometry. Sheets and panels have a 2px radius (the sheet's top-left corner is 0 where it meets the active tab); tabs are 2px on the top corners only; scrollbar thumbs 1px. Borders are 1px printed rules, never thicker except the stopwatch button's 1.5px ink ring. Circles are reserved for the stopwatch play button (34px), replay play button, headshots and the freshness dot. Team colour swatches are short 14×3px dashes, not squares or pills. Bars are square-ended rectangles on a `rule-faint` track. Buttons and selects are rectangles with 2px corners; the 4–6px pill radii still present on some Sector / Telemetry / Head-to-Head chips are legacy, not the rule.

## Components

### Buttons
- **Shape:** near-square, 2px radius.
- **Secondary (expand / show all):** translucent ink fill (`--w04`) with a `--w08` hairline, `--w60` text, Barlow 500 12px, padding `8px 14px`; 200ms transition.
- **Ghost (back / reset / zoom):** no fill, `--w08` border or none, `--w45`–`--w60` text.
- **Hover / Focus:** border darkens toward `rule` or `ink`; focus-visible is a 2px `record-red` outline at 2px offset (−3px inset on tabs).
- **Stopwatch play (signature):** 34px circle, `sheet` fill, 1.5px `ink` ring, SVG glyph; inverts to `ink` fill / `sheet` glyph on hover (150ms).

### Chips
- **Filter chips (sessions, drivers, rounds, metrics):** `--w02`/`--w03` fill, `--w08` hairline, `--w40`–`--w55` text, Barlow 11–13px, padding `5px 10px` to `8px 20px`.
- **Selected:** red filter chips take `red-soft` fill with a `record-red` border and `ink` text; driver chips take the driver's ink-clamped colour as border and a ten-percent tint of it as fill, weight 700.
- **Disabled (max drivers reached):** opacity 0.35, `not-allowed` cursor.

### Cards / Containers
- **Sheet:** `sheet` paper, `0 2px 2px 2px` radius, sheet shadow, `26px 28px 30px` padding; opens with the `sheet-band` (Courier 12px, `ink-3`, `sheet-2` fill, 1px `rule` under-edge) that names the sheet number and its sources.
- **Panel (`.rc`):** `panel` fill, 1px `rule-soft` border, 2px radius, 20px padding (14px mobile); border goes to `rule` on hover.
- **Ledger:** one ruled line (`rule` top and bottom, 9px vertical padding) of `KEY value` pairs separated by `rule-faint` verticals; keys condensed 12px `0.08em`, values Courier 13px bold.
- **Podium strip:** three ruled cells with Courier 26px position, condensed 18px name, 11px team, Courier gap.
- **Billing:** ruled list, `28px 1fr auto` grid, size tiers t1–t5, team dash before each name, `rule-faint` dividers (full `rule` under the leader).
- **Entries:** quote rows separated by `rule-faint`, 14px padding, headshot at left.

### Inputs / Fields
- **Select:** appearance none, `--w04` fill, 1px `--w10` border, 2px radius, `ink` text, Barlow 500 12–13px, `8px 36px 8px 12px` padding; border goes `record-red` on hover and focus; options render on `sheet`.
- **Range (scrubber):** the native input is transparent over a custom rail: 2px `ink-4` rail, 1px `ink-4` minor ticks and `ink-2` major ticks, Courier 9px tick labels, a 2px `record-red` hand with a 10px red cap. `accent-color` is `record-red` where native ranges show.

### Navigation
- **Index tabs:** a flex bar of `.tb` tabs on the sheet's top edge, each `flex:1`, Barlow Condensed 600 14px uppercase `0.06em`, `bench-2` fill with a `bench-3` border and no bottom border, top corners 2px, sitting 2px low. Hover lifts text to `bench-ink` on `bench-3`. Active takes the `sheet` colour and `ink` text, rises flush to the sheet and gains 2px top padding so it joins the paper. On mobile the bar scrolls horizontally (`flex:0 0 auto`, 12.5px) and a right-edge fade into the bench (`.fade-r`) shows overflow.

### Lap Chart (signature)
An SVG timing sheet: laps as columns with Courier lap numbers, positions as rows, each car a `round`-joined polyline in its ink-clamped team colour with its car number written in the same ink at both ends; the winner's trace is `record-red` and slightly heavier. Pit stops are open circles, local-yellow laps are pale `yellow` columns, the cursor is a 1.25px red vertical. Focusing a car fades the others to 0.28 opacity (180ms). Lines draw on with `.ink-draw` (stroke-dashoffset, 1.6s) the first time a tab is visited. A `LapReadout` beneath lists the running order at the cursor lap in Courier 11.5px; the `LapScrubber` (stopwatch rail plus play button) drives the cursor shared with the replay.

### Motion
- `.fu` fade-up (10px, 0.5s, `--ease-out` = `cubic-bezier(0.16,1,0.3,1)`) on a sheet and staggered 40–320ms across its children, only the first time a tab is visited (`visitedTabs` ref adds `.no-anim` after 1.2s).
- State transitions 150–200ms (background, colour, border, opacity); tab transform 180ms.
- `prefers-reduced-motion: reduce` sets every animation and transition to 0.01ms and pre-draws chart strokes.

## Do's and Don'ts

### Do:
- **Do** put every number in Courier Prime with `tabular-nums`, including large points totals and lap counters.
- **Do** run any data-sourced colour through `inkify()` before rendering it on paper; use it as stroke, text, bar or dot.
- **Do** separate sections with a single 1px `rule` line and size hierarchy, not with boxes.
- **Do** open every sheet with a `sheet-band` naming its sources and fetch time.
- **Do** keep radii at 2px on sheets, panels, buttons and selects; circles only for the stopwatch button, headshots and the freshness dot.
- **Do** reserve `record-red` for the record (leader, winner, fastest) and the instant (cursor, hand, active filter, focus).
- **Do** gate entrance animation on first visit and collapse all motion under `prefers-reduced-motion`.

### Don't:
- **Don't** fill any area with a team colour beyond a ten-percent tint behind a selected chip.
- **Don't** add glows, blurs, textures or gradient fills; the tab-bar scroll fade is the only gradient permitted.
- **Don't** nest a panel inside a panel or put a card on a card; the sheet is the only lifted surface.
- **Don't** set headings, names or labels in Barlow, system-ui or any face other than Barlow Condensed.
- **Don't** reintroduce the dark-card theme: no `#0a0a0f` grounds, no white-alpha surfaces, no Outfit.
- **Don't** use raw broadcast liveries or the old teal (`#27F4D2`) as a semantic positive colour; positive deltas are `green`.
- **Don't** use emoji or Unicode glyphs as icons; icons are inline SVG (the scrubber play glyph is the model).
