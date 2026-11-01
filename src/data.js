// Pure data logic for the dashboard: data.json → the shapes the sheets render,
// plus the date/status/meeting helpers. No React, no DOM — App.jsx renders it
// and test/data.test.mjs tests it with node:test. (Components stay in App.jsx.)

// Data is loaded dynamically from data.json (fetched from Jolpica API)
// Transform functions convert API format to dashboard format

// Classification label of a raw data.json result: null for a classified finish,
// else "DNF" / "DSQ" / "DNS" / "NC". Current builds carry it as `out` (from
// Jolpica's positionText); older builds only have the status text.
export function resultOut(res){
  if(res.out!==undefined)return res.out;
  const st=(res.status||"").toLowerCase();
  if(st.includes("did not start"))return"DNS";
  if(st.includes("disqualified"))return"DSQ";
  if(isNaN(parseInt(res.pos))||/retired|accident|collision|engine|mechanical/.test(st))return"DNF";
  return null;
}

// Teammate battles, one per pair of drivers who shared a garage. Pairs come from
// who raced or qualified for each team in each round, so a seat change mid-season
// (2026: Lawson to Red Bull from round 12) yields a battle per pairing, each
// scored only over the rounds that pair actually shared.
export function headToHead(DS, CS, rawRaces, allRaces, qualifying) {
  const byDid = new Map(DS.filter(d => d.did).map(d => [d.did, d]));
  const byLast = new Map(DS.map(d => [d.n.split(" ").pop(), d]));
  const seats = {}; // team → round → Map(name → DS entry)
  const seat = (team, round, did, last) => {
    const d = (did && byDid.get(did)) || byLast.get(last);
    if (d && team) ((seats[team] ??= {})[round] ??= new Map()).set(d.n, d);
  };
  for (const r of rawRaces) for (const res of r.results || []) seat(res.team, r.round, res.did, res.driver);
  for (const q of qualifying) for (const res of q.results) seat(res.t, q.round, res.did, res.d);
  const same = (row, d) => (row.did ? row.did === d.did : row.d === d.n.split(" ").pop());
  const avg = a => (a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) : null);

  const battles = [];
  for (const c of CS) {
    const pairs = {};
    for (const [round, drivers] of Object.entries(seats[c.t] || {})) {
      const [a, b] = [...drivers.values()].sort((x, y) => x.p - y.p); // d1 = higher in the standings
      if (a && b) (pairs[`${a.n}|${b.n}`] ??= { d1: a, d2: b, rounds: [] }).rounds.push(Number(round));
    }
    const list = Object.values(pairs).map(p => ({ ...p, rounds: p.rounds.sort((x, y) => x - y) }))
      .sort((x, y) => y.rounds.at(-1) - x.rounds.at(-1)); // current pairing first
    for (const { d1, d2, rounds } of list) {
      const inPair = new Set(rounds);
      let q1 = 0, q2 = 0;
      const qualDetails = [];
      for (const q of qualifying) {
        if (!inPair.has(q.round)) continue;
        const r1 = q.results.find(r => r.t === c.t && same(r, d1));
        const r2 = q.results.find(r => r.t === c.t && same(r, d2));
        if (!r1 || !r2) continue;
        if (r1.pos < r2.pos) q1++; else if (r2.pos < r1.pos) q2++;
        qualDetails.push({ race: q.name.replace(" Grand Prix", ""), d1: r1.pos, d2: r2.pos });
      }
      // Finishing order from races; points from races and sprints, for this team only
      let w1 = 0, w2 = 0, pts1 = 0, pts2 = 0;
      const f1 = [], f2 = [], raceDetails = [];
      for (const race of allRaces) {
        if (!inPair.has(parseInt(race.r))) continue;
        const r1 = race.full.find(r => r.t === c.t && same(r, d1));
        const r2 = race.full.find(r => r.t === c.t && same(r, d2));
        pts1 += r1?.pts || 0;
        pts2 += r2?.pts || 0;
        if (race.sprint || !r1 || !r2) continue;
        const p1 = typeof r1.p === "number" ? r1.p : 99, p2 = typeof r2.p === "number" ? r2.p : 99;
        if (p1 < p2) w1++; else if (p2 < p1) w2++;
        if (typeof r1.p === "number") f1.push(r1.p); // average finish counts classified finishes only
        if (typeof r2.p === "number") f2.push(r2.p);
        raceDetails.push({ race: race.nm.replace(" Grand Prix", ""), d1: r1.p, d2: r2.p });
      }
      battles.push({
        team: c.t, d1, d2, rounds, teamPairings: list.length,
        qual: { d1: q1, d2: q2, details: qualDetails },
        race: { d1: w1, d2: w2, details: raceDetails },
        avgPos: { d1: avg(f1), d2: avg(f2) },
        pts: { d1: pts1, d2: pts2 },
      });
    }
  }
  return battles;
}

