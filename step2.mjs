import fs from 'fs';
const p = 'C:/Users/rpfly/Projects/f1-dashboard/src/App.jsx';
const src = fs.readFileSync(p, 'utf8');
const L = src.split('\n'); // L[i] is line i+1
const lines = (a, b) => L.slice(a - 1, b); // inclusive 1-indexed
const assert = (cond, msg) => { if (!cond) { console.error('ASSERT FAIL: ' + msg); process.exit(1); } };

// ── sanity checks on landmarks ──
assert(L[0] === 'import { useState, useEffect, useMemo, useRef, Fragment } from "react";', 'line 1 import');
assert(L[669] === '', 'line 670 blank');
assert(L[670].startsWith('export default function F1Dashboard(){'), 'line 671 F1Dashboard');
assert(L[696].includes('const[telMeetingKey,setTelMeetingKey]'), 'line 697 telMeetingKey');
assert(L[697].includes('const[telSelected,setTelSelected]'), 'line 698 telSelected');
assert(L[732].includes('lapCompareDataRef.current=lapCompareData;'), 'line 733 mirror');
assert(L[733] === '', 'line 734 blank');
assert(L[793].includes('// Race Replay clock'), 'line 794 replay clock comment');
assert(L[794].includes('useRafClock(replayPlaying'), 'line 795 replay clock');
assert(L[801] === '', 'line 802 blank');
assert(L[802].includes('// Leaving the Telemetry tab'), 'line 803 leaving comment');
assert(L[804].includes('useEffect(()=>{if(tab!=="Telemetry"){setReplayPlaying(false)'), 'line 805 leaving effect');
assert(L[805] === '', 'line 806 blank');
assert(L[806].includes('// Reset lap compare selection'), 'line 807 reset comment');
assert(L[816] === '    if(tab!=="Telemetry"||!openf1||lapCompareLap)return;', 'line 817 autoselect guard');
assert(L[823] === '  },[tab,openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap]);', 'line 824 autoselect deps');
assert(L[828] === '    if(tab!=="Telemetry"||!openf1||!lapCompareLap)return;', 'line 829 fetch guard');
assert(L[895] === '  },[tab,openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap,lapCompareRetry]);', 'line 896 fetch deps');
assert(L[896] === '', 'line 897 blank');
assert(L[1787].includes('═══ TELEMETRY ═══'), 'line 1788 marker');
assert(L[1788].trim() === '{tab==="Telemetry"&&(()=>{', 'line 1789 IIFE open');
assert(L[3411].trim() === '})()}', 'line 3412 IIFE close');

// ── pieces ──
const importLine = 'import { useState, useEffect, useMemo, useRef, Fragment, memo } from "react";';

const stateBlock = lines(698, 733); // moved state + refs + render-mirror, verbatim

// effects: replay clock(794-795), blank, reset replay(797-798), blank, lap clock(800-801), blank
const fxA = lines(794, 801);
// reset selection(807-808), reset zoom/pan(809-810), blank(811), autoselect comment(812-815)
const fxB = lines(807, 815);
// autoselect body 816-824 with guard/deps edits
const auto = lines(816, 824);
auto[1] = '    if(!openf1||lapCompareLap)return;';
auto[8] = '  },[openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap]);';
assert(lines(816, 824)[1] === L[816], 'auto slice sanity');
// blank 825, fetch comment+effect 826-896 with guard/deps edits
const fetchFx = lines(825, 896);
const gi = fetchFx.findIndex(l => l === '    if(tab!=="Telemetry"||!openf1||!lapCompareLap)return;');
assert(gi >= 0, 'fetch guard found');
fetchFx[gi] = '    if(!openf1||!lapCompareLap)return;';
const di = fetchFx.findIndex(l => l === '  },[tab,openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap,lapCompareRetry]);');
assert(di >= 0, 'fetch deps found');
fetchFx[di] = '  },[openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap,lapCompareRetry]);';

const body = lines(1790, 3411); // IIFE body, verbatim

const component = [
  '// ─── Telemetry tab — module-scope so hover/animation state re-renders only this',
  '// subtree, not the whole dashboard. Mounted only while the tab is active.',
  'const TelemetryTab=memo(function TelemetryTab({openf1,tracks,telMeetingKey,setTelMeetingKey}){',
  '  // Telemetry tab state',
  ...stateBlock,
  '',
  ...fxA,
  ...fxB,
  ...auto,
  ...fetchFx,
  '',
  ...body,
  '});',
];

const renderLine = '        {tab==="Telemetry"&&<TelemetryTab openf1={openf1} tracks={tracks} telMeetingKey={telMeetingKey} setTelMeetingKey={setTelMeetingKey}/>}';

const out = [
  importLine,
  ...lines(2, 670),
  ...component,
  '',
  ...lines(671, 697),   // F1Dashboard start .. telMeetingKey (kept)
  ...lines(734, 793),   // blank + data-loading effect + openf1 memo + lazy-load effect + blank
  ...lines(897, 1788),  // blank .. TELEMETRY marker comment
  renderLine,
  ...lines(3413, L.length),
];

fs.writeFileSync(p, out.join('\n'));
console.log('OK — wrote', out.length, 'lines (was', L.length, ')');
