# Surface brief — F1 2026 dashboard (whole app shell + Overview first viewport)

Scope: full visual redesign of the single-page dashboard (all nine tabs share the shell and system; Overview is the first surface). Visitor mode: Operate, with a Persuade edge on the first viewport (recruiters arrive cold).

Audience: F1 fans returning weekly; hiring managers judging in 30–90 s. Task: what happened last round, who leads, what's next; depth (telemetry, sectors, quotes) one gesture away. Proof: real season data, real telemetry, provenance and freshness stamps. Constraints: static GitHub Pages, single-file React app, team colours identify cars, Lap Compare live-fetches OpenF1.

Memorable moment: the last Grand Prix's real lap chart drawn as a timekeeper's sheet, scrubbed by a stopwatch cursor that also drives the replay.

Unresolved: whether the F1 wordmark stays (user: no preference; keep as a small stamp); tab grouping stays nine.

## Direction contract

THESIS: The season kept the way a timekeeper kept it: ruled sheets on a dark bench, every figure in tabular ink, each car written in its team colour. It refuses the broadcast-graphics dashboard of dark cards, glowing accents and stat tiles.

OWN-WORLD: Bench #1B1F24 surrounds pale sheets #DDE4EA ruled in #9DB3CF; ink #14181D; record red #D62828 for fastest/leader only; team colours as ink, never fills. Barlow Condensed for headings and labels, Courier Prime for every numeral and data cell. Sheets with stamped header strips, ruled tables, index tabs on the sheet edge, a stopwatch scrubber. No Outfit, no glow, no textures.

STORY: A fan reads last round's lap chart and the standings billing at a glance; a reviewer sees live telemetry drawn as ink and a provenance stamp on every sheet, and believes the pipeline.

FIRST VIEWPORT: One sheet fills the viewport on the bench. Header strip: round, circuit, date, freshness stamp, index tabs. Left 62%: the last GP's lap chart, laps as columns, positions as rows, car numbers in team ink, leader traced red; the stopwatch scrubber beneath drives a lap cursor shared with replay and gap chart. Right 38%: standings as billing, leader largest, tail dense.

FORM: Timekeeper's lap chart, candidate 6 of 7 on the grounded list; seed cdc8c333; assigned. Raised by: strict monospace grid (ASCII), shared lap cursor (cyclorama), size-only hierarchy (lineup), station rail FP1→Race (darkroom), one header grid on every sheet (sneaker).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