export function transformData(raw) {
  // Only the calendar is required: before round 1 of a new season there are no
  // standings yet, and the sheets show a season-opener view rather than an error
  if (!raw || !Array.isArray(raw.schedule)) return null;
  raw = { drivers: [], constructors: [], races: [], sprints: [], qualifying: [], ...raw };

  // Points delta: what each driver scored in the round the standings follow —
  // that round's race and/or sprint. Keyed off standingsRound because on a
  // sprint Saturday the standings already include the sprint while the last
  // race is the previous round (subtracting that race gave wrong arrows).
  // No fastest-lap bonus — the FL point was abolished from the 2025 season.
  const F1_PTS = {1:25,2:18,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1};
  const SPRINT_PTS = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:1};
  const sprintsArr = raw.sprints || [];
  // Older data.json builds lack per-result points — derive them from position
  const rowPts = (row, sprint) => row.pts ?? (row.out ? 0 : (sprint ? SPRINT_PTS : F1_PTS)[parseInt(row.pos)] || 0);
  // The latest round with a race or sprint result, no later than the round the
  // standings follow. Jolpica opens the NEXT round's standings table on race
  // Saturday (same points as the round before, no sessions yet) — keying off
  // that empty round blanked every delta and arrow until the race had run.
  const resultRounds = [...raw.races.map(r => r.round), ...sprintsArr.map(s => s.round)];
  const lastRound = Math.max(0, ...resultRounds.filter(r => !raw.standingsRound || r <= raw.standingsRound));
  const lastRoundPts = {};      // driverId (or surname on old builds) → points
  const lastRoundTeamPts = {};  // team → points, by the team each car raced for
  for (const [sessions, sprint] of [[raw.races, false], [sprintsArr, true]]) {
    for (const s of sessions) {
      if (s.round !== lastRound) continue;
      for (const r of s.results || []) {
        const pts = rowPts(r, sprint);
        const key = r.did || r.driver;
        lastRoundPts[key] = (lastRoundPts[key] || 0) + pts;
        lastRoundTeamPts[r.team] = (lastRoundTeamPts[r.team] || 0) + pts;
      }
    }
  }
  const lastPtsOf = (did, name) => lastRoundPts[did] ?? lastRoundPts[name.split(" ").pop()] ?? 0;
  const haveLastRound = Object.keys(lastRoundPts).length > 0;

  const DS = raw.drivers.map(d => {
    const delta = lastPtsOf(d.driverId, d.name);
    return { p: d.pos, n: d.name, t: d.team, pts: d.pts, wins: d.wins || 0, d: delta > 0 ? `+${delta}` : "—", mv: 0, did: d.driverId || "", teams: d.teams || [d.team] };
  });

  // Compute position movement: compare current standings vs what they'd be without last-round points
  if (haveLastRound) {
    const prevStandings = DS.map(d => ({ n: d.n, pts: d.pts - lastPtsOf(d.did, d.n) }))
      .sort((a, b) => b.pts - a.pts || DS.findIndex(x=>x.n===a.n) - DS.findIndex(x=>x.n===b.n));
    for (let i = 0; i < DS.length; i++) {
      const prevPos = prevStandings.findIndex(x => x.n === DS[i].n) + 1;
      DS[i].mv = prevPos - DS[i].p; // positive = gained positions
    }
  }

  // Constructor standings with per-driver breakdowns (points scored for this
  // team — a driver who switched teams appears under both) and the current pairing
  const CS = raw.constructors.map(c => ({
    p: c.pos, t: c.team, pts: c.pts, mv: 0,
    dr: c.drivers.map(d => ({ n: d.name, pts: d.pts })),
    lu: c.lineup || [],
  }));

  // Constructor movement — same idea as drivers: subtract each team's last-round
  // points, re-sort to reconstruct the previous order, compare.
  if (haveLastRound) {
    const teamDelta = lastRoundTeamPts;
    const prevCS = CS.map(c => ({ t: c.t, pts: c.pts - (teamDelta[c.t] || 0) }))
      .sort((a, b) => b.pts - a.pts || CS.findIndex(x => x.t === a.t) - CS.findIndex(x => x.t === b.t));
    for (const c of CS) {
      const prevPos = prevCS.findIndex(x => x.t === c.t) + 1;
      c.mv = prevPos - c.p; // positive = gained places
    }
  }

  // One classification row. `p` is the finishing position for a classified car
  // and a label ("DNF", "DSQ", "DNS", "NC") otherwise — Jolpica numbers every
  // car, retirements included, so the label comes from its positionText (`out`).
  // Old builds without `out` fall back to the status for non-numeric positions.
  const fullRow = (res, sprint) => ({
    p: res.out || (isNaN(parseInt(res.pos)) ? res.status || "DNF" : parseInt(res.pos)),
    d: res.driver, t: res.team, did: res.did || "", num: res.num ?? null,
    grid: res.grid ?? null, laps: res.laps ?? null, pts: rowPts(res, sprint),
    g: res.pos === "1" ? "WINNER" : (res.gap || res.status || ""),
  });
  const podRow = res => ({
    p: parseInt(res.pos), d: res.driver, t: res.team,
    g: res.pos === "1" ? "WINNER" : (res.gap.startsWith("+") ? res.gap : `+${res.gap}`),
  });

  // Combine races and sprints, sorted by date
  const allRaces = [
    ...raw.races.map(r => ({
      r: r.round, nm: r.name, ci: r.circuit, dt: r.date, tt: r.time || null, w: r.results[0]?.driver || "", wt: r.results[0]?.team || "",
      tm: r.winnerTime || "", sprint: false,
      fl: r.fastestLap || null, // normalized shape: {driver, time, team} or null
      pod: r.results.slice(0, 3).map(podRow),
      full: r.results.map(res => fullRow(res, false)),
    })),
    ...sprintsArr.map(r => ({
      r: r.round + "S", nm: r.name, ci: r.circuit, dt: r.date, tt: r.time || null, w: r.results[0]?.driver || "", wt: r.results[0]?.team || "",
      tm: "", sprint: true,
      fl: r.fastestLap || null, // normalized shape: {driver, time, team} or null
      pod: r.results.slice(0, 3).map(podRow),
      full: r.results.map(res => fullRow(res, true)),
    })),
  ].sort((a, b) => {
    const da = new Date(a.dt) - new Date(b.dt);
    if (da !== 0) return da;
    // Same date: sprints come before the main race
    if (a.sprint && !b.sprint) return -1;
    if (!a.sprint && b.sprint) return 1;
    return 0;
  });

  // Pit stops from most recent race (durationSec is current; durationMs is the
  // legacy field name from older data.json builds — both hold seconds)
  const pits = (raw.pitStops?.stops || []).map(p => ({
    d: p.driver, fn: p.fullName || p.driver, t: p.team || "", s: p.durationSec ?? p.durationMs, l: p.lap,
  })).filter(p => p.s > 0 && p.s < 60);

  // Per-race pit stops for the Pit Stops tab's race selector (older data.json
  // builds only carry the latest race — the tab falls back to `pits` then)
  const pitsByRace = (raw.pitStopsByRace || []).map(pr => ({
    r: pr.round, nm: pr.raceName,
    stops: pr.stops.map(p => ({ d: p.driver, fn: p.fullName || p.driver, t: p.team || "", s: p.durationSec ?? p.durationMs, l: p.lap })).filter(p => p.s > 0 && p.s < 60),
  })).filter(pr => pr.stops.length > 0);

  // Schedule — status is computed client-side from race date + UTC start time,
  // so a stale weekly build can't keep the NEXT RACE badge on a finished race.
  // +3h after the start covers the race distance.
  const now = new Date();
  const raceEnded = (r) => now - new Date(`${r.date}T${r.time || "12:00:00Z"}`) > 3 * 3600 * 1000;
  const nextRaceIdx = raw.schedule.findIndex(r => !raceEnded(r));
  const sched = raw.schedule.map((r, i) => ({
    r: r.round, nm: r.name, ci: r.circuit, dt: r.date, tt: r.time || null,
    st: raceEnded(r) ? "done" : (i === nextRaceIdx ? "next" : "upcoming"),
    w: r.winner, sp: r.sprint, fc: r.country, sdt: r.sprintDate || null, stt: r.sprintTime || null,
  }));

  const completedRounds = raw.completedRounds;
  const totalRounds = raw.totalRounds;
  const fetchedAt = raw.fetchedAt;
  const pitRaceName = raw.pitStops?.raceName || "";

  // Qualifying data — each driver's best lap of the session and its gap to pole (%)
  const qualifying = (raw.qualifying || []).map(q => {
    const best = q.results.map(r => Math.min(...[r.q1, r.q2, r.q3].map(lapTime).filter(Boolean)));
    const pole = Math.min(...best.filter(Number.isFinite));
    return {
      round: q.round,
      name: q.raceName,
      results: q.results.map((r, i) => ({
        pos: r.pos, d: r.driver, did: r.driverId || "", t: r.team,
        best: Number.isFinite(best[i]) ? best[i] : null,
        gap: Number.isFinite(best[i]) && Number.isFinite(pole) ? (best[i] / pole - 1) * 100 : null,
      })),
    };
  });

  // Head-to-head. Teammates are paired round by round from who actually drove
  // for the team that weekend (race or qualifying), so a mid-season seat change
  // starts a new battle instead of setting a driver against his old team-mate's
  // replacement. Battles follow constructor order, the current pairing first.
  const h2h = headToHead(DS, CS, raw.races, allRaces, qualifying);

  // Get leader info
  const leader = DS[0] || { n: "TBD", t: "Mercedes", pts: 0 };
  const lastRace = allRaces.filter(r => !r.sprint).slice(-1)[0];
  const lastWinner = lastRace ? { name: lastRace.w, team: lastRace.wt, race: lastRace.nm } : null;
  const fastestLap = lastRace?.fl || null;

  // Build season narrative from raw race data
  const teamRaceStats={};
  for(const r of raw.races){
    for(const res of r.results){
      if(!teamRaceStats[res.team])teamRaceStats[res.team]={wins:0,pods:0,dnfs:0,dns:0,bestFinish:99,driverWins:{},driverPods:{}};
      const s=teamRaceStats[res.team];
      const pos=parseInt(res.pos);
      const out=resultOut(res);
      if(!out&&!isNaN(pos)){
        if(pos===1){s.wins++;s.driverWins[res.driver]=(s.driverWins[res.driver]||0)+1;}
        if(pos<=3){s.pods++;s.driverPods[res.driver]=(s.driverPods[res.driver]||0)+1;}
        if(pos<s.bestFinish)s.bestFinish=pos;
      }
      if(out==="DNF")s.dnfs++;
      if(out==="DNS")s.dns++;
    }
  }
  // Last race per-team driver finishes
  const lastRaceData=raw.races[raw.races.length-1];
  const lastRaceName=lastRaceData?lastRaceData.name:"";
  const lastRaceTeamFinish={};
  if(lastRaceData){
    for(const res of lastRaceData.results){
      if(!lastRaceTeamFinish[res.team])lastRaceTeamFinish[res.team]=[];
      const pos=parseInt(res.pos);
      const out=resultOut(res);
      const dnf=out==="DNF"||out==="DNS";
      lastRaceTeamFinish[res.team].push({d:res.driver,pos:out||isNaN(pos)?99:pos,dnf,status:res.status});
    }
  }
  const nRaces=raw.races.length;
  const narrative=CS.slice(0,4).map((c,i)=>{
    const s=teamRaceStats[c.t]||{wins:0,pods:0,dnfs:0,dns:0,bestFinish:99,driverWins:{},driverPods:{}};
    const pts=c.pts;
    const gap=i===0?(CS[1]?pts-CS[1].pts:0):(CS[0].pts-pts);
    // The garage split is the CURRENT pairing, with each driver's points for this team
    const lineup=c.lu.length>=2?c.lu:c.dr.slice(0,2).map(d=>d.n);
    const [d1,d2]=lineup.slice(0,2).map(n=>c.dr.find(d=>d.n===n)||{n,pts:0}).sort((a,b)=>b.pts-a.pts);
    // A driver who arrived mid-season: from which team, and at which round
    const arrival=[d1,d2].map(d=>{
      const drv=DS.find(x=>x.n.split(" ").pop()===d.n);
      const teams=drv?.teams||[];
      if(teams.length<2||teams[teams.length-1]!==c.t)return null;
      const joined=raw.races.find(r=>r.results.some(res=>res.driver===d.n&&res.team===c.t))?.round;
      return joined?{d,from:teams[teams.length-2],joined}:null;
    }).find(Boolean);
    const lrf=lastRaceTeamFinish[c.t]||[];
    // Title logic
    let ti;
    if(i===0){ti=s.wins>=nRaces*0.5&&gap>20?"Dominant Force":s.wins>0?"Championship Leaders":"Points Leaders";}
    else if(i===1){ti=s.pods>0?"Best of the Rest":"Chasing the Leaders";}
    else if(i===2){ti=s.dnfs+s.dns>0?"Under Pressure":"Midfield Battle";}
    else{ti=s.dnfs+s.dns>=2?"In Crisis":s.bestFinish>10?"Struggling":"Work to Do";}
    // Compose narrative — vary opening by rank, combine related facts to avoid template feel.
    const lines=[];
    const winEntries=Object.entries(s.driverWins);
    const podEntries=Object.entries(s.driverPods);
    // Sort last-race finish, pull DNF status off the worst entry
    let best=null,worst=null;
    if(lrf.length>=1){const sorted=[...lrf].sort((a,b)=>a.pos-b.pos);best=sorted[0];worst=sorted[sorted.length-1];}
    const lr=lastRaceName;

    // OPENING — wins, podiums, or struggles. Avoid the templated "X have also reached the podium."
    if(s.wins>0){
      if(winEntries.length===1){
        const[d,w]=winEntries[0];
        lines.push(`${d} ${w===nRaces?"has swept every round":`has taken ${w} win${w>1?"s":""}`} from ${nRaces} race${nRaces>1?"s":""} so far.`);
      } else {
        const wlist=winEntries.map(([d,w])=>`${d} (${w})`).join(" and ");
        lines.push(`${wlist} have shared ${s.wins} wins from ${nRaces} race${nRaces>1?"s":""}.`);
      }
      const nonWinPod=podEntries.filter(([d])=>!s.driverWins[d]).map(([d])=>d);
      if(nonWinPod.length>0){
        lines.push(`${nonWinPod.join(" and ")} ${nonWinPod.length>1?"have":"has"} added further podiums.`);
      }
    } else if(s.pods>0){
      if(podEntries.length===2&&podEntries[0][1]===podEntries[1][1]){
        const n=podEntries[0][1];
        lines.push(`${podEntries[0][0]} and ${podEntries[1][0]} have each ${n===1?"scored a podium":`taken ${n} podiums`} so far.`);
      } else if(podEntries.length===2){
        const top=podEntries[0][1]>podEntries[1][1]?podEntries[0]:podEntries[1];
        const bot=podEntries[0][1]>podEntries[1][1]?podEntries[1]:podEntries[0];
        lines.push(`${top[0]} leads the way with ${top[1]} podium${top[1]>1?"s":""}, while ${bot[0]} has added ${bot[1]}.`);
      } else {
        const[d,n]=podEntries[0];
        lines.push(`${d} ${n===1?"has been the team's lone podium scorer":`accounts for all ${n} of the team's podiums`} this season.`);
      }
    } else if(s.bestFinish<99){
      lines.push(`No podiums yet — their best result is P${s.bestFinish}.`);
    }

    // POINTS / POSITION — vary the framing per rank to break the template feel
    if(i===0){
      if(gap>0)lines.push(`The team leads the constructors' standings on ${pts} pts, ${gap} clear of ${CS[1].t}.`);
      else lines.push(`Tied at the top on ${pts} pts.`);
    } else if(i===1){
      lines.push(`That puts them ${gap} points behind ${CS[0].t} on ${pts}.`);
    } else if(i===2){
      lines.push(`The team sits ${gap} points adrift of ${CS[0].t} on ${pts}.`);
    } else {
      lines.push(`A ${gap}-point gap to ${CS[0].t} leaves them on just ${pts}.`);
    }

    // RELIABILITY + LAST RACE — merge into one sentence when the last race featured a team retirement
    const lastRaceDnf=!!(worst&&worst.dnf);
    const hasReliability=(s.dnfs+s.dns)>0;
    let lastRaceCovered=false;
    if(hasReliability){
      const issues=[];
      if(s.dnfs>0)issues.push(`${s.dnfs} DNF${s.dnfs>1?"s":""}`);
      if(s.dns>0)issues.push(`${s.dns} DNS`);
      const issuesStr=issues.join(" and ");
      if(lastRaceDnf&&best&&worst&&lr){
        // Combine retirement with whatever the other driver did
        let bestClause;
        if(best.pos===1)bestClause=`${best.d} still took victory`;
        else if(best.pos<=3)bestClause=`${best.d} salvaged ${best.pos===2?"P2":"P3"}`;
        else if(best.pos<=10)bestClause=`${best.d} brought it home in P${best.pos}`;
        else bestClause=`${best.d} also finished outside the points`;
        lines.push(`Reliability has bitten with ${issuesStr} this season — ${worst.d} retired at the ${lr}, where ${bestClause}.`);
        lastRaceCovered=true;
      } else {
        lines.push(`Reliability remains a concern, with ${issuesStr} so far this season.`);
      }
    }

    // STANDALONE LAST RACE — only when not already covered above
    if(best&&worst&&lr&&!lastRaceCovered){
      if(best.pos===1){
        if(worst.pos<=10)lines.push(`${best.d} won the ${lr} with ${worst.d} home in P${worst.pos}.`);
        else lines.push(`${best.d} won the ${lr}.`);
      } else if(best.pos<=3){
        const verb=best.pos===2?"finished runner-up":"rounded out the podium";
        const worstClause=worst.pos===best.pos?"":worst.pos<=10?` while ${worst.d} took P${worst.pos}`:` though ${worst.d} fell back to P${worst.pos}`;
        lines.push(`${best.d} ${verb} at the ${lr}${worstClause}.`);
      } else if(best.pos<=10){
        const worstClause=worst.pos===best.pos?"":worst.pos<=10?` and ${worst.d} P${worst.pos}`:` while ${worst.d} finished outside the points`;
        lines.push(`${best.d} scraped points with P${best.pos} at the ${lr}${worstClause}.`);
      } else {
        lines.push(`Neither car troubled the points at the ${lr}.`);
      }
    }

    // DRIVER SPLIT — handle equal points edge case and a mid-season arrival
    if(arrival){
      lines.push(arrival.d===d1
        ?`${d1.n} leads the garage on ${d1.pts} pts since arriving from ${arrival.from} at round ${arrival.joined}, ahead of ${d2.n} on ${d2.pts}.`
        :`${d1.n} leads the garage on ${d1.pts} pts, with ${arrival.d.n} on ${arrival.d.pts} since arriving from ${arrival.from} at round ${arrival.joined}.`);
    } else if(d1.pts===d2.pts){
      if(d1.pts===0)lines.push(`Neither driver has scored yet.`);
      else lines.push(`${d1.n} and ${d2.n} are level on ${d1.pts} pts apiece.`);
    } else {
      lines.push(`${d1.n} leads the garage on ${d1.pts} to ${d2.n}'s ${d2.pts}.`);
    }

    return{t:c.t,ti,desc:lines.join(" ")};
  });

  // Points progression — cumulative points by round. Track top-6 for chart lines
  // and ALL drivers for tooltip rankings.
  const topNames=DS.slice(0,6).map(d=>d.n);
  const allRosterNames=DS.map(d=>d.n);
  const cumAll=Object.fromEntries(allRosterNames.map(n=>[n,0]));
  const progressionLabels=["Start"];
  const progressionRaceNames=["Season start"];
  const progressionStandings=[
    allRosterNames.map((n,idx)=>({name:n,pts:0,pos:idx+1})),
  ];
  const progressionSeries=topNames.map(n=>{
    const driver=DS.find(x=>x.n===n);
    return{name:n,team:driver?.t||"",points:[0]};
  });
  for(const race of allRaces){
    for(const res of race.full){
      const match=allRosterNames.find(n=>n.split(" ").pop()===res.d||n===res.d);
      if(!match)continue;
      cumAll[match]+=res.pts||0; // points as awarded (no FL bonus — abolished from 2025)
    }
    if(!race.sprint){
      // Mark sprint weekends — the sprint event shares the round number with an "S" suffix
      const hadSprint=allRaces.some(x=>x.sprint&&x.r===race.r+"S");
      progressionLabels.push("R"+race.r+(hadSprint?" S":""));
      progressionRaceNames.push(race.nm);
      // Snapshot current standings (sorted by pts, ties broken by original DS order)
      const ranked=allRosterNames
        .map(n=>({name:n,pts:cumAll[n],dsIdx:allRosterNames.indexOf(n)}))
        .sort((a,b)=>b.pts-a.pts||a.dsIdx-b.dsIdx)
        .map((d,i)=>({name:d.name,pts:d.pts,pos:i+1}));
      progressionStandings.push(ranked);
      progressionSeries.forEach(s=>s.points.push(cumAll[s.name]));
    }
  }
  const progression={labels:progressionLabels,raceNames:progressionRaceNames,series:progressionSeries,standings:progressionStandings};

  return { season: raw.season, DS, CS, races: allRaces, pits, pitsByRace, sched, qualifying, h2h, completedRounds, totalRounds, fetchedAt, pitRaceName, leader, lastWinner, fastestLap, narrative, progression };
}

// Calendar days between today and the race's start, both in the viewer's time
// zone. Rounding up whole 24-hour blocks said "tomorrow" on race morning.
export const daysUntilRace = (dt, tt, now = new Date()) => {
  const start = new Date(`${dt}T${tt || "12:00:00Z"}`);
  const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
  return Math.round(day(start) - day(now));
};
export const countdownLabel = (dt, tt, now = new Date()) => {
  if (tt && now.getTime() >= new Date(`${dt}T${tt}`).getTime()) return "under way";
  const d = daysUntilRace(dt, tt, now);
  return d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
};
// OpenF1 meeting for a Jolpica Grand Prix ({r, dt}). The OpenF1 script stamps
// each meeting with its `round` and Jolpica `raceName`; older payloads fall back
// to the race session's date. Names alone don't join the two APIs: OpenF1's
// "Bahrain Grand Prix" is Jolpica's "Bahrain Grand Prix in Malaysia" (Sepang),
// "São Paulo" is "Brazilian", and tracks.json is keyed by Jolpica names.
export const meetingRaceDay = m => (m?.sessions || []).find(s => s.sessionName === "Race")?.dateStart?.slice(0, 10) || null;
export function meetingForRace(meetings, race) {
  if (!meetings || !race) return null;
  const round = typeof race.r === "string" ? parseInt(race.r) : race.r;
  return meetings.find(m => m.round === round) || meetings.find(m => m.round == null && meetingRaceDay(m) === race.dt) || null;
}
// Name to look a meeting up by in tracks.json
export const meetingTrackName = m => m?.raceName || m?.meetingName || "";

// Race status from the clock, not the build: done 3h after lights out, the first
// unfinished round is "next". Recomputed every minute while the page is open.
export const withStatus = (sched, now = Date.now()) => {
  const ended = r => now - new Date(`${r.dt}T${r.tt || "12:00:00Z"}`).getTime() > 3 * 3600 * 1000;
  const nextIdx = sched.findIndex(r => !ended(r));
  return sched.map((r, i) => ({ ...r, st: ended(r) ? "done" : i === nextIdx ? "next" : "upcoming" }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics layer — season metrics, race pace, passes, title outlook. Shared by
// the app, scripts/build-season-stats.mjs and the tests. Inputs are the shapes
// in data.json and the OpenF1 meeting files (race session: drivers[].lapTimes
// {l, t, pit, ds}, drivers[].positions {l, p}, stints, raceControlPeriods,
// overtakes [[ms, by, of, pos]], pitStops [[num, lap, stop, lane]]).
// ─────────────────────────────────────────────────────────────────────────────

export const median = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const quantile = (a, q) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i);
  return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo);
};
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

// Laps under SC / VSC / red flag, plus the restart lap after each period
export function neutralLaps(session) {
  const set = new Set();
  for (const p of session?.raceControlPeriods || []) for (let l = p.lapStart; l <= p.lapEnd + 1; l++) set.add(l);
  return set;
}

// A driver's representative racing laps: no lap 1, no in- or out-lap, nothing
// under a safety car or VSC (or the restart lap), and nothing slower than 107%
// of their own median — what's left measures pace, not incidents.
export function greenFlagLaps(driver, session) {
  const laps = (driver?.lapTimes || []).filter(l => l.t > 0).sort((a, b) => a.l - b.l);
  const outLaps = new Set(laps.filter(l => l.pit).map(l => l.l));
  const neutral = neutralLaps(session);
  const kept = laps.filter(l => l.l > 1 && !outLaps.has(l.l) && !outLaps.has(l.l + 1) && !neutral.has(l.l));
  if (kept.length < 3) return kept;
  const med = median(kept.map(l => l.t));
  return kept.filter(l => l.t <= med * 1.07);
}

const compoundAt = (session, num, lap) =>
  (session?.stints || []).find(s => s.driverNumber === num && lap >= (s.lapStart || 1) && lap <= (s.lapEnd || 999))?.compound || "UNKNOWN";

// Per-driver distribution of green-flag lap times for one race, in finishing
// order. Box stats use Tukey whiskers (1.5 × IQR, clamped to the data).
export function racePace(session, minLaps = 8) {
  const finalPos = d => d.positions?.at(-1)?.p ?? 99;
  return (session?.drivers || [])
    .map(d => {
      const laps = greenFlagLaps(d, session).map(l => ({ l: l.l, t: l.t, c: compoundAt(session, d.number, l.l) }));
      if (laps.length < minLaps) return null;
      const ts = laps.map(l => l.t), q1 = quantile(ts, 0.25), q3 = quantile(ts, 0.75), iqr = q3 - q1;
      return {
        number: d.number, acronym: d.acronym, team: d.team, teamColour: d.teamColour, laps, n: laps.length,
        q1, med: median(ts), q3,
        lo: Math.min(...ts.filter(t => t >= q1 - 1.5 * iqr)), hi: Math.max(...ts.filter(t => t <= q3 + 1.5 * iqr)),
        pos: finalPos(d),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos);
}

// The lap a driver was on at an instant (epoch ms), from their lap start times
function lapAt(driver, ms) {
  const laps = driver?.lapTimes || [];
  let lap = null;
  for (const l of laps) if (l.ds != null && l.ds <= ms) lap = l.l;
  return lap;
}

// On-track passes from OpenF1's raw overtakes, which record every position
// swap. Dropped: lap 1 (its own metric), swaps where either car pitted that
// lap or the next (pit cycles), swaps under a safety car/VSC, swaps with a car
// on a different lap (lapping), and swaps on a car's final lap when it retired
// (a stopping car isn't overtaken). Returns {byDriver: {num: {made, lost}}, kept, raw}.
export function onTrackPasses(session, outNums = new Set()) {
  const drivers = Object.fromEntries((session?.drivers || []).map(d => [d.number, d]));
  const neutral = neutralLaps(session);
  // pit-out lap or the in-lap before it
  const pitAround = (d, lap) => (d?.lapTimes || []).some(l => l.pit && (l.l === lap || l.l === lap + 1));
  const byDriver = {};
  const bump = (n, k) => { (byDriver[n] ??= { made: 0, lost: 0 })[k]++; };
  let kept = 0;
  const raw = session?.overtakes || [];
  for (const [ms, by, of] of raw) {
    const a = drivers[by], b = drivers[of];
    if (!a || !b) continue;
    const lap = lapAt(a, ms), lapB = lapAt(b, ms);
    if (lap == null || lap <= 1 || lapB !== lap || neutral.has(lap)) continue;
    if (pitAround(a, lap) || pitAround(b, lap)) continue;
    const lastB = b.lapTimes?.at(-1)?.l ?? 0;
    if (outNums.has(String(of)) && lap >= lastB - 1) continue;
    bump(by, "made"); bump(of, "lost"); kept++;
  }
  return { byDriver, kept, raw: raw.length };
}

// Places gained on lap 1: starting grid (Jolpica; 0 = pit lane, counted from
// the back) minus the position at the end of lap 1 (OpenF1). {num: gain}
export function lapOneGains(session, results) {
  const field = (results || []).length || 20;
  const gridByNum = Object.fromEntries((results || []).filter(r => r.num != null).map(r => [String(r.num), r.grid === 0 ? field : r.grid]));
  const out = {};
  for (const d of session?.drivers || []) {
    const p1 = d.positions?.find(p => p.l === 1)?.p, g = gridByNum[String(d.number)];
    if (p1 != null && g) out[d.number] = g - p1;
  }
  return out;
}

// Mini-sector dominance from the fastest-lap speed traces ({d, s} samples).
// Each trace's time is spread over distance as Δd / v and scaled to the real
// lap time; the lap is cut into `n` equal-distance segments and each goes to
// the driver who covered it quickest. Only drivers with a trace take part.
export function miniSectors(session, n = 25) {
  const runs = (session?.drivers || [])
    .filter(d => (d.fastLapTrace?.trace || []).length >= 10)
    .map(d => {
      const tr = d.fastLapTrace.trace, d0 = tr[0].d, D = tr.at(-1).d - d0;
      const seg = new Array(n).fill(0);
      for (let i = 1; i < tr.length; i++) {
        const dd = tr[i].d - tr[i - 1].d, v = (tr[i].s + tr[i - 1].s) / 2;
        if (dd <= 0 || v <= 0) continue;
        const f = ((tr[i].d + tr[i - 1].d) / 2 - d0) / D;
        seg[Math.min(n - 1, Math.max(0, Math.floor(f * n)))] += dd / v;
      }
      const total = seg.reduce((s, v) => s + v, 0);
      return { number: d.number, acronym: d.acronym, team: d.team, teamColour: d.teamColour,
        lap: d.fastLapTrace.lap, lapTime: d.fastLapTrace.lapTime, seg: seg.map(v => (total > 0 ? (v / total) * d.fastLapTrace.lapTime : Infinity)) };
    });
  if (runs.length < 2) return null;
  const winners = Array.from({ length: n }, (_, i) => runs.reduce((best, r) => (r.seg[i] < best.seg[i] ? r : best)).number);
  const count = Object.fromEntries(runs.map(r => [r.number, winners.filter(w => w === r.number).length]));
  return { n, winners, runs, count };
}

// ── Title outlook ────────────────────────────────────────────────────────────
// Deterministic maths (maximum points left, who can still win, what clinches
// it next) plus a Monte Carlo projection. The simulation draws each driver's
// result at every remaining event from their own season results — position
// plus noise, a retirement when the draw lands on one — and sorts the field,
// so every simulated race is a consistent finishing order. Seeded, so the
// numbers don't jump between renders.
const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function remainingEvents(sched, sprintsRun) {
  const ran = new Set((sprintsRun || []).map(s => (typeof s === "object" ? s.round ?? parseInt(s.r) : s)));
  const out = [];
  for (const r of sched || []) {
    if (r.st === "done") continue;
    if (r.sp && !ran.has(r.r)) out.push({ round: r.r, name: r.nm, kind: "sprint", max: SPRINT_POINTS[0] });
    out.push({ round: r.r, name: r.nm, kind: "race", max: RACE_POINTS[0] });
  }
  return out;
}

export function titleOutlook({ DS, sched, races, sprints, sims = 4000, seed = 2026 }) {
  const events = remainingEvents(sched, sprints);
  const maxLeft = events.reduce((s, e) => s + e.max, 0);
  const field = (DS || []).filter(d => d.pts != null);
  if (!field.length) return null;
  const leader = field[0];
  const alive = field.filter(d => d.pts + maxLeft >= leader.pts);
  const rival = field[1];
  const clinched = !!rival && leader.pts - rival.pts > maxLeft;

  // What clinches it at the next weekend: the lead after it must exceed the
  // points left after it, over every rival still alive
  const next = events.length ? events.filter(e => e.round === events[0].round) : [];
  const leftAfter = maxLeft - next.reduce((s, e) => s + e.max, 0);
  const needed = clinched || !rival ? null : { round: next[0]?.round, name: next[0]?.name, rival: rival.n, margin: leftAfter + 1 - (leader.pts - rival.pts) };

  // Monte Carlo
  const hist = {};
  for (const r of races || []) for (const row of r.full || []) (hist[row.did || row.d] ??= []).push(typeof row.p === "number" ? row.p : null);
  const last = d => d.n.split(" ").pop();
  const rand = rng(seed);
  const titles = Object.fromEntries(field.map(d => [d.n, 0]));
  for (let s = 0; s < sims && events.length; s++) {
    const tot = Object.fromEntries(field.map(d => [d.n, d.pts]));
    for (const e of events) {
      const table = e.kind === "sprint" ? SPRINT_POINTS : RACE_POINTS;
      const order = field.map(d => {
        const h = hist[d.did] || hist[last(d)] || [];
        const draw = h.length ? h[Math.floor(rand() * h.length)] : 12 + rand() * 8;
        return { n: d.n, score: draw == null ? 100 + rand() : draw + (rand() - 0.5) * 3 };
      }).sort((a, b) => a.score - b.score);
      order.forEach((o, i) => { if (o.score < 100 && i < table.length) tot[o.n] += table[i]; });
    }
    let best = null;
    for (const d of field) if (!best || tot[d.n] > tot[best] || (tot[d.n] === tot[best] && rand() < 0.5)) best = d.n;
    titles[best]++;
  }
  const prob = Object.fromEntries(field.map(d => [d.n, events.length ? titles[d.n] / sims : d === leader ? 1 : 0]));
  return {
    events, maxLeft, clinched, needed, sims: events.length ? sims : 0,
    drivers: field.map(d => ({ n: d.n, t: d.t, pts: d.pts, max: d.pts + maxLeft, alive: alive.includes(d), behind: leader.pts - d.pts, prob: prob[d.n] })),
  };
}

// Points for a finishing position in a race or sprint (null/0 = no points)
export const pointsFor = (pos, kind = "race") => (pos ? (kind === "sprint" ? SPRINT_POINTS : RACE_POINTS)[pos - 1] || 0 : 0);

// ── Season metrics and percentiles ──────────────────────────────────────────
export const lapTime = s => {
  if (!s) return null;
  const m = String(s).match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? (m[1] ? +m[1] * 60 : 0) + +m[2] : null;
};

export const SEASON_METRICS = [
  { key: "qualiGap", label: "Qualifying pace", unit: "% off pole", better: "low", digits: 2, note: "Median gap of the driver's best qualifying lap to pole, per round." },
  { key: "racePace", label: "Race pace", unit: "% off best", better: "low", digits: 2, note: "Median green-flag lap against the race's quickest median, per race." },
  { key: "consistency", label: "Consistency", unit: "% lap spread", better: "low", digits: 2, note: "Standard deviation of green-flag laps as a share of their mean, per race." },
  { key: "lap1", label: "Opening lap", unit: "places gained", better: "high", digits: 1, note: "Average places gained from the grid by the end of lap 1." },
  { key: "passes", label: "Overtaking", unit: "passes / race", better: "high", digits: 1, note: "On-track passes per race, pit cycles, lapping and safety-car swaps excluded." },
  { key: "teammateQuali", label: "Beats team-mate", unit: "% of qualifyings", better: "high", digits: 0, note: "Share of qualifying sessions ahead of the team-mate that weekend." },
  { key: "pointsPerStart", label: "Scoring", unit: "points / start", better: "high", digits: 1, note: "Season points per Grand Prix started." },
  { key: "finishRate", label: "Reliability", unit: "% classified", better: "high", digits: 0, note: "Share of Grands Prix with a classified finish." },
  { key: "pitStop", label: "Pit crew", unit: "s stationary", better: "low", digits: 2, note: "Median time stationary in the box (OpenF1), the team's crew more than the driver." },
];

// Season metrics per driver plus a percentile for each (0–100, 100 = best in
// the field), among drivers with at least `minStarts` Grand Prix starts.
export function buildSeasonStats(data, meetingsByRound, { minStarts = 5 } = {}) {
  const drivers = (data?.drivers || []).map(d => ({ name: d.name, did: d.driverId, team: d.team, last: d.name.split(" ").pop() }));
  const vals = Object.fromEntries(drivers.map(d => [d.did, Object.fromEntries(SEASON_METRICS.map(m => [m.key, []]))]));
  const push = (did, k, v) => { if (vals[did] && v != null && Number.isFinite(v)) vals[did][k].push(v); };
  const starts = {}, finishes = {};

  for (const q of data?.qualifying || []) {
    const best = q.results.map(r => ({ r, t: Math.min(...[r.q1, r.q2, r.q3].map(lapTime).filter(Boolean)) })).filter(x => Number.isFinite(x.t));
    const pole = Math.min(...best.map(x => x.t));
    for (const { r, t } of best) push(r.driverId, "qualiGap", (t / pole - 1) * 100);
    const byTeam = {};
    for (const r of q.results) (byTeam[r.team] ??= []).push(r);
    for (const pair of Object.values(byTeam)) if (pair.length === 2) {
      const [a, b] = pair;
      push(a.driverId, "teammateQuali", a.pos < b.pos ? 100 : 0);
      push(b.driverId, "teammateQuali", b.pos < a.pos ? 100 : 0);
    }
  }

  for (const race of data?.races || []) {
    const numToDid = Object.fromEntries(race.results.filter(r => r.num != null).map(r => [String(r.num), r.did]));
    for (const r of race.results) {
      starts[r.did] = (starts[r.did] || 0) + 1;
      if (!r.out) finishes[r.did] = (finishes[r.did] || 0) + 1;
    }
    const session = (meetingsByRound?.[race.round]?.sessions || []).find(s => s.sessionName === "Race" && s.drivers);
    if (!session) continue;
    const pace = racePace(session);
    const ref = Math.min(...pace.filter(p => p.n >= 10).map(p => p.med));
    for (const p of pace) {
      const did = numToDid[String(p.number)];
      if (Number.isFinite(ref)) push(did, "racePace", (p.med / ref - 1) * 100);
      const ts = p.laps.map(l => l.t), m = mean(ts);
      push(did, "consistency", (Math.sqrt(mean(ts.map(t => (t - m) ** 2))) / m) * 100);
    }
    const outNums = new Set(race.results.filter(r => r.out).map(r => String(r.num)));
    for (const [num, g] of Object.entries(lapOneGains(session, race.results))) push(numToDid[num], "lap1", g);
    if ((session.overtakes || []).length) {
      const { byDriver } = onTrackPasses(session, outNums);
      for (const r of race.results) push(r.did, "passes", byDriver[r.num]?.made || 0);
    }
    for (const [num, , stop] of session.pitStops || []) if (stop > 0 && stop < 20) push(numToDid[String(num)], "pitStop", stop);
  }

  for (const d of drivers) {
    const s = starts[d.did] || 0;
    const pts = (data.drivers.find(x => x.driverId === d.did) || {}).pts || 0;
    if (s) { push(d.did, "pointsPerStart", pts / s); push(d.did, "finishRate", ((finishes[d.did] || 0) / s) * 100); }
  }

  const summary = k => (["teammateQuali", "pointsPerStart", "finishRate", "lap1", "passes"].includes(k) ? mean : median);
  const rows = drivers.map(d => ({
    name: d.name, did: d.did, team: d.team, starts: starts[d.did] || 0,
    metrics: Object.fromEntries(SEASON_METRICS.map(m => {
      const v = vals[d.did][m.key];
      return [m.key, { value: v.length ? summary(m.key)(v) : null, n: v.length }];
    })),
  }));
  const eligible = rows.filter(r => r.starts >= minStarts);
  for (const m of SEASON_METRICS) {
    const pool = eligible.filter(r => r.metrics[m.key].value != null);
    for (const r of rows) {
      const v = r.metrics[m.key].value;
      if (v == null || !pool.includes(r) || pool.length < 2) { r.metrics[m.key].pct = null; continue; }
      const worse = pool.filter(o => (m.better === "low" ? o.metrics[m.key].value > v : o.metrics[m.key].value < v)).length;
      r.metrics[m.key].pct = Math.round((worse / (pool.length - 1)) * 100);
    }
  }
  return { season: data?.season, rounds: (data?.races || []).length, minStarts, metrics: SEASON_METRICS, drivers: rows };
}

// The round the title was decided at, if it has been: replay the season event by
// event (each round's sprint, then its Grand Prix) and find the first point where
// the eventual leader's lead exceeded every point still available. Uses the
// classification points (`pts` on each row), which is what the standings sum.
// → { round, name, lead, left } or null
export function titleClinch({ DS, sched, races }) {
  const champ = DS?.[0];
  if (!champ || !(sched || []).length) return null;
  const rounds = [...sched].sort((a, b) => a.r - b.r);
  const maxOf = r => RACE_POINTS[0] + (r.sp ? SPRINT_POINTS[0] : 0);
  const key = row => row.did || row.d;
  const champKey = champ.did || lastNameOf(champ.n);
  const tot = {};
  let left = rounds.reduce((s, r) => s + maxOf(r), 0);
  for (const r of rounds) {
    const run = (races || []).filter(x => parseInt(x.r) === r.r);
    if (!run.some(x => !x.sprint)) break; // the Grand Prix hasn't run
    for (const x of run) for (const row of x.full || []) tot[key(row)] = (tot[key(row)] || 0) + (row.pts || 0);
    left -= maxOf(r);
    const mine = tot[champKey] || 0;
    const rival = Math.max(0, ...Object.entries(tot).filter(([k]) => k !== champKey).map(([, v]) => v));
    if (mine - rival > left) return { round: r.r, name: r.nm, lead: mine - rival, left };
  }
  return null;
}
const lastNameOf = n => (n || "").split(" ").pop();
