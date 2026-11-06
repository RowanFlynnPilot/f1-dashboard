import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Fragment, Component, memo } from "react";
import { transformData, countdownLabel, withStatus, meetingRaceDay, meetingForRace, meetingTrackName, greenFlagLaps, racePace, onTrackPasses, lapOneGains, miniSectors, titleOutlook, titleClinch, championAge, YOUNGEST_CHAMPION_BEFORE_2026, pointsFor } from "./data.js";

// The season comes from data.json (scripts/season.json drives the fetch); this is
// only the fallback before it loads.
const SEASON_FALLBACK = 2026;

const F1_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABQCAIAAADTD63nAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAMGElEQVR42u2ca4xe1XWGn3ftb8bG9xmHEJQIaNIqQU0oTUFtbk1o0lZJIYka+iOqaKKGKlQ1djDYFS7mfkkoxDdIgUpVU4UfKYGmJOJHb2qhpU1LFYJQq4g0tUCUpsY2vowvM+estz++GWMTDPZ8Z+zB7Ecja+SZOTpn73ev9e611/mgUqlUXiuoPsaJimd+cPyanhFNfR24XU/961d8tgpQoK1L/eDbiin15Et+Ir24YAxSQYELLpMS1KQW/XoMZY2ZDw6et2W3aEixCDfdDUZCQfPl5+zWL7+0e7NqUAICEhK1felIJ8Ep6FRxKpyK3ohGnIvFQpiH5oi5MAQ9VHBYAcJwQIGvF3EZEo2E/0vlCtjiJtEHQ7eKN6QmcCcD0Yh5poRvVbm7bfIwSUOzJz69eIsqZ0g/I52L3wVnWKfgBXiuLSybqV/OgxKiD0qRr0NaGIJ5ivsiVtubnUKriq5Kz8nc38VMG1pYIm2OWIEezJTTszMV9iXVToWWM6WPKX4ZzrJPdhbT4nGYgPbQtKiXu/vXp4U3NLBIsVO6VtyVBp8hbZA+nrnNzilfMZBwRaAl8EDECvNcZkAefhUfz7k44CvnqlwgXYTfC6POCbTXnsA+yLnXfd/h7A4wKh6O8gXzeBr5k9Lt0mltvoCji6FrYAHsj3KttCETXOx2Fpr3mBqUuVEuQr8jftZ25hiegKhKOuL5ngeKskHcbHZnzg9dLS13Nuk9MNSJbxOjxOOhS82jtpx66Y5qFghLqCcmALgwYjW8O3Pc3gNG0ZHBfJ349FF4qmgl8VCbyGdFbMIfSLY61U360zCeR/xJxGp7R7Y91ByZidUxDlQJSGcprpPOtyey3T21GawcuU/vwULF1yNWm2fdgj4b3IJG29wxVXYZPBwulp6PuBL92ZGlv+MjrB400jBcod5leEk2LxxUr6oc+XwvQjtLWSvubhOzNLhF+u3MMXt/FwWkBBSj8PcRy/B/ZIZ9tLVoHZtABSR6d5Qviw9k7jQNLrVsfpTzLdT36SvM426x3hdsFGcn25wd+XTNwxGxTnF95n7cM83Rz9SMC2ty66dYEbHWLLB3ui3Vm0/Lp0eU9Yob3e6xAy0PXWPPydzVkU9vYUSxOeIy/O00duCc1tVmcH4FPTQBb1FZH/HJnNhlN2hGA9UJGQNbNCp+oFipeChb7LdErAtf2Hq73ULpwreFNALfjLLCPJNtgcQeYPZnKFCpxSjOj7IOn5HtdrurQHVwqV3gQysUOo51lBlYJz04SfHn0Vvl9lkb+KhYL70tc7s7K1MtROMR1ytuzxYodjvYIp2R8e/79LnoWvWWk002+zoylf0i8hAMw1DfvUmGCZTQQAsptTiZXG5G/ac8oEK9XGB7hR+96i/M0N/2/39c+iK6J9PkXLQmdLnT6bGuylRoRHoitBz9Y+YRlqmOtbAEBRp4Z/TuEB/MdqsNigHk7yk9zUNz0H6xRXoGNsPT0o/wFrMd77bHYD9MSBOQdouYrkU47oHKUKDAHrTFRrxDsQl/2Gxzupv0pyGYL301YpW9/WjKVMdUWAd8+ucibrKXZO7EvUEfnh4sRPtC31P8Hf4n6wn8Pwfvf1/BCUwGhB8LWRz+G//YwPjQ2DLzfxv2sLTvxefSp0vcCqe07Y6pvN9BmQptLbEG/WkmdsFtpyGmy/S3VHGbykXZ7HZODLaqEgSLpe2KB6V7zSPkRF9PjlPEWxVvhTfLbzSjeKE0z8yBObiHAgJPdm+9dgxXYxajHVHW4EfaZtxeFLpZ+nzmXrsrRwEakR6JWGaezDZw5y2THQx5TIZufSjKRvjpbLfKxdO/dH/fuxBaxX0RG+3vTiY0vVfxUfEe+6fsUTSXLAbkvqmaMgd99elQg8/s9lgJRgvEY1GWme9kizhH3CGdm2x3qssyVdkYurbNfdMtU824sMrkTjV+P+JKU9yMeaBV1d88L5H+OXrXOP/GBvfEr9O7WP4Fe0HmBN4HzUEtXDpmdbmZqcs0MAfmRPmK4urMMRL0u8EN1vxsd3bh0/vpb4ni6dDl1l86BylTzaCwBIFa6SekjYpfy2a77cGOaCZgEYxHuV26PdsxG8X7Q2vhvEzbu6bW94nU/tDAYsWPIi6H+zKx3xS6Xfp05g57oqP0J2JJ+Fsqy+2nM3vQDlCmmilhHfDpvxFxm32q8wUP5NP762YEPVZ0mfWojXOhtEbl9/CcbHeeiAeLfbszKv46esvwU9mCPiI2SG/vtEw1H02UuAndlmnTI5uZD8PT9OkLiBsjLnGOZzugqeyfV/Qi7lasde5MI85VbCDek802nF3srmdhoDoJRZTbpJud+53DxKrgSmekd3cRqA6UqZ4MLUcPd1em6lhYgUJq8M+pd4f4+Wy22YNkpcnzKeKZolX2/en+Nu7S0HX2vPROfOIdLLp/SoN+WPQF9FC2mLeFNoiPJdud7qSbCg3BAumrodXJVrc9qbWPzanXUdx/6Ve3pUuj91fk2dk8P1isbiFgVPGtEufZ9yfgN4l7i9bZytyFeyecqloQLJX+olc+bB5qW9CnSvyt9CvpLU66UFUDC2F/iUsiPpfeShZojpWqjjRiCQpqpFOldepd6Ildmc1g6WkCFqOxiBul9Zm2kc5T3CG/o223wgnZAdG3O03EDdK6zBYvQNeFLnXuT+/tLv2NBo+qLDPfywySY5L+jk5Y/UBl+NVSNuCfzNxuBukhPuBY/7WUS9P/lgkq8urQlSbSewau18/O9JdoVDwRscJ62C3obLFRvD/Z1lmg0kl4KGKTdHV6r90TjY9Dz4de3aej4Yi1aCXOzL2DzXqD5spDKncFa1vvdgKnR9kknZ/tgAWLPOjtQs0yVQ3D/Chfk1bbWzKRLg5uspZk+0Jnx8mTZapV8MBg3VQzKCxBIRpxpmKT+KXBZl3QSgkj8IxiZcQ326Z/ivfxiPXkaW1um2768+RL38xFw1DAEtiWcT+06riqqqAtobXonkzwyYpbxW9l7rLHu0h/LQQxIn87ynJ788yXqaYprAPdVJ9R3IKXZu5AvQHSdP8seVHogSiXp5+2sedI10qX2RPOaduLBs3BC9BO6fvS9+FptFXstvfhFrfIPt7hSvEkPOEEflFslN6V7q6ZmPmojbhZ+lKmoThbjjM6XJlqRPEl6bP23mzHB/TpYiHaq7gObXTiBJ0Z5U7pQ9lss6dnL/qBarHi/xRfg6/jJ/GEc9Z2kRbFytBaeyhzZ3fpb0Txn6Fl6B+OYZnq6IQVAJH4fVE2ibOz3WprsPSHGRHfibLcPOZGlqXflP4QL03vmK5ja6FHLJS/EWWt/dSUnsqhuwrPgvEtsB+dLq0LPpHscHbSTNxIw2a+dG/EFfbzmT1m5Dh5UGH1fToRV0hrnUPJLnKQVdXCXNQrcSe6Jj3mBC9SfDHi4sy9zmkHwgYWwa4oa9AfuwWGPGkpZlW0iqkt8AUl1sHpmZ30Z091f2gsYo10Txq7cPzT30uFNXmcjE4LrZc+kTngqjK00gjaLF2ueDBbOa04R/EVfE62W6fbrTZ5pKj4l9Ay9N1sY+rDZ2Zd4oMWDUvXhS5zNh01E/e7a5aKR6Msg8czi9OzbwQkZEBcEOXL+LS23Sb1PEiZSsN4oco3IlY6n83sq/fz0g14fnonHprulefCnNCdiqsy9ziHpGNZTT7asX17cIf0oWR7R2WqRHPxcMRdij9Ij9k9aJil3dc6OcoflZ4jWjQG+wb42gvjiudLWRY9VPqjebrK/aVnaRz6benTu3KL/ruUT5WCSkizs9Ohf3I6hC4p5YUohl2DDekhI6DYXHoXRkEFNJt7PfSGiDWlnNfmVhspBih+9N9V2qFyPf73tikAenOUG6R3evrp78CV/1e6yvwgs+BEnpXbv6KQ+EyUS+wxexx30pdhGILnVNbgH7btcS9TvbqwhiTBeNe7gX4pRdKw1HjgLv2DPk10hlppu/MW0X9BbZ/d/TtQArv/eXTMbjr+mE4f9NlXr1Ium+69voZe5+pWV4cb20qlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVyuH5f0X6aWi3TTCrAAAAAElFTkSuQmCC";

// Driver photos and team logos are static files in public/img/ (they were base64 in
// this file — ~84 KB of the bundle every phone had to parse before first paint).
const IMG=import.meta.env.BASE_URL+"img/";
const DRIVER_IMAGES = {
  "George Russell": IMG+"drivers/george-russell.png",
  "Kimi Antonelli": IMG+"drivers/kimi-antonelli.png",
  "Charles Leclerc": IMG+"drivers/charles-leclerc.png",
  "Lewis Hamilton": IMG+"drivers/lewis-hamilton.png",
  "Oliver Bearman": IMG+"drivers/oliver-bearman.png",
  "Lando Norris": IMG+"drivers/lando-norris.png",
  "Pierre Gasly": IMG+"drivers/pierre-gasly.png",
  "Max Verstappen": IMG+"drivers/max-verstappen.png",
  "Liam Lawson": IMG+"drivers/liam-lawson.png",
  "Arvid Lindblad": IMG+"drivers/arvid-lindblad.jpg",
  "Isack Hadjar": IMG+"drivers/isack-hadjar.png",
  "Oscar Piastri": IMG+"drivers/oscar-piastri.png",
  "Carlos Sainz": IMG+"drivers/carlos-sainz.png",
  "Gabriel Bortoleto": IMG+"drivers/gabriel-bortoleto.png",
  "Franco Colapinto": IMG+"drivers/franco-colapinto.png",
  "Esteban Ocon": IMG+"drivers/esteban-ocon.png",
  "Nico Hülkenberg": IMG+"drivers/nico-hulkenberg.png",
  "Alexander Albon": IMG+"drivers/alexander-albon.png",
  "Valtteri Bottas": IMG+"drivers/valtteri-bottas.png",
  "Sergio Pérez": IMG+"drivers/sergio-perez.png",
  "Fernando Alonso": IMG+"drivers/fernando-alonso.png",
  "Lance Stroll": IMG+"drivers/lance-stroll.png",
};
// Jolpica spells out his legal name — same photo, no second copy in the bundle
DRIVER_IMAGES["Andrea Kimi Antonelli"]=DRIVER_IMAGES["Kimi Antonelli"];

const TEAM_LOGOS = {
  "Alpine": IMG+"teams/alpine.png",
  "Aston Martin": IMG+"teams/aston-martin.png",
  "Williams": IMG+"teams/williams.png",
  "Audi": IMG+"teams/audi.png",
  "Cadillac": IMG+"teams/cadillac.png",
  "Haas": IMG+"teams/haas.png",
  "McLaren": IMG+"teams/mclaren.png",
  "Mercedes": IMG+"teams/mercedes.png",
  "Racing Bulls": IMG+"teams/racing-bulls.png",
  "Red Bull": IMG+"teams/red-bull.png",
  "Ferrari": IMG+"teams/ferrari.png",
};

// Team colours as ink on paper. Broadcast liveries are tuned for black screens;
// inkify() clamps lightness so pale ones (Mercedes teal, Williams blue, Haas
// silver) still read at text sizes on the sheet while keeping their hue.
// Team liveries are tuned for black broadcast screens; on the pale sheet they
// must read as ink. inkify() darkens a colour (preserving hue via a uniform
// sRGB scale) until it clears ~3.1:1 against the sheet — the data-graphic
// contrast bar — so every team code and line stays legible. The old clamp
// targeted white, which left pale liveries (Williams, McLaren, Mercedes) at
// ~2.3-3.1:1 on the actual #DDE4EA sheet. Colours already dark enough are
// returned unchanged. Cached: it runs per driver on every lap-chart repaint.
const SHEET_LUM=0.768;            // relative luminance of --sheet #DDE4EA
const INK_CONTRAST=3.1;           // target ratio for team ink on the sheet (lines, marks, large labels)
const TEXT_CONTRAST=4.6;          // small text in team colour (WCAG AA 4.5, with headroom: 4.5 landed at 4.48 after rounding)
const _srgbLin=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const _relLum=(r,g,b)=>0.2126*_srgbLin(r)+0.7152*_srgbLin(g)+0.0722*_srgbLin(b);
const _inkCache=new Map();
function inkify(hex,ratio=INK_CONTRAST){
  if(!hex||typeof hex!=="string")return hex;
  const ck=hex+"|"+ratio;
  if(_inkCache.has(ck))return _inkCache.get(ck);
  let h=hex.trim().replace("#","");
  if(h.length===3)h=h.split("").map(c=>c+c).join("");
  if(h.length!==6||/[^0-9a-f]/i.test(h)){_inkCache.set(ck,hex);return hex;}
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const need=(SHEET_LUM+0.05)/ratio-0.05; // max foreground luminance for the target ratio
  let out;
  if(_relLum(r,g,b)<=need){out="#"+h.toLowerCase();}
  else{
    // binary-search the largest uniform sRGB scale whose luminance still clears the bar
    let lo=0,hi=1;
    for(let i=0;i<24;i++){const m=(lo+hi)/2;if(_relLum(r*m,g*m,b*m)>need)hi=m;else lo=m;}
    const to=(v)=>Math.round(Math.max(0,Math.min(255,v*lo))).toString(16).padStart(2,"0");
    out="#"+to(r)+to(g)+to(b);
  }
  _inkCache.set(ck,out);
  return out;
}
const TC_RAW = { Mercedes: "#27F4D2", Ferrari: "#E80020", McLaren: "#FF8000", "Red Bull": "#3671C6", "Racing Bulls": "#6692FF", Alpine: "#FF87BC", "Aston Martin": "#229971", Haas: "#B6BABD", Williams: "#64C4FF", Audi: "#FF0000", Cadillac: "#D4AF37" };
const TC = Object.fromEntries(Object.entries(TC_RAW).map(([k,v])=>[k,inkify(v)]));
// Team ink for small text (names, team labels): the 4.5:1 bar instead of 3.1:1
const TCT = Object.fromEntries(Object.entries(TC_RAW).map(([k,v])=>[k,inkify(v,TEXT_CONTRAST)]));
const TB = { Mercedes: "rgba(27,127,75,0.10)", Ferrari: "rgba(214,40,40,0.10)", McLaren: "rgba(255,128,0,0.10)", "Red Bull": "rgba(54,113,198,0.10)", "Racing Bulls": "rgba(102,146,255,0.10)", Alpine: "rgba(255,135,188,0.10)", "Aston Martin": "rgba(34,153,113,0.10)", Haas: "rgba(182,186,189,0.10)", Williams: "rgba(100,196,255,0.10)", Audi: "rgba(255,0,0,0.06)", Cadillac: "rgba(212,175,55,0.10)" };

// Translucent version of any colour — hex, rgb() or a CSS variable. Appending a
// hex alpha ("${c}22") silently produced invalid CSS whenever c was a
// var(--token), which the paper-theme remap made common (the tyre heatmap's
// Medium and Hard cells lost their shading). a is 0–255, like a hex alpha pair.
const alpha=(c,a)=>`color-mix(in srgb, ${c} ${Math.round(a/2.55)}%, transparent)`;

// Normalize OpenF1 team names to match TC/TL keys
function normTeam(t){if(!t)return"";return t.replace(" F1 Team","").replace("Red Bull Racing","Red Bull").replace("Kick Sauber","Audi").trim();}

// Shared requestAnimationFrame clock for Race Replay and Lap Compare playback.
// Advances `time` by elapsed-seconds × speed while playing; reads the current
// duration from a ref (published by the render) and auto-pauses at the end so
// the clock can't run forever past the race/lap finish.
function useRafClock(playing, speed, time, setTime, setPlaying, durationRef) {
  const timeRef = useRef(time);
  timeRef.current = time;
  useEffect(() => {
    if (!playing) return;
    let raf = null, last = null;
    const tick = (now) => {
      if (last != null) {
        // Cap the step: frames pause while the page is hidden, and the whole gap
        // used to land at once (a minute away at 8× jumped eight minutes)
        const next = timeRef.current + (Math.min(now - last, 100) / 1000) * speed;
        const dur = durationRef.current;
        if (dur > 0 && next >= dur) { setTime(dur); setPlaying(false); return; }
        setTime(next);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);
}

// Resolve the active race session for Lap Compare (falls back to the latest
// meeting that has a Race session). Mirrors the resolution in the Telemetry
// render so the fetch effects and the UI always agree.
function lapCompareTarget(openf1, telMeetingKey) {
  const raceMeetings = (openf1.meetings || [])
    .map(m => ({ meeting: m, race: m.sessions.find(s => s.sessionName === "Race") }))
    .filter(x => x.race);
  if (raceMeetings.length === 0) return null;
  const activeKey = telMeetingKey && raceMeetings.find(rm => rm.meeting.meetingKey === telMeetingKey) ? telMeetingKey : raceMeetings[raceMeetings.length - 1].meeting.meetingKey;
  return raceMeetings.find(rm => rm.meeting.meetingKey === activeKey) || null;
}
// Resolve the two compared drivers (defaults: top-2 finishers with usable laps).
function pickLapCompareDrivers(cur, acrAPref, acrBPref) {
  const usable = (cur.race.drivers || []).filter(d => (d.lapTimes || []).filter(l => l.ds).length >= 3);
  if (usable.length < 2) return {};
  const finalPos = (d) => { const ps = d.positions; if (!ps || ps.length === 0) return 99; return ps[ps.length - 1].p; };
  const sortedByFinish = [...usable].sort((a, b) => finalPos(a) - finalPos(b));
  const acrA = acrAPref && usable.find(d => d.acronym === acrAPref) ? acrAPref : sortedByFinish[0]?.acronym;
  const acrB = acrBPref && usable.find(d => d.acronym === acrBPref) ? acrBPref : sortedByFinish[1]?.acronym;
  const drA = usable.find(d => d.acronym === acrA);
  const drB = usable.find(d => d.acronym === acrB);
  if (!drA || !drB || drA.acronym === drB.acronym) return {};
  return { drA, drB };
}

// Format a race date (and optional UTC start time) in the viewer's locale.
// Without a time, anchor at 12:00 UTC so the calendar date doesn't shift in
// western-hemisphere timezones.
// `fixed` formats in en-US/UTC: the pre-rendered page and the render that hydrates
// it must print identical text, so both use it until hydration completes
const FIXED_FMT={locale:"en-US",timeZone:"UTC"};
// "2026-10-31 22:39": the same width in every zone and locale (UTC when `utc`)
const isoMinute=(iso,utc)=>{const d=new Date(iso),p=n=>String(n).padStart(2,"0");return utc?d.toISOString().slice(0,16).replace("T"," "):`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;};
const raceDateFmt = (dt, tt, fixed) => new Date(`${dt}T${tt || "12:00:00Z"}`).toLocaleDateString(fixed?.locale, { weekday: "short", month: "short", day: "numeric", timeZone: fixed?.timeZone });
const raceTimeFmt = (dt, tt) => tt ? new Date(`${dt}T${tt}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

// One bad data field shouldn't white-screen the whole dashboard — catch render
// errors per-tab (keyed on the tab, so other tabs stay usable).
//
// Tab bodies render through <TabBody> so their errors are thrown inside this
// boundary: written as inline expressions in App's own render, they escaped it
// and blanked the entire site. Reset clears the tab's selections (race,
// meeting, session) — a bad selection would otherwise throw again on re-entry.
function TabBody({render}){return render();}
class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error("Tab render failed:", error); }
  reset = () => { this.props.onReset?.(); this.setState({ error: null }); };
  render() {
    if (this.state.error) {
      return (
        <div className="fu" role="alert" style={{ textAlign: "center", padding: 60, color: "var(--ink-3)" }}>
          <div className="num" style={{ fontSize: 34, fontWeight: 700, marginBottom: 12, color: "var(--red)" }}>!</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "var(--fg)" }}>This tab hit an error</div>
          <div className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{String(this.state.error?.message || this.state.error)}</div>
          <div style={{ fontSize: 12, marginTop: 10 }}>The other tabs still work — this is likely a data quirk from the latest fetch.</div>
          <button onClick={this.reset} className="head" style={{ marginTop: 16, padding: "8px 16px", borderRadius: 2, border: "1px solid var(--rule)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Reset this tab</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Drivers whose OpenF1 headshot_url is missing or points to a fallback image —
// the manual map below supplies working high-res URLs found on
// formula1.com/en/drivers.html.
const DH_USE_B64 = new Set(["Kimi Antonelli","Andrea Kimi Antonelli","Arvid Lindblad"]);
const MANUAL_HEADSHOT_URLS = {
  "Andrea Kimi Antonelli": "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp",
  "Kimi Antonelli":        "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp",
  "Arvid Lindblad":        "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp",
};
// Rewrite F1.com Cloudinary URLs to request a higher-res image. Source has w_240
// which is fine for tiny avatars but blurry in the 140px hero. Only ever upsize
// — never downsize — so smaller standings rows keep the existing 240px source.
function upscaleHeadshotUrl(url, displaySize){
  if(!url||!url.includes("formula1.com/image"))return url;
  if(displaySize>=64)return url.replace(/c_lfill,w_\d+/, "c_lfill,w_480");
  // Small avatars: ask the CDN for ~3× the display size, not the 440px portrait
  // (a 44px circle was downloading a 440×1265 image)
  return url.replace(/c_lfill,w_\d+/, `c_lfill,w_${Math.max(96,Math.ceil(displaySize*3/8)*8)}`);
}
function DH({name,size=32,headshots}){const[tryLevel,setTryLevel]=useState(0);
  // Reset the fallback chain when this instance is reused for a different driver \u2014
  // otherwise a previous driver's CDN failure makes the new driver skip working URLs.
  const prevName=useRef(name);
  if(prevName.current!==name){prevName.current=name;setTryLevel(0);}
  const normName=(n)=>n.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let of1=headshots&&headshots[name];
  if(!of1&&headshots){const key=Object.keys(headshots).find(k=>k.toLowerCase()===name.toLowerCase()||normName(k)===normName(name));if(key)of1=headshots[key];}
  const manualUrl=MANUAL_HEADSHOT_URLS[name];
  const baseCdn=manualUrl||(DH_USE_B64.has(name)?null:of1?.url);
  const of1Url=upscaleHeadshotUrl(baseCdn,size);
  const b64Url=DRIVER_IMAGES[name];
  const urls=[of1Url,b64Url].filter(Boolean);
  const u=urls[tryLevel];
  if(!u){
    const acr=of1?.acronym||name.split(" ").map(n=>n[0]).join("").slice(0,3);
    const tc=of1?.teamColour||TC[of1?.team]||"var(--w20)";
    return (<div style={{width:size,height:size,borderRadius:"50%",background:`${alpha(tc,0x22)}`,border:`2px solid ${alpha(tc,0x66)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:800,color:tc,flexShrink:0,letterSpacing:0.5}}>{acr}</div>);
  }
  return (<img src={u} alt={name} width={size} height={size} loading="lazy" decoding="async" onError={()=>setTryLevel(prev=>prev+1)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",objectPosition:"top center",flexShrink:0,background:"var(--w05)"}}/>);}
function TL({team,size=20}){const[e,sE]=useState(false);const u=TEAM_LOGOS[team];if(!u||e)return null;const isData=u.startsWith("data:");return (<img src={u} alt={team} {...(isData?{}:{referrerPolicy:"no-referrer",crossOrigin:"anonymous"})} width={size} height={size} loading="lazy" decoding="async" onError={()=>sE(true)} style={{width:size,height:size,objectFit:"contain",flexShrink:0,...(team==="Cadillac"?{filter:"invert(1) brightness(1.15)"}:{})}}/>);}

// Inline SVG circuit outline. Sourced from bacinger/f1-circuits via fetch-tracks.mjs.
// Caller controls the container size — SVG scales to fit while preserving aspect.
function TrackMap({raceName,tracks,stroke="var(--fg)",strokeWidth=2,opacity=1,fill="none",height,width,style}){
  const t=tracks?.[raceName];
  if(!t)return null;
  return(
    <svg role="img" aria-label={`${raceName} circuit outline`} viewBox={t.viewBox} preserveAspectRatio="xMidYMid meet" style={{display:"block",height,width,overflow:"visible",...style}}>
      <path d={t.path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>
    </svg>
  );
}

// Build a closed-loop sampler from a TrackMap path. Given a fraction in [0,1]
// returns the (x, y) point that fraction of the way around the lap. Used by the
// Race Replay panel to position driver dots on the circuit outline.
function buildTrackSampler(track){
  if(!track)return null;
  const matches=[...(track.path||"").matchAll(/[ML]([0-9.]+),([0-9.]+)/g)];
  const pts=matches.map(m=>[parseFloat(m[1]),parseFloat(m[2])]);
  if(pts.length<2)return null;
  const cumDist=[0];
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];
    cumDist.push(cumDist[i-1]+Math.sqrt(dx*dx+dy*dy));
  }
  const total=cumDist[cumDist.length-1];
  return{
    total,
    sample(frac){
      const t=((frac%1)+1)%1*total;
      // Binary search for segment containing t
      let lo=0,hi=cumDist.length-1;
      while(lo<hi-1){const mid=(lo+hi)>>1;if(cumDist[mid]<=t)lo=mid;else hi=mid;}
      const segLen=cumDist[hi]-cumDist[lo]||1;
      const f=(t-cumDist[lo])/segLen;
      return[pts[lo][0]+f*(pts[hi][0]-pts[lo][0]),pts[lo][1]+f*(pts[hi][1]-pts[lo][1])];
    },
  };
}

// Join live /car_data and /location samples for a single lap window into a
// time-aligned series [{t, x, y, d, speed, th, br, g}, ...] used by Lap Compare.
// Browser-side OpenF1 requests for Lap Compare. The free tier allows about three
// requests a second, so calls are spaced 400 ms apart and a 429 waits out
// Retry-After (or backs off) before retrying instead of surfacing a raw error.
let openf1LastCall=0;
async function openf1Fetch(url,signal){
  for(let attempt=0;;attempt++){
    const gap=openf1LastCall+400-Date.now();
    if(gap>0)await new Promise(r=>setTimeout(r,gap));
    openf1LastCall=Date.now();
    const res=await fetch(url,{signal});
    if(res.status!==429||attempt>=3)return res;
    const ra=parseInt(res.headers.get("retry-after")||"0",10);
    await new Promise(r=>setTimeout(r,Math.max(ra*1000,1500*2**attempt)));
  }
}

// The build-time default lap (fetch-openf1-data.mjs): compact [ms offset, …] rows
// expanded back into the car_data / location shapes processLapTelemetry reads.
function expandLapCompare(raw){
  const t0=raw.t0||0;
  const car=(raw.car||[]).map(([dt,speed,throttle,brake,n_gear])=>({date:new Date(t0+dt).toISOString(),speed,throttle,brake,n_gear}));
  const loc=(raw.loc||[]).map(([dt,x,y])=>({date:new Date(t0+dt).toISOString(),x,y}));
  return processLapTelemetry(car,loc);
}

function processLapTelemetry(carData, location){
  if(!carData||!location||location.length<3)return [];
  const carSorted=[...carData].filter(c=>c.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const locSorted=[...location].filter(l=>l.date&&l.x!=null&&l.y!=null).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(locSorted.length<3)return [];
  const startMs=new Date(locSorted[0].date).getTime();
  // Cumulative XY distance + retain x/y per sample
  const samples=[];
  let cum=0;
  for(let i=0;i<locSorted.length;i++){
    if(i>0){
      const dx=locSorted[i].x-locSorted[i-1].x;
      const dy=locSorted[i].y-locSorted[i-1].y;
      cum+=Math.sqrt(dx*dx+dy*dy);
    }
    const t=(new Date(locSorted[i].date).getTime()-startMs)/1000;
    samples.push({t,x:locSorted[i].x,y:locSorted[i].y,d:cum,speed:0,th:0,br:0,g:null});
  }
  // Walk car_data with two pointers to attach nearest speed
  let ci=0;
  for(const s of samples){
    const targetMs=startMs+s.t*1000;
    while(ci+1<carSorted.length&&Math.abs(new Date(carSorted[ci+1].date).getTime()-targetMs)<Math.abs(new Date(carSorted[ci].date).getTime()-targetMs))ci++;
    s.speed=carSorted[ci]?.speed||0;
    s.th=carSorted[ci]?.throttle||0;
    s.br=carSorted[ci]?.brake||0;
    s.g=carSorted[ci]?.n_gear??null;
  }
  return samples;
}

// Split a TrackMap path into three equal-length segments. Used for the sector
// overlay on Sector Times. Returns three path strings, the start point of each
// sector boundary (for label dots), and the original viewBox.
function splitTrackIntoSectors(track){
  if(!track)return null;
  const matches=[...(track.path||"").matchAll(/[ML]([0-9.]+),([0-9.]+)/g)];
  const pts=matches.map(m=>[parseFloat(m[1]),parseFloat(m[2])]);
  if(pts.length<6)return null;
  let total=0;
  const cum=[0];
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];
    total+=Math.sqrt(dx*dx+dy*dy);
    cum.push(total);
  }
  const t1=total/3,t2=(total*2)/3;
  let i1=cum.findIndex(l=>l>=t1);
  let i2=cum.findIndex(l=>l>=t2);
  if(i1<1)i1=Math.floor(pts.length/3);
  if(i2<i1+1)i2=Math.floor((pts.length*2)/3);
  const build=(a,b)=>pts.slice(a,b+1).map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
  return{
    s1:build(0,i1),
    s2:build(i1,i2),
    s3:build(i2,pts.length-1),
    boundaries:[pts[i1],pts[i2]],
    viewBox:track.viewBox,
  };
}

// Loading / failed / empty panel for the lazily loaded sheets. Visitors never
// see developer instructions — a failure offers Retry.
function SheetStatus({title,detail,onRetry,children}){
  return(
    <div className="fu" role={onRetry?"alert":"status"} style={{textAlign:"center",padding:"48px 16px",color:"var(--ink-3)"}}>
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{display:"block",margin:"0 auto 12px"}}><circle cx="20" cy="22" r="14" fill="none" stroke="var(--ink-3)" strokeWidth="2"/><path d="M20 12v10l6 4" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/><path d="M16 5h8M20 5v3" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/></svg>
      <div style={{fontSize:16,fontWeight:600,marginBottom:4,color:"var(--fg)"}}>{title}</div>
      {detail&&<div style={{fontSize:13}}>{detail}</div>}
      {onRetry&&<button onClick={onRetry} className="head" style={{marginTop:14,padding:"7px 16px",borderRadius:2,border:"1px solid var(--rule)",background:"var(--panel)",color:"var(--fg)",fontSize:13,fontWeight:700,cursor:"pointer"}}>Retry</button>}
      {children}
    </div>
  );
}
function SC({label,value,sub,accent,icon}){return (<div style={{background:"var(--w03)",border:"1px solid var(--w06)",borderRadius:2,padding:"14px 16px",flex:1,minWidth:130}}><div className="sc-label" style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",marginBottom:8,fontFamily:"var(--font-ui)"}}>{label}</div><div style={{display:"flex",alignItems:"center",gap:8}}>{icon}{" "}<span style={{fontSize:22,fontWeight:700,color:accent||"var(--fg)",lineHeight:1,fontFamily:"var(--font-ui)"}}>{value}</span></div>{sub&&<div style={{fontSize:11,color:"var(--w50)",marginTop:6,fontFamily:"var(--font-ui)"}}>{sub}</div>}</div>);}

function SB({status}){const m={done:{bg:"rgba(27,127,75,0.12)",c:"var(--green)",t:"COMPLETED"},next:{bg:"rgba(214,40,40,0.15)",c:"var(--red)",t:"NEXT RACE"},postponed:{bg:"rgba(183,121,31,0.12)",c:"var(--amber)",t:"POSTPONED"},upcoming:{bg:"var(--w05)",c:"var(--w40)",t:"UPCOMING"}};const s=m[status]||m.upcoming;return (<span style={{fontSize:10,fontWeight:700,letterSpacing:1,padding:"3px 8px",borderRadius:2,background:s.bg,color:s.c}}>{s.t}</span>);}

// ── The timekeeper's lap chart ──────────────────────────────────────────────
// One column per lap, one row per position. Each car's line is inked in its
// team colour; the winner's line is traced in red. Yellow-flag laps and
// safety-car periods band the sheet. Scrubbed by the stopwatch beneath it,
// which shares its lap cursor with the read-out (and the replay via #lap=).
// outNums: car numbers not classified (from the Jolpica classification). A line that
// ends early is not a retirement by itself — lapped finishers end a lap or two short.
const LapChart=memo(function LapChart({session,lap,setLap,outNums}){
  const[focus,setFocus]=useState(null);
  const wrapRef=useRef(null);
  const[compact,setCompact]=useState(false);
  // Measured before paint: a phone that first drew the desktop layout and then
  // flipped to compact doubled the chart's height and pushed the read-out down
  useLayoutEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const m=()=>setCompact(el.clientWidth<640);m();
    const ro=new ResizeObserver(m);ro.observe(el);return()=>ro.disconnect();
  },[]);
  const drivers=useMemo(()=>session.drivers||[],[session.drivers]);
  const total=Math.max(1,...drivers.map(d=>(d.positions||[]).reduce((m,q)=>Math.max(m,q.l||0),0)));
  const n=Math.max(drivers.length,20);
  // Compact (phone) keeps the same 1000-unit width but taller rows and larger type,
  // so the whole race fits the screen and the scrubber hand stays over its lap.
  const W=1000,ML=compact?58:40,MR=compact?86:56,MT=compact?30:16,MB=compact?14:8,rowH=compact?46:23;
  const fs=compact?24:12,fsLap=compact?21:10.5,sw=compact?2.6:1.4,swW=compact?4:2.2,pr=compact?5:2.6;
  const H=MT+MB+n*rowH;
  // x/y change with the phone layout — the memo below must rebuild the lines when
  // `compact` flips after mount, or phones draw desktop-spaced lines under phone rows.
  const x=useCallback((l)=>ML+((l-1)/Math.max(1,total-1))*(W-ML-MR),[ML,MR,total]);
  const y=useCallback((p)=>MT+(p-0.5)*rowH,[MT,rowH]);
  const {paths,winner,finals,starts}=useMemo(()=>{
    let winner=null;const finals=[],starts=[];
    const paths=drivers.map(d=>{
      const pts=(d.positions||[]).filter(q=>q.p&&q.l>=1);
      if(pts.length===0)return null;
      const dstr=pts.map((q,i)=>`${i===0?"M":"L"}${x(q.l).toFixed(1)},${y(q.p).toFixed(1)}`).join("");
      const last=pts[pts.length-1];
      if(last.p===1&&last.l>=total-1)winner=d.number;
      finals.push({d,p:last.p,l:last.l});starts.push({d,p:pts[0].p});
      const pitLaps=(d.lapTimes||[]).filter(t=>t.pit).map(t=>t.l);
      const pits=pitLaps.map(l=>{const q=pts.find(z=>z.l===l);return q?{x:x(q.l),y:y(q.p)}:null;}).filter(Boolean);
      return {d,dstr,pits,len:pts.length};
    }).filter(Boolean);
    return {paths,winner,finals,starts};
  },[drivers,total,x,y]);
  const yellow=new Set(session.yellowFlagLaps||[]);
  const periods=session.raceControlPeriods||[];
  const cur=Math.max(1,Math.min(total,lap));
  const lapFromEvent=(e)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const px=((e.clientX-r.left)/r.width)*W;
    return Math.round(1+((px-ML)/(W-ML-MR))*(total-1));
  };
  const onPointer=(e)=>{if(e.buttons!==1&&e.type!=="pointerdown")return;setLap(Math.max(1,Math.min(total,lapFromEvent(e))));};
  return(
    <div ref={wrapRef} className={`lapchart${focus?" has-focus":""}${compact?" compact":""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lap chart, ${total} laps, ${drivers.length} cars`} onPointerDown={onPointer} onPointerMove={onPointer} style={{touchAction:"pan-y",cursor:"crosshair"}}>
        {/* period bands */}
        {periods.map((pr,i)=>{const c=pr.type==="RED"?"var(--red)":pr.type==="VSC"?"var(--amber)":"var(--yellow)";return <rect key={i} x={x(pr.lapStart)-((W-ML-MR)/(total-1))/2} y={0} width={Math.max(2,x(pr.lapEnd)-x(pr.lapStart)+((W-ML-MR)/(total-1)))} height={H} fill={c} opacity={0.14}/>;})}
        {[...yellow].filter(l=>l>=1&&l<=total).map(l=>{const cw=(W-ML-MR)/Math.max(1,total-1);return <rect key={"y"+l} x={x(l)-cw/2} y={0} width={cw} height={H} fill="var(--yellow)" opacity={0.12}/>;})}
        {/* rules: rows + every 5th lap */}
        {Array.from({length:n+1},(_,i)=><line key={"r"+i} x1={ML-4} x2={W-MR+4} y1={MT+i*rowH} y2={MT+i*rowH} stroke={i%5===0?"var(--rule)":"var(--rule-faint)"} strokeWidth={i%5===0?0.8:0.5}/>)}
        {/* every 5th lap, plus the first and last; a 5th lap within 2 of the end gives way, or its label runs into the final one ("7071") */}
        {Array.from({length:total},(_,i)=>i+1).filter(l=>l===1||l===total||(l%5===0&&total-l>2)).map(l=><g key={"c"+l}><line x1={x(l)} x2={x(l)} y1={MT-2} y2={H-MB} stroke={l%10===0||l===1||l===total?"var(--rule)":"var(--rule-faint)"} strokeWidth={0.6}/><text x={x(l)} y={MT-6} textAnchor="middle" className="lc-lap" style={{fontSize:fsLap}}>{l}</text></g>)}
        {/* car lines */}
        {paths.map(({d,dstr,pits})=>{const col=inkify(d.teamColour||"var(--ink-4)");const isW=d.number===winner;return(
          <g key={d.number} className={`${isW?"leader ":""}${focus===d.number?"focus":""}`} onPointerEnter={()=>setFocus(d.number)} onPointerLeave={()=>setFocus(null)}>
            <path d={dstr} fill="none" stroke={isW?"var(--red)":col} strokeWidth={isW?swW:sw} strokeLinejoin="round" strokeLinecap="round" className={isW?"leader ink-draw":"ink-draw"} style={{"--len":4000}}/>
            {pits.map((pt,i)=><circle key={i} cx={pt.x} cy={pt.y} r={pr} fill="var(--sheet)" stroke={isW?"var(--red)":col} strokeWidth={sw}/>)}
          </g>);})}
        {/* start + finish numerals */}
        {starts.map(({d,p})=><text key={"s"+d.number} x={ML-8} y={y(p)+fs*0.35} textAnchor="end" className="lc-num" style={{fontSize:fs}} fill={inkify(d.teamColour||"var(--ink-4)")}>{d.number}</text>)}
        {finals.map(({d,p,l})=>{const ended=l<total-1;const retired=!!outNums?.has(String(d.number));return <text key={"f"+d.number} x={ended?x(l)+7:W-MR+8} y={y(p)+fs*0.35} className="lc-num" fill={d.number===winner?"var(--red)":inkify(d.teamColour||"var(--ink-4)")} opacity={retired?0.75:1} style={{fontSize:retired?fs*0.85:fs,fontStyle:retired?"italic":"normal"}}>{retired?`${d.acronym} ×`:d.acronym}</text>;})}
        {/* lap cursor */}
        <line className="lc-cursor" x1={x(cur)} x2={x(cur)} y1={0} y2={H} style={{strokeWidth:compact?2.5:1.25}}/>
        <text x={x(cur)} y={H+fs*0.9} textAnchor="middle" className="lc-num" fill="var(--red)" style={{fontSize:fs*0.85}}>L{cur}</text>
      </svg>
    </div>
  );
});

const LapReadout=memo(function LapReadout({session,lap,live=true}){
  const drivers=session.drivers||[];
  const order=drivers.map(d=>{const q=(d.positions||[]).find(z=>z.l===lap);const t=(d.lapTimes||[]).find(z=>z.l===lap);return q?{d,p:q.p,pit:!!t?.pit}:null;}).filter(Boolean).sort((a,b)=>a.p-b.p);
  return(
    <div className="readout" aria-live={live?"polite":"off"}>
      <span className="ro-lap">LAP {lap}</span>
      {order.map(o=><span key={o.d.number} className={`ro-car${o.pit?" pit":""}`} title={`${o.d.name}${o.pit?" · pit stop this lap":""}`}><i>{o.p}</i><b style={{color:inkify(o.d.teamColour,TEXT_CONTRAST)||"var(--ink-3)"}}>{o.d.acronym}</b></span>)}
    </div>
  );
});

// Stopwatch scrubber: drives the lap cursor; play advances a lap every 160 ms.
function LapScrubber({lap,setLap,total,playing,setPlaying}){
  useEffect(()=>{if(!playing)return;const id=setInterval(()=>setLap(l=>{if(l>=total){setPlaying(false);return l;}return l+1;}),160);return()=>clearInterval(id);},[playing,total,setLap,setPlaying]);
  const pct=(l)=>((l-1)/Math.max(1,total-1))*100;
  const ticks=[];for(let l=1;l<=total;l++){if(l===1||l%5===0||l===total)ticks.push(l);}
  return(
    <div className="scrub">
      <button type="button" aria-label={playing?"Pause lap playback":"Play laps"} onClick={()=>{if(!playing&&lap>=total)setLap(1);setPlaying(p=>!p);}}>
        {playing?<svg viewBox="0 0 12 12"><rect x="1.5" y="1" width="3.2" height="10"/><rect x="7.3" y="1" width="3.2" height="10"/></svg>:<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>}
      </button>
      <div className="track">
        <div className="rail"/>
        {ticks.map(l=><span key={l} className={`tick${l%10===0||l===1||l===total?" major":""}`} style={{left:`${pct(l)}%`}}/>)}
        {ticks.filter(l=>l===1||l%10===0||(l===total&&total%10>=4)).map(l=><span key={"t"+l} className={`tick-lbl${l===total?" last":""}`} style={{left:`${pct(l)}%`}}>{l}</span>)}
        <div className="hand" style={{left:`${pct(lap)}%`}}/>
        <input type="range" min={1} max={total} step={1} value={lap} aria-label="Lap" onChange={e=>{setPlaying(false);setLap(parseInt(e.target.value));}}/>
      </div>
      <div className="lapno">LAP {String(lap).padStart(2,"0")}<small> / {total}</small></div>
    </div>
  );
}

// Inline SVG control glyphs, one stroke weight (the stopwatch play mark is the model)
const IcoPlay=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>;
const IcoPause=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1.5" y="1" width="3.2" height="10"/><rect x="7.3" y="1" width="3.2" height="10"/></svg>;
const IcoRestart=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="2" height="10"/><path d="M11 1L4 6l7 5z"/></svg>;

// ── Deep links ─────────────────────────────────────────────────────────────
// The URL hash carries the open tab and its selection (#tab=results&r=14,
// #tab=telemetry&r=14&lap=12, #tab=sectors&r=14&s=qualifying), so any view
// can be linked and Back/Forward step between tabs. A bare #lap=N — the old
// scrubber link — still opens the Overview on that lap.
const TAB_SLUGS={Overview:"overview",Standings:"standings","Race Results":"results","Sector Times":"sectors",Telemetry:"telemetry","Head to Head":"h2h","Pit Stops":"pits",Quotes:"quotes",Schedule:"schedule"};
const SLUG_TABS=Object.fromEntries(Object.entries(TAB_SLUGS).map(([k,v])=>[v,k]));
const SESSION_SLUGS={"Practice 1":"fp1","Practice 2":"fp2","Practice 3":"fp3",Qualifying:"qualifying","Sprint Qualifying":"sprint-qualifying",Sprint:"sprint",Race:"race"};
const hashParams=()=>new URLSearchParams(typeof location!=="undefined"?location.hash.replace(/^#/,""):"");
const tabFromHash=()=>SLUG_TABS[hashParams().get("tab")]||"Overview";
const tabHref=(tab,params={})=>"#"+new URLSearchParams({tab:TAB_SLUGS[tab],...Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null).map(([k,v])=>[k,String(v)]))}).toString();
// Merge params into the current hash without adding a history entry
function patchHash(params){
  const p=hashParams();
  for(const[k,v]of Object.entries(params)){if(v==null||v==="")p.delete(k);else p.set(k,String(v));}
  const h="#"+p.toString();
  if(typeof location!=="undefined"&&h!==location.hash){try{history.replaceState(null,"",h);}catch{/* Safari rate-limits history calls */}}
}

// The Overview's lap chart, read-out and stopwatch. It owns the lap cursor, so
// playback re-renders this sheet rather than the whole dashboard (the cursor
// used to live in the root), and it mirrors the lap into the URL — debounced,
// since Safari throttles history calls. The read-out's live region goes quiet
// during playback instead of announcing a lap every 160 ms.
function LapSheet({session,total,outNums,onOpenReplay,replayHref}){
  const[lap,setLapRaw]=useState(()=>{const L=parseInt(hashParams().get("lap"));return Number.isFinite(L)?Math.max(1,Math.min(total,L)):1;});
  const setLap=useCallback(v=>setLapRaw(prev=>Math.max(1,Math.min(total,typeof v==="function"?v(prev):v))),[total]);
  const[playing,setPlaying]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>patchHash({lap:lap>1?lap:null}),400);return()=>clearTimeout(id);},[lap]);
  return(
    <div style={{marginTop:14}}>
      <LapChart session={session} lap={lap} setLap={setLap} outNums={outNums}/>
      <LapReadout session={session} lap={lap} live={!playing}/>
      <LapScrubber lap={lap} setLap={setLap} total={total} playing={playing} setPlaying={setPlaying}/>
      <p className="sheet-sub" style={{marginTop:10}}>Red line: the winner. Circles: pit stops. ×: retired. Yellow columns: local yellows. Drag the stopwatch, or press play. <a href={replayHref(lap)} onClick={e=>{e.preventDefault();onOpenReplay(lap);}}>Open this lap in the replay →</a></p>
    </div>
  );
}

const TABS=[{id:"Overview",label:"Overview"},{id:"Standings",label:"Standings"},{id:"Race Results",label:"Race Results"},{id:"Sector Times",label:"Sector Times"},{id:"Telemetry",label:"Telemetry"},{id:"Head to Head",label:"Head to Head"},{id:"Pit Stops",label:"Pit Stops"},{id:"Quotes",label:"Quotes"},{id:"Schedule",label:"Schedule"}];

// F1 tire compound color map (broadcast graphics convention)
const COMPOUND_COLORS={SOFT:"#FF3344",MEDIUM:"var(--yellow)",HARD:"var(--ink)",INTERMEDIATE:"#43B02A",WET:"#0067AD",UNKNOWN:"var(--ink-4)"};
// Letter colour that reads on each compound chip. The dark-theme pairing drew
// the HARD letter in bench ink on an ink chip (~1.1:1) after the paper remap.
const COMPOUND_INK={HARD:"var(--sheet)",WET:"var(--sheet)",UNKNOWN:"var(--sheet)"};
const compoundInk=c=>COMPOUND_INK[c]||"var(--ink)";

// Race Results OpenF1 enrichment table — module-scope so it can own the show-all
// toggle (its call site is an IIFE inside a .map(), which can't hold hooks).
const SectorEnrichment=memo(function SectorEnrichment({sess,isExact,sessLabel,targetSession}){
  const[showAll,setShowAll]=useState(false);
  const sb=sess.sessionBests;
  const fmtS=(v)=>v?v.toFixed(3):"—";
  const shown=sess.drivers.slice(0,showAll?undefined:5);
  return(
    <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:16,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)"}}>{sessLabel} · {showAll?`All ${sess.drivers.length}`:"Top 5"} <span style={{fontSize:9,opacity:0.6,letterSpacing:0}}>(via OpenF1){!isExact?` · ${targetSession} data unavailable`:""}</span></div>
        <div style={{display:"flex",gap:12,fontSize:10,color:"var(--w30)"}}>
          <span>I1: {sb.topI1Speed||"—"} km/h</span>
          <span>I2: {sb.topI2Speed||"—"} km/h</span>
          <span>ST: {sb.topSTSpeed||"—"} km/h</span>
        </div>
      </div>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:12}}>
        <thead><tr style={{borderBottom:"1px solid var(--w06)"}}>
          {["","Driver","Best S1","Best S2","Best S3","Theo. Best","Top Speed"].map(h=><th key={h} style={{textAlign:h==="Driver"?"left":"right",padding:"5px 8px",fontSize:9,textTransform:"uppercase",letterSpacing:.8,color:"var(--w30)",fontWeight:500}}>{h}</th>)}
        </tr></thead>
        <tbody>{shown.map((d,i)=>{
          const isFS1=d.bestS1&&sb.fastestS1&&Math.abs(d.bestS1-sb.fastestS1)<0.001;
          const isFS2=d.bestS2&&sb.fastestS2&&Math.abs(d.bestS2-sb.fastestS2)<0.001;
          const isFS3=d.bestS3&&sb.fastestS3&&Math.abs(d.bestS3-sb.fastestS3)<0.001;
          return(
          <tr key={i} style={{borderBottom:"1px solid var(--w03)"}}>
            <td style={{padding:"5px 8px",width:20,fontSize:11,fontWeight:700,color:i<3?"var(--fg)":"var(--w35)"}}>{i+1}</td>
            <td style={{padding:"5px 8px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:3,height:14,borderRadius:1,background:inkify(d.teamColour)||"var(--ink-4)"}}/><span style={{fontWeight:600,fontSize:12}}>{d.acronym}</span><span style={{fontSize:10,color:"var(--w20)",margin:"0 2px"}}>|</span><span style={{fontSize:10,color:"var(--w35)"}}>{normTeam(d.team||"")}</span></div></td>
            <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isFS1?"var(--purple)":"var(--w60)",fontWeight:isFS1?700:400}}>{fmtS(d.bestS1)}</td>
            <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isFS2?"var(--purple)":"var(--w60)",fontWeight:isFS2?700:400}}>{fmtS(d.bestS2)}</td>
            <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isFS3?"var(--purple)":"var(--w60)",fontWeight:isFS3?700:400}}>{fmtS(d.bestS3)}</td>
            <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:700,color:i===0?"var(--green)":"var(--w70)"}}>{fmtS(d.theoreticalBest)}</td>
            <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:"var(--w50)"}}>{d.maxSTSpeed||"—"}</td>
          </tr>);
        })}</tbody>
      </table></div>
      {sess.drivers.length>5&&(
        <button onClick={()=>setShowAll(v=>!v)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"var(--w04)",borderRadius:2,border:"1px solid var(--w08)",color:"var(--w60)",fontSize:12,fontWeight:500,fontFamily:"var(--font-ui)",transition:"all 0.2s",marginTop:10}}>
          {showAll?"Top 5":`Show all ${sess.drivers.length}`}
          <span style={{transform:showAll?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s",display:"inline-block"}}>▾</span>
        </button>
      )}
    </div>
  );
});

// Default selections once data.json is in: the Race Results dropdown opens on the
// latest round ("All" was a 17-card, 10,000 px page with the newest race at the
// bottom) unless the deep link names one; Pit Stops takes a linked round.
function initialSelections(t,want){
  const lastGP=t?.races?.filter(r=>!r.sprint).slice(-1)[0];
  const wantTab=SLUG_TABS[want.get("tab")],wantR=want.get("r");
  const linked=wantTab==="Race Results"&&wantR?t?.races?.find(x=>String(x.r)===wantR):null;
  return{selRace:linked?linked.r:lastGP?lastGP.r:"all",selPitRace:wantTab==="Pit Stops"&&wantR?wantR:null};
}

// `initialRaw` is data.json already in hand: the build-time pre-render
// (scripts/prerender.mjs) and the client taking over that pre-rendered page
// both pass it, so the first render is the finished Overview, not the loading
// screen — the two renders match and the swap moves nothing.
export default function F1Dashboard({initialRaw=null,renderAt=null}){
  const[tab,setTab]=useState(()=>tabFromHash());
  // The deep link the page opened with — applied as the data it names arrives
  const initialHash=useRef(null);
  if(initialHash.current===null)initialHash.current=hashParams();
  const initial=useRef(undefined);
  if(initial.current===undefined){const t=initialRaw?transformData(initialRaw):null;initial.current={t,sel:t?initialSelections(t,initialHash.current):null};}
  const[expandedRace,setExpandedRace]=useState(null);
  const[data,setData]=useState(initial.current.t);
  // The tab title follows the season in data.json (index.html's is the fallback)
  useEffect(()=>{if(data?.season)document.title=`F1 ${data.season} Dashboard`;},[data]);
  // Minute clock: race statuses, countdowns and the freshness stamp follow real
  // time while the page stays open, and catch up when a hidden tab returns
  // `renderAt`: the build's clock, for the pre-render and the render that hydrates
  // it. Live time and the viewer's own zone take over right after hydration.
  const[clock,setClock]=useState(()=>renderAt??Date.now());
  const[hydrated,setHydrated]=useState(!renderAt);
  useEffect(()=>{if(!hydrated){setHydrated(true);setClock(Date.now());}},[hydrated]);
  const fixedFmt=hydrated?null:FIXED_FMT;
  const dateFmt=(dt,tt)=>raceDateFmt(dt,tt,fixedFmt);
  const countdown=(dt,tt)=>countdownLabel(dt,tt,new Date(clock),!hydrated);
  // "11:00 AM CST" — in UTC until hydration, like every other date on the Overview: the
  // build renders in CI's zone, so a local time here failed hydration for everyone else
  const timeFmt=(dt,tt)=>new Date(`${dt}T${tt}`).toLocaleTimeString(fixedFmt?.locale,{hour:"numeric",minute:"2-digit",timeZoneName:"short",timeZone:fixedFmt?.timeZone});
  const stampFmt=(iso,opts)=>new Date(iso).toLocaleString(fixedFmt?.locale,{...opts,timeZone:fixedFmt?.timeZone});
  useEffect(()=>{
    const tick=()=>setClock(Date.now());
    const id=setInterval(tick,60000);
    const onVis=()=>{if(document.visibilityState==="visible")tick();};
    document.addEventListener("visibilitychange",onVis);
    return()=>{clearInterval(id);document.removeEventListener("visibilitychange",onVis);};
  },[]);
  const[loading,setLoading]=useState(!initial.current.t);
  const[error,setError]=useState(null);
  // OpenF1 data is split: a light index (meeting/session metadata + headshots,
  // ~11 KB) loads on page load; full per-meeting payloads (~200 KB each) load
  // lazily when a tab needs them. The composed `openf1` value below keeps the
  // original shape so consumers are unchanged.
  const[openf1Index,setOpenf1Index]=useState(null);
  const[openf1Meetings,setOpenf1Meetings]=useState({}); // meetingKey -> full meeting payload
  const meetingFetchTried=useRef(new Set()); // one attempt per key per page load (Retry clears it)
  const[openf1Status,setOpenf1Status]=useState("loading"); // loading | ready | empty | failed
  const[meetingFailed,setMeetingFailed]=useState({}); // meetingKey → true once a load failed
  const retryMeeting=useCallback(key=>{meetingFetchTried.current.delete(key);setMeetingFailed(prev=>{const n={...prev};delete n[key];return n;});},[]);
  const[selMeeting,setSelMeeting]=useState(null);
  const[selSession,setSelSession]=useState(null);
  const[selRace,setSelRace]=useState(initial.current.sel?.selRace??"all");
  const[h2hMetric,setH2hMetric]=useState("qual");
  const[selPitRace,setSelPitRace]=useState(initial.current.sel?.selPitRace??null); // round id; null = latest
  const[quotes,setQuotes]=useState(null);
  const[seasonStats,setSeasonStats]=useState(null); // public/season-stats.json (scripts/build-season-stats.mjs)
  const[quotesSession,setQuotesSession]=useState("race");
  const[quoteDriver,setQuoteDriver]=useState(null); // null = all drivers
  const[quotesShowAll,setQuotesShowAll]=useState(false); // older rounds collapsed by default
  // Lap cursor for the overview lap chart. Deep-linkable: #lap=34 restores it,
  const[progHover,setProgHover]=useState(null);
  const[progHidden,setProgHidden]=useState(()=>new Set());
  const[tracks,setTracks]=useState(null);
  // Per-session driver selection for the Sector Times compare panel.
  // Map: sessionKey -> array of acronyms. Empty/missing means "auto: top 3".
  const[compareBySession,setCompareBySession]=useState({});
  // Telemetry tab state — the rest of it lives inside TelemetryTab; telMeetingKey
  // stays here because the lazy meeting-payload loader effect below depends on it.
  const[telMeetingKey,setTelMeetingKey]=useState(null);

  // Mobile tab bar scrolls sideways — show a trailing-edge fade until the user
  // reaches the end so it's obvious there are more tabs.
  const tabBarRef=useRef(null);
  const[tabsFade,setTabsFade]=useState(false);
  const measureTabs=(el)=>{if(el)setTabsFade(el.scrollWidth>el.clientWidth+2&&el.scrollLeft+el.clientWidth<el.scrollWidth-2);};
  useEffect(()=>{
    const el=tabBarRef.current;if(!el)return;
    const m=()=>measureTabs(el);m();
    window.addEventListener("resize",m);
    return()=>window.removeEventListener("resize",m);
  },[loading]); // the bar only exists once the loading screen is gone
  // The fade-up entrance runs only the first time each tab is opened — replaying
  // it on every switch made navigation feel laggy on slower phones.
  const visitedTabs=useRef(null);
  if(visitedTabs.current===null)visitedTabs.current=new Set(initialRaw?[tab]:[]); // a pre-rendered sheet is already on screen: no entrance
  const tabSeen=visitedTabs.current.has(tab);
  useEffect(()=>{const id=setTimeout(()=>visitedTabs.current.add(tab),1200);return()=>clearTimeout(id);},[tab]);

  // OpenF1 index (light) — retryable, so a failed load offers Retry instead of
  // leaving the sheets on "Loading…" for good
  const loadOpenf1Index=useCallback(()=>{
    setOpenf1Status("loading");
    // Falls back to the legacy single-file payload for
    // checkouts whose public/ data predates the split layout.
    fetch(import.meta.env.BASE_URL + "openf1/index.json")
      .then(r=>r.ok?r.json():null).catch(()=>null)
      .then(idx=>idx||fetch(import.meta.env.BASE_URL + "openf1-data.json").then(r=>r.ok?r.json():null).catch(()=>null))
      .then(of1=>{
        if(!of1){setOpenf1Status("failed");return;}
        if(!of1.meetings||of1.meetings.length===0){setOpenf1Status("empty");return;}
        setOpenf1Index(of1);
        setOpenf1Status("ready");
        // Legacy payload ships full meetings inline — seed the cache so nothing refetches
        const preloaded={};
        for(const m of of1.meetings){if(m.sessions?.some(s=>s.drivers))preloaded[m.meetingKey]=m;}
        if(Object.keys(preloaded).length>0)setOpenf1Meetings(prev=>({...preloaded,...prev}));
        const want=initialHash.current,wantTab=SLUG_TABS[want.get("tab")],wantR=parseInt(want.get("r"));
        const linked=Number.isFinite(wantR)?of1.meetings.find(m=>m.round===wantR):null;
        if(linked&&wantTab==="Telemetry")setTelMeetingKey(linked.meetingKey);
        const secMtg=linked&&wantTab==="Sector Times"?linked:of1.meetings[of1.meetings.length-1];
        setSelMeeting(secMtg.meetingKey);
        const raceSess=(linked&&wantTab==="Sector Times"&&secMtg.sessions.find(s=>SESSION_SLUGS[s.sessionName]===want.get("s")))||secMtg.sessions.find(s=>s.sessionName==="Race")||secMtg.sessions[secMtg.sessions.length-1];
        if(raceSess)setSelSession(raceSess.sessionKey);
      });
  },[]);

  useEffect(()=>{
    // data.json alone gates first paint — the dashboard used to stay on the
    // loading screen until the multi-MB telemetry payload finished downloading.
    // Everything else streams in and populates state when it lands.
    if(!initialRaw)fetch(import.meta.env.BASE_URL + "data.json")
      .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
      .then(raw=>{
        const t=transformData(raw);
        setData(t);
        const sel=initialSelections(t,initialHash.current);
        setSelRace(sel.selRace);
        if(sel.selPitRace)setSelPitRace(sel.selPitRace);
        setLoading(false);
      })
      .catch(e=>{console.error("Failed to load data:",e);setError(e.message);setLoading(false);});
    loadOpenf1Index();
    fetch(import.meta.env.BASE_URL + "season-stats.json").then(r=>r.ok?r.json():null).catch(()=>null).then(st=>{if(st&&st.drivers)setSeasonStats(st);});
    fetch(import.meta.env.BASE_URL + "driver-quotes.json").then(r=>r.ok?r.json():null).catch(()=>null).then(dq=>{if(dq&&dq.rounds)setQuotes(dq);});
    fetch(import.meta.env.BASE_URL + "tracks.json").then(r=>r.ok?r.json():null).catch(()=>null).then(tk=>{if(tk)setTracks(tk);});
  },[loadOpenf1Index,initialRaw]);

  // Composed view: index metadata with full meeting payloads spliced in as they
  // load. Same shape as the old single openf1 object, so consumers are unchanged;
  // a meeting whose sessions lack `drivers` simply isn't loaded yet.
  const openf1=useMemo(()=>{
    if(!openf1Index)return null;
    return {...openf1Index,meetings:openf1Index.meetings.map(m=>openf1Meetings[m.meetingKey]?{...m,...openf1Meetings[m.meetingKey]}:m)};
  },[openf1Index,openf1Meetings]);

  // Lazy-load full meeting payloads for whatever the active tab needs.
  useEffect(()=>{
    if(!openf1Index||openf1Index.meetings.length===0)return;
    const meta=openf1Index.meetings;
    const lastKey=meta[meta.length-1].meetingKey;
    const wanted=new Set();
    if(tab==="Sector Times")wanted.add(selMeeting||lastKey);
    if(tab==="Overview"){ // the lap chart on the first sheet — the meeting of the latest classified GP
      const gp=data?.races?.filter(r=>!r.sprint).slice(-1)[0];
      const m=meetingForRace(meta,gp)||[...meta].reverse().find(x=>x.sessions.some(s=>s.sessionName==="Race"));
      if(m)wanted.add(m.meetingKey);
    }
    if(tab==="Telemetry"){
      const lastRace=[...meta].reverse().find(m=>m.sessions.some(s=>s.sessionName==="Race"));
      wanted.add(telMeetingKey||lastRace?.meetingKey||lastKey);
    }
    if(tab==="Race Results"){ // sector enrichment for the race(s) on screen — not all ~3 MB of meetings
      const shown=(data?.races||[]).filter(r=>selRace==="all"||r.r===selRace);
      for(const r of shown){const m=meetingForRace(meta,data.sched.find(s=>s.r===parseInt(r.r)));if(m)wanted.add(m.meetingKey);}
    }
    if(tab==="Pit Stops"){ // OpenF1's stationary times for the race on screen
      const pr=selPitRace??data?.pitsByRace?.at(-1)?.r;
      const m=pr!=null?meetingForRace(meta,data.sched.find(s=>String(s.r)===String(pr))):null;
      if(m)wanted.add(m.meetingKey);
    }
    const tried=meetingFetchTried.current;
    for(const key of wanted){
      if(!key||openf1Meetings[key]||tried.has(key))continue;
      tried.add(key); // one attempt per page load — a failed meeting fetch must not retry-loop
      fetch(`${import.meta.env.BASE_URL}openf1/meetings/${key}.json`)
        .then(r=>r.ok?r.json():null).catch(()=>null)
        .then(m=>{
          if(m)setOpenf1Meetings(prev=>prev[key]?prev:{...prev,[key]:m});
          else setMeetingFailed(prev=>({...prev,[key]:true}));
        });
    }
  },[openf1Index,openf1Meetings,tab,selMeeting,telMeetingKey,data,selRace,selPitRace,meetingFailed]);

  // Mirror the view into the URL. A tab change pushes a history entry (Back
  // returns to the previous tab); a selection change replaces it. Telemetry and
  // Sector Times wait for the OpenF1 index so a deep link isn't overwritten
  // while it loads. A lap stays in the hash only for the same tab and round.
  const hashTabRef=useRef(tab);
  useEffect(()=>{
    if(!data)return;
    if((tab==="Telemetry"||tab==="Sector Times")&&!openf1Index)return;
    const meta=openf1Index?.meetings||[];
    const roundOf=key=>meta.find(m=>m.meetingKey===key)?.round??null;
    let r=null,sess=null;
    if(tab==="Race Results"&&selRace!=="all")r=selRace;
    if(tab==="Pit Stops"&&selPitRace!=null)r=selPitRace;
    if(tab==="Telemetry")r=roundOf(telMeetingKey??[...meta].reverse().find(m=>m.sessions.some(x=>x.sessionName==="Race"))?.meetingKey);
    if(tab==="Sector Times"){
      const mk=selMeeting??meta[meta.length-1]?.meetingKey;
      r=roundOf(mk);
      const ss=meta.find(m=>m.meetingKey===mk)?.sessions.find(x=>x.sessionKey===selSession);
      sess=ss?SESSION_SLUGS[ss.sessionName]:null;
    }
    const cur=hashParams();
    const sameView=(cur.get("tab")||(cur.has("lap")?"overview":null))===TAB_SLUGS[tab]&&(cur.get("r")??null)===(r==null?null:String(r));
    const next=new URLSearchParams({tab:TAB_SLUGS[tab]});
    if(r!=null)next.set("r",String(r));
    if(sess)next.set("s",sess);
    if(sameView&&cur.get("lap")&&(tab==="Overview"||tab==="Telemetry"))next.set("lap",cur.get("lap"));
    if(sameView&&cur.get("d")&&tab==="Head to Head")next.set("d",cur.get("d"));
    const h="#"+next.toString();
    const push=hashTabRef.current!==tab;
    hashTabRef.current=tab;
    if(h===location.hash)return;
    try{history[push?"pushState":"replaceState"](null,"",h);}catch{/* Safari rate-limits history calls */}
  },[tab,data,openf1Index,selRace,selPitRace,telMeetingKey,selMeeting,selSession]);

  // Back/Forward: restore the tab and selection the URL names
  const openf1IndexRef=useRef(openf1Index);
  openf1IndexRef.current=openf1Index;
  useEffect(()=>{
    const onPop=()=>{
      const p=hashParams();
      const t=SLUG_TABS[p.get("tab")]||"Overview";
      hashTabRef.current=t; // arriving by Back/Forward is not a new history entry
      setTab(t);
      const r=p.get("r");
      if(t==="Race Results")setSelRace(r?(r.endsWith("S")?r:parseInt(r)):"all");
      if(t==="Pit Stops")setSelPitRace(r||null);
      const m=r?(openf1IndexRef.current?.meetings||[]).find(x=>x.round===parseInt(r)):null;
      if(t==="Telemetry")setTelMeetingKey(m?m.meetingKey:null);
      if(t==="Sector Times"&&m){
        setSelMeeting(m.meetingKey);
        const ss=m.sessions.find(x=>SESSION_SLUGS[x.sessionName]===p.get("s"))||m.sessions.find(x=>x.sessionName==="Race");
        setSelSession(ss?ss.sessionKey:null);
      }
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  // Overview → replay on the same lap: the URL carries round and lap to the replay
  const openReplay=useCallback((round,lap)=>{
    const m=(openf1Index?.meetings||[]).find(x=>x.round===round);
    if(m)setTelMeetingKey(m.meetingKey);
    try{history.pushState(null,"",tabHref("Telemetry",{r:round,lap}));}catch{/* rate-limited */}
    hashTabRef.current="Telemetry";
    setTab("Telemetry");
  },[openf1Index]);

  // Cars that weren't classified, per GP date: the lap chart and replay mark
  // retirements from the official classification, not from where a line ends
  const outByDay=useMemo(()=>Object.fromEntries((data?.races||[]).filter(r=>!r.sprint).map(r=>[r.dt,new Set(r.full.filter(x=>typeof x.p!=="number"&&x.num!=null).map(x=>String(x.num)))])),[data]);

  if(loading)return(<div className="bench" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:"#E6ECF1"}}><div className="head" style={{fontSize:30,fontWeight:700,marginBottom:6}}>Opening the season sheets</div><div className="num" style={{color:"#93A1AF",fontSize:13}}>reading data.json …</div></div></div>);
  if(error||!data)return(<div className="bench" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:"#E6ECF1"}}><div className="head" style={{fontSize:30,fontWeight:700,color:"#FF5A5A",marginBottom:6}}>The season sheets didn't load</div><div style={{color:"#C9D3DC",fontSize:14,marginBottom:6}}>Check your connection, then try again.</div>{error&&<div className="num" style={{color:"#93A1AF",fontSize:12}}>{error}</div>}<button onClick={()=>window.location.reload()} className="head" style={{marginTop:16,padding:"8px 18px",borderRadius:2,border:"1px solid #9DB3CF",background:"transparent",color:"#E6ECF1",fontSize:14,fontWeight:700,cursor:"pointer"}}>Try again</button></div></div>);

  const{DS,CS,races,pits,pitsByRace,qualifying,h2h,completedRounds,totalRounds,fetchedAt,pitRaceName,leader,narrative,progression}=data;
  const sched=withStatus(data.sched,clock);
  const seasonDone=sched.length>0&&sched.every(r=>r.st==="done");
  const clinch=titleClinch({DS,sched,races}); // mathematically decided, possibly with rounds to go
  const season=data.season||SEASON_FALLBACK;
  const avgP=pits.length>0?`${(pits.reduce((a,b)=>a+b.s,0)/pits.length).toFixed(3)}s`:"N/A";
  const fastestPit=pits.length>0?pits[0]:null;
  const maxDriverPts=Math.max(1,...DS.map(d=>d.pts));
  const nextRace=sched.find(r=>r.st==="next");
  const headshots=openf1?.driverHeadshots||{};

  return(
    <div className="bench">
      {/* Global styles live in src/styles.css; fonts load from index.html */}


      <header className="hdr">
        <div className="hdr-row">
          <div className="fu">
            <div className="hdr-mark">
              <img src={F1_LOGO} alt="Formula 1"/>
              <div className="sep"/>
              <h1 className="hdr-title">{season} Season Sheets<small>Formula 1 World Championship · kept lap by lap</small></h1>
            </div>
          </div>
          {(()=>{
            const ageDays=Math.floor((clock-new Date(fetchedAt).getTime())/86400000);
            const cls=ageDays<4?"":ageDays<10?"amber":"red";
            const label=ageDays<=0?"data fetched today":ageDays===1?"data fetched yesterday":`data fetched ${ageDays} days ago`;
            return(
          <div className="stamp fu" style={{animationDelay:"0.1s"}} title={stampFmt(fetchedAt)}>
            <div><b>ROUND {completedRounds} / {totalRounds}</b> completed</div>
            {!nextRace&&seasonDone&&DS[0]&&<div>season complete · <b>{DS[0].n.split(" ").pop().toUpperCase()}</b> champion</div>}
            {!seasonDone&&clinch&&DS[0]&&<div><b>{DS[0].n.split(" ").pop().toUpperCase()}</b> · {season} champion · clinched R{clinch.round}</div>}
            {nextRace&&<div>next · <b>{nextRace.nm.replace(" Grand Prix"," GP").toUpperCase()}</b> · {dateFmt(nextRace.dt,nextRace.tt)} · {countdown(nextRace.dt,nextRace.tt)}</div>}
            {(()=>{const pending=sched.filter(r=>r.st==="done"&&!races.some(x=>!x.sprint&&x.r===r.r));return pending.length?<div style={{color:"#F2B8B8"}}>R{pending[0].r} {pending[0].nm.replace(" Grand Prix"," GP")} · results pending next fetch</div>:null;})()}
            <div className="fresh"><i className={cls}/>{label} · Jolpica · OpenF1</div>
          </div>);})()}
        </div>
      </header>
            <div className={`tab-wrap${tabsFade?" fade-r":""}`}>
        <div className="tab-bar" role="tablist" aria-label="Dashboard sheets" ref={tabBarRef} onScroll={e=>measureTabs(e.currentTarget)} onKeyDown={e=>{
          // Roving focus: arrows move between tabs, Home/End jump to the ends
          const i=TABS.findIndex(t=>t.id===tab);
          const next=e.key==="ArrowRight"?(i+1)%TABS.length:e.key==="ArrowLeft"?(i-1+TABS.length)%TABS.length:e.key==="Home"?0:e.key==="End"?TABS.length-1:-1;
          if(next<0)return;
          e.preventDefault();
          setTab(TABS[next].id);
          e.currentTarget.children[next]?.focus();
        }}>
          {TABS.map(t=>{return <button key={t.id} id={`tab-${TAB_SLUGS[t.id]}`} role="tab" aria-selected={tab===t.id} aria-controls="sheet" tabIndex={tab===t.id?0:-1} className={`tb ${tab===t.id?"a":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>;})}
        </div>
      </div>

      <main className="main"><div id="sheet" role="tabpanel" aria-labelledby={`tab-${TAB_SLUGS[tab]}`}>
        <TabErrorBoundary key={tab} onReset={()=>{
          // Back to each tab's defaults: latest race, latest meeting, no expanded rows
          const lastGP=races.filter(r=>!r.sprint).slice(-1)[0];
          setSelRace(lastGP?lastGP.r:"all");setExpandedRace(null);setSelPitRace(null);
          setTelMeetingKey(null);setSelMeeting(null);setSelSession(null);setQuoteDriver(null);
        }}>
        <div className={(tabSeen?"no-anim ":"")+"sheet"}>
        <div className="sheet-band">
          <span><b>{tab.toUpperCase()}</b> · sheet {String(TABS.findIndex(t=>t.id===tab)+1).padStart(2,"0")} of {String(TABS.length).padStart(2,"0")}</span>
          {/* Fixed-width timestamp and a source list that doesn't wait on a fetch:
              the band wraps on phones, so text that grew after first paint (the
              local time replacing the pre-render's UTC, quotes arriving) pushed the
              sheet down */}
          <span>sources · Jolpica F1 · OpenF1{tab==="Overview"||tab==="Quotes"?" · F1 YouTube via Claude":""} · fetched <span title={stampFmt(fetchedAt,{dateStyle:"full",timeStyle:"long"})}>{isoMinute(fetchedAt,!hydrated)}</span></span>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab==="Overview"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:20}}>

            {(()=>{
              const lastRaceFull=races.filter(r=>!r.sprint).slice(-1)[0];
              if(!lastRaceFull)return(
              <div className="hero-grid">
                <div>
                  <h2 className="sheet-h" style={{fontSize:30}}>{season} season</h2>
                  <p className="sheet-sub">{nextRace?`Opens at the ${nextRace.nm} · ${dateFmt(nextRace.dt,nextRace.tt)} · ${countdown(nextRace.dt,nextRace.tt)}`:"The calendar hasn't been published yet"}</p>
                  {nextRace&&tracks&&tracks[nextRace.nm]&&(
                    <div style={{display:"flex",justifyContent:"center",padding:"18px 0",borderTop:"1px solid var(--rule)",marginTop:14}}>
                      <TrackMap raceName={nextRace.nm} tracks={tracks} stroke="var(--ink)" strokeWidth={2.2} height={220} width={320}/>
                    </div>
                  )}
                  <p className="sheet-sub" style={{marginTop:10}}>The lap chart, results and standings fill in after round 1.</p>
                </div>
                <div>
                  <h2 className="sheet-h" style={{fontSize:30}}>Standings</h2>
                  <p className="sheet-sub">Open after round 1.</p>
                </div>
              </div>
              );
              // The race session of the newest meeting that has one (lazy-loaded; falls back to a note while it lands)
              // Matched to the title's round, so a source that lags can't put one race's chart under another's name
              const raceMeeting=openf1?meetingForRace(openf1.meetings,lastRaceFull):null;
              const raceSession=raceMeeting?raceMeeting.sessions.find(s=>s.sessionName==="Race"&&s.drivers):null;
              const total=raceSession?Math.max(1,...raceSession.drivers.map(d=>(d.positions||[]).reduce((m,q)=>Math.max(m,q.l||0),0))):0;
              const winnerName=lastRaceFull?.w||"";
              return(
              <div className="hero-grid">
                <div>
                  <h2 className="sheet-h" style={{fontSize:30}}>Lap chart · {lastRaceFull?lastRaceFull.nm:"—"}</h2>
                  <p className="sheet-sub">{lastRaceFull?`Round ${lastRaceFull.r} · ${lastRaceFull.ci} · ${dateFmt(lastRaceFull.dt,lastRaceFull.tt)}`:""}{(total||lastRaceFull?.full?.[0]?.laps)?` · ${total||lastRaceFull.full[0].laps} laps`:""}{winnerName?` · won by ${winnerName}`:""}{lastRaceFull?.tm?` in ${lastRaceFull.tm}`:""}</p>
                  {/* The slot holds the lap sheet's height while its meeting file loads — the
                      one-line note used to jump to ~600 px and push the page down (CLS 0.3) */}
                  <div className="lapsheet-slot">
                  {raceSession?(
                    <LapSheet key={raceSession.sessionKey} session={raceSession} total={total} outNums={outByDay[lastRaceFull?.dt]} onOpenReplay={lap=>openReplay(lastRaceFull.r,lap)} replayHref={lap=>tabHref("Telemetry",{r:lastRaceFull.r,lap})}/>
                  ):(
                    (()=>{
                      const failed=openf1Status==="failed"||(raceMeeting&&meetingFailed[raceMeeting.meetingKey]);
                      if(failed)return(<div className="num" role="alert" style={{marginTop:14,padding:"18px 0",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",color:"var(--ink-3)",fontSize:12}}>The lap sheet didn't load. <button onClick={()=>raceMeeting?retryMeeting(raceMeeting.meetingKey):loadOpenf1Index()} className="head" style={{marginLeft:8,padding:"3px 10px",borderRadius:2,border:"1px solid var(--rule)",background:"var(--panel)",color:"var(--fg)",fontSize:12,fontWeight:700,cursor:"pointer"}}>Retry</button></div>);
                      return <div className="num" style={{marginTop:14,padding:"18px 0",borderTop:"1px solid var(--rule)",borderBottom:"1px solid var(--rule)",color:"var(--ink-3)",fontSize:12}}>{openf1&&!raceMeeting?"Lap positions for this round are not in the OpenF1 sheet yet.":"Fetching the lap sheet …"}</div>;
                    })()
                  )}
                  </div>
                  <div style={{marginTop:22}}>
                  <div className="ledger">
                    <span><i>avg pit</i><b>{avgP}</b></span>
                    <span><i>fastest pit</i><b>{fastestPit?`${fastestPit.s.toFixed(3)}s`:"N/A"}</b><small>{fastestPit?fastestPit.d:""}</small></span>
                    <span><i>rounds</i><b>{completedRounds}<em>/{totalRounds}</em></b></span>
                    <span><i>winners</i><b>{String(new Set(races.filter(r=>!r.sprint&&r.w).map(r=>r.w)).size)}<em>/{races.filter(r=>!r.sprint).length}</em></b></span>
                  </div>
                              </div>
                </div>
                <div>
                  <h2 className="sheet-h" style={{fontSize:30}}>Standings</h2>
                  <p className="sheet-sub">Drivers · after round {completedRounds}{clinch&&leader?` · ${leader.n.split(" ").pop()} is ${season} champion, clinched at R${clinch.round}`:leader&&DS[1]?` · ${leader.n.split(" ").pop()} leads by ${leader.pts-DS[1].pts}`:""}{leader&&leader.wins?` · ${leader.wins} win${leader.wins>1?"s":""}`:""}</p>
                  <ol className="billing" style={{marginTop:12}}>
                    {DS.map((d,i)=>{const tier=i===0?"t1":i<3?"t2":i<6?"t3":i<10?"t4":"t5";return(
                      <li key={d.n} className={tier}>
                        <span className="rk">{d.p}</span>
                        <span className="nm"><em style={{background:TC[d.t]||"var(--ink-4)"}}/>{d.n.split(" ").pop()}{i===0&&clinch&&<b className="champ">{season} champion</b>}{tier!=="t5"&&<small>{d.t}</small>}</span>
                        <span className="pt">{d.pts}{d.d!=="—"&&<small>{d.d}</small>}</span>
                      </li>);})}
                  </ol>
                </div>
              </div>
              );
            })()}
            
            {(()=>{
              const lastRaceFull=races.filter(r=>!r.sprint).slice(-1)[0];
              if(!lastRaceFull||!lastRaceFull.pod||lastRaceFull.pod.length<3)return null;
              const fullName=(lastName)=>DS.find(d=>d.n.split(" ").pop()===lastName)?.n||lastName;
              const fl=lastRaceFull.fl;
              return(
                <div>
                  <div className="rule-h"/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:16,flexWrap:"wrap",marginBottom:12}}>
                    <div>
                      <h2 className="sheet-h">Classification · {lastRaceFull.nm}</h2>
                      <p className="sheet-sub">Top three{fl?.driver?` · fastest lap ${fl.driver} (${fl.team}) ${fl.time||""}`:""}</p>
                    </div>
                    <a href={tabHref("Race Results",{r:lastRaceFull.r})} onClick={e=>{e.preventDefault();setSelRace(lastRaceFull.r);setTab("Race Results");}} className="head" style={{fontSize:13,color:"var(--red-ink)",fontWeight:700}}>Full classification →</a>
                  </div>
                  <div className="podium">
                    {lastRaceFull.pod.map((p,idx)=>(
                      <div key={idx}>
                        <div className="pos">{idx+1}</div>
                        <DH name={fullName(p.d)} size={44} headshots={headshots}/>
                        <div className="who">
                          <b style={{color:TCT[p.t]||"var(--ink)"}}>{fullName(p.d)}</b>
                          <span>{p.t}</span>
                          <span className="gap">{p.g}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
                        <div className="rule-h"/>
            <div className="g2">
              {/* Constructors (none before round 1) */}
              {CS.length>0?<div style={{display:"flex",flexDirection:"column"}}>
                <h2 className="sheet-h" style={{fontSize:20}}>Constructors' championship</h2>
                <p className="sheet-sub" style={{marginBottom:12}}>After round {completedRounds} · bars scaled to the leading driver</p>
                {CS.map((c,i)=>(
                  <div key={c.t} style={{padding:"9px 12px",borderRadius:2,marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",marginBottom:4}}>
                      <div style={{width:24,fontSize:14,fontWeight:700,color:i<3?"var(--fg)":"var(--w40)"}}>{c.p}</div>
                      <TL team={c.t} size={22}/>
                      <div style={{width:3,height:22,borderRadius:2,background:TC[c.t],margin:"0 8px",opacity:.8}}/>
                      <div style={{flex:1,fontSize:13,fontWeight:600}}>{c.t}</div>
                      <div style={{fontSize:16,fontWeight:700,width:36,textAlign:"right"}}>{c.pts}</div>
                    </div>
                    <div style={{marginLeft:35,display:"flex",flexDirection:"column",gap:3}}>
                      {c.dr.map((d,di)=>(
                        <div key={di} style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:60,fontSize:10,color:"var(--w45)",textAlign:"right"}}>{d.n}</div>
                          <div style={{flex:1,height:4,background:"var(--w04)",borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${d.pts>0?Math.max((d.pts/maxDriverPts)*100,2):0}%`,background:TC[c.t],borderRadius:2,opacity:di===0?1:0.55}}/>
                          </div>
                          <div style={{width:20,fontSize:10,fontWeight:600,color:"var(--w50)",textAlign:"right"}}>{d.pts}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>:<div/>}
            {nextRace&&(
            <div>
              <h2 className="sheet-h" style={{fontSize:30}}>Next race · {nextRace.nm}</h2>
              <p className="sheet-sub">Round {nextRace.r} · {countdown(nextRace.dt,nextRace.tt)} · {nextRace.ci} · {dateFmt(nextRace.dt,nextRace.tt)}{nextRace.tt?` · lights out ${timeFmt(nextRace.dt,nextRace.tt)}${hydrated?" your time":""}`:""}{nextRace.sp?" · sprint weekend":""}</p>
              <div style={{borderTop:"1px solid var(--rule)",marginTop:12,paddingTop:16}}>
                {tracks&&tracks[nextRace.nm]&&(
                  <div style={{display:"flex",justifyContent:"center",padding:"6px 0 8px"}}>
                    <TrackMap raceName={nextRace.nm} tracks={tracks} stroke="var(--ink)" strokeWidth={2.2} opacity={1} height={220} width={320}/>
                  </div>
                )}
                <a href={tabHref("Schedule")} onClick={e=>{e.preventDefault();setTab("Schedule");}} className="head" style={{display:"inline-block",marginTop:14,fontSize:13,color:"var(--red-ink)",fontWeight:700}}>Full calendar →</a>
              </div>
            </div>
            )}
            {!nextRace&&seasonDone&&(
            <div>
              <h2 className="sheet-h" style={{fontSize:30}}>Season complete</h2>
              <p className="sheet-sub">{season} · {totalRounds} rounds{DS[0]?` · ${DS[0].n} champion on ${DS[0].pts} pts`:""}{CS[0]?` · ${CS[0].t} take the constructors' title`:""}</p>
              <div style={{borderTop:"1px solid var(--rule)",marginTop:12,paddingTop:16}}>
                <a href={tabHref("Schedule")} onClick={e=>{e.preventDefault();setTab("Schedule");}} className="head" style={{display:"inline-block",fontSize:13,color:"var(--red-ink)",fontWeight:700}}>The full season →</a>
              </div>
            </div>
            )}
            </div>
            {/* Driver Reactions */}
            {quotes&&quotes.rounds&&quotes.rounds.length>0&&(()=>{
              // Latest round with race quotes — a round can exist with only qualifying
              // quotes (Saturday) or none yet, and the block must not vanish then.
              const lastRound=[...quotes.rounds].reverse().find(r=>(r.sessions?.race?.quotes||[]).length>0);
              if(!lastRound)return null;
              const showQuotes=lastRound.sessions.race.quotes.slice(0,3);
              // Quotes need a manual transcript step (YouTube blocks CI) — say so when they lag the results
              const latestGP=races.filter(r=>!r.sprint).slice(-1)[0];
              const quoteLag=!!latestGP&&lastRound.round<latestGP.r;
              return(
                <div style={{borderTop:"1px solid var(--rule)",paddingTop:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div>
                      <h2 className="sheet-h">Driver reactions</h2>
                      <p className="sheet-sub">{lastRound.raceName}{quoteLag?` · later rounds (through the ${latestGP.nm}) not yet transcribed`:""}</p>
                    </div>
                    <a href={tabHref("Quotes")} onClick={e=>{e.preventDefault();setTab("Quotes");}} className="head" style={{fontSize:13,color:"var(--red-ink)",fontWeight:700}}>All quotes →</a>
                  </div>
                  <div className="entries">
                    {showQuotes.map((q,i)=>(
                      <div key={i} className="entry">
                        <DH name={q.driver} size={40} headshots={headshots}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="head" style={{fontSize:17,fontWeight:700,lineHeight:1,display:"flex",alignItems:"baseline",gap:8}}>{q.driver.split(" ").pop()}<span className="num" style={{fontSize:11,fontWeight:400,textTransform:"none",letterSpacing:0,color:TCT[q.team]||"var(--ink-3)"}}>{q.team}</span></div>
                          <p style={{margin:"6px 0 0",fontSize:13.5,lineHeight:1.5,color:"var(--ink)"}}>“{q.quote.length>160?q.quote.slice(0,160)+"…":q.quote}”</p>
                          {q.context&&<div className="num" style={{fontSize:11,color:"var(--ink-3)",marginTop:5}}>{q.context}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}/>}

        {/* ═══ STANDINGS ═══ */}
        {tab==="Standings"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            {/* Title fight — maths, projection and what-if */}
            <TitleFight DS={DS} sched={sched} races={races} CS={CS} clinch={clinch} season={season}/>
            {/* Points Progression Chart */}
            {progression&&progression.labels.length>=3&&(()=>{
              const W=800,H=240,padL=44,padR=24,padT=20,padB=32;
              const plotW=W-padL-padR,plotH=H-padT-padB;
              const n=progression.labels.length;
              // Y-max from ALL series, not just visible ones — keeps the chart from
              // jumping around when toggling drivers off.
              const maxY=Math.max(10,...progression.series.flatMap(s=>s.points));
              const xOf=i=>padL+(i/(n-1))*plotW;
              const yOf=v=>padT+plotH-(v/maxY)*plotH;
              const yTicks=[0,Math.round(maxY*0.25),Math.round(maxY*0.5),Math.round(maxY*0.75),Math.round(maxY)];
              const isVisible=(name)=>!progHidden.has(name);
              const onMove=(e)=>{
                const rect=e.currentTarget.getBoundingClientRect();
                const xPx=e.clientX-rect.left;
                const xView=(xPx/rect.width)*W;
                let i=Math.round(((xView-padL)/plotW)*(n-1));
                i=Math.max(0,Math.min(n-1,i));
                setProgHover(i);
              };
              const toggle=(name)=>{
                setProgHidden(prev=>{
                  const next=new Set(prev);
                  if(next.has(name))next.delete(name); else next.add(name);
                  return next;
                });
              };
              const hoverIdx=progHover;
              const standingsNow=hoverIdx!==null?progression.standings[hoverIdx]:null;
              return(
                <div style={{position:"relative",background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Points Progression</div>
                  <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>Top 6 drivers · cumulative points by round · hover for details, click legend to filter{progression.labels.some(l=>l.endsWith(" S"))&&" · S = sprint weekend (sprint points included in that round's jump)"}</div>
                  <div style={{position:"relative"}}>
                    <svg role="img" aria-label="Points progression: cumulative points by round for the top six drivers" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:240,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setProgHover(null)}>
                      {/* Y gridlines + labels */}
                      {yTicks.map(t=>(
                        <g key={t}>
                          <line x1={padL} x2={W-padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--w06)" strokeWidth={1}/>
                          <text x={padL-8} y={yOf(t)+4} textAnchor="end" fill="var(--w40)" fontSize="10" fontFamily="var(--font-ui)">{t}</text>
                        </g>
                      ))}
                      {/* X labels */}
                      {progression.labels.map((label,i)=>(
                        <text key={i} x={xOf(i)} y={H-padB+18} textAnchor="middle" fill={hoverIdx===i?"var(--fg)":"var(--w45)"} fontWeight={hoverIdx===i?600:400} fontSize="10" fontFamily="var(--font-ui)">{label}</text>
                      ))}
                      {/* Hover vertical line */}
                      {hoverIdx!==null&&hoverIdx>0&&(
                        <line x1={xOf(hoverIdx)} x2={xOf(hoverIdx)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>
                      )}
                      {/* Lines */}
                      {(()=>{const seenTeam={};return progression.series.map(s=>{
                        const visible=isVisible(s.name);
                        const color=TC[s.team]||"var(--fg)";
                        const isSecond=!!seenTeam[s.team];
                        seenTeam[s.team]=true;
                        if(!visible)return null;
                        const path=s.points.map((v,i)=>`${i===0?"M":"L"}${xOf(i)},${yOf(v)}`).join(" ");
                        return(
                          <g key={s.name} pointerEvents="none">
                            <path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isSecond?"5 4":"none"} opacity={isSecond?0.85:1}/>
                            {s.points.map((v,i)=>i>0&&(
                              <circle key={i} cx={xOf(i)} cy={yOf(v)} r={hoverIdx===i?5:3.5} fill={isSecond?"var(--bench)":color} stroke={color} strokeWidth={1.5}/>
                            ))}
                          </g>
                        );
                      })})()}
                    </svg>
                    {/* Tooltip */}
                    {hoverIdx!==null&&hoverIdx>0&&standingsNow&&(()=>{
                      const visibleSeries=progression.series.filter(s=>isVisible(s.name));
                      if(visibleSeries.length===0)return null;
                      const rows=visibleSeries
                        .map(s=>{
                          const entry=standingsNow.find(x=>x.name===s.name);
                          return entry?{name:s.name,team:s.team,pts:entry.pts,pos:entry.pos}:null;
                        })
                        .filter(Boolean)
                        .sort((a,b)=>a.pos-b.pos);
                      const leftPct=(xOf(hoverIdx)/W)*100;
                      const placeRight=leftPct<60;
                      return(
                        <div style={{position:"absolute",top:8,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:200,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:2}}>{progression.labels[hoverIdx]}</div>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>{progression.raceNames[hoverIdx]}</div>
                          {rows.map(r=>(
                            <div key={r.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:11}}>
                              <div style={{width:18,color:"var(--w45)",fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>P{r.pos}</div>
                              <div style={{width:3,height:11,background:TC[r.team]||"var(--fg)",borderRadius:1,opacity:0.85}}/>
                              <div style={{flex:1,color:"var(--fg)",fontWeight:500}}>{r.name.split(" ").pop()}</div>
                              <div style={{color:"var(--w85)",fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{r.pts}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Legend — click to toggle visibility */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:14,marginTop:12,justifyContent:"center"}}>
                    {(()=>{const seenTeam={};return progression.series.map(s=>{
                      const isSecond=!!seenTeam[s.team];
                      seenTeam[s.team]=true;
                      const color=TC[s.team]||"var(--fg)";
                      const visible=isVisible(s.name);
                      return(
                        <button className="chip" key={s.name} onClick={()=>toggle(s.name)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,background:"none",border:"none",color:"inherit",cursor:"pointer",padding:"3px 6px",borderRadius:2,opacity:visible?1:0.35,transition:"opacity 0.2s",fontFamily:"var(--font-ui)"}}>
                          {isSecond?(
                            <svg aria-hidden="true" width={16} height={4} style={{display:"block"}}><line x1={0} y1={2} x2={16} y2={2} stroke={color} strokeWidth={2.5} strokeDasharray="4 3"/></svg>
                          ):(
                            <div style={{width:14,height:2.5,background:color,borderRadius:1}}/>
                          )}
                          <span style={{color:"var(--w75)",fontWeight:500,textDecoration:visible?"none":"line-through"}}>{s.name.split(" ").pop()}</span>
                        </button>
                      );
                    })})()}
                  </div>
                </div>
              );
            })()}
            <div className="g2">
              <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Drivers' World Championship</div>
                <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>{"After Round " + completedRounds}</div>
                {(()=>{const maxPts=Math.max(1,...DS.map(d=>d.pts||0));return DS.map((d,i)=>(
                  <div key={d.n} className="dr" style={{background:i<3?TB[d.t]:"transparent",marginBottom:1}}>
                    <div style={{width:24,fontSize:13,fontWeight:700,color:i<3?"var(--fg)":"var(--w35)"}}>{d.p}</div>
                    <DH name={d.n} size={28} headshots={headshots}/>
                    <div style={{width:3,height:20,borderRadius:2,background:TC[d.t],margin:"0 8px",opacity:.8}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.n}</div>
                      <div style={{fontSize:10,color:"var(--w35)",marginTop:1}}>{d.t}</div>
                    </div>
                    <div className="num" style={{width:36,textAlign:"center",fontSize:11,color:"var(--ink-2)",fontWeight:700}} title={d.wins>0?`${d.wins} win${d.wins>1?"s":""}`:""}>{d.wins>0?`${d.wins}W`:""}</div>
                    <div className={d.mv!==0?"pulse-once":""} style={{width:40,textAlign:"center",fontSize:11,fontWeight:600,color:d.mv>0?"var(--green)":d.mv<0?"var(--red)":"var(--w15)",display:"inline-block"}}>{d.mv>0?`▲${d.mv}`:d.mv<0?`▼${Math.abs(d.mv)}`:"—"}</div>
                    <div style={{width:40,textAlign:"center",fontSize:11,fontWeight:600,color:d.d!=="—"?"var(--green)":"var(--w20)"}}>{d.d}</div>
                    <div style={{width:55,marginRight:8,overflow:"hidden"}}><div style={{height:4,width:`${d.pts>0?Math.max((d.pts/maxPts)*100,3):0}%`,background:TC[d.t],borderRadius:2,transformOrigin:"left",animation:"barGrow 1.1s cubic-bezier(0.22,1,0.36,1) both",animationDelay:`${600+i*40}ms`}}/></div>
                    <div style={{fontSize:14,fontWeight:700,width:32,textAlign:"right"}}>{d.pts}</div>
                  </div>
                ))})()}
              </div>
              <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Constructors' World Championship</div>
                <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>{"After Round " + completedRounds}</div>
                {(()=>{const maxDriverPts=Math.max(1,...CS.flatMap(c=>(c.dr||[]).map(d=>d.pts||0)));return CS.map((c,i)=>(
                  <div key={c.t} style={{position:"relative",padding:"14px 16px",borderRadius:2,marginBottom:4,background:i<3?TB[c.t]:"transparent",border:i<3?`1px solid ${TC[c.t]}22`:"1px solid transparent",overflow:"hidden"}}>
                    {i<3&&(
                      <div style={{position:"absolute",right:-10,top:-18,opacity:0.10,pointerEvents:"none"}}>
                        <TL team={c.t} size={120}/>
                      </div>
                    )}
                    <div style={{position:"relative",display:"flex",alignItems:"center",marginBottom:8}}>
                      <div style={{width:24,fontSize:16,fontWeight:800,color:i<3?TC[c.t]:"var(--w30)"}}>{c.p}</div>
                      <TL team={c.t} size={26}/>
                      <div style={{flex:1,marginLeft:10}}><span style={{fontSize:15,fontWeight:700}}>{c.t}</span></div>
                      <div className={c.mv!==0?"pulse-once":""} style={{width:40,textAlign:"center",fontSize:11,fontWeight:600,color:c.mv>0?"var(--green)":c.mv<0?"var(--red)":"var(--w15)",display:"inline-block"}}>{c.mv>0?`▲${c.mv}`:c.mv<0?`▼${Math.abs(c.mv)}`:"—"}</div>
                      <div style={{fontSize:20,fontWeight:800}}>{c.pts}<span style={{fontSize:11,fontWeight:400,color:"var(--w40)",marginLeft:4}}>PTS</span></div>
                    </div>
                    <div style={{position:"relative",marginLeft:24}}>
                      {c.dr.map((d,di)=>(
                        <div key={di} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <div style={{width:70,fontSize:11,color:"var(--w50)",textAlign:"right"}}>{d.n}</div>
                          <div style={{flex:1,height:4,background:"var(--w04)",borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${d.pts>0?Math.max((d.pts/maxDriverPts)*100,2):0}%`,background:TC[c.t],borderRadius:2,opacity:di===0?1:0.55,transformOrigin:"left",animation:"barGrow 1.1s cubic-bezier(0.22,1,0.36,1) both",animationDelay:`${700+i*60+di*40}ms`}}/>
                          </div>
                          <div style={{width:24,fontSize:11,fontWeight:600,color:"var(--w60)",textAlign:"right"}}>{d.pts}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))})()}
              </div>
            </div>
            <PositionHeatmap races={races} DS={DS}/>
            <QualiGapTrend qualifying={qualifying}/>
            {/* Narrative */}
            {narrative&&narrative.length>0&&(
            <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
              <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",marginBottom:16}}>Season Narrative</div>
              <div className="g4">
                {narrative.map((n,i)=>(
                  <div key={i} style={{position:"relative",padding:16,background:TB[n.t],borderRadius:2,border:`1px solid ${TC[n.t]}20`,overflow:"hidden"}}>
                    <div style={{position:"absolute",right:-14,bottom:-14,opacity:0.10,pointerEvents:"none",transform:"scale(1.1)"}}>
                      <TL team={n.t} size={130}/>
                    </div>
                    <div style={{position:"relative",display:"flex",alignItems:"center",gap:6,marginBottom:8}}><TL team={n.t} size={18}/><span style={{fontSize:11,color:"var(--w40)",textTransform:"uppercase",letterSpacing:1}}>{n.ti}</span></div>
                    <div style={{position:"relative",fontSize:16,fontWeight:700,color:TC[n.t]}}>{n.t}</div>
                    <div style={{position:"relative",fontSize:12,color:"var(--w50)",marginTop:4,lineHeight:1.4}}>{n.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}/>}

        {/* ═══ RACE RESULTS ═══ */}
        {tab==="Race Results"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            {/* Race Selector Dropdown */}
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",flexShrink:0}}>Race</div>
              <div style={{position:"relative",flex:1,maxWidth:360}}>
                <select aria-label="Race" value={selRace} onChange={e=>{const v=e.target.value;setSelRace(v==="all"?"all":v.includes("S")?v:parseInt(v));}} style={{width:"100%",appearance:"none",WebkitAppearance:"none",MozAppearance:"none",background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"10px 40px 10px 14px",color:"var(--fg)",fontSize:13,fontWeight:500,fontFamily:"var(--font-ui)",cursor:"pointer",outline:"none",transition:"border-color .2s"}}>
                  <option value="all" style={{background:"var(--sheet)",color:"var(--fg)"}}>All Races & Sprints</option>
                  {races.map(race=>(
                    <option key={race.r} value={race.r} style={{background:"var(--sheet)",color:"var(--fg)"}}>{race.sprint?"SPRINT · ":"RACE · "}R{typeof race.r==="string"?race.r.replace("S",""):race.r} — {race.nm}</option>
                  ))}
                </select>
                <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"var(--w40)",fontSize:11}}>▾</div>
              </div>
            </div>
            {races.filter(race=>selRace==="all"||selRace===race.r).map(race=>(
              <div key={race.r} className="rc">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:20}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <span style={{background:"var(--red)",color:"var(--fg)",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:2}}>R{race.r}</span>
                      {race.sprint&&<span style={{fontSize:9,fontWeight:700,letterSpacing:.5,padding:"2px 6px",borderRadius:2,background:"rgba(214,40,40,0.15)",color:"var(--red-ink)"}}>SPRINT</span>}
                      <span style={{fontSize:20,fontWeight:700}}>{race.nm}</span>
                    </div>
                    <div style={{fontSize:12,color:"var(--w40)"}}>{race.ci} · {dateFmt(race.dt,race.tt)}, {season}</div>
                  </div>
                  {race.tm&&<div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:"var(--w40)"}}>Race Time</div>
                    <div style={{fontSize:16,fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{race.tm}</div>
                  </div>}
                </div>
                <div className="pod" style={{marginBottom:16}}>
                  {race.pod.map(p=>(
                    <div key={p.p} style={{flex:1,background:p.p===1?"rgba(154,123,31,0.08)":"var(--w03)",border:`1px solid ${p.p===1?"rgba(154,123,31,0.2)":"var(--w06)"}`,borderRadius:2,padding:"14px 14px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:22,fontWeight:900,color:p.p===1?"var(--gold)":p.p===2?"#C0C0C0":"#CD7F32",lineHeight:1}}>P{p.p}</div>
                      <TL team={p.t} size={34}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:3,height:16,borderRadius:2,background:TC[p.t]}}/>
                          <span style={{fontSize:14,fontWeight:600}}>{p.d}</span>
                        </div>
                        <div style={{fontSize:11,color:"var(--w40)",marginTop:2,marginLeft:9}}>{p.g}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
                  {race.fl&&race.fl.driver&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"rgba(128,0,128,0.1)",borderRadius:2,border:"1px solid rgba(128,0,128,0.2)"}}>
                    <span className="head" style={{fontSize:11,color:"var(--red-ink)",fontWeight:700}}>Fastest lap</span>
                    <span style={{fontSize:13,fontWeight:600}}>{race.fl.driver}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"var(--purple)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{race.fl.time}</span>
                  </div>
                  )}
                  <button onClick={()=>setExpandedRace(expandedRace===race.r?null:race.r)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"var(--w04)",borderRadius:2,border:"1px solid var(--w08)",color:"var(--w60)",fontSize:12,fontWeight:500,fontFamily:"var(--font-ui)",transition:"all 0.2s"}}>
                    {expandedRace===race.r?"Hide":"View"} Full Classification
                    <span style={{transform:expandedRace===race.r?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s",display:"inline-block"}}>▾</span>
                  </button>
                </div>
                {/* ── OpenF1 Sector Enrichment ── */}
                {(()=>{
                  if(!openf1||!openf1.meetings||openf1.meetings.length===0)return null;
                  // The meeting for this round (stamped round, else the race date)
                  const rn=typeof race.r==="string"?parseInt(race.r):race.r;
                  let mtg=meetingForRace(openf1.meetings,sched.find(x=>x.r===rn));
                  // Name fallbacks for payloads without the stamp. No round-index guess:
                  // a missing meeting shifted every later round onto the wrong race.
                  const baseName=race.nm.replace(/ Sprint$/,"").trim();
                  const baseKey=baseName.replace(/ Grand Prix$/i,"").toLowerCase().trim();
                  if(!mtg)mtg=openf1.meetings.find(m=>m.meetingName===baseName);
                  if(!mtg)mtg=openf1.meetings.find(m=>m.meetingName.replace(/ Grand Prix$/i,"").toLowerCase().trim()===baseKey);
                  if(!mtg)return null;
                  const targetSession=race.sprint?"Sprint":"Race";
                  // Preferred fallback order: target session → Qualifying → Sprint Qualifying → Sprint → Practice 3 → Practice 2 → Practice 1
                  const sessPriority=race.sprint
                    ?["Sprint","Sprint Qualifying","Qualifying","Practice 3","Practice 2","Practice 1"]
                    :["Race","Qualifying","Sprint Qualifying","Sprint","Practice 3","Practice 2","Practice 1"];
                  let sess=null;
                  for(const sn of sessPriority){const s=mtg.sessions.find(s=>s.sessionName===sn&&s.drivers&&s.drivers.length>0);if(s){sess=s;break;}}
                  if(!sess)return null;
                  const isExact=sess.sessionName===targetSession;
                  const sessLabel=isExact?(race.sprint?"Sprint Sector Times":"Race Sector Times"):`${sess.sessionName} Sector Times`;
                  return <SectorEnrichment sess={sess} isExact={isExact} sessLabel={sessLabel} targetSession={targetSession}/>;
                })()}
                {expandedRace===race.r&&(()=>{
                  // Starting grid from the classification itself (after penalties, 0 = pit
                  // lane). Older builds lack it — the GP then falls back to qualifying order.
                  const hasGrid=race.full.some(r=>r.grid!=null);
                  const quali=!hasGrid&&!race.sprint?qualifying.find(q=>q.round===(typeof race.r==="string"?parseInt(race.r):race.r)):null;
                  const showGrid=hasGrid||!!quali;
                  // OpenF1 extras for a Grand Prix: places gained on lap 1, filtered on-track passes
                  const rmtg=!race.sprint&&openf1?meetingForRace(openf1.meetings,sched.find(x=>x.r===race.r)):null;
                  const rsess=rmtg?.sessions?.find(x=>x.sessionName==="Race"&&x.drivers);
                  const outNums=new Set(race.full.filter(x=>typeof x.p!=="number"&&x.num!=null).map(x=>String(x.num)));
                  const lap1=rsess&&hasGrid?lapOneGains(rsess,race.full):null;
                  const passes=rsess?.overtakes?onTrackPasses(rsess,outNums).byDriver:null;
                  const heads=[...(showGrid?["Pos","","Driver","Team","Grid","+/−"]:["Pos","","Driver","Team"]),...(lap1?["Lap 1"]:[]),...(passes?["Passes"]:[]),"Gap to Winner"];
                  return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,overflow:"hidden",marginTop:4}}>
                    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:13}}>
                      <thead><tr style={{borderBottom:"1px solid var(--w08)"}}>
                        {heads.map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:500}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {race.full.map((r,i)=>{
                          const isFinisher=typeof r.p==="number";
                          const isDNF=r.p==="DNF";
                          const isDNS=r.p==="DNS";
                          const gridRaw=hasGrid?r.grid:quali?.results.find(x=>x.d===r.d)?.pos;
                          const pitLane=hasGrid&&gridRaw===0;
                          const grid=pitLane?race.full.length:gridRaw; // pit-lane starts count from the back
                          const gain=grid&&isFinisher?grid-r.p:null;
                          return(
                            <tr key={i} style={{borderBottom:"1px solid var(--w03)",opacity:isFinisher?1:0.5}}>
                              <td style={{padding:"7px 10px",fontWeight:700,width:36,color:isFinisher&&r.p<=3?(r.p===1?"var(--gold)":r.p===2?"#C0C0C0":"#CD7F32"):"var(--w50)",fontSize:12}}>{r.p}</td>
                              <td style={{padding:"7px 4px",width:28}}><TL team={r.t} size={20}/></td>
                              <td style={{padding:"7px 10px",fontWeight:600}}>{r.d}</td>
                              <td style={{padding:"7px 10px",color:"var(--w40)",fontSize:12}}>{r.t}</td>
                              {showGrid&&<td style={{padding:"7px 10px",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:"var(--w45)",fontSize:12}}>{pitLane?"Pit lane":grid?`P${grid}`:"—"}</td>}
                              {showGrid&&<td style={{padding:"7px 10px",fontSize:11,fontWeight:600,color:gain>0?"var(--green)":gain<0?"var(--red)":"var(--w25)"}}>{gain==null?"":gain>0?`▲${gain}`:gain<0?`▼${-gain}`:"—"}</td>}
                              {lap1&&(()=>{const g=lap1[r.num];return <td className="num" style={{padding:"7px 10px",fontSize:11,fontWeight:600,color:g>0?"var(--green)":g<0?"var(--red-ink)":"var(--w25)"}}>{g==null?"":g>0?`+${g}`:g<0?`−${-g}`:"0"}</td>;})()}
                              {passes&&(()=>{const p=passes[r.num]||{made:0,lost:0};return <td className="num" style={{padding:"7px 10px",fontSize:11,color:"var(--w60)",whiteSpace:"nowrap"}} title={`${p.made} made · ${p.lost} lost`}><b style={{color:"var(--fg)"}}>{p.made}</b> / {p.lost}</td>;})()}
                              <td style={{padding:"7px 10px",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:r.g==="WINNER"?"var(--green)":isDNF?"var(--red)":isDNS?"var(--w30)":"var(--w60)",fontSize:12,fontWeight:r.g==="WINNER"?600:400}}>{r.g}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table></div>
                    {(lap1||passes)&&<div style={{padding:"8px 12px 12px",fontSize:11,color:"var(--w50)"}}>{lap1&&"Lap 1 · places gained from the grid by the end of the opening lap. "}{passes&&"Passes · on-track passes made / lost, from OpenF1 — pit cycles, lapping and safety-car swaps left out."}</div>}
                  </div>
                  );})()}
              </div>
            ))}
            <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
              <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",marginBottom:16}}>{season} Season Key Facts</div>
              <div className="g3">
                {[...(clinch&&DS[0]?[{l:`${season} Champion`,v:(()=>{const a=championAge(DS[0],clinch,races);return `${DS[0].n} — clinched at R${clinch.round} ${clinch.name.replace(" Grand Prix","")}${a?`, aged ${a.label}${a.youngest?" (youngest ever)":""}`:""}`;})()}]:[]),{l:"New Regulations",v:"Active aero, 50/50 ICE/ERS split, new chassis"},{l:"New Teams",v:"Cadillac (11th team), Audi (ex-Sauber)"},{l:"New Engine Suppliers",v:"Audi, Honda (Aston Martin), Ford (Red Bull)"},{l:"Calendar",v:`${totalRounds} rounds · Bahrain moved to Sepang, Saudi Arabia postponed`},{l:"Defending Champions",v:"Norris (WDC) · McLaren (WCC)"},{l:"Youngest Pole",v:"Antonelli — 19y 201d (China)"}].map((f,i)=>(
                  <div key={i} style={{padding:14,background:"var(--w02)",borderRadius:2}}>
                    <div style={{fontSize:11,color:"var(--w40)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{f.l}</div>
                    <div style={{fontSize:13,color:"var(--w75)",lineHeight:1.4}}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}/>}

        {/* ═══ SECTOR TIMES ═══ */}
        {tab==="Sector Times"&&<TabBody render={()=>{
          if(!openf1)return openf1Status==="failed"
            ?<SheetStatus title="The sector sheet didn't load" detail="OpenF1 data is fetched separately from the results." onRetry={loadOpenf1Index}/>
            :openf1Status==="empty"
              ?<SheetStatus title="No sessions on the sheet yet" detail="Sector times appear once the first practice session of the season has run."/>
              :<SheetStatus title="Loading sector data…"/>;
          const curMtg=openf1.meetings.find(m=>m.meetingKey===selMeeting)||openf1.meetings[openf1.meetings.length-1];
          // Full meeting payload still streaming in (lazy-loaded per meeting). The
          // picker stays up so a meeting that failed to load never traps the page.
          if(!curMtg.sessions.some(s=>s.drivers))return(
            <div className="fu">
              <label style={{display:"flex",alignItems:"center",gap:12,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--ink-3)"}}>Meeting
                <select aria-label="Meeting" value={String(curMtg.meetingKey)} onChange={e=>{const m=openf1.meetings.find(x=>String(x.meetingKey)===e.target.value);if(m){setSelMeeting(m.meetingKey);setSelSession(null);}}} style={{background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"6px 12px",color:"var(--fg)",fontSize:12,fontFamily:"var(--font-ui)"}}>
                  {openf1.meetings.map(m=><option key={m.meetingKey} value={String(m.meetingKey)}>{meetingTrackName(m).replace(" Grand Prix","")}</option>)}
                </select>
              </label>
              {meetingFailed[curMtg.meetingKey]
                ?<SheetStatus title={`${meetingTrackName(curMtg)} didn't load`} detail="The meeting file failed to download." onRetry={()=>retryMeeting(curMtg.meetingKey)}/>
                :<SheetStatus title="Loading sector data…" detail={meetingTrackName(curMtg)}/>}
            </div>
          );
          const curSess=curMtg.sessions.find(s=>s.sessionKey===selSession)||(curMtg.sessions.find(s=>s.sessionName==="Race"))||curMtg.sessions[0];
          const drivers=curSess?.drivers||[];
          const sb=curSess?.sessionBests||{};
          const fmtS=(v)=>v?v.toFixed(3):"—";
          const fmtLap=(v)=>{if(!v)return"—";const m=Math.floor(v/60);const s=(v%60).toFixed(3);return`${m}:${s.padStart(6,"0")}`;};
          return(
            <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
              {/* Meeting + Session Selectors */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)"}}>Meeting</div>
                <select aria-label="Meeting" value={String(curMtg.meetingKey)} onChange={e=>{const m=openf1.meetings.find(x=>String(x.meetingKey)===e.target.value);if(!m)return;setSelMeeting(m.meetingKey);const rs=m.sessions.find(s=>s.sessionName==="Race")||m.sessions[m.sessions.length-1];if(rs)setSelSession(rs.sessionKey);}} style={{appearance:"none",WebkitAppearance:"none",MozAppearance:"none",background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"8px 36px 8px 12px",color:"var(--fg)",fontSize:12,fontWeight:500,fontFamily:"var(--font-ui)",cursor:"pointer",outline:"none",minWidth:200,transition:"border-color .2s"}}>
                  {openf1.meetings.map(m=>(
                    <option key={m.meetingKey} value={String(m.meetingKey)} style={{background:"var(--sheet)",color:"var(--fg)"}}>{meetingTrackName(m).replace(" Grand Prix","")}</option>
                  ))}
                </select>
                <div style={{height:20,width:1,background:"var(--w10)",margin:"0 4px"}}/>
                <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)"}}>Session</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {curMtg.sessions.map(s=>(
                    <button key={s.sessionKey} onClick={()=>setSelSession(s.sessionKey)} style={{cursor:"pointer",padding:"5px 12px",borderRadius:2,border:selSession===s.sessionKey?"1px solid rgba(27,127,75,0.4)":"1px solid var(--w06)",background:selSession===s.sessionKey?"rgba(27,127,75,0.1)":"var(--w02)",color:selSession===s.sessionKey?"var(--green)":"var(--w40)",fontSize:11,fontWeight:selSession===s.sessionKey?600:400,fontFamily:"var(--font-ui)",transition:"all .2s"}}>{s.sessionName}</button>
                  ))}
                </div>
              </div>

              {/* Sector Track Overlay */}
              {(()=>{
                const track=tracks?.[meetingTrackName(curMtg)];
                const sectors=track?splitTrackIntoSectors(track):null;
                if(!sectors)return null;
                const findSecDriver=(key,best)=>drivers.find(d=>d[key]&&best&&Math.abs(d[key]-best)<0.001);
                const sDrivers=[
                  findSecDriver("bestS1",sb.fastestS1),
                  findSecDriver("bestS2",sb.fastestS2),
                  findSecDriver("bestS3",sb.fastestS3),
                ];
                const sColors=sDrivers.map(d=>d?.teamColour||"var(--w40)");
                const paths=[sectors.s1,sectors.s2,sectors.s3];
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:15,fontWeight:700}}>Sector Map</div>
                      <div style={{fontSize:11,color:"var(--w40)"}}>{meetingTrackName(curMtg)} · {curSess.sessionName}</div>
                    </div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>Each third of the lap coloured by the team that set the fastest sector time</div>
                    <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 320px",minWidth:280,height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg role="img" aria-label="Circuit map coloured by the team that set the fastest time in each third of the lap" viewBox={sectors.viewBox} preserveAspectRatio="xMidYMid meet" style={{display:"block",width:"100%",height:200,overflow:"visible"}}>
                          {/* Underlay base track for continuity */}
                          <path d={track.path} fill="none" stroke="var(--w06)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
                          {/* Sector segments */}
                          {paths.map((p,i)=>(
                            <path key={i} d={p} fill="none" stroke={sColors[i]} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.95}/>
                          ))}
                          {/* Boundary markers */}
                          {sectors.boundaries.map((pt,i)=>(
                            <circle key={i} cx={pt[0]} cy={pt[1]} r={1.8} fill="var(--fg)" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6}/>
                          ))}
                        </svg>
                      </div>
                      <div style={{flex:"0 1 260px",display:"flex",flexDirection:"column",gap:8}}>
                        {[1,2,3].map(idx=>{
                          const i=idx-1;
                          const d=sDrivers[i];
                          const time=[sb.fastestS1,sb.fastestS2,sb.fastestS3][i];
                          return(
                            <div key={idx} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:2,background:"var(--w02)",border:`1px solid ${sColors[i]}30`}}>
                              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,padding:"4px 8px",borderRadius:2,background:`${sColors[i]}22`,color:sColors[i],minWidth:32,textAlign:"center"}}>S{idx}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d?.name||"—"}</div>
                                <div style={{fontSize:10,color:"var(--w40)",marginTop:1}}>{d?normTeam(d.team||""):""}</div>
                              </div>
                              <div style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:sColors[i]}}>{fmtS(time)}s</div>
                            </div>
                          );
                        })}
                        <div style={{fontSize:10,color:"var(--w30)",marginTop:4,fontStyle:"italic"}}>Sectors split by track length, not official timing-line positions</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Summary Cards */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {(()=>{const d1=drivers.find(d=>d.bestS1&&Math.abs(d.bestS1-sb.fastestS1)<0.001);return <SC label="Fastest S1" value={sb.fastestS1?fmtS(sb.fastestS1)+"s":"—"} sub={d1?.acronym||""} accent="var(--purple)" icon={d1?<TL team={normTeam(d1.team)} size={22}/>:null}/>;})()}
                {(()=>{const d2=drivers.find(d=>d.bestS2&&Math.abs(d.bestS2-sb.fastestS2)<0.001);return <SC label="Fastest S2" value={sb.fastestS2?fmtS(sb.fastestS2)+"s":"—"} sub={d2?.acronym||""} accent="var(--purple)" icon={d2?<TL team={normTeam(d2.team)} size={22}/>:null}/>;})()}
                {(()=>{const d3=drivers.find(d=>d.bestS3&&Math.abs(d.bestS3-sb.fastestS3)<0.001);return <SC label="Fastest S3" value={sb.fastestS3?fmtS(sb.fastestS3)+"s":"—"} sub={d3?.acronym||""} accent="var(--purple)" icon={d3?<TL team={normTeam(d3.team)} size={22}/>:null}/>;})()}
                {(()=>{const di=drivers.find(d=>d.maxI1Speed===sb.topI1Speed);return <SC label="Top Speed (I1)" value={`${sb.topI1Speed||"—"} km/h`} sub={di?.acronym||""} accent="#FF8000" icon={di?<TL team={normTeam(di.team)} size={22}/>:null}/>;})()}
                {(()=>{const di=drivers.find(d=>d.maxI2Speed===sb.topI2Speed);return <SC label="Top Speed (I2)" value={`${sb.topI2Speed||"—"} km/h`} sub={di?.acronym||""} accent="#FF8000" icon={di?<TL team={normTeam(di.team)} size={22}/>:null}/>;})()}
                {(()=>{const di=drivers.find(d=>d.maxSTSpeed===sb.topSTSpeed);return <SC label="Top Speed (ST)" value={`${sb.topSTSpeed||"—"} km/h`} sub={di?.acronym||""} accent="#FF8000" icon={di?<TL team={normTeam(di.team)} size={22}/>:null}/>;})()}
              </div>

              {/* Driver Compare — pick 2-4 drivers, see bars per sector with deltas */}
              {(()=>{
                if(drivers.length<2)return null;
                const sessionKey=curSess.sessionKey;
                const userSel=(compareBySession[sessionKey]||[]).filter(a=>drivers.find(d=>d.acronym===a));
                const defaultSel=drivers.slice(0,3).map(d=>d.acronym);
                const selected=userSel.length>0?userSel:defaultSel;
                const toggle=(acr)=>{
                  setCompareBySession(prev=>{
                    const current=(prev[sessionKey]||defaultSel).filter(a=>drivers.find(d=>d.acronym===a));
                    let next;
                    if(current.includes(acr)){
                      if(current.length<=1)return prev; // keep at least one
                      next=current.filter(a=>a!==acr);
                    } else {
                      if(current.length>=4)return prev; // cap at 4
                      next=[...current,acr];
                    }
                    return{...prev,[sessionKey]:next};
                  });
                };
                const selectedDrivers=selected.map(a=>drivers.find(d=>d.acronym===a)).filter(Boolean);
                // For bar scaling — use max time across selected drivers for each sector
                const maxS=[
                  Math.max(...selectedDrivers.map(d=>d.bestS1||0)),
                  Math.max(...selectedDrivers.map(d=>d.bestS2||0)),
                  Math.max(...selectedDrivers.map(d=>d.bestS3||0)),
                ];
                const minS=[
                  Math.min(...selectedDrivers.filter(d=>d.bestS1).map(d=>d.bestS1))||0,
                  Math.min(...selectedDrivers.filter(d=>d.bestS2).map(d=>d.bestS2))||0,
                  Math.min(...selectedDrivers.filter(d=>d.bestS3).map(d=>d.bestS3))||0,
                ];
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:15,fontWeight:700}}>Driver Compare</div>
                      <div style={{fontSize:11,color:"var(--w40)"}}>{selectedDrivers.length} of 4 max selected · Click to toggle</div>
                    </div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>Pick drivers to see their best sectors side-by-side. Bars are rescaled to each sector's spread — fastest at 25%, slowest at 100% — so small gaps stay visible.</div>
                    {/* Driver picker */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
                      {drivers.map(d=>{
                        const on=selected.includes(d.acronym);
                        const tc=inkify(d.teamColour)||"var(--fg)";
                        const atMax=!on&&selected.length>=4;
                        return(
                          <button className="chip" aria-pressed={on} key={d.acronym} disabled={atMax} onClick={()=>toggle(d.acronym)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:2,border:`1px solid ${on?tc:"var(--w08)"}`,background:on?`${alpha(tc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:atMax?"not-allowed":"pointer",fontSize:11,fontWeight:on?700:500,fontFamily:"var(--font-ui)",opacity:atMax?0.35:1,transition:"all .15s"}}>
                            <div style={{width:3,height:11,background:tc,borderRadius:1,opacity:on?1:0.5}}/>
                            <span style={{letterSpacing:0.5}}>{d.acronym}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Compare grid */}
                    <div className="compare-grid-wrap">
                    <div className="compare-grid" style={{display:"grid",gridTemplateColumns:"minmax(110px,140px) repeat(3, 1fr)",gap:"10px 16px",alignItems:"center"}}>
                      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:600}}>Driver</div>
                      {["Sector 1","Sector 2","Sector 3"].map(h=>(
                        <div key={h} style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:600}}>{h}</div>
                      ))}
                      {selectedDrivers.map(d=>{
                        const tc=inkify(d.teamColour)||"var(--fg)";
                        return(
                          <Fragment key={d.acronym}>
                            <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                              <div style={{width:3,height:24,background:tc,borderRadius:1.5,flexShrink:0}}/>
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.acronym}</div>
                                <div style={{fontSize:10,color:"var(--w40)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{normTeam(d.team||"")}</div>
                              </div>
                            </div>
                            {[1,2,3].map(si=>{
                              const time=d[`bestS${si}`];
                              const max=maxS[si-1];
                              const min=minS[si-1];
                              const isFastest=time&&min&&Math.abs(time-min)<0.001;
                              const delta=time&&min?time-min:0;
                              const pct=time&&max?25+75*((time-min)/((max-min)||1)):0;
                              return(
                                <div key={si} style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{flex:1,height:14,background:"var(--w04)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:tc,borderRadius:1,transformOrigin:"left",animation:"barGrow 0.7s cubic-bezier(0.22,1,0.36,1) both"}}/>
                                  </div>
                                  <div style={{minWidth:78,textAlign:"right"}}>
                                    <div style={{fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isFastest?"var(--purple)":"var(--fg)"}}>{time?time.toFixed(3):"—"}</div>
                                    <div style={{fontSize:9,color:isFastest?"var(--purple)":"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",marginTop:1}}>{isFastest?"FASTEST":delta>0?`+${delta.toFixed(3)}`:""}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </div>
                    </div>
                    {/* Theoretical best — sum of best sectors per compared driver, delta to best */}
                    {(()=>{
                      const theo=selectedDrivers.map(d=>({d,tb:d.theoreticalBest||((d.bestS1&&d.bestS2&&d.bestS3)?d.bestS1+d.bestS2+d.bestS3:null)}));
                      const valid=theo.filter(t=>t.tb);
                      if(valid.length===0)return null;
                      const bestTb=Math.min(...valid.map(t=>t.tb));
                      return(
                        <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",marginTop:16,paddingTop:14,borderTop:"1px solid var(--w06)"}}>
                          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:600}}>Theoretical best</div>
                          {theo.map(({d,tb})=>{
                            const isBest=tb&&Math.abs(tb-bestTb)<0.0005;
                            return(
                              <div key={d.acronym} style={{display:"flex",alignItems:"center",gap:7}}>
                                <div style={{width:3,height:14,background:inkify(d.teamColour)||"var(--fg)",borderRadius:1.5}}/>
                                <span style={{fontSize:11,fontWeight:600,color:"var(--w60)"}}>{d.acronym}</span>
                                <span style={{fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isBest?"var(--green)":"var(--fg)"}}>{tb?fmtLap(tb):"—"}</span>
                                {tb&&!isBest&&<span style={{fontSize:10,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:"var(--w50)"}}>+{(tb-bestTb).toFixed(3)}s</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Driver Sector Comparison Table */}
              <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{meetingTrackName(curMtg)} — {curSess.sessionName} Sector Analysis</div>
                <div style={{fontSize:12,color:"var(--w35)",marginBottom:20}}>{drivers.length} drivers · Sorted by theoretical best lap · <span style={{color:"var(--purple)"}}>Purple</span> = session fastest sector</div>
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800,fontSize:13}}>
                  <thead><tr style={{borderBottom:"1px solid var(--w08)"}}>
                    {["#","","Driver","Team","Best S1","Best S2","Best S3","Theo. Best","Best Lap","I1","I2","ST"].map(h=><th key={h} style={{textAlign:["Driver","Team"].includes(h)?"left":"right",padding:"8px 10px",fontSize:10,textTransform:"uppercase",letterSpacing:.8,color:"var(--w30)",fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {drivers.map((d,i)=>{
                      const isFS1=d.bestS1&&sb.fastestS1&&Math.abs(d.bestS1-sb.fastestS1)<0.001;
                      const isFS2=d.bestS2&&sb.fastestS2&&Math.abs(d.bestS2-sb.fastestS2)<0.001;
                      const isFS3=d.bestS3&&sb.fastestS3&&Math.abs(d.bestS3-sb.fastestS3)<0.001;
                      const isTopI1=d.maxI1Speed&&d.maxI1Speed===sb.topI1Speed;
                      const isTopI2=d.maxI2Speed&&d.maxI2Speed===sb.topI2Speed;
                      const isTopST=d.maxSTSpeed&&d.maxSTSpeed===sb.topSTSpeed;
                      const sCol=(isBest)=>isBest?"var(--purple)":"var(--w60)";
                      const spCol=(isBest)=>isBest?"#FF8000":"var(--w50)";
                      return(
                        <tr key={i} style={{borderBottom:"1px solid var(--w04)",background:i<3?`${alpha(inkify(d.teamColour),0x08)}`:"transparent"}}>
                          <td style={{padding:"8px 10px",fontWeight:700,width:28,color:i<3?"var(--fg)":"var(--w35)",fontSize:12,textAlign:"right"}}>{i+1}</td>
                          <td style={{padding:"8px 4px",width:24}}><div style={{width:3,height:18,borderRadius:2,background:inkify(d.teamColour)||"var(--ink-4)"}}/></td>
                          <td style={{padding:"8px 10px",fontWeight:600,whiteSpace:"nowrap"}}>{d.acronym} <span style={{fontWeight:400,fontSize:11,color:"var(--w20)"}}>|</span> <span style={{fontWeight:400,fontSize:11,color:"var(--w35)"}}>{d.name?.split(" ").pop()}</span></td>
                          <td style={{padding:"8px 10px",color:"var(--w40)",fontSize:11}}>{normTeam(d.team||"")}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:sCol(isFS1),fontWeight:isFS1?700:400}}>{fmtS(d.bestS1)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:sCol(isFS2),fontWeight:isFS2?700:400}}>{fmtS(d.bestS2)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:sCol(isFS3),fontWeight:isFS3?700:400}}>{fmtS(d.bestS3)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:700,color:i===0?"var(--green)":i<3?"var(--fg)":"var(--w70)"}}>{fmtS(d.theoreticalBest)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontSize:12,color:"var(--w50)"}}>{fmtLap(d.bestLap)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:spCol(isTopI1),fontWeight:isTopI1?700:400}}>{d.maxI1Speed||"—"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:spCol(isTopI2),fontWeight:isTopI2?700:400}}>{d.maxI2Speed||"—"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:spCol(isTopST),fontWeight:isTopST?700:400}}>{d.maxSTSpeed||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              </div>

              {/* Speed Trap Visual Comparison */}
              <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Speed Trap Comparison</div>
                <div style={{fontSize:12,color:"var(--w35)",marginBottom:20}}>Maximum speed recorded at the speed trap (km/h)</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[...drivers].sort((a,b)=>(b.maxSTSpeed||0)-(a.maxSTSpeed||0)).slice(0,15).map((d,i)=>{
                    const maxAll=sb.topSTSpeed||330;
                    const minShow=maxAll-30;
                    const pct=d.maxSTSpeed?Math.max(((d.maxSTSpeed-minShow)/(maxAll-minShow))*100,3):0;
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:30,fontSize:11,fontWeight:600,color:i===0?"#FF8000":"var(--w40)",textAlign:"right"}}>{d.acronym}</div>
                        <div style={{flex:1,height:20,background:"var(--w04)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:inkify(d.teamColour)||"var(--ink-4)",borderRadius:1}}/>
                          <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--w60)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:i===0?700:400}}>{d.maxSTSpeed||"—"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data source note */}
              <div style={{fontSize:11,color:"var(--w25)",textAlign:"center",padding:8}}>
                Sector times & speed trap data sourced from <a href="https://openf1.org" target="_blank" rel="noopener noreferrer" style={{color:"var(--w35)",textDecoration:"underline"}}>OpenF1 API</a> · Last updated {new Date(openf1.fetchedAt).toLocaleDateString()}
              </div>
            </div>
          );
        }}/>}

        {/* ═══ HEAD TO HEAD ═══ */}
        {tab==="Head to Head"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            <DriverRatings stats={seasonStats} DS={DS} headshots={headshots} season={season}/>
            {/* Metric Toggle */}
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)"}}>Compare by</div>
              <div style={{display:"flex",gap:4}}>
                {[{id:"qual",label:"Qualifying Position"},{id:"race",label:"Average Finish"},{id:"pts",label:"Points Scored"}].map(m=>(
                  <button key={m.id} onClick={()=>setH2hMetric(m.id)} style={{cursor:"pointer",padding:"8px 16px",borderRadius:2,border:h2hMetric===m.id?"1px solid rgba(214,40,40,0.4)":"1px solid var(--w08)",background:h2hMetric===m.id?"rgba(214,40,40,0.12)":"var(--w03)",color:h2hMetric===m.id?"var(--red)":"var(--w50)",fontSize:12,fontWeight:h2hMetric===m.id?600:400,fontFamily:"var(--font-ui)",transition:"all .2s"}}>{m.label}</button>
                ))}
              </div>
            </div>

            {/* Team Battles */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {h2h.map(battle=>{
                const tc=TC[battle.team]||"var(--ink-4)";
                const d1Last=battle.d1.n.split(" ").pop();
                const d2Last=battle.d2.n.split(" ").pop();

                // Compute bar values based on selected metric
                let d1Val,d2Val,d1Label,d2Label,metricNote;
                if(h2hMetric==="qual"){
                  d1Val=battle.qual.d1;d2Val=battle.qual.d2;
                  d1Label=`${battle.qual.d1} win${battle.qual.d1!==1?"s":""}`;
                  d2Label=`${battle.qual.d2} win${battle.qual.d2!==1?"s":""}`;
                  metricNote="Qualifying head-to-head (better qualifying position wins)";
                }else if(h2hMetric==="race"){
                  // Lower avg position = bigger bar. 21−avg keeps backmarkers positive
                  // (10−avg went negative past P10 and inverted the bars).
                  d1Val=battle.avgPos.d1?Math.max(0.5,21-battle.avgPos.d1):0;d2Val=battle.avgPos.d2?Math.max(0.5,21-battle.avgPos.d2):0;
                  d1Label=battle.avgPos.d1?`P${battle.avgPos.d1} avg`:"No data";
                  d2Label=battle.avgPos.d2?`P${battle.avgPos.d2} avg`:"No data";
                  metricNote="Average race finishing position";
                }else{
                  // Points scored for this team in the rounds the pair shared
                  d1Val=battle.pts.d1;d2Val=battle.pts.d2;
                  d1Label=`${battle.pts.d1} pts`;d2Label=`${battle.pts.d2} pts`;
                  metricNote="Points scored as team-mates";
                }
                // A team that changed its line-up gets one card per pairing, labelled by rounds
                const span=battle.teamPairings>1?(battle.rounds.length>1?`Rounds ${battle.rounds[0]}–${battle.rounds[battle.rounds.length-1]}`:`Round ${battle.rounds[0]}`):null;
                const total=d1Val+d2Val;
                const d1Pct=total>0?(d1Val/total)*100:50;
                const d2Pct=total>0?(d2Val/total)*100:50;
                const d1Leads=d1Val>d2Val;
                const d2Leads=d2Val>d1Val;

                return(
                  <div key={`${battle.team}-${battle.d1.n}-${battle.d2.n}`} style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,overflow:"hidden"}}>
                    {/* Team Header */}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                      <TL team={battle.team} size={28}/>
                      <div style={{width:3,height:22,borderRadius:2,background:tc,opacity:.8}}/>
                      <span style={{fontSize:16,fontWeight:700}}>{battle.team}</span>
                      {span&&<span className="num" style={{fontSize:11,color:"var(--ink-3)"}}>{span}</span>}
                      <span style={{fontSize:11,color:"var(--w30)",marginLeft:"auto"}}>{metricNote}{(()=>{if(h2hMetric!=="qual"&&h2hMetric!=="race")return "";const n=(h2hMetric==="qual"?battle.qual?.details:battle.race?.details)?.length;return n!=null?` · ${n} of ${battle.rounds.length} round${battle.rounds.length!==1?"s":""} compared`:"";})()}</span>
                    </div>

                    {/* Driver vs Driver */}
                    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
                      {/* Driver 1 */}
                      <div style={{flex:1,textAlign:"right"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,marginBottom:6}}>
                          <div>
                            <div style={{fontSize:15,fontWeight:700,color:d1Leads?"var(--fg)":"var(--w50)"}}>{d1Last}</div>
                            <div style={{fontSize:20,fontWeight:800,color:d1Leads?tc:"var(--w40)"}}>{d1Label}</div>
                          </div>
                          <DH name={battle.d1.n} size={44} headshots={headshots}/>
                        </div>
                      </div>

                      {/* VS badge */}
                      <div style={{flexShrink:0,width:40,height:40,borderRadius:"50%",background:"var(--w06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"var(--w30)"}}>VS</div>

                      {/* Driver 2 */}
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <DH name={battle.d2.n} size={44} headshots={headshots}/>
                          <div>
                            <div style={{fontSize:15,fontWeight:700,color:d2Leads?"var(--fg)":"var(--w50)"}}>{d2Last}</div>
                            <div style={{fontSize:20,fontWeight:800,color:d2Leads?tc:"var(--w40)"}}>{d2Label}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Battle Bar */}
                    <div style={{display:"flex",height:8,borderRadius:2,overflow:"hidden",background:"var(--w04)"}}>
                      <div style={{width:`${d1Pct}%`,background:d1Leads?tc:"var(--w15)",borderRadius:"2px 0 0 2px"}}/>
                      <div style={{width:2,background:"var(--bench)",flexShrink:0}}/>
                      <div style={{width:`${d2Pct}%`,background:d2Leads?tc:"var(--w15)",borderRadius:"0 4px 4px 0"}}/>
                    </div>

                    {/* Per-race detail row (Qualifying / Race) */}
                    {h2hMetric!=="pts"&&(
                      <div style={{marginTop:14,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {(h2hMetric==="qual"?battle.qual.details:battle.race.details).map((rd,i)=>{
                          // A retirement ("DNF"/"DSQ"/…) loses to any classified finish
                          const rank=v=>typeof v==="number"?v:99;
                          const d1Won=rank(rd.d1)<rank(rd.d2);
                          const d2Won=rank(rd.d2)<rank(rd.d1);
                          const show=v=>typeof v==="number"?`P${v}`:v;
                          return(
                            <div key={i} style={{background:"var(--w03)",borderRadius:2,padding:"6px 10px",fontSize:11,border:"1px solid var(--w04)",minWidth:80}}>
                              <div style={{color:"var(--w35)",marginBottom:3,fontSize:10}}>{rd.race}</div>
                              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                                <span style={{fontWeight:d1Won?700:400,color:d1Won?tc:"var(--w40)"}}>{show(rd.d1)}</span>
                                <span style={{color:"var(--w15)"}}>—</span>
                                <span style={{fontWeight:d2Won?700:400,color:d2Won?tc:"var(--w40)"}}>{show(rd.d2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}/>}

        {/* ═══ PIT STOPS ═══ */}
        {tab==="Pit Stops"&&<TabBody render={()=>{
          const prs=pitsByRace.length>0?pitsByRace:(pits.length>0?[{r:null,nm:pitRaceName,stops:pits}]:[]);
          if(prs.length===0)return(
            <div className="fu" style={{textAlign:"center",padding:60,color:"var(--w40)"}}>
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{display:"block",margin:"0 auto 12px"}}><circle cx="20" cy="22" r="14" fill="none" stroke="var(--ink-3)" strokeWidth="2"/><path d="M20 12v10l6 4" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/><path d="M16 5h8M20 5v3" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/></svg>
              <div style={{fontSize:16,fontWeight:600,marginBottom:4,color:"var(--fg)"}}>No pit stop data yet</div>
              <div style={{fontSize:13}}>Pit stops appear here after the first race of the season.</div>
            </div>
          );
          const curPr=prs.find(p=>String(p.r)===String(selPitRace))||prs[prs.length-1];
          const cpits=curPr.stops;
          const cName=curPr.nm;
          const cFastest=cpits[0];
          const cSlowest=cpits[cpits.length-1];
          const cAvg=`${(cpits.reduce((a,b)=>a+b.s,0)/cpits.length).toFixed(3)}s`;
          // Jolpica times the whole pit-lane transit, which varies by circuit (every
          // Spanish GP stop took over 30 s), so the chart cutoff and the quick/slow
          // colours follow this race's median instead of fixed seconds.
          const byS=cpits.map(d=>d.s).sort((a,b)=>a-b);
          const med=byS.length?byS[Math.floor((byS.length-1)/2)]:0;
          // Pit-lane times cluster within ~1 s of the median, so these mark the few
          // genuinely quick and slow stops (typically 4–7 and 1–3 per race)
          const quickS=med-0.5, slowS=med+2;
          const chart=cpits.filter(d=>d.s<=med*1.5); // drive-throughs, repairs and red-flag waits drop out
          const hiddenStops=cpits.length-chart.length;
          // Bars run from 25% (fastest) to 100% (slowest shown) so sub-second gaps stay visible
          const minS=chart.length?chart[0].s:0, maxS=chart.length?chart[chart.length-1].s:1;
          const barPct=s=>maxS>minS?25+75*(s-minS)/(maxS-minS):100;
          // OpenF1 times the car at rest in the box; Jolpica the whole pit lane. Joined by
          // car number (from the classification) and lap, ±1 since the two count laps differently.
          const pitMtg=curPr.r!=null&&openf1?meetingForRace(openf1.meetings,sched.find(x=>String(x.r)===String(curPr.r))):null;
          const pitSess=pitMtg?.sessions?.find(x=>x.sessionName==="Race"&&x.pitStops);
          const numOf=Object.fromEntries((races.find(x=>!x.sprint&&String(x.r)===String(curPr.r))?.full||[]).map(x=>[x.d,String(x.num)]));
          const stoppedFor=d=>{if(!pitSess)return null;const n=numOf[d.d];const rows=pitSess.pitStops.filter(p=>String(p[0])===n&&p[2]>0);const hit=rows.find(p=>p[1]===d.l)||rows.find(p=>Math.abs(p[1]-d.l)===1);return hit?hit[2]:null;};
          const stopped=cpits.map(stoppedFor);
          const quickest=stopped.reduce((b,v,i)=>v!=null&&(b<0||v<stopped[b])?i:b,-1);
          const hasStopped=quickest>=0; // OpenF1 has no stationary times for some races (2026 Mexico): no column of dashes
          return(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            {prs.length>1&&(
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600}}>Race</span>
                <select aria-label="Race" value={String(curPr.r)} onChange={e=>setSelPitRace(e.target.value)} style={{appearance:"none",WebkitAppearance:"none",background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"6px 28px 6px 12px",color:"var(--fg)",fontSize:12,fontWeight:500,fontFamily:"var(--font-ui)",cursor:"pointer",outline:"none",minWidth:220}}>
                  {prs.map(p=><option key={p.r} value={String(p.r)} style={{background:"var(--sheet)"}}>{`R${p.r} — ${p.nm}`}</option>)}
                </select>
              </div>
            )}
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <SC label="Fastest Pit Stop" value={cFastest?`${cFastest.s.toFixed(3)}s`:"N/A"} sub={cFastest?`${cFastest.d} · Lap ${cFastest.l}`:""} accent="var(--gold)" icon={cFastest&&cFastest.t?<TL team={cFastest.t} size={24}/>:null}/>
              <SC label="Avg Pit Stop" value={cAvg} sub={`${cpits.length} stops · ${cName}`} accent="var(--green)"/>
              {quickest>=0&&<SC label="Quickest Crew" value={`${stopped[quickest].toFixed(1)}s`} sub={`${cpits[quickest].d} · Lap ${cpits[quickest].l} · stationary`} accent="var(--gold)" icon={cpits[quickest].t?<TL team={cpits[quickest].t} size={24}/>:null}/>}
              <SC label="Slowest Pit Stop" value={cSlowest?`${cSlowest.s.toFixed(3)}s`:"N/A"} sub={cSlowest?`${cSlowest.d} · Lap ${cSlowest.l}`:""} accent="var(--red)" icon={cSlowest&&cSlowest.t?<TL team={cSlowest.t} size={24}/>:null}/>
            </div>
            <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{cName + " — Pit Stop Times"}</div>
              <div style={{fontSize:12,color:"var(--w35)",marginBottom:20}}>Pit-lane time, fastest first · bars scaled from the fastest to the slowest shown{hiddenStops>0?` · ${hiddenStops} long stop${hiddenStops>1?"s":""} over 1.5× the race median listed below only`:""}</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {chart.map(d=>(
                  <div key={`${curPr.r}-${d.d}-${d.l}`} style={{display:"flex",alignItems:"center",gap:8}}>
                    <TL team={d.t} size={22}/>
                    <div style={{width:96,fontSize:12,color:"var(--w70)",textAlign:"right",flexShrink:0,whiteSpace:"nowrap"}}>{d.d}<span style={{color:"var(--w30)",fontSize:10,marginLeft:4}}>L{d.l}</span></div>
                    <div style={{flex:1,height:22,background:"var(--w04)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                      <div style={{height:"100%",width:`${barPct(d.s)}%`,background:TC[d.t]||"var(--ink-4)",borderRadius:2,opacity:.8}}/>
                      <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--w60)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{d.s.toFixed(3)}s</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>{"Full Pit Stop Summary — " + cName}</div>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:13}}>
                <thead><tr style={{borderBottom:"1px solid var(--w08)"}}>
                  {["#","Driver","Team","Lap","Pit lane",...(hasStopped?["Stopped"]:[])].map(h=><th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"var(--w35)",fontWeight:500}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {cpits.map((d,i)=>(
                    <tr key={`${curPr.r}-${d.d}-${d.l}-${i}`} style={{borderBottom:"1px solid var(--w04)"}}>
                      <td style={{padding:"10px 12px",color:"var(--w40)",fontWeight:600}}>{i+1}</td>
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><TL team={d.t} size={24}/><div style={{width:3,height:16,borderRadius:2,background:TC[d.t]}}/><span style={{fontWeight:600}}>{d.d}</span></div></td>
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6,color:"var(--w50)"}}><TL team={d.t} size={16}/>{d.t}</div></td>
                      <td style={{padding:"10px 12px",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{d.l}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:d.s<=quickS?"var(--green)":d.s>=slowS?"var(--red)":"var(--fg)"}}>{d.s.toFixed(3)}s</td>
                      {hasStopped&&<td className="num" style={{padding:"10px 12px",color:i===quickest?"var(--green)":"var(--w60)",fontWeight:i===quickest?700:400}}>{stopped[i]!=null?`${stopped[i].toFixed(1)}s`:"—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <HowComputed>Pit lane is Jolpica's timing from pit entry to pit exit, so it depends on the length of each circuit's pit lane; the quick and slow colours compare each stop with this race's median. Stopped is OpenF1's time with the car at rest in the box — the crew's part of the stop — matched to Jolpica's stop by car number and lap (one lap either way, as the two count laps differently). A dash means OpenF1 had no stationary time for that stop; for a race where it has none at all, the column is left out.</HowComputed>
            </div>
          </div>);
        }}/>}

        {/* ═══ QUOTES ═══ */}
        {tab==="Quotes"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            {!quotes||!quotes.rounds||quotes.rounds.length===0?(
              <div style={{textAlign:"center",padding:60,color:"var(--w40)"}}>
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{display:"block",margin:"0 auto 12px"}}><circle cx="20" cy="22" r="14" fill="none" stroke="var(--ink-3)" strokeWidth="2"/><path d="M20 12v10l6 4" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/><path d="M16 5h8M20 5v3" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round"/></svg>
                <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>No driver quotes available yet</div>
                <div style={{fontSize:13}}>Quotes are extracted from official F1 YouTube post-session videos</div>
              </div>
            ):(()=>{
              const SESSION_ORDER=["race","sprint","qualifying","sprintQualifying"];
              const SESSION_LABELS={race:"Race",sprint:"Sprint",qualifying:"Qualifying",sprintQualifying:"Sprint Quali"};
              const availableSessions=SESSION_ORDER.filter(s=>quotes.rounds.some(r=>(r.sessions?.[s]?.quotes||[]).length>0));
              const activeSession=availableSessions.includes(quotesSession)?quotesSession:(availableSessions[0]||"race");
              // Driver filter chips — distinct drivers in the active session across all rounds, by quote count desc
              const driverCounts={};
              quotes.rounds.forEach(r=>(r.sessions?.[activeSession]?.quotes||[]).forEach(q=>{driverCounts[q.driver]=(driverCounts[q.driver]||0)+1;}));
              const quoteDrivers=Object.entries(driverCounts).sort((a,b)=>b[1]-a[1]);
              const activeDriver=quoteDriver&&driverCounts[quoteDriver]?quoteDriver:null;
              // Every finished Grand Prix without race quotes, not just trailing ones:
              // a gap behind a later quoted round (R17 in 2026) used to go unmentioned
              const quotedRace=new Set(quotes.rounds.filter(r=>(r.sessions?.race?.quotes||[]).length>0).map(r=>r.round));
              const noRaceQuotes=races.filter(r=>!r.sprint&&!quotedRace.has(r.r));
              return(
              <>
                {noRaceQuotes.length>0&&(
                  <div style={{fontSize:12,color:"var(--w45)",background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:"10px 14px"}}>
                    No race quotes yet for the <b style={{color:"var(--fg)"}}>{noRaceQuotes.map(r=>r.nm.replace(" Grand Prix","")).join(", ")}</b> {noRaceQuotes.length>1?"Grands Prix":"Grand Prix"} — the reaction {noRaceQuotes.length>1?"videos haven't":"video hasn't"} been transcribed yet.
                  </div>
                )}
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <SC label="Rounds with Quotes" value={String(quotes.rounds.length)} sub={quotes.rounds.map(r=>r.raceName.replace(" Grand Prix","")).join(" · ")} accent="var(--red)"/>
                  <SC label="Total Quotes" value={String(quotes.rounds.reduce((sum,r)=>sum+Object.values(r.sessions||{}).reduce((s2,sess)=>s2+(sess.quotes||[]).length,0),0))} sub={"Across "+availableSessions.map(s=>SESSION_LABELS[s].toLowerCase()).join(", ")} accent="var(--green)"/>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {availableSessions.map(s=>(
                    <button key={s} onClick={()=>{setQuotesSession(s);setQuoteDriver(null);}} style={{padding:"8px 20px",borderRadius:2,border:"1px solid "+(activeSession===s?"var(--red)":"var(--w08)"),background:activeSession===s?"rgba(214,40,40,0.15)":"var(--w02)",color:activeSession===s?"var(--fg)":"var(--w50)",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-ui)"}}>{SESSION_LABELS[s]}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>setQuoteDriver(null)} style={{padding:"6px 14px",borderRadius:2,border:"1px solid "+(activeDriver===null?"var(--red)":"var(--w08)"),background:activeDriver===null?"rgba(214,40,40,0.15)":"var(--w02)",color:activeDriver===null?"var(--fg)":"var(--w50)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"var(--font-ui)"}}>All</button>
                  {quoteDrivers.map(([name,cnt])=>(
                    <button key={name} onClick={()=>setQuoteDriver(activeDriver===name?null:name)} style={{padding:"6px 14px",borderRadius:2,border:"1px solid "+(activeDriver===name?"var(--red)":"var(--w08)"),background:activeDriver===name?"rgba(214,40,40,0.15)":"var(--w02)",color:activeDriver===name?"var(--fg)":"var(--w50)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"var(--font-ui)"}}>{name} <span style={{fontWeight:400,opacity:0.55}}>{cnt}</span></button>
                  ))}
                </div>
                {(()=>{
                  // Newest first; rounds with nothing to show for this session/driver are dropped.
                  // Only the latest two rounds are expanded unless a driver filter is active.
                  const roundsDesc=[...quotes.rounds].reverse().filter(r=>(r.sessions?.[activeSession]?.quotes||[]).some(q=>!activeDriver||q.driver===activeDriver));
                  const visibleRounds=quotesShowAll||activeDriver?roundsDesc:roundsDesc.slice(0,2);
                  const hiddenRounds=roundsDesc.length-visibleRounds.length;
                  return(<>
                {visibleRounds.map(round=>{
                  const sess=round.sessions?.[activeSession];
                  const roundQuotes=(sess?.quotes||[]).filter(q=>!activeDriver||q.driver===activeDriver);
                  return(
                    <div key={round.round} style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                        <div>
                          <div style={{fontSize:15,fontWeight:700}}>{round.raceName}</div>
                          <div style={{fontSize:11,color:"var(--w35)",marginTop:2}}>Round {round.round} · Post-{SESSION_LABELS[activeSession].toLowerCase()} reactions</div>
                        </div>
                        <div style={{fontSize:11,color:"var(--w25)"}}>{roundQuotes.length} quotes</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
                        {roundQuotes.map((q,i)=>(
                          <div key={i} style={{borderTop:`2px solid ${TC[q.team]||"var(--rule)"}`,borderBottom:"1px solid var(--rule-faint)",padding:"12px 0 14px",display:"flex",gap:12}}>
                            <div style={{flexShrink:0}}>
                              <DH name={q.driver} size={40} headshots={headshots}/>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                <span style={{fontSize:13,fontWeight:700}}>{q.driver}</span>
                                <div style={{width:3,height:12,borderRadius:2,background:TC[q.team]||"var(--ink-4)",opacity:.7}}/>
                                <span style={{fontSize:11,color:"var(--w40)"}}>{q.team}</span>
                              </div>
                              <div style={{fontSize:12,color:"var(--w80)",lineHeight:1.6,fontStyle:"italic"}}>"{q.quote}"</div>
                              {q.context&&<div style={{fontSize:10,color:"var(--w30)",marginTop:6,textTransform:"uppercase",letterSpacing:.5}}>{q.context}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {hiddenRounds>0&&(
                  <button onClick={()=>setQuotesShowAll(true)} style={{alignSelf:"center",padding:"10px 22px",borderRadius:2,border:"1px solid var(--w10)",background:"var(--w03)",color:"var(--w70)",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-ui)"}}>
                    Show {hiddenRounds} earlier round{hiddenRounds>1?"s":""}
                  </button>
                )}
                {quotesShowAll&&roundsDesc.length>2&&(
                  <button onClick={()=>{setQuotesShowAll(false);window.scrollTo({top:0,behavior:"smooth"});}} style={{alignSelf:"center",padding:"8px 18px",borderRadius:2,border:"1px solid var(--w08)",background:"none",color:"var(--w45)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-ui)"}}>
                    Collapse to latest rounds
                  </button>
                )}
                  </>);
                })()}
              </>
              );
            })()}
          </div>
        )}/>}

        {/* ═══ SCHEDULE ═══ */}
        {tab==="Schedule"&&<TabBody render={()=>(
          <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <SC label="Total Races" value={String(totalRounds)} sub="Bahrain moved to Sepang · Saudi Arabia postponed" accent="var(--fg)"/>
              <SC label="Races Completed" value={String(completedRounds)} sub={sched.filter(r=>r.st==="done").map(r=>r.nm.replace(" Grand Prix","")).join(" · ")||"None yet"} accent="var(--green)"/>
              <SC label="Sprint Weekends" value={String(sched.filter(r=>r.sp).length)} sub={sched.filter(r=>r.sp).map(r=>r.fc).join(" · ")} accent="var(--red)"/>
              <SC label="Season Finale" value={sched.length>0?sched[sched.length-1].nm.replace(" Grand Prix",""):"TBD"} sub={sched.length>0?dateFmt(sched[sched.length-1].dt,sched[sched.length-1].tt):""} accent="var(--gold)"/>
            </div>
            <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{season} Race Calendar</div>
              <div style={{fontSize:12,color:"var(--w35)",marginBottom:20}}>{sched.length} races · {sched.filter(r=>r.sp).length} Sprint weekends</div>
              {sched.map(race=>{
                return(
                <div key={race.r} className="sr" style={{background:race.st==="next"?"rgba(214,40,40,0.08)":race.st==="postponed"?"rgba(183,121,31,0.04)":"transparent",border:race.st==="next"?"1px solid rgba(214,40,40,0.2)":"1px solid transparent"}}>
                  <div style={{width:36,fontSize:13,fontWeight:700,color:race.st==="done"?"var(--green)":race.st==="next"?"var(--red)":"var(--w30)",flexShrink:0}}>R{race.r}</div>
                  {race.fc && <div style={{width:36,height:24,borderRadius:2,flexShrink:0,marginRight:10,background:"var(--w06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--w40)",letterSpacing:.5,opacity:race.st==="postponed"?0.4:1}}>{race.fc}</div>}
                  {tracks&&tracks[race.nm]&&(
                    <div style={{width:44,height:32,marginRight:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:race.st==="postponed"?0.3:0.75}}>
                      <TrackMap raceName={race.nm} tracks={tracks} stroke={race.st==="next"?"var(--red)":race.st==="done"?"var(--green)":"var(--w55)"} strokeWidth={1.8} height={32} width={44}/>
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,fontWeight:600,color:race.st==="postponed"?"var(--w40)":"var(--fg)"}}>{race.nm}</span>
                      {race.sp&&<span style={{fontSize:9,fontWeight:700,letterSpacing:.5,padding:"2px 6px",borderRadius:2,background:"rgba(214,40,40,0.15)",color:"var(--red-ink)"}}>SPRINT</span>}
                      {race.st==="next"&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:2,background:"rgba(214,40,40,0.1)",color:"var(--w70)"}}>{countdown(race.dt,race.tt)}</span>}
                    </div>
                    <div style={{fontSize:11,color:"var(--w35)",marginTop:2}}>{race.ci}</div>
                  </div>
                  <div style={{fontSize:12,color:"var(--w50)",marginRight:16,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",flexShrink:0,textAlign:"right",width:105}}>
                    <div>{dateFmt(race.dt,race.tt)}</div>
                    {race.tt&&<div style={{fontSize:10,color:"var(--w30)",marginTop:1}}>{raceTimeFmt(race.dt,race.tt)}</div>}
                  </div>
                  <div style={{width:95,flexShrink:0,display:"flex",justifyContent:"flex-end"}}><SB status={race.st}/></div>
                  {race.w&&<div className="num" style={{marginLeft:12,fontSize:12,color:"var(--ink)",fontWeight:700,flexShrink:0}}>P1 {race.w}</div>}
                </div>
                );
              })}
            </div>
          </div>
        )}/>}

        {/* ═══ TELEMETRY ═══ */}
        {tab==="Telemetry"&&<TelemetryTab openf1={openf1} tracks={tracks} telMeetingKey={telMeetingKey} setTelMeetingKey={setTelMeetingKey} outByDay={outByDay} openf1Status={openf1Status} meetingFailed={meetingFailed} retryMeeting={retryMeeting} retryIndex={loadOpenf1Index}/>}
        </div>
        </TabErrorBoundary>
      </div></main>

      {/* Colophon — on the bench, in the header stamp's Courier: who built it,
          where the source and pipeline live, where the data comes from */}
      <footer className="colophon">
        <span>Built by <a href="https://github.com/RowanFlynnPilot">RowanFlynnPilot</a></span>
        <span><a href="https://github.com/RowanFlynnPilot/f1-dashboard">Source &amp; data pipeline on GitHub</a></span>
        <span>Data · Jolpica F1 · OpenF1 · Formula 1 on YouTube</span>
        <span>Raw data · {[["data.json","results"],["season-stats.json","ratings"],["openf1/index.json","OpenF1 index"],["driver-quotes.json","quotes"]].map(([p,l],i)=><Fragment key={p}>{i>0&&" · "}<a href={import.meta.env.BASE_URL+p} download>{l}</a></Fragment>)} · <a href="https://github.com/RowanFlynnPilot/f1-dashboard/blob/main/docs/DATA.md">data dictionary</a></span>
        <span>Unofficial fan project · not affiliated with Formula 1</span>
      </footer>
    </div>
  );
}

// ─── Analytics sheets — title fight, finishing heatmap, qualifying trend,
// driver ratings, race pace, weather, mini-sectors. The maths lives in
// src/data.js (tested); these only draw it. Each carries a "How this is
// computed" note, because a number nobody can check is a number nobody trusts.
const FUEL_S_PER_LAP=0.03; // lap time gained per lap of fuel burned — a rule-of-thumb figure, not measured
const PANEL={background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20};
const SELECT_STYLE={appearance:"none",WebkitAppearance:"none",background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"5px 10px",color:"var(--fg)",fontSize:12,fontFamily:"var(--font-data)",cursor:"pointer"};
const lastName=n=>(n||"").split(" ").pop();
const fmtLap=s=>{if(s==null||!Number.isFinite(s))return"—";const m=Math.floor(s/60);return `${m}:${(s-m*60).toFixed(3).padStart(6,"0")}`;};
const fmtMetric=(v,m)=>v==null?"no data":`${v.toFixed(m.digits)}${m.unit.startsWith("%")?"":" "}${m.unit}`;
const pctLabel=(p,sure)=>p==null?"—":sure?`${Math.round(p*100)}%`:p<0.005?"<1%":p>0.995?">99%":`${Math.round(p*100)}%`;

function PanelHead({title,sub}){
  return(<><div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{title}</div>{sub&&<div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>{sub}</div>}</>);
}
function HowComputed({children}){
  return(<details className="how"><summary>How this is computed</summary><div>{children}</div></details>);
}

// ── Standings: the title fight ─────────────────────────────────────────────
// Odds table for a contest still open: driver or team, points, gap, ceiling, odds
function OddsTable({rows,nameOf,colorOf}){
  const maxP=Math.max(...rows.map(r=>r.prob),0);
  return(
    <div className="tbl-wrap" style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:340}}>
        <thead><tr style={{borderBottom:"1px solid var(--w08)"}}>{["","Pts","Behind","Max","Odds"].map(h=><th key={h} style={{textAlign:h===""||h==="Odds"?"left":"right",padding:"6px 8px",fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w40)",fontWeight:600}}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r=>(
          <tr key={nameOf(r)} style={{borderBottom:"1px solid var(--w04)"}}>
            <td style={{padding:"6px 8px",whiteSpace:"nowrap"}}><span style={{display:"inline-block",width:3,height:12,background:colorOf(r),marginRight:8,verticalAlign:"-1px"}}/>{nameOf(r)}</td>
            <td className="num" style={{padding:"6px 8px",textAlign:"right",fontWeight:700}}>{r.pts}</td>
            <td className="num" style={{padding:"6px 8px",textAlign:"right",color:"var(--w50)"}}>{r.behind?`−${r.behind}`:"—"}</td>
            <td className="num" style={{padding:"6px 8px",textAlign:"right",color:"var(--w50)"}}>{r.max}</td>
            <td style={{padding:"6px 8px",minWidth:110}}><div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:6,background:"var(--w04)"}}><div style={{height:"100%",width:`${maxP>0?(r.prob/maxP)*100:0}%`,background:colorOf(r)}}/></div>
              <span className="num" style={{width:34,textAlign:"right",fontSize:12}}>{pctLabel(r.prob,false)}</span>
            </div></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

const TitleFight=memo(function TitleFight({DS,sched,races,CS,clinch,season}){
  const outlook=useMemo(()=>titleOutlook({DS,sched,races,sprints:races.filter(r=>r.sprint)}),[DS,sched,races]);
  // Once the title is settled the open contests are second place and the constructors'
  const decided=!!(clinch||outlook?.clinched);
  const after=useMemo(()=>decided&&DS[0]?titleOutlook({DS,sched,races,sprints:races.filter(r=>r.sprint),exclude:[DS[0].n],CS}):null,[decided,DS,sched,races,CS]);
  const[whatIf,setWhatIf]=useState({}); // `${eventIndex}|${driver}` → finishing position ("0" = no points)
  if(!outlook)return null;
  const{events,maxLeft,clinched,needed,drivers,sims}=outlook;
  const leader=drivers[0],rival=drivers[1];
  const L=d=>lastName(d.n);
  if(!events.length)return(
    <div style={PANEL}>
      <PanelHead title="Title Fight" sub="Season complete"/>
      <div className="head" style={{fontSize:26,fontWeight:700}}>{leader.n} · champion by {leader.pts-(rival?.pts||0)} points</div>
    </div>
  );
  if(decided){
    const p2=after?.drivers.filter(d=>d.alive)||[];
    const wcc=after?.constructors;
    const teamNext=after?.events.filter(e=>e.round===after.events[0]?.round).reduce((x,e)=>x+(e.kind==="sprint"?15:43),0)||0;
    let wccLine=null;
    if(wcc){
      const [lt,rt]=wcc.teams;
      if(wcc.clinched)wccLine=<>{lt.t} are constructors' champions: {lt.pts-rt.pts} points clear with {wcc.maxLeft} left.</>;
      else if(wcc.needed.margin<=0)wccLine=<>{lt.t} clinch at the {wcc.needed.name} unless {rt.t} outscore them there by {1-wcc.needed.margin} points or more.</>;
      else if(wcc.needed.margin<=teamNext)wccLine=<>{lt.t} can clinch at the {wcc.needed.name} by outscoring {rt.t} there by {wcc.needed.margin} points or more.</>;
      else wccLine=<>It can't be settled at the {wcc.needed.name}: {lt.t} lead {rt.t} by {lt.pts-rt.pts} with {wcc.maxLeft} left for one team.</>;
    }
    const sub=clinch?`Decided at R${clinch.round} ${clinch.name}: ${clinch.lead} points clear with ${clinch.left} left to win`:"Decided";
    const age=clinch?championAge(DS[0],clinch,races):null;
    const rec=YOUNGEST_CHAMPION_BEFORE_2026;
    return(
      <div style={PANEL}>
        <PanelHead title="Title Fight" sub={sub}/>
        <div className="head" style={{fontSize:30,fontWeight:700,lineHeight:1.05,display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
          <span style={{display:"inline-block",width:5,height:24,background:TC[leader.t]||"var(--ink-3)",alignSelf:"center"}}/>
          {leader.n}<span className="num" style={{fontSize:13,fontWeight:400,color:"var(--ink-3)",textTransform:"none"}}>{season} World Champion{age?` · ${age.youngest?"the youngest in history, at ":"aged "}${age.label}`:""}</span>
        </div>
        {after&&after.events.length>0?(
          <div className="g2" style={{marginTop:20,alignItems:"start"}}>
            <div>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600,marginBottom:6}}>Fight for second</div>
              <p style={{margin:"0 0 10px",fontSize:14,lineHeight:1.45}}>{p2.length>1?<>{L(p2[0])} holds second by {p2[0].pts-p2[1].pts} over {L(p2[1])}; with {after.maxLeft} points left, {p2.length} drivers can still finish runner-up.</>:<>{L(p2[0])} has second place sealed.</>}</p>
              <OddsTable rows={p2.slice(0,5)} nameOf={d=>L(d)} colorOf={d=>TC[d.t]||"var(--ink-4)"}/>
            </div>
            {wcc&&<div>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600,marginBottom:6}}>Constructors' championship</div>
              <p style={{margin:"0 0 10px",fontSize:14,lineHeight:1.45}}>{wccLine}</p>
              <OddsTable rows={wcc.teams.filter(t=>t.alive)} nameOf={t=>t.t} colorOf={t=>TC[t.t]||"var(--ink-4)"}/>
            </div>}
          </div>
        ):(
          <p style={{margin:"10px 0 0",fontSize:14,color:"var(--w60)",maxWidth:"70ch"}}>{L(leader)} finished the season {leader.pts-rival.pts} points clear of {L(rival)}.</p>
        )}
        <HowComputed>A title is decided once the leader's margin over every rival is larger than the points still available: 25 for every Grand Prix left and 8 for every sprint; the deciding round is found by replaying the season result by result.{age?` The champion's age is counted from Jolpica's date of birth to the day of the deciding race; the record it is compared with is ${rec.name}'s, ${rec.years} years ${rec.days} days in ${rec.season}.`:""} The fight for second runs the same {after?.sims?.toLocaleString?.()||"4,000"} simulated run-ins with the champion still racing (still taking points and places) but out of the count. Constructors' odds come from the same runs, summing each team's two cars; a team can add 43 points per Grand Prix (25 + 18) and 15 per sprint. Projections from this season's form, not predictions.</HowComputed>
      </div>
    );
  }
  const alive=drivers.filter(d=>d.alive);
  const contenders=alive.slice(0,4);
  const nextMax=events.filter(e=>e.round===events[0].round).reduce((s,e)=>s+e.max,0);
  let line;
  if(needed&&needed.margin<=0)line=<>{L(leader)} clinches the title at the {needed.name} unless {L(rival)} outscores {L(leader)} there by {1-needed.margin} points or more.</>;
  else if(needed&&needed.margin<=nextMax)line=<>{L(leader)} can clinch at the {needed.name} by outscoring {L(rival)} there by {needed.margin} points or more.</>;
  else line=<>The title can't be settled at the {events[0].name}: {alive.length} drivers can still mathematically win it.</>;
  const pick=(i,n)=>whatIf[`${i}|${n}`]||"";
  const totals=contenders.map(d=>({...d,total:d.pts+events.reduce((s,e,i)=>s+pointsFor(parseInt(pick(i,d.n))||0,e.kind),0)})).sort((a,b)=>b.total-a.total);
  const clash=events.map((e,i)=>{const ps=contenders.map(d=>pick(i,d.n)).filter(p=>p&&p!=="0");return new Set(ps).size<ps.length;});
  const anyPick=Object.values(whatIf).some(Boolean);
  const maxProb=Math.max(...drivers.map(d=>d.prob));
  return(
    <div style={PANEL}>
      <PanelHead title="Title Fight" sub={`${events.length} point-scoring session${events.length>1?"s":""} left · ${maxLeft} points still available to one driver`}/>
      <p style={{margin:"0 0 18px",fontSize:15,maxWidth:"70ch",lineHeight:1.45}}>{line}</p>
      <div className="g2" style={{alignItems:"start"}}>
        <div className="tbl-wrap" style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:380}}>
            <thead><tr style={{borderBottom:"1px solid var(--w08)"}}>{["Driver","Pts","Behind","Max","Title odds"].map(h=><th key={h} style={{textAlign:h==="Driver"||h==="Title odds"?"left":"right",padding:"6px 8px",fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w40)",fontWeight:600}}>{h}</th>)}</tr></thead>
            <tbody>
              {drivers.slice(0,Math.max(4,alive.length)).map(d=>(
                <tr key={d.n} style={{borderBottom:"1px solid var(--w04)",opacity:d.alive?1:0.55}}>
                  <td style={{padding:"6px 8px",whiteSpace:"nowrap"}}><span style={{display:"inline-block",width:3,height:12,background:TC[d.t]||"var(--ink-4)",marginRight:8,verticalAlign:"-1px"}}/>{L(d)}{!d.alive&&<span style={{fontSize:10,color:"var(--w40)",marginLeft:6}}>out of it</span>}</td>
                  <td className="num" style={{padding:"6px 8px",textAlign:"right",fontWeight:700}}>{d.pts}</td>
                  <td className="num" style={{padding:"6px 8px",textAlign:"right",color:"var(--w50)"}}>{d.behind?`−${d.behind}`:"—"}</td>
                  <td className="num" style={{padding:"6px 8px",textAlign:"right",color:"var(--w50)"}}>{d.max}</td>
                  <td style={{padding:"6px 8px",minWidth:120}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:6,background:"var(--w04)"}}><div style={{height:"100%",width:`${maxProb>0?(d.prob/maxProb)*100:0}%`,background:TC[d.t]||"var(--ink-4)"}}/></div>
                      <span className="num" style={{width:34,textAlign:"right",fontSize:12}}>{d.alive?pctLabel(d.prob,clinched):"0%"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600,marginBottom:8}}>What if… pick their finishes</div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:12}}>
              <thead><tr><th/>{contenders.map(d=><th key={d.n} style={{padding:"4px 6px",fontSize:11,fontWeight:700,color:TCT[d.t]||"var(--fg)",textAlign:"left"}}>{L(d)}</th>)}</tr></thead>
              <tbody>
                {events.map((e,i)=>(
                  <tr key={i}>
                    <td style={{padding:"3px 8px 3px 0",whiteSpace:"nowrap",color:clash[i]?"var(--red-ink)":"var(--w60)"}}>R{e.round} {e.name.replace(" Grand Prix","")}{e.kind==="sprint"?" sprint":""}</td>
                    {contenders.map(d=>(
                      <td key={d.n} style={{padding:"3px 6px"}}>
                        <select aria-label={`${d.n}, ${e.name}${e.kind==="sprint"?" sprint":""}`} value={pick(i,d.n)} onChange={ev=>setWhatIf(w=>({...w,[`${i}|${d.n}`]:ev.target.value}))} style={SELECT_STYLE}>
                          <option value="">—</option>
                          {Array.from({length:e.kind==="sprint"?8:10},(_,k)=><option key={k} value={k+1}>P{k+1}</option>)}
                          <option value="0">no pts</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:12,fontSize:13}}>
            {anyPick?(
              <>
                <div className="num" style={{display:"flex",gap:14,flexWrap:"wrap"}}>{totals.map((d,i)=><span key={d.n} style={{fontWeight:i===0?700:400}}>{L(d)} {d.total}</span>)}</div>
                <div style={{marginTop:6,color:"var(--w60)"}}>{clash.some(Boolean)?"Two drivers can't share a finishing position — check the rows in red.":`On those results ${L(totals[0])} leads by ${totals[0].total-totals[1].total}. Blank picks score nothing.`}</div>
                <button className="chip" onClick={()=>setWhatIf({})} style={{marginTop:8,fontSize:11,padding:"4px 10px",background:"var(--w03)",border:"1px solid var(--w10)",borderRadius:2,cursor:"pointer",color:"var(--fg)"}}>Clear picks</button>
              </>
            ):<span style={{color:"var(--w50)"}}>Blank picks score nothing; set a few to see where the totals land.</span>}
          </div>
        </div>
      </div>
      <HowComputed>
        Points left: 25 for every Grand Prix still to run and 8 for every sprint, the most one driver can add. A driver is still in it while their points plus that maximum reach the leader's total (ties go to countback, which this ignores). The clinch line compares the leader with the nearest rival: after the next weekend the lead must exceed the points that remain. Title odds come from {sims.toLocaleString()} simulated run-ins: at each remaining session every driver draws one of their own finishes this season at random, plus a little noise, a retirement when the draw lands on one, and the field is sorted into a finishing order and scored. It's a projection from this season's form, not a prediction; the seed is fixed so the numbers don't move between visits.
      </HowComputed>
    </div>
  );
});

// ── Standings: where each driver finishes ──────────────────────────────────
const PositionHeatmap=memo(function PositionHeatmap({races,DS}){
  const gps=races.filter(r=>!r.sprint);
  const field=Math.max(20,...gps.map(r=>r.full.length));
  const rows=DS.map(d=>{
    const counts=Array(field+1).fill(0);let n=0;
    for(const r of gps){const row=r.full.find(x=>(x.did&&x.did===d.did)||x.d===lastName(d.n));if(!row)continue;n++;if(typeof row.p==="number")counts[row.p-1]++;else counts[field]++;}
    return{d,counts,n};
  }).filter(r=>r.n>0);
  if(!rows.length)return null;
  const max=Math.max(1,...rows.flatMap(r=>r.counts));
  const cols=[...Array.from({length:field},(_,i)=>`${i+1}`),"DNF"];
  return(
    <div style={PANEL}>
      <PanelHead title="Where They Finish" sub={`Grand Prix finishing positions, ${gps.length} races · darker = more often (square-root scale, so rare finishes still show) · DNF column counts every unclassified result`}/>
      <div className="tbl-wrap" style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate",borderSpacing:2,fontSize:11,minWidth:760,width:"100%"}}>
          <thead><tr><th/>{cols.map(c=><th key={c} className="num" style={{fontSize:10,fontWeight:400,color:c==="1"?"var(--red-ink)":"var(--w45)",padding:"0 0 4px"}}>{c==="DNF"?c:`P${c}`}</th>)}</tr></thead>
          <tbody>
            {rows.map(({d,counts})=>{
              const col=TC[d.t]||"var(--ink-3)";
              return(
                <tr key={d.n}>
                  <th scope="row" style={{textAlign:"left",fontWeight:600,whiteSpace:"nowrap",paddingRight:8,fontSize:12}}><span style={{display:"inline-block",width:3,height:11,background:col,marginRight:6,verticalAlign:"-1px"}}/>{lastName(d.n)}</th>
                  {counts.map((c,i)=>(
                    <td key={i} className="num" title={c?`${lastName(d.n)}: ${cols[i]==="DNF"?"not classified":`P${cols[i]}`} ×${c}`:undefined} style={{textAlign:"center",height:20,minWidth:22,background:c?alpha("var(--ink)",Math.round(18+190*Math.sqrt(c/max))):"var(--w02)",color:Math.sqrt(c/max)>0.55?"var(--sheet)":"var(--ink)",fontSize:10}}>{c||""}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <HowComputed>Every classified Grand Prix result for each driver in the standings, counted by finishing position. Sprints are left out. Drivers who raced for two teams carry their current team's mark.</HowComputed>
    </div>
  );
});

// ── Standings: qualifying gap to pole, per team, round by round ────────────
const QualiGapTrend=memo(function QualiGapTrend({qualifying}){
  const teams=useMemo(()=>{
    const by={};
    for(const q of qualifying)for(const r of q.results){if(r.gap==null)continue;const t=by[r.t]??={};t[q.round]=Math.min(t[q.round]??Infinity,r.gap);}
    return Object.entries(by).map(([t,rounds])=>{
      const pts=Object.entries(rounds).map(([r,g])=>({r:+r,g})).sort((a,b)=>a.r-b.r);
      const gs=pts.map(p=>p.g).sort((a,b)=>a-b);
      return{t,pts,med:gs[Math.floor((gs.length-1)/2)],poles:pts.filter(p=>p.g===0).length};
    }).sort((a,b)=>a.med-b.med);
  },[qualifying]);
  if(teams.length<2||qualifying.length<2)return null;
  const rounds=qualifying.map(q=>q.round),r0=Math.min(...rounds),r1=Math.max(...rounds);
  const CAP=4; // % — slower laps (rain, a crash in Q1) pin to the floor
  const W=200,H=64,pad=4;
  const x=r=>pad+((r-r0)/Math.max(1,r1-r0))*(W-pad*2);
  const y=g=>pad+(Math.min(g,CAP)/CAP)*(H-pad*2);
  return(
    <div style={PANEL}>
      <PanelHead title="Qualifying Gap to Pole" sub={`Each team's best car, % off pole, rounds ${r0}–${r1} · pole at the top line · ordered by season median`}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"18px 20px"}}>
        {teams.map(tm=>{
          const col=TC[tm.t]||"var(--ink-3)";
          const path=tm.pts.map((p,i)=>`${i?"L":"M"}${x(p.r).toFixed(1)},${y(p.g).toFixed(1)}`).join(" ");
          return(
            <div key={tm.t}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
                <span className="head" style={{fontSize:14,fontWeight:700,color:TCT[tm.t]||col}}>{tm.t}</span>
                <span className="num" style={{fontSize:11,color:"var(--w55)"}}>{tm.med.toFixed(2)}%{tm.poles?` · ${tm.poles} pole${tm.poles>1?"s":""}`:""}</span>
              </div>
              <svg role="img" aria-label={`${tm.t}: median ${tm.med.toFixed(2)}% off pole`} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block",borderTop:"1px solid var(--rule-soft)",borderBottom:"1px solid var(--rule-faint)"}}>
                {[1,2,3].map(g=><line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} stroke="var(--rule-faint)" strokeWidth={0.6}/>)}
                <path d={path} fill="none" stroke={col} strokeWidth={1.6} strokeLinejoin="round"/>
                {tm.pts.map(p=><circle key={p.r} cx={x(p.r)} cy={y(p.g)} r={p.g===0?2.6:1.6} fill={p.g===0?"var(--red)":col}><title>{`R${p.r}: ${p.g===0?"pole":`+${p.g.toFixed(2)}%`}`}</title></circle>)}
              </svg>
            </div>
          );
        })}
      </div>
      <div className="num" style={{fontSize:10,color:"var(--w40)",marginTop:8}}>Guides at 1%, 2%, 3% · anything past {CAP}% sits on the floor</div>
      <HowComputed>For each qualifying session, every driver's best lap across Q1, Q2 and Q3 is compared with pole as a percentage; the team's quicker car is plotted. Percentages rather than seconds, so a 70-second lap and a 100-second lap compare fairly. A wet session or a car knocked out early with a problem shows as a spike.</HowComputed>
    </div>
  );
});

// ── Head to Head: driver ratings (percentiles), with a shareable card ──────
function drawRatingsCard(canvas,{row,metrics,season,rounds,team,link}){
  const W=1200,H=630,ctx=canvas.getContext("2d");
  canvas.width=W;canvas.height=H;
  const col=TC[team]||"#39424C";
  ctx.fillStyle="#DDE4EA";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#1B1F24";ctx.fillRect(0,0,W,64);
  ctx.fillStyle="#E6ECF1";ctx.font="700 26px 'Barlow Condensed', sans-serif";ctx.textBaseline="middle";
  ctx.fillText(`${season} SEASON SHEETS · DRIVER RATINGS`,40,33);
  ctx.textAlign="right";ctx.font="400 18px 'Courier Prime', monospace";ctx.fillText(`after round ${rounds}`,W-40,33);ctx.textAlign="left";
  ctx.fillStyle=col;ctx.fillRect(40,96,8,78);
  ctx.fillStyle="#14181D";ctx.font="700 64px 'Barlow Condensed', sans-serif";ctx.textBaseline="alphabetic";
  ctx.fillText(row.name.toUpperCase(),64,150);
  ctx.fillStyle="#4B5660";ctx.font="500 22px 'Barlow', sans-serif";ctx.fillText(`${team} · percentile among ${season} drivers with 5+ starts · 100 = best`,64,180);
  const top=222,rowH=40,labelW=260,barX=40+labelW,barW=560;
  metrics.forEach((m,i)=>{
    const v=row.metrics[m.key],yy=top+i*rowH;
    ctx.fillStyle="#14181D";ctx.font="600 22px 'Barlow', sans-serif";ctx.fillText(m.label,40,yy+22);
    ctx.fillStyle="rgba(20,24,29,0.08)";ctx.fillRect(barX,yy+6,barW,22);
    if(v.pct!=null){ctx.fillStyle=col;ctx.fillRect(barX,yy+6,barW*(Math.max(2,v.pct)/100),22);}
    ctx.fillStyle="rgba(20,24,29,0.35)";ctx.fillRect(barX+barW/2,yy+2,1.5,30);
    ctx.fillStyle="#14181D";ctx.font="700 22px 'Courier Prime', monospace";ctx.fillText(v.pct==null?"—":String(v.pct),barX+barW+16,yy+24);
    ctx.fillStyle="#4B5660";ctx.font="400 18px 'Courier Prime', monospace";
    ctx.fillText(fmtMetric(v.value,m),barX+barW+76,yy+24);
  });
  ctx.fillStyle="#1B1F24";ctx.fillRect(0,H-46,W,46);
  ctx.fillStyle="#E6ECF1";ctx.font="400 17px 'Courier Prime', monospace";ctx.textBaseline="middle";ctx.fillText(link,40,H-23);
  ctx.textAlign="right";ctx.fillText("Jolpica F1 · OpenF1",W-40,H-23);ctx.textAlign="left";
}

const DriverRatings=memo(function DriverRatings({stats,DS,headshots,season}){
  const rated=useMemo(()=>(stats?.drivers||[]).filter(d=>d.starts>=stats.minStarts),[stats]);
  const[sel,setSel]=useState(()=>hashParams().get("d"));
  const[copied,setCopied]=useState(false);
  // Back/Forward between shared links changes the driver without a reload
  useEffect(()=>{const on=()=>setSel(hashParams().get("d"));window.addEventListener("popstate",on);return()=>window.removeEventListener("popstate",on);},[]);
  if(!rated.length)return null;
  const order=DS.map(d=>d.did);
  const sorted=[...rated].sort((a,b)=>(order.indexOf(a.did)+1||99)-(order.indexOf(b.did)+1||99));
  const row=sorted.find(d=>d.did===sel)||sorted[0];
  const team=DS.find(d=>d.did===row.did)?.t||row.team;
  const col=TC[team]||"var(--ink-3)";
  // the canonical address, so a card made from a local or preview build still points at the live site
  const link=`${document.querySelector('link[rel=canonical]')?.href||location.origin+location.pathname}${tabHref("Head to Head",{d:row.did})}`;
  const choose=did=>{setSel(did);patchHash({d:did});};
  const download=async()=>{
    try{await document.fonts?.ready;}catch{/* fonts optional */}
    const c=document.createElement("canvas");
    drawRatingsCard(c,{row,metrics:stats.metrics,season,rounds:stats.rounds,team,link});
    const a=document.createElement("a");a.download=`${season}-${row.did}-ratings.png`;a.href=c.toDataURL("image/png");a.click();
  };
  const copy=()=>{navigator.clipboard?.writeText(link).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600);}).catch(()=>{});};
  return(
    <div style={PANEL}>
      <PanelHead title="Driver Ratings" sub={`Season percentiles among the ${rated.length} drivers with ${stats.minStarts}+ starts · 100 = best in the field · after round ${stats.rounds}`}/>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
        <DH name={row.name} size={44} headshots={headshots}/>
        <div style={{flex:"1 1 160px",minWidth:0}}>
          <div className="head" style={{fontSize:24,fontWeight:700,lineHeight:1.05}}>{row.name}</div>
          <div style={{fontSize:12,color:TCT[team]||col,fontWeight:600}}>{team} · {row.starts} starts</div>
        </div>
        <select aria-label="Driver" value={row.did} onChange={e=>choose(e.target.value)} style={{...SELECT_STYLE,fontFamily:"var(--font-ui)",fontSize:13,padding:"6px 12px"}}>
          {sorted.map(d=><option key={d.did} value={d.did}>{d.name}</option>)}
        </select>
        <button className="chip" onClick={download} style={{fontSize:12,padding:"6px 12px",background:"var(--ink)",color:"var(--sheet)",border:"1px solid var(--ink)",borderRadius:2,cursor:"pointer"}}>Download card</button>
        <button className="chip" onClick={copy} style={{fontSize:12,padding:"6px 12px",background:"var(--w03)",color:"var(--fg)",border:"1px solid var(--w10)",borderRadius:2,cursor:"pointer"}}>{copied?"Link copied":"Copy link"}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {stats.metrics.map(m=>{
          const v=row.metrics[m.key];
          return(
            <div key={m.key} className="rating-row" title={m.note}>
              <div style={{fontSize:13,fontWeight:600}}>{m.label}</div>
              <div style={{position:"relative",height:16,background:"var(--w04)"}}>
                {v.pct!=null&&<div style={{height:"100%",width:`${Math.max(2,v.pct)}%`,background:col}}/>}
                <div style={{position:"absolute",left:"50%",top:-2,bottom:-2,width:1,background:"var(--w30)"}}/>
              </div>
              <div className="num" style={{fontSize:14,fontWeight:700,textAlign:"right"}}>{v.pct??"—"}</div>
              <div className="num" style={{fontSize:11,color:"var(--w55)"}}>{fmtMetric(v.value,m)}</div>
            </div>
          );
        })}
      </div>
      <HowComputed>
        <p style={{margin:"0 0 6px"}}>Each metric is the driver's season figure (median for times, average for counts and rates), ranked against every driver with {stats.minStarts} or more Grand Prix starts. The percentile is the share of that field the driver beats; the tick marks the middle of the field.</p>
        <ul style={{margin:0,paddingLeft:18}}>{stats.metrics.map(m=><li key={m.key}><b>{m.label}</b> — {m.note}</li>)}</ul>
        <p style={{margin:"6px 0 0"}}>Lap 1 gains favour drivers who start further back (the polesitter can't gain); pit-crew times rate the team, not the driver. Race pace, consistency, overtaking and pit times need OpenF1's lap data, so a race OpenF1 didn't cover leaves those out.</p>
      </HowComputed>
    </div>
  );
});

// ── Telemetry: race pace distribution ──────────────────────────────────────
const RacePacePanel=memo(function RacePacePanel({race}){
  const pace=useMemo(()=>racePace(race),[race]);
  const[hover,setHover]=useState(null);
  if(pace.length<2)return null;
  const lo=Math.min(...pace.map(p=>p.lo)),hi=Math.max(...pace.map(p=>p.hi));
  const x0=Math.floor(lo*2)/2-0.25,x1=Math.ceil(hi*2)/2+0.25;
  const W=820,padL=52,padR=16,rowH=20,padT=8,H=padT+pace.length*rowH+26;
  const x=t=>padL+((t-x0)/(x1-x0))*(W-padL-padR);
  const ticks=[];for(let t=Math.ceil(x0);t<=x1;t+=x1-x0>8?2:1)ticks.push(t);
  const compounds=[...new Set(pace.flatMap(p=>p.laps.map(l=>l.c)))];
  const hp=hover!=null?pace[hover]:null;
  return(
    <div style={{...PANEL,position:"relative"}}>
      <PanelHead title="Race Pace" sub="Green-flag laps per driver, finishing order · box = middle half of laps, line = median, whiskers = typical range · dots coloured by tyre"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:8}}>
        {compounds.map(c=><span key={c} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--w60)"}}><i style={{width:8,height:8,borderRadius:"50%",background:COMPOUND_COLORS[c]||"var(--ink-4)",display:"inline-block"}}/>{c[0]+c.slice(1).toLowerCase()}</span>)}
      </div>
      <div className="tbl-wrap"><svg role="img" aria-label="Race pace: distribution of each driver's green-flag lap times" viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:560,display:"block"}} onPointerLeave={()=>setHover(null)}>
        {ticks.map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1={padT} y2={H-22} stroke="var(--rule-faint)"/><text x={x(t)} y={H-8} textAnchor="middle" fontSize="10" fill="var(--w45)" fontFamily="var(--font-data)">{fmtLap(t).replace(/\.000$/,"")}</text></g>)}
        {pace.map((p,i)=>{
          const cy=padT+i*rowH+rowH/2,col=inkify(p.teamColour)||"var(--ink-3)";
          return(
            <g key={p.number} onPointerEnter={()=>setHover(i)} opacity={hover==null||hover===i?1:0.45}>
              <rect x={0} y={cy-rowH/2} width={W} height={rowH} fill="transparent"/>
              <text x={padL-8} y={cy+4} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-ui)">{p.acronym}</text>
              <line x1={x(p.lo)} x2={x(p.hi)} y1={cy} y2={cy} stroke={col} strokeWidth={1}/>
              <rect x={x(p.q1)} y={cy-6} width={Math.max(1,x(p.q3)-x(p.q1))} height={12} fill={alpha(col,0x1A)} stroke={col} strokeWidth={1}/>
              <line x1={x(p.med)} x2={x(p.med)} y1={cy-7} y2={cy+7} stroke="var(--ink)" strokeWidth={2}/>
              {p.laps.filter(l=>l.t>=x0&&l.t<=x1).map(l=><circle key={l.l} cx={x(l.t)} cy={cy+((l.l*37)%9)-4} r={1.4} fill={COMPOUND_COLORS[l.c]||"var(--ink-4)"} opacity={0.75}/>)}
            </g>
          );
        })}
      </svg></div>
      {hp&&<div className="num" style={{fontSize:12,color:"var(--w70)",marginTop:6}}>{hp.acronym} · median {fmtLap(hp.med)} · middle half {fmtLap(hp.q1)}–{fmtLap(hp.q3)} · {hp.n} laps counted</div>}
      <HowComputed>A driver's racing laps with the noise taken out: lap 1, in- and out-laps, every lap under the safety car or VSC plus the restart lap, and anything over 107% of the driver's own median are dropped. The box spans the 25th to 75th percentile, the line is the median, and the whiskers reach the furthest laps within 1.5× the box width. Drivers with fewer than 8 laps left (early retirements) aren't shown. Fuel load isn't corrected here, so long first stints read a little slow.</HowComputed>
    </div>
  );
});

// ── Telemetry: weather by lap ──────────────────────────────────────────────
const WeatherStrip=memo(function WeatherStrip({race,maxLap}){
  const leader=useMemo(()=>[...(race?.drivers||[])].sort((a,b)=>(a.positions?.at(-1)?.p??99)-(b.positions?.at(-1)?.p??99))[0],[race]);
  const series=useMemo(()=>{
    const starts=(leader?.lapTimes||[]).filter(l=>l.ds).map(l=>({l:l.l,ds:l.ds,end:l.ds+l.t*1000}));
    if(!starts.length)return[];
    const lapOf=ms=>{if(ms<starts[0].ds)return null;const s=starts.find(x=>ms>=x.ds&&ms<x.end);return s?s.l-1+(ms-s.ds)/(s.end-s.ds):null;};
    // a reading at or below 0°C is a station glitch, not weather
    return (race?.weather||[]).map(([ms,track,air,rain])=>({lap:lapOf(ms),track:track>0?track:null,air:air>0?air:null,rain})).filter(r=>r.lap!=null);
  },[race,leader]);
  if(series.length<4)return null;
  const temps=series.flatMap(s=>[s.track,s.air]).filter(v=>v!=null);
  const t0=Math.floor(Math.min(...temps)-1),t1=Math.ceil(Math.max(...temps)+1);
  const W=820,H=90,padL=52,padR=16,padT=8,padB=18;
  const x=l=>padL+(l/Math.max(1,maxLap))*(W-padL-padR);
  const y=v=>padT+(1-(v-t0)/(t1-t0))*(H-padT-padB);
  const line=k=>series.filter(s=>s[k]!=null).map((s,i)=>`${i?"L":"M"}${x(s.lap).toFixed(1)},${y(s[k]).toFixed(1)}`).join(" ");
  const rainy=series.filter(s=>s.rain);
  const first=series.find(s=>s.track!=null)||series[0],last=[...series].reverse().find(s=>s.track!=null)||series.at(-1);
  return(
    <div style={PANEL}>
      <PanelHead title="Weather" sub={`Track ${first.track}°C → ${last.track}°C · air ${first.air}°C → ${last.air}°C${rainy.length?" · rain shaded":" · no rain during the race"} · by race lap`}/>
      <svg role="img" aria-label="Track and air temperature through the race" viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
        {rainy.map((s,i)=><rect key={i} x={x(s.lap)-2} y={padT} width={4} height={H-padT-padB} fill={alpha("#0067AD",0x30)}/>)}
        {[t0,Math.round((t0+t1)/2),t1].map(v=><g key={v}><line x1={padL} x2={W-padR} y1={y(v)} y2={y(v)} stroke="var(--rule-faint)"/><text x={padL-8} y={y(v)+3} textAnchor="end" fontSize="10" fill="var(--w45)" fontFamily="var(--font-data)">{v}°</text></g>)}
        {[1,...Array.from({length:Math.floor(maxLap/10)},(_,i)=>(i+1)*10)].map(l=><text key={l} x={x(l)} y={H-4} textAnchor="middle" fontSize="10" fill="var(--w45)" fontFamily="var(--font-data)">{l}</text>)}
        <path d={line("track")} fill="none" stroke="var(--ink)" strokeWidth={1.8}/>
        <path d={line("air")} fill="none" stroke="var(--ink-4)" strokeWidth={1.2} strokeDasharray="4 3"/>
      </svg>
      <div style={{display:"flex",gap:16,fontSize:11,color:"var(--w60)",marginTop:4}}>
        <span><i style={{display:"inline-block",width:14,height:2,background:"var(--ink)",verticalAlign:"middle",marginRight:5}}/>Track</span>
        <span><i style={{display:"inline-block",width:14,height:0,borderTop:"1.5px dashed var(--ink-4)",verticalAlign:"middle",marginRight:5}}/>Air</span>
        {rainy.length>0&&<span><i style={{display:"inline-block",width:10,height:10,background:alpha("#0067AD",0x30),verticalAlign:"middle",marginRight:5}}/>Rain</span>}
      </div>
      <HowComputed>OpenF1's weather station readings, about one a minute, placed on the race's lap axis using the winner's lap start times. Track temperature drives tyre behaviour, so a cooling track often explains a late-race pace change.</HowComputed>
    </div>
  );
});

// ── Telemetry: mini-sector dominance on the track map ──────────────────────
function splitTrackInto(track,n){
  const pts=[...(track?.path||"").matchAll(/[ML]([0-9.]+),([0-9.]+)/g)].map(m=>[parseFloat(m[1]),parseFloat(m[2])]);
  if(pts.length<n)return null;
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const total=cum.at(-1),segs=[];
  let j=0;
  for(let k=0;k<n;k++){
    const end=(total*(k+1))/n,seg=[pts[j]];
    while(j<pts.length-1&&cum[j+1]<=end){j++;seg.push(pts[j]);}
    if(j<pts.length-1){const f=(end-cum[j])/(cum[j+1]-cum[j]||1);seg.push([pts[j][0]+f*(pts[j+1][0]-pts[j][0]),pts[j][1]+f*(pts[j+1][1]-pts[j][1])]);}
    segs.push(seg.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "));
  }
  return segs;
}

const MiniSectorPanel=memo(function MiniSectorPanel({race,track,trackName}){
  const N=25;
  const ms=useMemo(()=>miniSectors(race,N),[race]);
  const segs=useMemo(()=>splitTrackInto(track,N),[track]);
  if(!ms)return null;
  const seenTeam={};
  const style=Object.fromEntries(ms.runs.map(r=>{const second=!!seenTeam[r.team];seenTeam[r.team]=true;return[r.number,{col:inkify(r.teamColour)||"var(--ink-3)",dash:second?"6 4":null}];}));
  const byCount=[...ms.runs].sort((a,b)=>ms.count[b.number]-ms.count[a.number]);
  return(
    <div style={PANEL}>
      <PanelHead title="Mini-Sector Dominance" sub={`${trackName} · each fastest lap cut into ${N} equal stretches · each stretch drawn in the ink of whoever covered it quickest`}/>
      <div className="g2" style={{alignItems:"center"}}>
        {segs&&track?(
          <svg role="img" aria-label={`Mini-sector dominance map of ${trackName}`} viewBox={track.viewBox} preserveAspectRatio="xMidYMid meet" style={{width:"100%",maxHeight:320,display:"block",overflow:"visible"}}>
            <path d={track.path} fill="none" stroke="var(--w08)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"/>
            {segs.map((d,i)=>{const s=style[ms.winners[i]];return <path key={i} d={d} fill="none" stroke={s.col} strokeWidth={6} strokeDasharray={s.dash||undefined} strokeLinecap="butt" strokeLinejoin="round"><title>{`Stretch ${i+1}: ${ms.runs.find(r=>r.number===ms.winners[i])?.acronym}`}</title></path>;})}
          </svg>
        ):(
          <div className="num" style={{display:"flex",height:22}}>{ms.winners.map((w,i)=><div key={i} title={`Stretch ${i+1}`} style={{flex:1,background:style[w].col,opacity:style[w].dash?0.6:1,borderRight:"1px solid var(--sheet)"}}/>)}</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {byCount.map(r=>(
            <div key={r.number} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <svg aria-hidden="true" width={22} height={6}><line x1={0} x2={22} y1={3} y2={3} stroke={style[r.number].col} strokeWidth={5} strokeDasharray={style[r.number].dash||undefined}/></svg>
              <b style={{width:40}}>{r.acronym}</b>
              <span className="num" style={{width:64,color:"var(--w60)"}}>{fmtLap(r.lapTime)}</span>
              <span className="num" style={{color:"var(--w60)"}}>L{r.lap}</span>
              <span className="num" style={{marginLeft:"auto",fontWeight:700}}>{ms.count[r.number]}/{N}</span>
            </div>
          ))}
        </div>
      </div>
      <HowComputed>Only the six drivers with a recorded speed trace take part: each trace is the driver's fastest race lap, about 80 speed samples along the lap distance. Time for each stretch is distance over speed, scaled so the stretches add up to the real lap time. The outline is the circuit's map cut into {N} equal lengths, so stretches line up with the track only approximately. Team-mates share a colour; the second is dashed.</HowComputed>
    </div>
  );
});

// The Telemetry sheet runs to a dozen panels; its index jumps between these.
// Hash links can't be used (the hash routes the app), so buttons scroll instead.
const TEL_SECTIONS=[["tel-replay","Replay"],["tel-compare","Lap Compare"],["tel-laps","Lap times"],["tel-pace","Race pace"],["tel-tyres","Tyres"],["tel-positions","Positions"],["tel-gaps","Gaps"],["tel-speed","Speed"]];
function TelIndex({race}){
  const[active,setActive]=useState(TEL_SECTIONS[0][0]);
  useEffect(()=>{
    // the section crossing the upper third of the viewport is the current one
    const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)setActive(e.target.id);},{rootMargin:"-30% 0px -65% 0px"});
    for(const[id]of TEL_SECTIONS){const el=document.getElementById(id);if(el)io.observe(el);}
    return()=>io.disconnect();
  },[race]);
  // Phones scroll the index sideways: keep the current section's label in view
  const navRef=useRef(null);
  useEffect(()=>{
    const nav=navRef.current,b=nav?.querySelector("[aria-current]");
    if(!b||nav.scrollWidth<=nav.clientWidth)return;
    const nr=nav.getBoundingClientRect(),br=b.getBoundingClientRect();
    if(br.left<nr.left||br.right>nr.right)nav.scrollLeft+=br.left-nr.left-16;
  },[active]);
  return(
    <nav ref={navRef} className="tel-index" aria-label="Telemetry sections">
      {TEL_SECTIONS.map(([id,label])=>(
        <button key={id} type="button" aria-current={active===id?"true":undefined} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})}>{label}</button>
      ))}
    </nav>
  );
}

// ─── Telemetry tab — module-scope memo component so hover tooltips and 60fps
// playback frames re-render only this subtree, never the whole dashboard.
// Mounted only while the Telemetry tab is active, so the rAF clocks stop on
// unmount and the live-fetch effects can drop their tab guards.
const TelemetryTab=memo(function TelemetryTab({openf1,tracks,telMeetingKey,setTelMeetingKey,outByDay,openf1Status,meetingFailed,retryMeeting,retryIndex}){
  const[telSelected,setTelSelected]=useState(()=>new Set());
          // ── Shared derivations (memoized — several panels read these). Hooks must
          // run before the early-return guards below, so empty/loading cases are
          // handled with null fallbacks inside the memos.
          // Collect race sessions across meetings (only racing sessions have lap series + positions)
          const{raceMeetings,activeKey,cur,race}=useMemo(()=>{
            const raceMeetings=(openf1?.meetings||[])
              .map(m=>{
                const race=m.sessions.find(s=>s.sessionName==="Race");
                return race?{meeting:m,race}:null;
              })
              .filter(Boolean);
            if(raceMeetings.length===0)return{raceMeetings,activeKey:null,cur:null,race:null};
            const activeKey=telMeetingKey&&raceMeetings.find(rm=>rm.meeting.meetingKey===telMeetingKey)?telMeetingKey:raceMeetings[raceMeetings.length-1].meeting.meetingKey;
            const cur=raceMeetings.find(rm=>rm.meeting.meetingKey===activeKey);
            return{raceMeetings,activeKey,cur,race:cur.race};
          },[openf1,telMeetingKey]);
          // Phones scroll the race row sideways; keep the selected race in view
          // (the newest race sits at the far end, off-screen)
          const pillsRef=useRef(null);
          useLayoutEffect(()=>{
            const el=pillsRef.current,b=el?.querySelector('[aria-pressed="true"]');
            if(!b||el.scrollWidth<=el.clientWidth)return;
            const er=el.getBoundingClientRect(),br=b.getBoundingClientRect();
            el.scrollLeft+=br.left-er.left-(er.width-br.width)/2;
          },[activeKey,raceMeetings.length,race]); // `race` lands after the loading guard, when the row first exists
          // Default selection — finishing top 5. Use final position from per-lap snapshots.
          const{allDrivers,sortedByFinish,defaultSel}=useMemo(()=>{
            const allDrivers=race?.drivers||[];
            const finalPos=(d)=>{
              const ps=d.positions;
              if(!ps||ps.length===0)return 99;
              return ps[ps.length-1].p;
            };
            const sortedByFinish=[...allDrivers].sort((a,b)=>finalPos(a)-finalPos(b));
            const defaultSel=new Set(sortedByFinish.slice(0,5).map(d=>d.acronym));
            return{allDrivers,sortedByFinish,defaultSel};
          },[race]);
          const selected=telSelected.size>0?telSelected:defaultSel;
          const toggleTel=(acr)=>{
            setTelSelected(prev=>{
              const cur=prev.size>0?new Set(prev):new Set(defaultSel);
              if(cur.has(acr)){if(cur.size<=1)return cur;cur.delete(acr);}
              else if(cur.size<8){cur.add(acr);}
              return cur;
            });
          };
          const visibleDrivers=useMemo(()=>allDrivers.filter(d=>selected.has(d.acronym)),[allDrivers,selected]);
          // Max lap across all drivers — derive race length
          const maxLap=useMemo(()=>Math.max(1,...allDrivers.flatMap(d=>(d.lapTimes||[]).map(l=>l.l))),[allDrivers]);
          // For lap-time chart, ignore extreme outliers (safety car / first lap can skew scale)
          const{yMin,yMax}=useMemo(()=>{
            const allValidTimes=visibleDrivers.flatMap(d=>(d.lapTimes||[]).filter(l=>!l.pit).map(l=>l.t));
            allValidTimes.sort((a,b)=>a-b);
            const p10=allValidTimes[Math.floor(allValidTimes.length*0.05)]||0;
            const p95=allValidTimes[Math.floor(allValidTimes.length*0.95)]||1;
            return{yMin:Math.max(0,p10-1),yMax:p95+3}; // tail above for slow laps
          },[visibleDrivers]);
          if(!openf1)return openf1Status==="failed"
            ?<SheetStatus title="The telemetry sheet didn't load" detail="OpenF1 data is fetched separately from the results." onRetry={retryIndex}/>
            :openf1Status==="empty"?<SheetStatus title="No race telemetry yet" detail="The replay and lap charts appear after the season's first race."/>
            :<SheetStatus title="Loading telemetry data…"/>;
          if(raceMeetings.length===0)return <SheetStatus title="No race telemetry yet" detail="The replay and lap charts appear after the season's first race."/>;
          // Full meeting payload still streaming in (lazy-loaded per meeting). The
          // race picker stays up so a meeting that failed to load never traps the tab.
          if(!race.drivers)return(
            <div className="fu">
              <div role="group" aria-label="Race" style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {raceMeetings.map(rm=>(
                  <button key={rm.meeting.meetingKey} onClick={()=>{setTelMeetingKey(rm.meeting.meetingKey);setTelSelected(new Set());}} aria-pressed={activeKey===rm.meeting.meetingKey} style={{cursor:"pointer",padding:"6px 12px",borderRadius:2,border:"1px solid var(--w08)",background:activeKey===rm.meeting.meetingKey?"var(--panel)":"transparent",color:"var(--fg)",fontSize:12,fontWeight:activeKey===rm.meeting.meetingKey?700:500}}>{meetingTrackName(rm.meeting).replace(" Grand Prix","")}</button>
                ))}
              </div>
              {meetingFailed?.[cur.meeting.meetingKey]
                ?<SheetStatus title={`${meetingTrackName(cur.meeting)} didn't load`} detail="The meeting file failed to download." onRetry={()=>retryMeeting(cur.meeting.meetingKey)}/>
                :<SheetStatus title="Loading telemetry data…" detail={meetingTrackName(cur.meeting)}/>}
            </div>
          );
          return(
            <div className="fu" style={{display:"flex",flexDirection:"column",gap:24}}>
              {/* Meeting selector */}
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)"}}>Race</div>
                <div ref={pillsRef} className="race-pills" role="group" aria-label="Race">
                  {raceMeetings.map(rm=>(
                    <button key={rm.meeting.meetingKey} aria-pressed={activeKey===rm.meeting.meetingKey} onClick={()=>{setTelMeetingKey(rm.meeting.meetingKey);setTelSelected(new Set());}} style={{cursor:"pointer",padding:"6px 14px",borderRadius:2,border:activeKey===rm.meeting.meetingKey?"1px solid rgba(214,40,40,0.4)":"1px solid var(--w08)",background:activeKey===rm.meeting.meetingKey?"rgba(214,40,40,0.12)":"var(--w03)",color:activeKey===rm.meeting.meetingKey?"var(--red-ink)":"var(--w50)",fontSize:12,fontWeight:activeKey===rm.meeting.meetingKey?600:400,fontFamily:"var(--font-ui)"}}>{meetingTrackName(rm.meeting).replace(" Grand Prix","")}</button>
                  ))}
                </div>
              </div>

              <TelIndex race={race}/>

              {/* Race Replay — track dots + animated leaderboard + scrubber */}
              <section id="tel-replay" className="tel-sec">
              <ReplayPanel cur={cur} race={race} tracks={tracks} allDrivers={allDrivers} telMeetingKey={telMeetingKey} outNums={outByDay?.[meetingRaceDay(cur.meeting)]}/>

              </section>

              {/* Lap Compare — pick 2 drivers + 1 lap, live-fetch /car_data + /location */}
              <section id="tel-compare" className="tel-sec">
              <LapComparePanel openf1={openf1} telMeetingKey={telMeetingKey} allDrivers={allDrivers} cur={cur}/>
              </section>

              {/* Driver chips */}
              <section id="tel-laps" className="tel-sec">
              <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                  <div style={{fontSize:12,color:"var(--w50)",fontWeight:500}}>Drivers (click to toggle · max 8)</div>
                  <div style={{fontSize:10,color:"var(--w30)"}}>{visibleDrivers.length} selected</div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {sortedByFinish.map(d=>{
                    const on=selected.has(d.acronym);
                    const tc=inkify(d.teamColour)||"var(--fg)";
                    return(
                      <button className="chip" aria-pressed={on} key={d.acronym} onClick={()=>toggleTel(d.acronym)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:2,border:`1px solid ${on?tc:"var(--w08)"}`,background:on?`${alpha(tc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w50)",cursor:"pointer",fontSize:11,fontWeight:on?700:500,fontFamily:"var(--font-ui)"}}>
                        <div style={{width:3,height:11,background:tc,borderRadius:1,opacity:on?1:0.5}}/>
                        <span style={{letterSpacing:0.5}}>{d.acronym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lap Times Chart */}
              <LapTimesChart maxLap={maxLap} yMin={yMin} yMax={yMax} race={race} visibleDrivers={visibleDrivers}/>
              <WeatherStrip race={race} maxLap={maxLap}/>
              </section>

              {/* Race pace distribution */}
              <section id="tel-pace" className="tel-sec">
              <RacePacePanel race={race}/>
              </section>

              {/* Tire Stints */}
              <section id="tel-tyres" className="tel-sec">
              <TireStrategyPanel race={race} maxLap={maxLap} allDrivers={allDrivers} visibleDrivers={visibleDrivers}/>

              {/* Tire Management — degradation rates + stint pace vs compound benchmark */}
              <TireManagementPanel race={race} allDrivers={allDrivers} maxLap={maxLap}/>
              </section>

              {/* Position Evolution */}
              <section id="tel-positions" className="tel-sec">
              <PositionChartPanel maxLap={maxLap} visibleDrivers={visibleDrivers} race={race}/>
              </section>

              {/* Driver-vs-Driver Delta */}
              <section id="tel-gaps" className="tel-sec">
              <DeltaChartPanel allDrivers={allDrivers} maxLap={maxLap} race={race}/>
              </section>

              {/* Speed Trace */}
              <section id="tel-speed" className="tel-sec">
              <SpeedTracePanel allDrivers={allDrivers}/>

              {/* Mini-sectors from the speed traces */}
              <MiniSectorPanel race={race} track={tracks?.[meetingTrackName(cur.meeting)]} trackName={meetingTrackName(cur.meeting)}/>
              </section>
            </div>
          );
});

// ─── Race Replay panel — owns the playback clock, scrubber and dot-hover state
// so the 60fps animation frames re-render only this panel.
const ReplayPanel=memo(function ReplayPanel({cur,race,tracks,allDrivers,telMeetingKey,outNums}){
  // Race Replay state
  const[replayTime,setReplayTime]=useState(0); // seconds into the race
  const[replayPlaying,setReplayPlaying]=useState(false);
  const[replaySpeed,setReplaySpeed]=useState(8); // 1x, 2x, 4x, 8x, 16x — default 8 since real time is slow
  const[replayDotHover,setReplayDotHover]=useState(null); // {driverNumber, x, y}
  const replayDurationRef=useRef(0); // published by the Telemetry render; the rAF clock auto-pauses here

  // Race Replay clock — advances replayTime while playing, auto-pauses at race end
  useRafClock(replayPlaying,replaySpeed,replayTime,setReplayTime,setReplayPlaying,replayDurationRef);

  // Reset replay when meeting changes
  useEffect(()=>{setReplayTime(0);setReplayPlaying(false);},[telMeetingKey]);

  const trackKey=meetingTrackName(cur.meeting);
  // Track sampler + cumulative lap tables are static per race — memoized so the
  // 60fps playback frames don't re-parse the SVG path or rebuild the tables.
  const sampler=useMemo(()=>tracks?buildTrackSampler(tracks[trackKey]):null,[tracks,trackKey]);
  // Sector thirds for the underlay — same point list + viewBox as the track path, so
  // the segments drop straight into the replay svg's coordinate system.
  const sectors=useMemo(()=>tracks?splitTrackIntoSectors(tracks[trackKey]):null,[tracks,trackKey]);
  // Race duration = max cumulative race time across drivers
  const lapsByDriver=useMemo(()=>Object.fromEntries(allDrivers.map(d=>{
    const sorted=[...(d.lapTimes||[])].sort((a,b)=>a.l-b.l);
    let cum=0;const cumArr=[];for(const l of sorted){cum+=l.t;cumArr.push({l:l.l,cum,t:l.t});}
    return[d.number,{cumArr,total:cum}];
  })),[allDrivers]);
  // Gap-to-winner series for the mini chart: gap(d,lap)=cum[d][lap]−cum[winner][lap], where
  // winner = first in finishing order (most laps, then lowest total time). Static per race —
  // keyed only on lapsByDriver; colors/acronyms are looked up at render time.
  const gapSeries=useMemo(()=>{
    const entries=Object.entries(lapsByDriver).filter(([,v])=>v.cumArr.length>0);
    if(entries.length<2)return null;
    const lastLap=(v)=>v.cumArr[v.cumArr.length-1].l;
    const order=[...entries].sort((a,b)=>lastLap(b[1])-lastLap(a[1])||a[1].total-b[1].total);
    const winCum=new Map(order[0][1].cumArr.map(e=>[e.l,e.cum]));
    const CAP=60; // cap displayed gap — backmarkers would crush the scale
    const series=order.slice(0,6).map(([num,v])=>({
      number:parseInt(num),
      pts:v.cumArr.filter(e=>winCum.has(e.l)).map(e=>({l:e.l,gap:Math.min(CAP,e.cum-winCum.get(e.l))})),
    })).filter(s=>s.pts.length>=2);
    if(series.length===0)return null;
    const maxGap=Math.max(5,...series.flatMap(s=>s.pts.map(p=>p.gap)));
    const minGap=Math.min(0,...series.flatMap(s=>s.pts.map(p=>p.gap)));
    return{series,totalLaps:lastLap(order[0][1]),maxGap,minGap};
  },[lapsByDriver]);
  // Shared lap cursor: the Overview writes #…&r=N&lap=L; open the replay on that
  // lap — but only for the race it belongs to (it was re-applied to any race picked).
  useEffect(()=>{
    const p=hashParams();
    const L=parseInt(p.get("lap"));
    if(!Number.isFinite(L))return;
    const r=parseInt(p.get("r"));
    if(Number.isFinite(r)&&cur?.meeting?.round!=null&&r!==cur.meeting.round)return;
    const entries=Object.values(lapsByDriver).filter(v=>v.cumArr.length>0);
    if(L<=1||entries.length===0)return;
    const lead=[...entries].sort((a,b)=>b.cumArr.length-a.cumArr.length||a.total-b.total)[0];
    const e=lead.cumArr.find(x=>x.l===L-1);
    if(e){setReplayPlaying(false);setReplayTime(e.cum+0.01);}
  },[lapsByDriver,cur?.meeting?.round]);
  return (()=>{
                const raceDuration=Math.max(1,...Object.values(lapsByDriver).map(x=>x.total));
                replayDurationRef.current=raceDuration; // rAF clock auto-pauses here
                const totalLaps=Math.max(1,...Object.values(lapsByDriver).map(x=>x.cumArr.length?x.cumArr[x.cumArr.length-1].l:0));
                const tClamped=Math.max(0,Math.min(raceDuration,replayTime));
                // Compute state per driver at tClamped
                const driverStates=allDrivers.map(d=>{
                  const lb=lapsByDriver[d.number];
                  if(!lb||lb.cumArr.length===0)return{driver:d,progress:0,lap:0,lapInProgress:1,fracOfLap:0,finished:false,onTrack:false};
                  const lastLapNum=lb.cumArr[lb.cumArr.length-1].l;
                  let cum=0,lapDone=0,fracOfLap=0,finished=false;
                  for(let i=0;i<lb.cumArr.length;i++){
                    const e=lb.cumArr[i];
                    if(tClamped<=e.cum){
                      lapDone=e.l-1;
                      fracOfLap=(tClamped-(cum))/e.t;
                      break;
                    }
                    cum=e.cum;
                    lapDone=e.l;
                  }
                  if(tClamped>=lb.total){finished=true;fracOfLap=1;lapDone=lastLapNum;}
                  // finished drivers sit exactly at their last lap — no "Lap 59 of 57"
                  const progress=lapDone+(finished?0:fracOfLap);
                  const lapInProgress=finished?lastLapNum:Math.min(lapDone+1,lastLapNum);
                  return{driver:d,progress,lap:lapDone,lapInProgress,fracOfLap:Math.max(0,Math.min(1,fracOfLap)),finished,onTrack:!finished&&progress>0};
                });
                // Rank by progress descending — higher progress = further ahead
                const ranked=[...driverStates].sort((a,b)=>b.progress-a.progress);
                const leaderProgress=ranked[0]?.progress||0;
                // Compute current stint (compound) per driver at this race time
                const stintForDriver=(driverNumber,lapNum)=>{
                  const stints=(race.stints||[]).filter(s=>s.driverNumber===driverNumber);
                  return stints.find(s=>lapNum>=(s.lapStart||1)&&lapNum<=(s.lapEnd||999))||null;
                };
                // Race-control state at current time — need to map race time back to lap of leader (rough)
                const leaderLap=ranked[0]?.lapInProgress||1;
                const periods=race.raceControlPeriods||[];
                const yellowLaps=race.yellowFlagLaps||[];
                const activePeriod=periods.find(p=>leaderLap>=p.lapStart&&leaderLap<=p.lapEnd);
                const yellowActive=!activePeriod&&replayTime>0&&yellowLaps.includes(leaderLap);
                // Format helpers
                const fmtTime=(s)=>{const m=Math.floor(s/60);const sec=Math.floor(s%60);return`${m}:${String(sec).padStart(2,"0")}`;};
                const fmtGapToLeader=(d)=>{
                  if(d===ranked[0])return"LEADER";
                  // Lapped = a full lap of progress behind. Comparing laps completed made a
                  // car 3 s back read "+1 lap" whenever the leader had just crossed the line.
                  const lapsBehind=Math.floor(leaderProgress-d.progress);
                  if(lapsBehind>=1)return`+${lapsBehind} lap${lapsBehind>1?"s":""}`;
                  // Same lap — approximate seconds gap using leader's current lap pace
                  const leadCurLapTime=ranked[0]?(ranked[0].finished?lapsByDriver[ranked[0].driver.number]?.cumArr.slice(-1)[0]?.t||90:(lapsByDriver[ranked[0].driver.number]?.cumArr[ranked[0].lap]?.t||90)):90;
                  const fracGap=leaderProgress-d.progress;
                  return`+${(fracGap*leadCurLapTime).toFixed(2)}s`;
                };
                // Scrubber period bars
                const scrubberPeriods=periods.map(p=>{
                  // Find race time at start and end of period (use leader's pace approximation)
                  const leadCum=lapsByDriver[ranked[0]?.driver?.number]?.cumArr||[];
                  const tAt=(lap)=>{const e=leadCum.find(x=>x.l===lap);return e?e.cum:null;};
                  const ts=tAt(p.lapStart),te=tAt(p.lapEnd);
                  return ts!=null&&te!=null?{type:p.type,start:ts,end:te}:null;
                }).filter(Boolean);
                const periodStyle={SC:{fill:"var(--yellow)",label:"SC"},VSC:{fill:"var(--amber)",label:"VSC"},RED:{fill:"var(--red)",label:"RED"}};
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:18,marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14,flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700}}>Race Replay</div>
                        <div style={{fontSize:11,color:"var(--w40)",marginTop:2}}>{meetingTrackName(cur.meeting)} · Lap {leaderLap} of {totalLaps} · {fmtTime(tClamped)}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <button aria-label={replayPlaying?"Pause replay":"Play replay"} onClick={()=>{if(replayTime>=raceDuration-0.5)setReplayTime(0);setReplayPlaying(p=>!p);}} style={{width:38,height:38,borderRadius:"50%",border:"1px solid var(--w15)",background:replayPlaying?"rgba(214,40,40,0.18)":"var(--w06)",color:"var(--fg)",cursor:"pointer",fontSize:14,fontFamily:"var(--font-ui)",display:"flex",alignItems:"center",justifyContent:"center"}}>{replayPlaying?<IcoPause/>:<IcoPlay/>}</button>
                        <button onClick={()=>{setReplayPlaying(false);setReplayTime(0);}} title="Restart" aria-label="Restart replay" style={{width:30,height:30,borderRadius:2,border:"1px solid var(--w08)",background:"var(--w03)",color:"var(--w55)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-ui)"}}><IcoRestart/></button>
                        <div style={{display:"flex",gap:3,border:"1px solid var(--w08)",borderRadius:2,padding:2,background:"var(--w02)"}}>
                          {[1,2,4,8,16].map(s=>(
                            <button key={s} onClick={()=>setReplaySpeed(s)} style={{padding:"3px 9px",borderRadius:2,border:"none",background:replaySpeed===s?"rgba(214,40,40,0.18)":"transparent",color:replaySpeed===s?"var(--fg)":"var(--w50)",cursor:"pointer",fontSize:10,fontWeight:replaySpeed===s?700:500,fontFamily:"var(--font-ui)"}}>{s}×</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Scrubber */}
                    <div style={{position:"relative",height:28,marginBottom:14}}>
                      <div style={{position:"absolute",inset:"12px 0",borderRadius:2,background:"var(--w04)"}}/>
                      {scrubberPeriods.map((p,i)=>{
                        const st=periodStyle[p.type];if(!st)return null;
                        const left=(p.start/raceDuration)*100;
                        const width=((p.end-p.start)/raceDuration)*100;
                        return<div key={i} title={`${st.label} L${periods[i]?.lapStart}-${periods[i]?.lapEnd}`} style={{position:"absolute",top:11,left:`${left}%`,width:`${Math.max(0.5,width)}%`,height:6,background:st.fill,opacity:0.45,borderRadius:1}}/>;
                      })}
                      <input type="range" aria-label="Race time" min={0} max={Math.floor(raceDuration)} step={0.5} value={tClamped} onChange={(e)=>{setReplayPlaying(false);setReplayTime(parseFloat(e.target.value));}} style={{position:"absolute",inset:0,width:"100%",height:28,margin:0,background:"transparent",appearance:"none",WebkitAppearance:"none",cursor:"pointer"}}/>
                      <style>{`input[type=range]::-webkit-slider-thumb{appearance:none;width:14px;height:22px;border-radius:3px;background:var(--red);border:2px solid var(--sheet);cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.35)}input[type=range]::-moz-range-thumb{width:14px;height:22px;border-radius:3px;background:var(--red);border:2px solid var(--sheet);cursor:pointer}input[type=range]::-webkit-slider-runnable-track{background:transparent}input[type=range]::-moz-range-track{background:transparent}`}</style>
                    </div>
                    {/* Race control banner */}
                    {(activePeriod||yellowActive)&&(()=>{
                      let label,color,bg;
                      if(activePeriod){const st=periodStyle[activePeriod.type];label=st?.label||activePeriod.type;color=st?.fill||"var(--fg)";bg=`${alpha(color,0x22)}`;}
                      else{label="LOCAL YELLOW";color="var(--yellow)";bg="rgba(255,200,0,0.10)";}
                      return(
                        <div style={{padding:"6px 12px",background:bg,border:`1px solid ${alpha(color,0x55)}`,borderRadius:2,marginBottom:14,fontSize:11,fontWeight:700,letterSpacing:1,color,textTransform:"uppercase",display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:8,height:8,background:color,borderRadius:"50%",animation:"pulse 1.2s ease-in-out infinite"}}/>{label} active
                        </div>
                      );
                    })()}
                    {/* Main: track + leaderboard */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:18,alignItems:"start"}} className="replay-grid">
                      {/* Track with driver dots */}
                      <div data-replay-track style={{position:"relative",background:"var(--w03)",border:"1px solid var(--w04)",borderRadius:2,padding:14}}>
                        {sampler&&tracks?.[trackKey]?(()=>{
                          const t=tracks[trackKey];
                          // Compute pixel positions per driver
                          const dotPositions=driverStates
                            .filter(s=>s.onTrack||s.finished)
                            .map(s=>({...s,pt:sampler.sample(s.fracOfLap)}));
                          return(
                            <svg role="img" aria-label="Race replay: every car's position on the circuit at the current race time" viewBox={t.viewBox} preserveAspectRatio="xMidYMid meet" style={{width:"100%",height:440,display:"block",overflow:"visible",touchAction:"pan-y"}}>
                              {/* Sector underlay — S1/S2/S3 thirds in faint hues beneath the track line */}
                              {sectors&&(()=>{
                                const segs=[{d:sectors.s1,c:"var(--purple)"},{d:sectors.s2,c:"var(--green)"},{d:sectors.s3,c:"#FF8000"}];
                                const m=sectors.s1.match(/^M([0-9.]+),([0-9.]+)/);
                                const starts=[m?[parseFloat(m[1]),parseFloat(m[2])]:null,sectors.boundaries[0],sectors.boundaries[1]];
                                return(
                                  <g pointerEvents="none">
                                    {segs.map((s,i)=><path key={i} d={s.d} fill="none" stroke={s.c} strokeOpacity={0.25} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"/>)}
                                    {starts.map((p,i)=>p&&(
                                      <text key={"sl"+i} x={p[0]+1.5} y={p[1]-1.5} fontSize="3.6" fontWeight="700" fill={segs[i].c} fillOpacity={0.6} fontFamily="var(--font-ui)">S{i+1}</text>
                                    ))}
                                  </g>
                                );
                              })()}
                              <path d={t.path} fill="none" stroke="var(--w14)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                              {/* Dots */}
                              {dotPositions.map(s=>{
                                const tc=inkify(s.driver.teamColour)||"var(--fg)";
                                const isLeader=ranked[0]?.driver?.number===s.driver.number;
                                const isHovered=replayDotHover?.driverNumber===s.driver.number;
                                return(
                                  <g key={s.driver.number} style={{transition:"transform 0.15s linear",cursor:"pointer"}}
                                    onPointerEnter={(e)=>{const r=e.currentTarget.getBoundingClientRect();const card=e.currentTarget.closest('[data-replay-track]').getBoundingClientRect();setReplayDotHover({driverNumber:s.driver.number,x:(r.left-card.left)+r.width/2,y:(r.top-card.top)});}}
                                    onPointerLeave={()=>setReplayDotHover(null)}>
                                    {/* Larger transparent hit area for easier hovering */}
                                    <circle cx={s.pt[0]} cy={s.pt[1]} r={3.5} fill="transparent"/>
                                    <circle cx={s.pt[0]} cy={s.pt[1]} r={(isLeader?1.9:1.5)*(isHovered?1.4:1)} fill={tc} stroke="var(--bench)" strokeWidth={0.5} opacity={s.finished?0.4:1}/>
                                    {(isLeader||isHovered)&&<circle cx={s.pt[0]} cy={s.pt[1]} r={isHovered?3.6:2.8} fill="none" stroke={tc} strokeWidth={isHovered?0.7:0.4} opacity={isHovered?0.9:0.7}/>}
                                  </g>
                                );
                              })}
                            </svg>
                          );
                        })():(
                          <div style={{textAlign:"center",padding:80,color:"var(--w30)",fontSize:12}}>Track outline not available</div>
                        )}
                        {/* Dot hover tooltip */}
                        {replayDotHover&&(()=>{
                          const s=driverStates.find(x=>x.driver.number===replayDotHover.driverNumber);
                          if(!s)return null;
                          const d=s.driver;
                          const stint=stintForDriver(d.number,s.lapInProgress||Math.floor(s.progress)+1);
                          const compound=(stint?.compound||"").toUpperCase();
                          const ccol=COMPOUND_COLORS[compound]||"var(--ink-4)";
                          const rank=ranked.findIndex(r=>r.driver.number===d.number)+1;
                          return(
                            <div style={{position:"absolute",left:replayDotHover.x,top:replayDotHover.y-58,transform:"translateX(-50%)",background:"var(--panel-2)",border:`1px solid ${inkify(d.teamColour)||"var(--fg)"}55`,borderRadius:2,padding:"8px 12px",pointerEvents:"none",boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)",zIndex:20,minWidth:140}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                                <div style={{fontSize:10,fontWeight:800,color:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",minWidth:18}}>P{rank}</div>
                                <div style={{width:3,height:14,background:inkify(d.teamColour)||"var(--fg)",borderRadius:1}}/>
                                <div style={{fontSize:13,fontWeight:700,letterSpacing:0.3}}>{d.acronym}</div>
                                {compound&&<div style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:2,background:ccol,fontSize:9,fontWeight:800,color:compoundInk(compound)}}>{compound[0]}</div>}
                              </div>
                              <div style={{fontSize:11,color:"var(--w60)",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name||d.acronym}</div>
                              <div style={{fontSize:10,color:inkify(d.teamColour)||"var(--w50)",fontWeight:600}}>{normTeam(d.team||"")}</div>
                              <div style={{fontSize:10,color:"var(--w45)",marginTop:4,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{s.finished?"Finished":`Lap ${(s.lapInProgress||Math.floor(s.progress)+1)} · ${Math.round(s.fracOfLap*100)}% around`}</div>
                            </div>
                          );
                        })()}
                        <div style={{position:"absolute",bottom:8,right:12,fontSize:10,color:"var(--w30)",fontStyle:"italic"}}>Dots interpolated from cumulative lap times</div>
                      </div>
                      {/* Leaderboard — fixed height matching track, scrollable if needed */}
                      <div style={{display:"flex",flexDirection:"column",gap:2,height:468,overflowY:"auto",paddingRight:4}}>
                        <div style={{display:"grid",gridTemplateColumns:"20px 26px 1fr 22px 50px",gap:5,padding:"2px 7px",fontSize:9,textTransform:"uppercase",letterSpacing:0.8,color:"var(--ink-3)",fontWeight:600,position:"sticky",top:0,background:"var(--sheet)",zIndex:1}}>
                          <div>P</div><div/><div>Driver</div><div style={{textAlign:"center"}}>T</div><div style={{textAlign:"right"}}>Gap</div>
                        </div>
                        {ranked.map((s,idx)=>{
                          const d=s.driver;
                          const tc=inkify(d.teamColour)||"var(--fg)";
                          const stint=stintForDriver(d.number,s.lapInProgress||Math.floor(s.progress)+1);
                          const compound=(stint?.compound||"").toUpperCase();
                          const ccol=COMPOUND_COLORS[compound]||"var(--w20)";
                          return(
                            <div key={d.number} style={{display:"grid",gridTemplateColumns:"20px 26px 1fr 22px 50px",gap:5,padding:"4px 7px",alignItems:"center",background:idx<3?`${alpha(tc,0x14)}`:"var(--w02)",border:idx<3?`1px solid ${alpha(tc,0x30)}`:"1px solid var(--w04)",borderRadius:2,opacity:s.finished?0.55:1,transition:"opacity 0.2s"}}>
                              <div style={{fontSize:11,fontWeight:800,color:idx<3?tc:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{idx+1}</div>
                              <div style={{width:3,height:16,background:tc,borderRadius:1.5}}/>
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.1}}>{d.acronym}</div>
                                <div style={{fontSize:8,color:"var(--w40)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.1,marginTop:1}}>L{Math.floor(s.progress)+(s.finished?0:1)}{s.finished?(outNums?.has(String(d.number))?" · OUT":" · FIN"):""}</div>
                              </div>
                              <div style={{textAlign:"center"}}>
                                {compound&&<div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:2,background:ccol,fontSize:9,fontWeight:800,color:compoundInk(compound)}}>{compound[0]}</div>}
                              </div>
                              <div style={{textAlign:"right",fontSize:10,fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:idx===0?"var(--green)":"var(--w60)"}}>{fmtGapToLeader(s)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Gap-to-winner mini chart — playhead follows the current leader's lap */}
                    {gapSeries&&(()=>{
                      const{series,totalLaps:gTL,maxGap,minGap}=gapSeries;
                      const W=800,H=120,padL=40,padR=14,padT=10,padB=22;
                      const plotW=W-padL-padR,plotH=H-padT-padB;
                      const xOf=l=>padL+((l-1)/Math.max(1,gTL-1))*plotW;
                      const yOf=g=>padT+((g-minGap)/Math.max(0.001,maxGap-minGap))*plotH; // smaller gap = higher
                      const phLap=Math.max(1,Math.min(gTL,leaderLap));
                      return(
                        <div style={{marginTop:14,background:"var(--w03)",border:"1px solid var(--w04)",borderRadius:2,padding:"12px 14px"}}>
                          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w40)",fontWeight:600,marginBottom:8}}>Gap to winner (s) by lap · top 6 finishers · capped at 60s</div>
                          <svg role="img" aria-label="Gap to the winner by lap for the top six finishers" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:120,display:"block"}}>
                            {[minGap,(minGap+maxGap)/2,maxGap].map((g,i)=>(
                              <g key={i}>
                                <line x1={padL} x2={W-padR} y1={yOf(g)} y2={yOf(g)} stroke="var(--w06)"/>
                                <text x={padL-6} y={yOf(g)+3} textAnchor="end" fill="var(--w40)" fontSize="9" fontFamily="var(--font-ui)">{Math.round(g)}</text>
                              </g>
                            ))}
                            {Array.from({length:5},(_,i)=>Math.round(1+(i/4)*(gTL-1))).map((l,i)=>(
                              <text key={i} x={xOf(l)} y={H-padB+14} textAnchor="middle" fill="var(--w45)" fontSize="9" fontFamily="var(--font-ui)">L{l}</text>
                            ))}
                            {series.map(s=>{
                              const drv=allDrivers.find(d=>d.number===s.number);
                              const tc=drv?.teamColour||"var(--fg)";
                              return <path key={s.number} d={s.pts.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.gap)}`).join(" ")} stroke={tc} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>;
                            })}
                            <line x1={xOf(phLap)} x2={xOf(phLap)} y1={padT} y2={padT+plotH} stroke="var(--w35)" strokeWidth={1} strokeDasharray="3 3"/>
                          </svg>
                          <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap",fontSize:10,color:"var(--w55)"}}>
                            {series.map(s=>{
                              const drv=allDrivers.find(d=>d.number===s.number);
                              if(!drv)return null;
                              return <span key={s.number} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:2,background:inkify(drv.teamColour)||"var(--fg)",display:"inline-block"}}/>{drv.acronym}</span>;
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })();
});

// ─── Lap Compare panel — owns driver/lap selection, the on-demand OpenF1
// telemetry fetch + cache, the playback clock and zoom/pan, so 60fps playback
// frames and fetch-state updates re-render only this panel.
const LapComparePanel=memo(function LapComparePanel({openf1,telMeetingKey,allDrivers,cur}){
  // Lap Compare state — pick two drivers, click a lap, live-fetch /car_data + /location
  const[lapCompareA,setLapCompareA]=useState(null); // acronym
  const[lapCompareB,setLapCompareB]=useState(null);
  const[lapCompareLap,setLapCompareLap]=useState(null);
  const[lapCompareData,setLapCompareData]=useState({}); // cache: key `${session}-${driverNum}-${lap}` → {samples, error, loading}
  const[lapComparePlayTime,setLapComparePlayTime]=useState(0);
  const[lapComparePlaying,setLapComparePlaying]=useState(false);
  const[lapCompareRetry,setLapCompareRetry]=useState(0); // bump to force effect re-fire
  const[lapZoom,setLapZoom]=useState(1.6); // viewBox zoom multiplier
  const[lapPan,setLapPan]=useState({x:0,y:0}); // viewBox pan in fitted-vb units
  const lapPlayDurationRef=useRef(0); // published by the Lap Compare render
  const lapDragRef=useRef(null);
  const lapSvgRef=useRef(null); // track-view svg — gets a non-passive wheel listener
  const lapViewGeoRef=useRef(null); // {fittedW,fittedH} published by the track-view render
  const lapZoomRef=useRef(lapZoom);lapZoomRef.current=lapZoom; // fresh mirrors for the wheel handler
  const lapPanRef=useRef(lapPan);lapPanRef.current=lapPan;
  const lapFetchRun=useRef(0); // id of the latest fetch run, so a cancelled run can't clear a newer one's marker
  const lapCompareDataRef=useRef(lapCompareData);
  lapCompareDataRef.current=lapCompareData; // fresh mirror so the fetch effect can read the cache without depending on it

  // Lap Compare playback clock — auto-pauses at the end of the lap
  useRafClock(lapComparePlaying,1,lapComparePlayTime,setLapComparePlayTime,setLapComparePlaying,lapPlayDurationRef);

  // Reset lap compare selection when meeting changes
  useEffect(()=>{setLapCompareLap(null);setLapComparePlaying(false);setLapComparePlayTime(0);setLapZoom(1.6);setLapPan({x:0,y:0});},[telMeetingKey]);
  // Reset zoom/pan when lap or drivers change
  useEffect(()=>{setLapZoom(1.6);setLapPan({x:0,y:0});},[lapCompareLap,lapCompareA,lapCompareB]);

  // Auto-select a default lap (Driver A's fastest valid lap) when none is chosen.
  // Lives in its own effect so the fetch effect below never invalidates itself by
  // setting state it depends on — that used to abort its own in-flight fetch and
  // strand the cache on {loading:true} forever.
  useEffect(()=>{
    if(!openf1||lapCompareLap)return;
    const cur=lapCompareTarget(openf1,telMeetingKey);
    if(!cur)return;
    const{drA}=pickLapCompareDrivers(cur,lapCompareA,lapCompareB);
    if(!drA)return;
    const fastestA=(drA.lapTimes||[]).filter(l=>l.ds&&!l.pit).reduce((a,b)=>(!a||b.t<a.t)?b:a,null);
    if(fastestA?.l)setLapCompareLap(fastestA.l);
  },[openf1,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap]);

  // Fetch lap telemetry for both drivers. The default view (top two finishers on
  // the winner's fastest lap) ships precomputed in the meeting file, so opening
  // the tab makes no live calls; other laps come from OpenF1 through
  // openf1Fetch, which spaces requests and waits out 429s. This component only
  // mounts while the Telemetry tab is open — most visitors never hit the live API.
  //
  // The effect keys off the session and whether its meeting file has loaded, not
  // the whole openf1 object: re-running whenever any other meeting landed
  // aborted driver A's request mid-flight and stranded the panel on "Waiting…".
  const lapCur=openf1?lapCompareTarget(openf1,telMeetingKey):null;
  const lapSessionKey=lapCur?.race?.sessionKey;
  const lapCurLoaded=!!lapCur?.race?.drivers;
  const openf1Ref=useRef(openf1);
  openf1Ref.current=openf1;
  useEffect(()=>{
    const of1=openf1Ref.current;
    if(!of1||!lapCompareLap||!lapCurLoaded)return;
    const cur=lapCompareTarget(of1,telMeetingKey);
    if(!cur)return;
    const{drA,drB}=pickLapCompareDrivers(cur,lapCompareA,lapCompareB);
    if(!drA||!drB)return;
    const sessionKey=cur.race.sessionKey;
    const lap=lapCompareLap;
    const pre=cur.race.lapCompareDefault;
    const runId=++lapFetchRun.current;
    let cancelled=false;
    const controllers=[];
    const fetchDriver=async(drv)=>{
      const key=`${sessionKey}-${drv.number}-${lap}`;
      if(cancelled)return;
      const cached=lapCompareDataRef.current[key];
      if(cached&&(cached.samples||cached.error))return; // settled — only Retry clears it
      const ltEntry=(drv.lapTimes||[]).find(l=>l.l===lap);
      if(!ltEntry?.ds){setLapCompareData(prev=>({...prev,[key]:{loading:false,error:"No timestamp for this lap"}}));return;}
      // Precomputed at build time for the default pair and lap
      const raw=pre&&pre.lap===lap?pre.drivers?.[drv.number]:null;
      if(raw){
        const samples=expandLapCompare(raw);
        if(samples.length>=3){setLapCompareData(prev=>({...prev,[key]:{samples,loading:false}}));return;}
      }
      // sessionStorage next — laps are immutable once the session is over, so a
      // revisit (or tab round-trip) should never re-hit the OpenF1 API.
      try{
        const stored=sessionStorage.getItem(`lapTel2:${key}`);
        if(stored){
          const samples=JSON.parse(stored);
          if(Array.isArray(samples)&&samples.length>=3){setLapCompareData(prev=>({...prev,[key]:{samples,loading:false}}));return;}
        }
      }catch{/* parse/quota issues — fall through to the network */}
      // Tagged with this run, so a cancelled run can only clear its own marker
      setLapCompareData(prev=>({...prev,[key]:{loading:true,run:runId}}));
      const controller=new AbortController();
      controllers.push(controller);
      const timeoutId=setTimeout(()=>controller.abort(),25000); // per driver, including rate-limit waits
      try{
        const startMs=new Date(ltEntry.ds).getTime();
        const endMs=startMs+ltEntry.t*1000+500;
        const startIso=new Date(startMs).toISOString();
        const endIso=new Date(endMs).toISOString();
        const base=`https://api.openf1.org/v1`;
        const fail=(res,what)=>new Error(res.status===404?`OpenF1 has no ${what} for this session yet — recent races can lag a few days`:res.status===429?"OpenF1 is rate-limiting live telemetry right now. Wait a few seconds, then Retry.":`OpenF1 ${what} request failed (HTTP ${res.status})`);
        const carRes=await openf1Fetch(`${base}/car_data?session_key=${sessionKey}&driver_number=${drv.number}&date>=${startIso}&date<=${endIso}`,controller.signal);
        if(!carRes.ok)throw fail(carRes,"car telemetry");
        const carData=await carRes.json();
        const locRes=await openf1Fetch(`${base}/location?session_key=${sessionKey}&driver_number=${drv.number}&date>=${startIso}&date<=${endIso}`,controller.signal);
        if(!locRes.ok)throw fail(locRes,"location data");
        const location=await locRes.json();
        if(!carData||carData.length===0||!location||location.length<3)throw new Error("No samples returned (lap may predate live data)");
        const samples=processLapTelemetry(carData,location);
        if(samples.length<3)throw new Error("Could not align speed and location samples");
        try{sessionStorage.setItem(`lapTel2:${key}`,JSON.stringify(samples));}catch{/* quota full — cache is best-effort */}
        setLapCompareData(prev=>({...prev,[key]:{samples,loading:false}}));
      }catch(err){
        if(err.name==="AbortError"&&cancelled){
          // Lap/driver changed mid-fetch — clear this run's pending marker (a newer
          // run may already own the key) so the next run fetches it fresh.
          setLapCompareData(prev=>{if(!prev[key]?.loading||prev[key].run!==runId)return prev;const n={...prev};delete n[key];return n;});
        }else if(err.name==="AbortError"){
          setLapCompareData(prev=>({...prev,[key]:{loading:false,error:"Timed out — OpenF1 may be slow. Retry in a moment."}}));
        }else{
          setLapCompareData(prev=>({...prev,[key]:{loading:false,error:err.message||"fetch failed"}}));
        }
      }finally{
        clearTimeout(timeoutId);
      }
    };
    // Sequential, and openf1Fetch spaces the calls — four back-to-back requests
    // tripped OpenF1's free-tier rate limit on first open
    (async()=>{await fetchDriver(drA);if(!cancelled)await fetchDriver(drB);})();
    return()=>{cancelled=true;controllers.forEach(c=>c.abort());};
  },[lapSessionKey,lapCurLoaded,telMeetingKey,lapCompareA,lapCompareB,lapCompareLap,lapCompareRetry]);

  // ── Selection + loaded samples, hoisted out of the render IIFE so the heavy
  // per-lap series below can live in useMemo (hooks can't sit behind its early returns)
  const usable=allDrivers.filter(d=>(d.lapTimes||[]).filter(l=>l.ds).length>=3);
  // Default to top 2 finishers
  const finalPos=(d)=>{const ps=d.positions;if(!ps||ps.length===0)return 99;return ps[ps.length-1].p;};
  const sortedByFinish=[...usable].sort((a,b)=>finalPos(a)-finalPos(b));
  const acrA=lapCompareA&&usable.find(d=>d.acronym===lapCompareA)?lapCompareA:sortedByFinish[0]?.acronym;
  const acrB=lapCompareB&&usable.find(d=>d.acronym===lapCompareB)?lapCompareB:sortedByFinish[1]?.acronym;
  const drA=usable.find(d=>d.acronym===acrA);
  const drB=usable.find(d=>d.acronym===acrB);
  // Cache key helper — fetching is handled by the consolidated useEffect
  const keyFor=(drv,lap)=>`${cur.race.sessionKey}-${drv.number}-${lap}`;
  const keyA=lapCompareLap&&drA&&cur?keyFor(drA,lapCompareLap):null;
  const keyB=lapCompareLap&&drB&&cur?keyFor(drB,lapCompareLap):null;
  const dataA=keyA?lapCompareData[keyA]:null;
  const dataB=keyB?lapCompareData[keyB]:null;
  const samplesA=dataA?.samples||null;
  const samplesB=dataB?.samples||null;
  const lapTimeA=lapCompareLap?drA?.lapTimes?.find(l=>l.l===lapCompareLap)?.t:null;
  const lapTimeB=lapCompareLap?drB?.lapTimes?.find(l=>l.l===lapCompareLap)?.t:null;
  // Broadcast gap series: delta(f)=tA(f)−tB(f) at 200 distance fractions (t as a function of d,
  // both monotonic). Positive = A behind B. Samples extend ~500ms past the finish line, so each
  // driver is trimmed at their official lap time (with an interpolated finish-line point) — that
  // pins delta(1) to exactly lapTimeA−lapTimeB instead of sampling-tail noise. Memoized — playback
  // re-renders at 60fps and must only pay for playhead interpolation.
  const lapDeltaSeries=useMemo(()=>{
    if(!samplesA||!samplesB||samplesA.length<3||samplesB.length<3)return null;
    const trim=(ss,lapT)=>{
      if(!lapT)return ss;
      const out=ss.filter(s=>s.t<=lapT);
      if(out.length<3)return ss;
      const last=out[out.length-1],next=ss[out.length];
      if(next&&next.t>last.t){const f=(lapT-last.t)/(next.t-last.t);out.push({...last,t:lapT,d:last.d+f*(next.d-last.d)});}
      return out;
    };
    const A=trim(samplesA,lapTimeA),B=trim(samplesB,lapTimeB);
    const tAt=(ss,frac)=>{const tot=ss[ss.length-1].d||1;const target=frac*tot;let lo=0,hi=ss.length-1;while(lo<hi-1){const mid=(lo+hi)>>1;if(ss[mid].d<=target)lo=mid;else hi=mid;}const seg=ss[hi].d-ss[lo].d||1;const f=(target-ss[lo].d)/seg;return ss[lo].t+f*(ss[hi].t-ss[lo].t);};
    const N=200,pts=[{f:0,delta:0}];let mx=0;
    for(let i=1;i<=N;i++){const f=i/N;const delta=tAt(A,f)-tAt(B,f);mx=Math.max(mx,Math.abs(delta));pts.push({f,delta});}
    const yMax=Math.max(0.1,mx*1.15);
    const dW=800,dH=120,dPadL=44,dPadR=20,dPadT=12,dPadB=20,pw=dW-dPadL-dPadR,ph=dH-dPadT-dPadB;
    const xOf=f=>dPadL+f*pw,yOf=v=>dPadT+ph/2-(Math.max(-yMax,Math.min(yMax,v))/yMax)*(ph/2);
    const line=pts.map((p,i)=>`${i===0?"M":"L"}${xOf(p.f)},${yOf(p.delta)}`).join(" ");
    const area=`M${xOf(0)},${yOf(0)} `+pts.map(p=>`L${xOf(p.f)},${yOf(p.delta)}`).join(" ")+` L${xOf(1)},${yOf(0)} Z`;
    return{pts,yMax,line,area,geo:{dW,dH,dPadL,dPadR,dPadT,dPadB,pw,ph}};
  },[samplesA,samplesB,lapTimeA,lapTimeB]);
  // Track outline split into runs colored by whoever is faster at that distance fraction.
  // Mirrors the render IIFE's projection exactly (bbox over both drivers, auto-rotate, 4% pad).
  const lapTrackRuns=useMemo(()=>{
    if(!samplesA||!samplesB||samplesA.length<3||samplesB.length<3)return null;
    const allPts=[...samplesA,...samplesB];
    const xs=allPts.map(p=>p.x),ys=allPts.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs);
    const minY=Math.min(...ys),maxY=Math.max(...ys);
    const rotate=(maxY-minY)>(maxX-minX);
    const toLocal=(x,y)=>rotate?[(y-minY),(x-minX)]:[(x-minX),(maxY-y)];
    const localSpanX=rotate?(maxY-minY):(maxX-minX)||1;
    const localSpanY=rotate?(maxX-minX):(maxY-minY)||1;
    const px=localSpanX*0.04,py=localSpanY*0.04;
    const pX=(x,y)=>toLocal(x,y)[0]+px,pY=(x,y)=>toLocal(x,y)[1]+py;
    const totA=samplesA[samplesA.length-1].d||1,totB=samplesB[samplesB.length-1].d||1;
    const spdBAt=(frac)=>{const target=Math.max(0,Math.min(1,frac))*totB;let lo=0,hi=samplesB.length-1;while(lo<hi-1){const mid=(lo+hi)>>1;if(samplesB[mid].d<=target)lo=mid;else hi=mid;}const seg=samplesB[hi].d-samplesB[lo].d||1;const f=(target-samplesB[lo].d)/seg;return(samplesB[lo].speed||0)+f*((samplesB[hi].speed||0)-(samplesB[lo].speed||0));};
    const runs=[];let run=null;
    for(let i=1;i<samplesA.length;i++){
      const p0=samplesA[i-1],p1=samplesA[i];
      const aFaster=((p0.speed||0)+(p1.speed||0))/2>=spdBAt(((p0.d+p1.d)/2)/totA);
      if(run&&run.aFaster===aFaster)run.d+=` L${pX(p1.x,p1.y)},${pY(p1.x,p1.y)}`;
      else{run={aFaster,d:`M${pX(p0.x,p0.y)},${pY(p0.x,p0.y)} L${pX(p1.x,p1.y)},${pY(p1.x,p1.y)}`};runs.push(run);}
    }
    return runs;
  },[samplesA,samplesB]);
  // Throttle/brake strip path strings (x = own-lap distance fraction, y = 0-100%)
  const lapStripPaths=useMemo(()=>{
    if(!samplesA||!samplesB||samplesA.length<3||samplesB.length<3)return null;
    const sW=800,sH=52,sPadL=44,sPadR=20,sPadT=10,sPadB=6,pw=sW-sPadL-sPadR,ph=sH-sPadT-sPadB;
    const totA=samplesA[samplesA.length-1].d||1,totB=samplesB[samplesB.length-1].d||1;
    const yOf=v=>sPadT+ph-(Math.max(0,Math.min(100,v||0))/100)*ph;
    const mk=(ss,tot,fld)=>ss.map((s,i)=>`${i===0?"M":"L"}${sPadL+(s.d/tot)*pw},${yOf(s[fld])}`).join(" ");
    const mkArea=(ss,tot,fld)=>`M${sPadL},${sPadT+ph} `+ss.map(s=>`L${sPadL+(s.d/tot)*pw},${yOf(s[fld])}`).join(" ")+` L${sPadL+pw},${sPadT+ph} Z`;
    return{thA:mk(samplesA,totA,"th"),thB:mk(samplesB,totB,"th"),thAreaA:mkArea(samplesA,totA,"th"),brA:mk(samplesA,totA,"br"),brB:mk(samplesB,totB,"br"),brAreaA:mkArea(samplesA,totA,"br"),brAreaB:mkArea(samplesB,totB,"br"),geo:{sW,sH,sPadL,sPadR,sPadT,sPadB,pw,ph}};
  },[samplesA,samplesB]);
  // Clamp pan so the track can't be pushed fully off-screen: ±(fitted−vb)/2 plus a 20% margin
  const clampPan=(p,z)=>{
    const g=lapViewGeoRef.current;
    if(!g)return p;
    const mx=((g.fittedW-g.fittedW/z)/2)*1.2,my=((g.fittedH-g.fittedH/z)/2)*1.2;
    return{x:Math.max(-mx,Math.min(mx,p.x)),y:Math.max(-my,Math.min(my,p.y))};
  };
  // Wheel zoom — React attaches its root wheel listener passively, so a JSX onWheel
  // preventDefault is a no-op and the page scrolls while zooming. Bind a non-passive
  // listener directly on the svg instead, and anchor the zoom at the cursor.
  useEffect(()=>{
    const el=lapSvgRef.current;
    if(!el)return;
    const onWheel=(e)=>{
      e.preventDefault();
      const z0=Math.max(1,Math.min(6,lapZoomRef.current));
      const z1=Math.max(1,Math.min(6,z0*(e.deltaY<0?1.12:0.88)));
      if(z1===z0)return;
      const g=lapViewGeoRef.current;
      if(!g){setLapZoom(z1);return;}
      const{fittedW,fittedH}=g;
      const rect=el.getBoundingClientRect();
      const pan=lapPanRef.current;
      // Current viewBox (mirrors the render math: vbW=fittedW/z, vbX=(fittedW−vbW)/2+pan.x)
      const vbW0=fittedW/z0,vbH0=fittedH/z0;
      const vbX0=(fittedW-vbW0)/2+pan.x,vbY0=(fittedH-vbH0)/2+pan.y;
      // Pointer → viewBox coords. preserveAspectRatio="xMidYMid meet" draws the vb at
      // uniform scale s=min(w/vbW,h/vbH), centered with letterbox offsets ox/oy. The vb
      // aspect is constant (both dims divide by z), so s scales by z1/z0 and ox/oy stay put.
      const s=Math.min(rect.width/vbW0,rect.height/vbH0)||1;
      const ox=(rect.width-vbW0*s)/2,oy=(rect.height-vbH0*s)/2;
      const px=vbX0+(e.clientX-rect.left-ox)/s;
      const py=vbY0+(e.clientY-rect.top-oy)/s;
      // Cursor-anchored zoom: the screen x of the world point, ox+(px−vbX)·s, must match
      // before and after. With s1=s0·(z1/z0): (px−vbX1)·s1=(px−vbX0)·s0
      //   ⇒ vbX1 = px − (px−vbX0)·(z0/z1)
      // and vbX1=(fittedW−fittedW/z1)/2+panX ⇒ panX = vbX1 − (fittedW−fittedW/z1)/2.
      const nx=px-(px-vbX0)*(z0/z1)-(fittedW-fittedW/z1)/2;
      const ny=py-(py-vbY0)*(z0/z1)-(fittedH-fittedH/z1)/2;
      setLapZoom(z1);
      setLapPan(clampPan({x:nx,y:ny},z1));
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    return()=>el.removeEventListener("wheel",onWheel);
  },[samplesA,samplesB,lapCompareLap]);

  return (()=>{
                if(usable.length<2)return null;
                if(!drA||!drB||drA.acronym===drB.acronym)return null;
                const tcA=inkify(drA.teamColour)||"var(--green)";
                const tcB=inkify(drB.teamColour)||"var(--red)";
                // Build lap-time series for each
                const lapsA=(drA.lapTimes||[]).filter(l=>l.ds&&!l.pit).sort((a,b)=>a.l-b.l);
                const lapsB=(drB.lapTimes||[]).filter(l=>l.ds&&!l.pit).sort((a,b)=>a.l-b.l);
                if(lapsA.length===0||lapsB.length===0)return null;
                const minLap=Math.min(lapsA[0].l,lapsB[0].l);
                const maxLapCmp=Math.max(lapsA[lapsA.length-1].l,lapsB[lapsB.length-1].l);
                // Find driver-specific fastest lap for marker
                const fastestA=lapsA.reduce((a,b)=>a.t<b.t?a:b);
                const fastestB=lapsB.reduce((a,b)=>a.t<b.t?a:b);
                // Y range
                const allTimes=[...lapsA.map(l=>l.t),...lapsB.map(l=>l.t)].sort((a,b)=>a-b);
                const p5=allTimes[Math.floor(allTimes.length*0.03)]||60;
                const p95=allTimes[Math.floor(allTimes.length*0.95)]||120;
                const yLo=p5*0.99,yHi=p95*1.03;
                const W=800,H=200,padL=44,padR=24,padT=18,padB=30;
                const plotW=W-padL-padR,plotH=H-padT-padB;
                const xOf=l=>padL+((l-minLap)/Math.max(1,maxLapCmp-minLap))*plotW;
                const yOf=t=>padT+plotH-((Math.min(t,yHi)-yLo)/(yHi-yLo))*plotH;
                const xTicks=Array.from({length:6},(_,i)=>Math.round(minLap+(i/5)*(maxLapCmp-minLap)));
                const yTicks=[yLo,(yLo+yHi)/2,yHi];
                const fmtLapTime=(s)=>{if(!s)return"—";const m=Math.floor(s/60);const r=(s%60).toFixed(3);return `${m}:${r.padStart(6,"0")}`;};
                const onPickLap=(lap)=>{
                  setLapCompareLap(lap);
                  setLapComparePlayTime(0);
                  setLapComparePlaying(false);
                };
                const onRetry=()=>{
                  if(!lapCompareLap)return;
                  const k1=keyFor(drA,lapCompareLap),k2=keyFor(drB,lapCompareLap);
                  setLapCompareData(prev=>{const n={...prev};delete n[k1];delete n[k2];return n;});
                  setLapCompareRetry(r=>r+1);
                };
                const bothLoaded=samplesA&&samplesB;
                // Lap times for selected lap
                const lapATime=drA.lapTimes?.find(l=>l.l===lapCompareLap)?.t;
                const lapBTime=drB.lapTimes?.find(l=>l.l===lapCompareLap)?.t;
                // For playback: max lap duration across both
                const playDuration=Math.max(lapATime||0,lapBTime||0)||90;
                lapPlayDurationRef.current=playDuration; // playback clock auto-pauses here
                const playT=Math.max(0,Math.min(playDuration,lapComparePlayTime));
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700}}>Lap Compare</div>
                        <div style={{fontSize:11,color:"var(--w40)",marginTop:2}}>Pick two drivers and click any lap marker · live telemetry loads on demand</div>
                      </div>
                    </div>
                    {/* Driver pickers */}
                    <div style={{display:"flex",gap:14,marginTop:12,marginBottom:14,flexWrap:"wrap"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:"var(--w40)",textTransform:"uppercase",letterSpacing:1}}>A</span>
                        {usable.map(d=>{const on=d.acronym===acrA;const dc=inkify(d.teamColour)||"var(--fg)";return(
                          <button className="chip" aria-pressed={on} key={"lcA-"+d.acronym} onClick={()=>{setLapCompareA(d.acronym);setLapCompareLap(null);}} style={{padding:"3px 8px",borderRadius:2,border:`1px solid ${on?dc:"var(--w08)"}`,background:on?`${alpha(dc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)",letterSpacing:0.4}}>{d.acronym}</button>
                        );})}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:"var(--w40)",textTransform:"uppercase",letterSpacing:1}}>B</span>
                        {usable.map(d=>{const on=d.acronym===acrB;const dc=inkify(d.teamColour)||"var(--fg)";return(
                          <button className="chip" aria-pressed={on} key={"lcB-"+d.acronym} onClick={()=>{setLapCompareB(d.acronym);setLapCompareLap(null);}} style={{padding:"3px 8px",borderRadius:2,border:`1px solid ${on?dc:"var(--w08)"}`,background:on?`${alpha(dc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)",letterSpacing:0.4}}>{d.acronym}</button>
                        );})}
                      </div>
                    </div>
                    {/* Lap dropdown selector */}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w40)",fontWeight:600}}>Lap</span>
                      <select aria-label="Lap to compare" value={lapCompareLap||""} onChange={(e)=>{const v=parseInt(e.target.value);if(!isNaN(v))onPickLap(v);}} style={{appearance:"none",WebkitAppearance:"none",background:"var(--w04)",border:"1px solid var(--w10)",borderRadius:2,padding:"6px 28px 6px 12px",color:"var(--fg)",fontSize:12,fontWeight:500,fontFamily:"var(--font-ui)",cursor:"pointer",outline:"none",minWidth:200}}>
                        {!lapCompareLap&&<option value="" disabled style={{background:"var(--sheet)"}}>Select a lap…</option>}
                        {(()=>{
                          // Union of usable laps across both drivers
                          const lapSet=new Set();
                          for(const l of lapsA)lapSet.add(l.l);
                          for(const l of lapsB)lapSet.add(l.l);
                          const sortedLaps=[...lapSet].sort((a,b)=>a-b);
                          return sortedLaps.map(lap=>{
                            const ta=lapsA.find(x=>x.l===lap)?.t;
                            const tb=lapsB.find(x=>x.l===lap)?.t;
                            const isFastestA=ta&&fastestA.l===lap;
                            const isFastestB=tb&&fastestB.l===lap;
                            const star=isFastestA||isFastestB?" ★":"";
                            const taStr=ta?fmtLapTime(ta):"—";
                            const tbStr=tb?fmtLapTime(tb):"—";
                            return<option key={lap} value={lap} style={{background:"var(--sheet)",color:"var(--fg)"}}>{`Lap ${lap}${star} — ${drA.acronym} ${taStr} · ${drB.acronym} ${tbStr}`}</option>;
                          });
                        })()}
                      </select>
                      {lapCompareLap&&(dataA?.error||dataB?.error)&&(
                        <button onClick={onRetry} style={{padding:"5px 12px",borderRadius:2,border:"1px solid rgba(214,40,40,0.4)",background:"rgba(214,40,40,0.15)",color:"var(--fg)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"var(--font-ui)"}}>Retry</button>
                      )}
                    </div>
                    {/* Lap selector chart */}
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--w40)",fontWeight:600,marginBottom:6}}>Or click any marker on the chart</div>
                    <svg role="img" aria-label="Lap times for both compared drivers across the race; select a lap to compare" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:140,display:"block"}}>
                      {yTicks.map((v,i)=>(
                        <g key={i}>
                          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke="var(--w06)"/>
                          <text x={padL-8} y={yOf(v)+4} textAnchor="end" fill="var(--w40)" fontSize="9" fontFamily="var(--font-ui)">{fmtLapTime(v)}</text>
                        </g>
                      ))}
                      {xTicks.map((l,i)=>(<text key={i} x={xOf(l)} y={H-padB+16} textAnchor="middle" fill="var(--w45)" fontSize="9" fontFamily="var(--font-ui)">L{l}</text>))}
                      {/* Lines */}
                      <path d={lapsA.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.t)}`).join(" ")} stroke={tcA} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                      <path d={lapsB.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.t)}`).join(" ")} stroke={tcB} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity={0.9}/>
                      {/* Dots — clickable */}
                      {lapsA.map(p=><circle key={"a"+p.l} cx={xOf(p.l)} cy={yOf(p.t)} r={p===fastestA?4:2.5} fill={tcA} stroke={lapCompareLap===p.l?"var(--fg)":(p===fastestA?"var(--green)":"var(--bench)")} strokeWidth={lapCompareLap===p.l?2:(p===fastestA?1.5:0.5)} style={{cursor:"pointer"}} onClick={()=>onPickLap(p.l)}/>)}
                      {lapsB.map(p=><circle key={"b"+p.l} cx={xOf(p.l)} cy={yOf(p.t)} r={p===fastestB?4:2.5} fill={tcB} stroke={lapCompareLap===p.l?"var(--fg)":(p===fastestB?"var(--green)":"var(--bench)")} strokeWidth={lapCompareLap===p.l?2:(p===fastestB?1.5:0.5)} style={{cursor:"pointer"}} onClick={()=>onPickLap(p.l)}/>)}
                    </svg>
                    {/* Legend */}
                    <div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap",fontSize:11}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:2,background:tcA}}/><span style={{fontWeight:600}}>{drA.acronym}</span><span style={{color:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{fmtLapTime(fastestA.t)} L{fastestA.l}</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><svg aria-hidden="true" width={14} height={2}><line x1={0} y1={1} x2={14} y2={1} stroke={tcB} strokeWidth={2} strokeDasharray="3 2"/></svg><span style={{fontWeight:600}}>{drB.acronym}</span><span style={{color:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{fmtLapTime(fastestB.t)} L{fastestB.l}</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6,color:"var(--w50)"}}><div style={{width:8,height:8,borderRadius:"50%",border:"1.5px solid var(--green)"}}/><span>fastest lap</span></div>
                    </div>
                    {/* Live telemetry viewer once a lap is picked */}
                    {lapCompareLap&&(
                      <div style={{marginTop:18,padding:14,background:"var(--w03)",border:"1px solid var(--w04)",borderRadius:2}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,flexWrap:"wrap",gap:8}}>
                          <div style={{fontSize:13,fontWeight:700}}>Lap {lapCompareLap} telemetry · {drA.acronym} <span style={{fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:tcA,marginLeft:4}}>{fmtLapTime(lapATime)}</span> vs {drB.acronym} <span style={{fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:tcB,marginLeft:4}}>{fmtLapTime(lapBTime)}</span></div>
                          <div style={{fontSize:11,color:"var(--w40)"}}>
                            {dataA?.loading||dataB?.loading?"Loading from OpenF1…":dataA?.error||dataB?.error?`Error: ${dataA?.error||dataB?.error}`:bothLoaded?`${samplesA.length}/${samplesB.length} samples loaded`:"Waiting…"}
                          </div>
                        </div>
                        {bothLoaded?(()=>{
                          // Combined bbox of both drivers' (x,y) coords
                          const allPts=[...samplesA,...samplesB];
                          if(allPts.length<3)return<div style={{padding:24,textAlign:"center",fontSize:12,color:"var(--w40)"}}>Insufficient data</div>;
                          const xs=allPts.map(p=>p.x),ys=allPts.map(p=>p.y);
                          const minX=Math.min(...xs),maxX=Math.max(...xs);
                          const minY=Math.min(...ys),maxY=Math.max(...ys);
                          // Auto-rotate: if the track is taller than wide in source coords,
                          // rotate 90° so the long axis fills horizontal space
                          const rotate=(maxY-minY)>(maxX-minX);
                          const padPct=0.04;
                          // Project a (x, y) sample into "fitted" local coords.
                          // OpenF1 location is north-positive Y, SVG is top-positive Y → flip Y.
                          // The rotated branch must keep that flip (determinant −1), otherwise
                          // the circuit renders mirror-imaged (left-handers become right-handers).
                          const toLocal=(x,y)=>rotate?[(y-minY),(x-minX)]:[(x-minX),(maxY-y)];
                          const localSpanX=rotate?(maxY-minY):(maxX-minX)||1;
                          const localSpanY=rotate?(maxX-minX):(maxY-minY)||1;
                          const px=localSpanX*padPct,py=localSpanY*padPct;
                          const fittedW=localSpanX+px*2,fittedH=localSpanY+py*2;
                          lapViewGeoRef.current={fittedW,fittedH}; // wheel handler + pan clamp read current fitted dims
                          // Apply zoom/pan to the viewBox (smaller vb = zoomed in)
                          const z=Math.max(1,Math.min(6,lapZoom));
                          const vbW=fittedW/z,vbH=fittedH/z;
                          const vbX=(fittedW-vbW)/2+lapPan.x;
                          const vbY=(fittedH-vbH)/2+lapPan.y;
                          const projX=(x,y)=>toLocal(x,y)[0]+px;
                          const projY=(x,y)=>toLocal(x,y)[1]+py;
                          const findAtTime=(samples,t)=>{
                            if(!samples||samples.length===0)return null;
                            if(t<=samples[0].t)return samples[0];
                            if(t>=samples[samples.length-1].t)return samples[samples.length-1];
                            for(let i=1;i<samples.length;i++){
                              if(samples[i].t>=t){
                                const prev=samples[i-1],next=samples[i];
                                const f=(t-prev.t)/(next.t-prev.t||1);
                                return{
                                  x:prev.x+f*(next.x-prev.x),
                                  y:prev.y+f*(next.y-prev.y),
                                  speed:prev.speed+f*((next.speed||0)-(prev.speed||0)),
                                  d:prev.d+f*(next.d-prev.d),
                                  g:(f<0.5?prev.g:next.g)??null,
                                  t,
                                };
                              }
                            }
                            return samples[samples.length-1];
                          };
                          const ptA=findAtTime(samplesA,playT);
                          const ptB=findAtTime(samplesB,playT);
                          // Shared playhead x for every distance-domain chart: driver A's distance fraction at playT
                          const playFrac=Math.max(0,Math.min(1,(ptA?.d??0)/((samplesA[samplesA.length-1].d)||1)));
                          // Live gap at the playhead, interpolated from the memoized delta series (tA−tB; negative = A ahead)
                          const deltaNow=lapDeltaSeries?(()=>{const pts=lapDeltaSeries.pts;const k=playFrac*(pts.length-1);const i0=Math.floor(k),i1=Math.min(pts.length-1,i0+1);return pts[i0].delta+(k-i0)*(pts[i1].delta-pts[i0].delta);})():null;
                          // Speed-vs-distance for chart below
                          const samplesAdist=samplesA.map(s=>({d:s.d/(samplesA[samplesA.length-1].d||1),s:s.speed}));
                          const samplesBdist=samplesB.map(s=>({d:s.d/(samplesB[samplesB.length-1].d||1),s:s.speed}));
                          const maxSpeed=Math.max(...samplesA.map(s=>s.speed||0),...samplesB.map(s=>s.speed||0),100)*1.05;
                          const minSpeedY=Math.min(...samplesA.map(s=>s.speed||9999),...samplesB.map(s=>s.speed||9999),30)*0.9;
                          return(
                            <>
                              {/* Playback controls */}
                              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                                <button aria-label={lapComparePlaying?"Pause lap playback":"Play lap"} onClick={()=>{if(playT>=playDuration-0.05)setLapComparePlayTime(0);setLapComparePlaying(p=>!p);}} style={{width:32,height:32,borderRadius:"50%",border:"1px solid var(--w15)",background:lapComparePlaying?"rgba(214,40,40,0.18)":"var(--w06)",color:"var(--fg)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-ui)",display:"flex",alignItems:"center",justifyContent:"center"}}>{lapComparePlaying?<IcoPause/>:<IcoPlay/>}</button>
                                <button aria-label="Restart lap" title="Restart" onClick={()=>{setLapComparePlaying(false);setLapComparePlayTime(0);}} style={{width:28,height:28,borderRadius:2,border:"1px solid var(--w08)",background:"var(--w03)",color:"var(--w55)",cursor:"pointer",fontSize:11,fontFamily:"var(--font-ui)"}}><IcoRestart/></button>
                                <div style={{fontSize:11,color:"var(--w70)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",minWidth:90}}>{playT.toFixed(2)}s / {playDuration.toFixed(2)}s</div>
                                <input type="range" aria-label="Time in lap" min={0} max={playDuration} step={0.05} value={playT} onChange={(e)=>{setLapComparePlaying(false);setLapComparePlayTime(parseFloat(e.target.value));}} style={{flex:1,minWidth:200,height:24,margin:0,appearance:"none",WebkitAppearance:"none",cursor:"pointer",background:"transparent"}}/>
                                {/* Zoom controls */}
                                <div style={{display:"flex",gap:2,border:"1px solid var(--w08)",borderRadius:2,padding:2,background:"var(--w02)"}}>
                                  <button onClick={()=>{const z1=Math.max(1,lapZoom*0.8);setLapZoom(z1);setLapPan(p=>clampPan(p,z1));}} style={{width:24,height:24,borderRadius:2,border:"none",background:"transparent",color:"var(--w60)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-ui)"}}>−</button>
                                  <button onClick={()=>{setLapZoom(1.6);setLapPan({x:0,y:0});}} title="Reset zoom" style={{padding:"3px 8px",borderRadius:2,border:"none",background:"transparent",color:"var(--w55)",cursor:"pointer",fontSize:10,fontFamily:"var(--font-ui)"}}>{(lapZoom*100|0)}%</button>
                                  <button onClick={()=>setLapZoom(z=>Math.min(6,z*1.25))} style={{width:24,height:24,borderRadius:2,border:"none",background:"transparent",color:"var(--w60)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-ui)"}}>+</button>
                                </div>
                              </div>
                              {/* Track view (live x/y) */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:14,alignItems:"start"}} className="lap-compare-grid">
                                <svg role="img" aria-label="Both drivers' positions on the circuit through the compared lap" ref={lapSvgRef} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet"
                                  onPointerDown={(e)=>{e.currentTarget.setPointerCapture(e.pointerId);lapDragRef.current={x:e.clientX,y:e.clientY,panX:lapPan.x,panY:lapPan.y,vbW};}}
                                  onPointerMove={(e)=>{if(!lapDragRef.current)return;const dx=(e.clientX-lapDragRef.current.x);const dy=(e.clientY-lapDragRef.current.y);const rect=e.currentTarget.getBoundingClientRect();const scale=lapDragRef.current.vbW/rect.width;setLapPan(clampPan({x:lapDragRef.current.panX-dx*scale,y:lapDragRef.current.panY-dy*scale},z));}}
                                  onPointerUp={()=>{lapDragRef.current=null;}}
                                  onPointerLeave={()=>{lapDragRef.current=null;}}
                                  style={{width:"100%",height:420,display:"block",cursor:lapDragRef.current?"grabbing":"grab",touchAction:"none"}}>
                                  {/* Track outline segmented by whoever is faster at each point — memoized runs (stroke widths use fitted dims so they stay consistent across zoom) */}
                                  {(lapTrackRuns||[]).map((r,i)=><path key={i} d={r.d} stroke={r.aFaster?tcA:tcB} strokeOpacity={0.85} strokeWidth={Math.max(fittedW,fittedH)*0.008/Math.sqrt(lapZoom)} fill="none" strokeLinecap="round" strokeLinejoin="round"/>)}
                                  {/* Start marker */}
                                  <circle cx={projX(samplesA[0].x,samplesA[0].y)} cy={projY(samplesA[0].x,samplesA[0].y)} r={Math.max(fittedW,fittedH)*0.008/Math.sqrt(lapZoom)} fill="var(--w40)"/>
                                  {/* Dots at current playT */}
                                  {ptA&&<g><circle cx={projX(ptA.x,ptA.y)} cy={projY(ptA.x,ptA.y)} r={Math.max(fittedW,fittedH)*0.018/Math.sqrt(lapZoom)} fill={tcA} stroke="var(--bench)" strokeWidth={Math.max(fittedW,fittedH)*0.005/Math.sqrt(lapZoom)}/></g>}
                                  {ptB&&<g><circle cx={projX(ptB.x,ptB.y)} cy={projY(ptB.x,ptB.y)} r={Math.max(fittedW,fittedH)*0.018/Math.sqrt(lapZoom)} fill={tcB} stroke="var(--bench)" strokeWidth={Math.max(fittedW,fittedH)*0.005/Math.sqrt(lapZoom)}/></g>}
                                </svg>
                                {/* Side panel — current readouts */}
                                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                  <div style={{padding:"10px 12px",background:`${alpha(tcA,0x10)}`,border:`1px solid ${alpha(tcA,0x40)}`,borderRadius:2}}>
                                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                                      <div style={{width:3,height:14,background:tcA,borderRadius:1.5}}/>
                                      <div style={{fontSize:13,fontWeight:700}}>{drA.acronym}</div>
                                    </div>
                                    <div style={{fontSize:10,color:"var(--w45)",marginBottom:2}}>Speed</div>
                                    <div style={{fontSize:18,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:tcA}}>{ptA?Math.round(ptA.speed):0}<span style={{fontSize:10,color:"var(--w50)",marginLeft:3,fontWeight:500}}>km/h</span></div>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:6}}>
                                      <div style={{fontSize:10,color:"var(--w45)"}}>Gear</div>
                                      <div style={{fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{ptA?.g==null?"—":ptA.g===0?"N":ptA.g}</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"10px 12px",background:`${alpha(tcB,0x10)}`,border:`1px solid ${alpha(tcB,0x40)}`,borderRadius:2}}>
                                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                                      <div style={{width:3,height:14,background:tcB,borderRadius:1.5}}/>
                                      <div style={{fontSize:13,fontWeight:700}}>{drB.acronym}</div>
                                    </div>
                                    <div style={{fontSize:10,color:"var(--w45)",marginBottom:2}}>Speed</div>
                                    <div style={{fontSize:18,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:tcB}}>{ptB?Math.round(ptB.speed):0}<span style={{fontSize:10,color:"var(--w50)",marginLeft:3,fontWeight:500}}>km/h</span></div>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:6}}>
                                      <div style={{fontSize:10,color:"var(--w45)"}}>Gear</div>
                                      <div style={{fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{ptB?.g==null?"—":ptB.g===0?"N":ptB.g}</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"10px 12px",background:"var(--w03)",border:"1px solid var(--w06)",borderRadius:2}}>
                                    <div style={{fontSize:10,color:"var(--w45)",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Speed Δ (A−B)</div>
                                    <div style={{fontSize:18,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:ptA&&ptB?(ptA.speed-ptB.speed>0?"var(--green)":"var(--red)"):"var(--fg)"}}>{ptA&&ptB?(ptA.speed-ptB.speed>=0?"+":"")+Math.round(ptA.speed-ptB.speed):"—"}<span style={{fontSize:10,color:"var(--w50)",marginLeft:3,fontWeight:500}}>km/h</span></div>
                                  </div>
                                  <div style={{padding:"10px 12px",background:"var(--w03)",border:"1px solid var(--w06)",borderRadius:2}}>
                                    <div style={{fontSize:10,color:"var(--w45)",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Gap {drA.acronym}−{drB.acronym}</div>
                                    <div style={{fontSize:18,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:deltaNow==null?"var(--fg)":deltaNow<=0?tcA:tcB}}>{deltaNow==null?"—":(deltaNow>=0?"+":"")+deltaNow.toFixed(3)}<span style={{fontSize:10,color:"var(--w50)",marginLeft:3,fontWeight:500}}>s</span></div>
                                    <div style={{fontSize:9,color:"var(--w35)",marginTop:2}}>{deltaNow==null?"":deltaNow<=0?`${drA.acronym} ahead`:`${drB.acronym} ahead`}</div>
                                  </div>
                                </div>
                                {/* Faster-driver legend — third grid child lands under the track svg */}
                                <div style={{display:"flex",gap:14,fontSize:10,color:"var(--w55)",alignItems:"center",marginTop:2}}>
                                  <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:tcA,display:"inline-block"}}/>{drA.acronym} faster</span>
                                  <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:tcB,display:"inline-block"}}/>{drB.acronym} faster</span>
                                </div>
                              </div>
                              {/* Broadcast-style gap chart — delta(f)=tA−tB vs distance %, memoized paths */}
                              {lapDeltaSeries&&(()=>{
                                const{yMax,line,area,geo:g}=lapDeltaSeries;
                                const y0=g.dPadT+g.ph/2;
                                const xPh=g.dPadL+playFrac*g.pw;
                                return(
                                  <div style={{marginTop:14}}>
                                    <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600,marginBottom:8}}>Gap {drA.acronym}−{drB.acronym} (s) · <span style={{color:tcA}}>below 0 = {drA.acronym} ahead</span></div>
                                    <svg role="img" aria-label="Time delta between the two drivers through the compared lap" viewBox={`0 0 ${g.dW} ${g.dH}`} preserveAspectRatio="none" style={{width:"100%",height:120,display:"block"}}>
                                      <defs>
                                        <clipPath id="lapGapAbove"><rect x={g.dPadL} y={g.dPadT} width={g.pw} height={g.ph/2}/></clipPath>
                                        <clipPath id="lapGapBelow"><rect x={g.dPadL} y={y0} width={g.pw} height={g.ph/2}/></clipPath>
                                      </defs>
                                      {[yMax,0,-yMax].map((v,i)=>{const y=y0-(v/yMax)*(g.ph/2);return(<g key={i}>
                                        <line x1={g.dPadL} x2={g.dW-g.dPadR} y1={y} y2={y} stroke={v===0?"var(--w22)":"var(--w06)"}/>
                                        <text x={g.dPadL-8} y={y+3} textAnchor="end" fill="var(--w40)" fontSize="9" fontFamily="var(--font-ui)">{(v>0?"+":"")+v.toFixed(2)}s</text>
                                      </g>);})}
                                      {[0,0.25,0.5,0.75,1].map((v,i)=>(<text key={i} x={g.dPadL+v*g.pw} y={g.dH-g.dPadB+15} textAnchor="middle" fill="var(--w45)" fontSize="9" fontFamily="var(--font-ui)">{Math.round(v*100)}%</text>))}
                                      <path d={area} fill={tcB} fillOpacity={0.13} clipPath="url(#lapGapAbove)"/>
                                      <path d={area} fill={tcA} fillOpacity={0.13} clipPath="url(#lapGapBelow)"/>
                                      <path d={line} stroke="var(--w85)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                      <line x1={xPh} x2={xPh} y1={g.dPadT} y2={g.dPadT+g.ph} stroke="var(--w40)" strokeWidth={1} strokeDasharray="3 3"/>
                                    </svg>
                                  </div>
                                );
                              })()}
                              {/* Speed-vs-distance comparison */}
                              {(()=>{
                                const cW=800,cH=180,cPadL=44,cPadR=20,cPadT=16,cPadB=28;
                                const cPlotW=cW-cPadL-cPadR,cPlotH=cH-cPadT-cPadB;
                                const xOfD=d=>cPadL+d*cPlotW;
                                const yOfS=s=>cPadT+cPlotH-((s-minSpeedY)/(maxSpeed-minSpeedY))*cPlotH;
                                const yTicksS=[Math.round(minSpeedY),Math.round((minSpeedY+maxSpeed)/2),Math.round(maxSpeed)];
                                const xTicksD=[0,0.25,0.5,0.75,1];
                                return(
                                  <div style={{marginTop:14}}>
                                    <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600,marginBottom:8}}>Speed Trace</div>
                                    <svg role="img" aria-label="Speed through the compared lap for both drivers" viewBox={`0 0 ${cW} ${cH}`} preserveAspectRatio="none" style={{width:"100%",height:180,display:"block"}}>
                                      {yTicksS.map((v,i)=>(<g key={i}>
                                        <line x1={cPadL} x2={cW-cPadR} y1={yOfS(v)} y2={yOfS(v)} stroke="var(--w06)"/>
                                        <text x={cPadL-8} y={yOfS(v)+4} textAnchor="end" fill="var(--w40)" fontSize="9" fontFamily="var(--font-ui)">{v} km/h</text>
                                      </g>))}
                                      {xTicksD.map((v,i)=>(<text key={i} x={xOfD(v)} y={cH-cPadB+15} textAnchor="middle" fill="var(--w45)" fontSize="9" fontFamily="var(--font-ui)">{Math.round(v*100)}%</text>))}
                                      <path d={samplesAdist.map((p,i)=>`${i===0?"M":"L"}${xOfD(p.d)},${yOfS(p.s)}`).join(" ")} stroke={tcA} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92}/>
                                      <path d={samplesBdist.map((p,i)=>`${i===0?"M":"L"}${xOfD(p.d)},${yOfS(p.s)}`).join(" ")} stroke={tcB} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity={0.92}/>
                                      {/* Vertical line at the shared playhead distance fraction */}
                                      <line x1={xOfD(playFrac)} x2={xOfD(playFrac)} y1={cPadT} y2={cPadT+cPlotH} stroke="var(--w40)" strokeWidth={1} strokeDasharray="3 3"/>
                                    </svg>
                                    {/* Throttle/brake strips — same x-axis (% of own lap distance), memoized paths */}
                                    {lapStripPaths&&(()=>{
                                      const g=lapStripPaths.geo;
                                      const xPh=g.sPadL+playFrac*g.pw;
                                      return(<>
                                        <svg role="img" aria-label="Throttle and brake through the compared lap" viewBox={`0 0 ${g.sW} ${g.sH}`} preserveAspectRatio="none" style={{width:"100%",height:g.sH,display:"block",marginTop:8}}>
                                          <line x1={g.sPadL} x2={g.sW-g.sPadR} y1={g.sPadT+g.ph} y2={g.sPadT+g.ph} stroke="var(--w08)"/>
                                          <text x={g.sPadL+4} y={g.sPadT+8} fill="var(--w40)" fontSize="9" letterSpacing="1.2" fontFamily="var(--font-ui)">THROTTLE</text>
                                          <path d={lapStripPaths.thAreaA} fill={tcA} fillOpacity={0.10}/>
                                          <path d={lapStripPaths.thA} stroke={tcA} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92}/>
                                          <path d={lapStripPaths.thB} stroke={tcB} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity={0.55}/>
                                          <line x1={xPh} x2={xPh} y1={g.sPadT} y2={g.sPadT+g.ph} stroke="var(--w40)" strokeWidth={1} strokeDasharray="3 3"/>
                                        </svg>
                                        <svg role="img" aria-label="Throttle and brake through the compared lap" viewBox={`0 0 ${g.sW} ${g.sH}`} preserveAspectRatio="none" style={{width:"100%",height:g.sH,display:"block",marginTop:6}}>
                                          <line x1={g.sPadL} x2={g.sW-g.sPadR} y1={g.sPadT+g.ph} y2={g.sPadT+g.ph} stroke="var(--w08)"/>
                                          <text x={g.sPadL+4} y={g.sPadT+8} fill="var(--w40)" fontSize="9" letterSpacing="1.2" fontFamily="var(--font-ui)">BRAKE</text>
                                          <path d={lapStripPaths.brAreaA} fill={tcA} fillOpacity={0.28}/>
                                          <path d={lapStripPaths.brAreaB} fill={tcB} fillOpacity={0.28}/>
                                          <path d={lapStripPaths.brA} stroke={tcA} strokeWidth={1} fill="none" opacity={0.8}/>
                                          <path d={lapStripPaths.brB} stroke={tcB} strokeWidth={1} fill="none" strokeDasharray="4 3" opacity={0.55}/>
                                          <line x1={xPh} x2={xPh} y1={g.sPadT} y2={g.sPadT+g.ph} stroke="var(--w40)" strokeWidth={1} strokeDasharray="3 3"/>
                                        </svg>
                                      </>);
                                    })()}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })():(
                          <div style={{padding:40,textAlign:"center",fontSize:12,color:"var(--w50)"}}>
                            {dataA?.error||dataB?.error?(
                              <>
                                <div style={{fontSize:14,fontWeight:700,color:"var(--red-ink)",marginBottom:6}}>Could not load telemetry</div>
                                <div>{dataA?.error||dataB?.error}</div>
                              </>
                            ):(
                              <>
                                <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Loading telemetry from OpenF1…</div>
                                <div>~2-4 seconds depending on connection.</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })();
});

// ─── Lap Times chart panel — owns the hover crosshair/readout state so 60Hz
// mousemove updates re-render only this chart.
const LapTimesChart=memo(function LapTimesChart({maxLap,yMin,yMax,race,visibleDrivers}){
  const[telLapHover,setTelLapHover]=useState(null); // {x,lap} or null
  return (()=>{
                const W=800,H=280,padL=50,padR=20,padT=18,padB=34;
                const plotW=W-padL-padR,plotH=H-padT-padB;
                const xOf=l=>padL+((l-1)/Math.max(1,maxLap-1))*plotW;
                const yOf=t=>padT+plotH-((Math.min(t,yMax)-yMin)/(yMax-yMin))*plotH;
                const yTicks=[yMin,(yMin+yMax)/2,yMax].map(v=>Math.round(v));
                const xTicks=Array.from({length:6},(_,i)=>Math.round(1+(i/5)*(maxLap-1)));
                const fmtSec=(s)=>{const m=Math.floor(s/60);const r=(s%60).toFixed(1);return `${m}:${r.padStart(4,"0")}`;};
                const fmtLapTime=(s)=>{if(!s)return"—";const m=Math.floor(s/60);const r=(s%60).toFixed(3);return `${m}:${r.padStart(6,"0")}`;};
                const periods=race.raceControlPeriods||[];
                const yellowLaps=race.yellowFlagLaps||[];
                const periodStyle={SC:{fill:"rgba(255,218,0,0.10)",border:"rgba(255,218,0,0.45)",label:"SC",color:"var(--yellow)"},VSC:{fill:"rgba(255,152,0,0.08)",border:"rgba(255,152,0,0.40)",label:"VSC",color:"var(--amber)"},RED:{fill:"rgba(214,40,40,0.14)",border:"rgba(214,40,40,0.55)",label:"RED",color:"var(--red-ink)"}};
                const onMove=(e)=>{
                  const rect=e.currentTarget.getBoundingClientRect();
                  const xView=((e.clientX-rect.left)/rect.width)*W;
                  const yView=((e.clientY-rect.top)/rect.height)*H;
                  let lap=Math.round(((xView-padL)/plotW)*(maxLap-1))+1;
                  lap=Math.max(1,Math.min(maxLap,lap));
                  // Invert yView back to a time value (only when inside plot area)
                  let timeAtY=null;
                  if(yView>=padT&&yView<=padT+plotH){
                    timeAtY=yMax-((yView-padT)/plotH)*(yMax-yMin);
                  }
                  setTelLapHover({lap,yView,timeAtY});
                };
                const hoverLap=telLapHover?.lap||null;
                const hoverYView=telLapHover?.yView??null;
                const hoverTimeAtY=telLapHover?.timeAtY??null;
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,position:"relative"}}>
                    <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Lap Times</div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:8}}>Lap-by-lap pace · low Y axis clipped to 5th-95th percentile · hover for crosshair readout · □ = pit stop</div>
                    {/* Race-control legend */}
                    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14,fontSize:10,color:"var(--w50)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:8,background:"rgba(255,218,0,0.45)",borderRadius:2}}/><span>Safety Car</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:8,background:"rgba(255,152,0,0.45)",borderRadius:2}}/><span>Virtual SC</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:8,background:"rgba(214,40,40,0.55)",borderRadius:2}}/><span>Red Flag</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><svg aria-hidden="true" width={14} height={8}><line x1={7} y1={0} x2={7} y2={8} stroke="rgba(255,200,0,0.7)" strokeWidth={1.5} strokeDasharray="2 2"/><circle cx={7} cy={2} r={2} fill="var(--yellow)"/></svg><span>Local yellow flag</span></div>
                    </div>
                    <div style={{position:"relative"}}>
                      <svg role="img" aria-label="Lap times by lap for the selected drivers" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:280,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setTelLapHover(null)}>
                        {/* Race control bands — behind gridlines */}
                        {periods.map((p,i)=>{
                          const st=periodStyle[p.type];if(!st||!p.lapStart||!p.lapEnd)return null;
                          const x1=xOf(p.lapStart);const x2=xOf(Math.max(p.lapStart,p.lapEnd));
                          return(
                            <g key={"rc"+i}>
                              <rect x={x1} y={padT} width={Math.max(2,x2-x1)} height={plotH} fill={st.fill}/>
                              <line x1={x1} x2={x1} y1={padT} y2={padT+plotH} stroke={st.border} strokeWidth={1} strokeDasharray="2 2"/>
                              <line x1={x2} x2={x2} y1={padT} y2={padT+plotH} stroke={st.border} strokeWidth={1} strokeDasharray="2 2"/>
                              <text x={(x1+x2)/2} y={padT+10} textAnchor="middle" fill={st.color} fontSize="9" fontWeight={700} fontFamily="var(--font-ui)" letterSpacing={1}>{st.label}</text>
                            </g>
                          );
                        })}
                        {/* Localised yellow-flag markers — thin dashed line per lap (skip lap 0/1 noise) */}
                        {yellowLaps.filter(l=>l>=2).map((l,i)=>(
                          <g key={"yf"+i}>
                            <line x1={xOf(l)} x2={xOf(l)} y1={padT+12} y2={padT+plotH} stroke="rgba(255,200,0,0.45)" strokeWidth={1} strokeDasharray="2 3"/>
                            <circle cx={xOf(l)} cy={padT+6} r={2.5} fill="var(--yellow)"/>
                          </g>
                        ))}
                        {yTicks.map((v,i)=>(
                          <g key={i}>
                            <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke="var(--w06)"/>
                            <text x={padL-8} y={yOf(v)+4} textAnchor="end" fill="var(--w40)" fontSize="10" fontFamily="var(--font-ui)">{fmtSec(v)}</text>
                          </g>
                        ))}
                        {xTicks.map((l,i)=>(
                          <text key={i} x={xOf(l)} y={H-padB+18} textAnchor="middle" fill={hoverLap===l?"var(--fg)":"var(--w45)"} fontWeight={hoverLap===l?600:400} fontSize="10" fontFamily="var(--font-ui)">L{l}</text>
                        ))}
                        {hoverLap&&(
                          <line x1={xOf(hoverLap)} x2={xOf(hoverLap)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>
                        )}
                        {hoverYView!==null&&hoverTimeAtY!==null&&(
                          <g pointerEvents="none">
                            <line x1={padL} x2={W-padR} y1={hoverYView} y2={hoverYView} stroke="var(--w22)" strokeWidth={1} strokeDasharray="3 3"/>
                            <rect x={padL-46} y={hoverYView-9} width={42} height={18} rx={3} fill="var(--panel-2)" stroke="var(--rule)" strokeWidth={0.6}/>
                            <text x={padL-25} y={hoverYView+4} textAnchor="middle" fill="var(--green)" fontSize="10" fontFamily="var(--font-ui)" fontWeight={700}>{fmtLapTime(hoverTimeAtY)}</text>
                          </g>
                        )}
                        {visibleDrivers.map(d=>{
                          const lt=(d.lapTimes||[]).filter(l=>l.l>1);
                          if(lt.length<2)return null;
                          const color=inkify(d.teamColour)||"var(--fg)";
                          const path=lt.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.t)}`).join(" ");
                          return(
                            <g key={d.acronym} pointerEvents="none">
                              <path d={path} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
                              {/* Pit-out laps — small hollow square at the data point */}
                              {lt.filter(p=>p.pit).map(p=>(
                                <rect key={"pit"+p.l} x={xOf(p.l)-3} y={yOf(p.t)-3} width={6} height={6} fill="var(--bench)" stroke={color} strokeWidth={1.3} opacity={0.9}/>
                              ))}
                              {hoverLap&&(()=>{const p=lt.find(x=>x.l===hoverLap);return p?<circle cx={xOf(p.l)} cy={yOf(p.t)} r={4} fill={color} stroke="var(--bench)" strokeWidth={1.5}/>:null;})()}
                            </g>
                          );
                        })}
                      </svg>
                      {hoverLap&&(()=>{
                        const rows=visibleDrivers
                          .map(d=>{
                            const p=(d.lapTimes||[]).find(x=>x.l===hoverLap);
                            return p?{acronym:d.acronym,team:d.team,teamColour:inkify(d.teamColour),time:p.t,pit:p.pit}:null;
                          })
                          .filter(Boolean)
                          .sort((a,b)=>a.time-b.time);
                        if(rows.length===0)return null;
                        const leftPct=(xOf(hoverLap)/W)*100;
                        const placeRight=leftPct<55;
                        return(
                          <div style={{position:"absolute",top:6,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:200,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:4}}>Lap {hoverLap}</div>
                            {yellowLaps.includes(hoverLap)&&(
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"3px 7px",background:"rgba(255,200,0,0.10)",border:"1px solid rgba(255,200,0,0.35)",borderRadius:2,fontSize:9,fontWeight:700,color:"var(--yellow)",letterSpacing:0.5}}>
                                <div style={{width:6,height:6,background:"var(--yellow)",borderRadius:"50%"}}/>YELLOW FLAG
                              </div>
                            )}
                            {rows.map(r=>(
                              <div key={r.acronym} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:11}}>
                                <div style={{width:3,height:11,background:inkify(r.teamColour)||"var(--fg)",borderRadius:1}}/>
                                <div style={{flex:1,fontWeight:600}}>{r.acronym}</div>
                                <div style={{fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:700,color:r.pit?"var(--gold)":"var(--fg)"}}>{fmtLapTime(r.time)}{r.pit?" · pit":""}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })();
});

// ─── Tire Strategy panel — owns the stint-segment hover tooltip state.
const TireStrategyPanel=memo(function TireStrategyPanel({race,maxLap,allDrivers,visibleDrivers}){
  const[telStintHover,setTelStintHover]=useState(null); // {driverNumber, stintNumber, x, y} or null
  return (()=>{
                const allStints=race.stints||[];
                if(allStints.length===0)return null;
                const fmtLapTime=(s)=>{if(!s)return"—";const m=Math.floor(s/60);const r=(s%60).toFixed(3);return `${m}:${r.padStart(6,"0")}`;};
                const computeStintStats=(driver,stint)=>{
                  const start=Math.max(1,stint.lapStart||1);
                  const end=Math.min(maxLap,stint.lapEnd||maxLap);
                  const inRange=(driver.lapTimes||[]).filter(l=>l.l>=start&&l.l<=end&&!l.pit&&l.t>0);
                  if(inRange.length===0)return{lapsRun:end-start+1,validLaps:0,avg:null,best:null,start,end};
                  const times=inRange.map(l=>l.t).sort((a,b)=>a-b);
                  return{lapsRun:end-start+1,validLaps:times.length,avg:times.reduce((a,b)=>a+b,0)/times.length,best:times[0],start,end};
                };
                const hovered=telStintHover;
                let hoveredData=null;
                if(hovered){
                  const driver=allDrivers.find(d=>d.number===hovered.driverNumber);
                  const stint=allStints.find(s=>s.driverNumber===hovered.driverNumber&&s.stintNumber===hovered.stintNumber);
                  if(driver&&stint){
                    const stats=computeStintStats(driver,stint);
                    const overall=(driver.lapTimes||[]).filter(l=>!l.pit&&l.t>0);
                    const overallAvg=overall.length?overall.reduce((a,b)=>a+b.t,0)/overall.length:null;
                    hoveredData={driver,stint,stats,overallAvg};
                  }
                }
                return(
                  <div data-stint-card style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,position:"relative"}}>
                    <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Tire Strategy</div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>Stints by compound — hover any segment for pace stats</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,position:"relative"}}>
                      {visibleDrivers.map(d=>{
                        const myStints=allStints.filter(s=>s.driverNumber===d.number).sort((a,b)=>a.stintNumber-b.stintNumber);
                        return(
                          <div key={d.acronym} style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:60,fontSize:11,fontWeight:700,letterSpacing:0.5,display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <div style={{width:3,height:14,background:inkify(d.teamColour)||"var(--fg)",borderRadius:1}}/>
                              {d.acronym}
                            </div>
                            <div style={{flex:1,display:"flex",height:22,background:"var(--w03)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                              {myStints.map((s,i)=>{
                                const start=Math.max(1,s.lapStart||1);
                                const end=Math.min(maxLap,s.lapEnd||maxLap);
                                const lapsInStint=end-start+1;
                                const pct=(lapsInStint/maxLap)*100;
                                const c=(s.compound||"UNKNOWN").toUpperCase();
                                const col=COMPOUND_COLORS[c]||COMPOUND_COLORS.UNKNOWN;
                                const isHovered=hovered&&hovered.driverNumber===d.number&&hovered.stintNumber===s.stintNumber;
                                return(
                                  <div key={i}
                                    onPointerEnter={(e)=>{const r=e.currentTarget.getBoundingClientRect();const card=e.currentTarget.closest('[data-stint-card]');if(!card)return;const cr=card.getBoundingClientRect();setTelStintHover({driverNumber:d.number,stintNumber:s.stintNumber,x:(r.left-cr.left)+r.width/2,y:(r.bottom-cr.top)});}}
                                    onPointerLeave={()=>setTelStintHover(null)}
                                    style={{width:`${pct}%`,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:compoundInk(c),letterSpacing:0.5,borderRight:i<myStints.length-1?"2px solid rgba(0,0,0,0.4)":"none",cursor:"default",outline:isHovered?"2px solid var(--w55)":"none",outlineOffset:isHovered?-2:0,transition:"outline-color 0.12s"}}>
                                    {pct>4?c[0]:""}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:14,marginTop:14,flexWrap:"wrap",fontSize:10,color:"var(--w50)"}}>
                      {Object.entries(COMPOUND_COLORS).filter(([k])=>k!=="UNKNOWN").map(([k,v])=>(
                        <div key={k} style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:14,height:8,background:v,borderRadius:2}}/>
                          <span>{k[0]+k.slice(1).toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                    {hoveredData&&(()=>{
                      const{driver,stint,stats,overallAvg}=hoveredData;
                      const c=(stint.compound||"UNKNOWN").toUpperCase();
                      const col=COMPOUND_COLORS[c]||COMPOUND_COLORS.UNKNOWN;
                      const delta=(stats.avg&&overallAvg)?stats.avg-overallAvg:null;
                      return(
                        <div style={{position:"absolute",left:hovered.x,top:hovered.y+6,transform:"translateX(-50%)",background:"var(--panel-2)",border:`1px solid ${alpha(col,0x40)}`,borderRadius:2,padding:"12px 14px",pointerEvents:"none",minWidth:220,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)",zIndex:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                            <div style={{fontSize:9,fontWeight:800,letterSpacing:1.2,padding:"3px 8px",borderRadius:2,background:col,color:compoundInk(c)}}>{c}</div>
                            <div style={{fontSize:11,color:"var(--w70)",fontWeight:600}}>{driver.acronym} · Stint {stint.stintNumber}</div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"5px 14px",fontSize:11}}>
                            <div style={{color:"var(--w40)"}}>Laps</div>
                            <div style={{fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>L{stats.start} – L{stats.end} <span style={{color:"var(--w40)",fontWeight:400}}>({stats.lapsRun})</span></div>
                            {stint.tyreAge!=null&&(
                              <>
                                <div style={{color:"var(--w40)"}}>Tire age</div>
                                <div style={{fontWeight:600}}>{stint.tyreAge===0?"Fresh":`${stint.tyreAge} laps old`}</div>
                              </>
                            )}
                            {stats.best!=null&&(
                              <>
                                <div style={{color:"var(--w40)"}}>Best lap</div>
                                <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:"var(--green)"}}>{fmtLapTime(stats.best)}</div>
                              </>
                            )}
                            {stats.avg!=null&&(
                              <>
                                <div style={{color:"var(--w40)"}}>Avg pace</div>
                                <div style={{fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{fmtLapTime(stats.avg)}</div>
                              </>
                            )}
                            {delta!=null&&(
                              <>
                                <div style={{color:"var(--w40)"}}>vs race avg</div>
                                <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:delta<0?"var(--green)":"var(--red)"}}>{delta>=0?"+":""}{delta.toFixed(3)}s</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })();
});

// ─── Tire Management panel — one component for the degradation chart, compound
// benchmark, heatmap and stint overlay because they all share the `analyzed`
// stint statistics. Owns every tire-related hover/filter/selection state.
const TireManagementPanel=memo(function TireManagementPanel({race,allDrivers,maxLap}){
  const[tireCompound,setTireCompound]=useState(null); // selected compound key for benchmark chart
  const[tireHover,setTireHover]=useState(null); // {key, x, y} for stint bar tooltip
  const[stintOverlay,setStintOverlay]=useState(()=>new Set()); // stint keys "driverNumber-stintNumber"
  const[overlayHover,setOverlayHover]=useState(null); // {lapInStint}
  const[overlayCompoundFilter,setOverlayCompoundFilter]=useState("ALL"); // compound key or "ALL"
  const[overlayDriverFilter,setOverlayDriverFilter]=useState("ALL"); // driverNumber or "ALL"
  // Analyze every stint with enough data — output [{driver, stint, compound, validLaps, avg, best, slope}]
  // Memoized: the per-stint outlier filtering + linear regression is the most
  // expensive derivation on this tab and must not re-run on every hover.
  const analyzed=useMemo(()=>{
                const allStints=race.stints||[];
                const analyzed=[];
                for(const driver of allDrivers){
                  const myStints=allStints.filter(s=>s.driverNumber===driver.number);
                  const green=new Set(greenFlagLaps(driver,race).map(l=>l.l));
                  for(const s of myStints){
                    const start=Math.max(1,s.lapStart||1);
                    const end=Math.min(maxLap,s.lapEnd||maxLap);
                    // Green-flag laps only (no SC/VSC, restart, in- or out-laps, 107% outliers)
                    const clean=(driver.lapTimes||[]).filter(l=>l.l>=start&&l.l<=end&&green.has(l.l));
                    if(clean.length<3)continue;
                    const avg=clean.reduce((a,b)=>a+b.t,0)/clean.length;
                    const best=Math.min(...clean.map(l=>l.t));
                    // Linear regression: slope of lap_time vs lap_in_stint
                    const xMean=clean.reduce((a,b)=>a+(b.l-start),0)/clean.length;
                    let num=0,den=0;
                    for(const l of clean){const x=l.l-start;num+=(x-xMean)*(l.t-avg);den+=(x-xMean)**2;}
                    // The car burns ~1.5 kg of fuel a lap and gets ~FUEL_S_PER_LAP quicker
                    // for it, which hides tyre wear; adding it back isolates the tyre
                    const rawSlope=den>0?num/den:0;
                    const slope=rawSlope+FUEL_S_PER_LAP;
                    analyzed.push({
                      driver,stint:s,compound:(s.compound||"UNKNOWN").toUpperCase(),
                      validLaps:clean.length,totalLaps:end-start+1,avg,best,slope,rawSlope,
                      lapStart:start,lapEnd:end,
                    });
                  }
                }
                return analyzed;
  },[race,allDrivers,maxLap]);
  return (()=>{
                const allStints=race.stints||[];
                if(allStints.length===0)return null;
                const fmtLapTime=(s)=>{if(!s)return"—";const m=Math.floor(s/60);const r=(s%60).toFixed(3);return `${m}:${r.padStart(6,"0")}`;};
                if(analyzed.length===0)return null;
                // Compounds actually used
                const compounds=[...new Set(analyzed.map(a=>a.compound))].filter(c=>COMPOUND_COLORS[c]);
                const activeCompound=tireCompound&&compounds.includes(tireCompound)?tireCompound:compounds[0];
                // Benchmark: best stint-avg per compound
                const benchmarks={};
                for(const c of compounds){
                  const stintsForC=analyzed.filter(a=>a.compound===c);
                  benchmarks[c]=Math.min(...stintsForC.map(a=>a.avg));
                }
                // Group analyzed by driver for the degradation chart, sort drivers by their best (lowest) degradation slope
                const byDriver={};
                for(const a of analyzed){const k=a.driver.number;byDriver[k]=byDriver[k]||{driver:a.driver,stints:[]};byDriver[k].stints.push(a);}
                const driverRows=Object.values(byDriver).sort((a,b)=>Math.min(...a.stints.map(s=>s.slope))-Math.min(...b.stints.map(s=>s.slope)));
                // Y scale for degradation chart — use max abs slope as ceiling
                const maxSlope=Math.max(0.05,...analyzed.map(a=>Math.abs(a.slope)));
                // Active compound stints for benchmark chart, sorted by gap ascending
                const benchmarkStints=analyzed.filter(a=>a.compound===activeCompound).sort((a,b)=>(a.avg-benchmarks[activeCompound])-(b.avg-benchmarks[activeCompound]));
                const maxGap=Math.max(0.5,...benchmarkStints.map(a=>a.avg-benchmarks[activeCompound]));

                // Hover lookup
                const hoveredEntry=tireHover?analyzed.find(a=>a.driver.number+"-"+a.stint.stintNumber===tireHover.key):null;

                return(
                  <div data-tire-card style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,position:"relative"}}>
                    <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Tire Management</div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:20}}>Fuel-corrected tyre degradation &amp; compound benchmarks · lower = better tyre management</div>

                    {/* DEGRADATION CHART */}
                    <div style={{marginBottom:24}}>
                      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",marginBottom:10,fontWeight:600}}>Degradation per stint</div>
                      <div className="tire-bars">
                      <div className="tire-bars-inner" style={{display:"flex",alignItems:"flex-end",gap:3,height:140,padding:"0 2px"}}>
                        {driverRows.map(({driver,stints})=>(
                          <div key={driver.number} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:"1 1 0",minWidth:0}}>
                            <div style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:1.5,height:100,width:"100%"}}>
                              {stints.sort((a,b)=>a.stint.stintNumber-b.stint.stintNumber).map(a=>{
                                const col=COMPOUND_COLORS[a.compound]||"var(--ink-4)";
                                const dark=a.compound==="HARD";
                                const h=Math.max(2,Math.min(100,(Math.abs(a.slope)/maxSlope)*100));
                                const key=a.driver.number+"-"+a.stint.stintNumber;
                                const isHovered=tireHover?.key===key;
                                return(
                                  <div key={a.stint.stintNumber}
                                    onPointerEnter={(e)=>{const r=e.currentTarget.getBoundingClientRect();const card=e.currentTarget.closest('[data-tire-card]').getBoundingClientRect();setTireHover({key,x:(r.left-card.left)+r.width/2,y:(r.top-card.top)});}}
                                    onPointerLeave={()=>setTireHover(null)}
                                    style={{flex:"1 1 0",maxWidth:9,minWidth:4,height:h,background:col,borderRadius:0,cursor:"default",outline:isHovered?"1.5px solid var(--w70)":"none",outlineOffset:isHovered?-1:0,position:"relative",border:dark?"1px solid rgba(0,0,0,0.4)":"none"}}/>
                                );
                              })}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:2,minWidth:0}}>
                              <div style={{width:2,height:9,background:inkify(driver.teamColour)||"var(--fg)",borderRadius:1,flexShrink:0}}/>
                              <div style={{fontSize:9,fontWeight:700,letterSpacing:0.3,color:"var(--w75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{driver.acronym}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                      <div style={{fontSize:10,color:"var(--w30)",marginTop:6,fontStyle:"italic"}}>Bar height = seconds lost per lap to the tyre, after the fuel correction (lower = better managed). Drivers sorted by best-managed stint.</div>
                      <HowComputed>Each stint's green-flag laps (no lap 1, in- or out-laps, safety-car or VSC laps, the restart lap, or laps over 107% of the driver's median) are fitted with a straight line, lap time against lap in stint. A car gets quicker as it burns fuel — about {FUEL_S_PER_LAP.toFixed(2)} s a lap, the usual rule of thumb for ~1.5 kg/lap at ~0.03 s/kg — which masks tyre wear, so that is added back. What's left is the tyre's cost per lap. Track evolution and traffic still leak in; read it as a ranking within the race, not an absolute.</HowComputed>
                    </div>

                    {/* COMPOUND PACE BENCHMARK */}
                    {compounds.length>0&&(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,flexWrap:"wrap",gap:8}}>
                          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600}}>Stint Pace vs Benchmark</div>
                          <div style={{fontSize:11,color:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>Benchmark {fmtLapTime(benchmarks[activeCompound])}</div>
                        </div>
                        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                          {compounds.map(c=>{
                            const col=COMPOUND_COLORS[c]||"var(--ink-4)";
                            const on=activeCompound===c;
                            return(
                              <button key={c} onClick={()=>setTireCompound(c)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:2,border:`1px solid ${on?col:"var(--w08)"}`,background:on?`${alpha(col,0x22)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:11,fontWeight:on?700:500,fontFamily:"var(--font-ui)"}}>
                                <div style={{width:14,height:14,borderRadius:2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:compoundInk(c)}}>{c[0]}</div>
                                <span style={{letterSpacing:0.5}}>{c[0]+c.slice(1).toLowerCase()}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="tire-bars">
                        <div className="tire-bars-inner" style={{display:"flex",alignItems:"flex-end",gap:3,height:160,padding:"0 2px"}}>
                          {benchmarkStints.map(a=>{
                            const gap=a.avg-benchmarks[activeCompound];
                            const h=Math.max(2,Math.min(140,(gap/maxGap)*140));
                            const tc=inkify(a.driver.teamColour)||"var(--ink-4)";
                            const isBest=gap<0.001;
                            const key=a.driver.number+"-"+a.stint.stintNumber;
                            const isHovered=tireHover?.key===key;
                            return(
                              <div key={key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:"1 1 0",minWidth:0}}>
                                <div style={{fontSize:9,fontWeight:700,color:isBest?"var(--green)":"var(--w50)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",whiteSpace:"nowrap"}}>{isBest?"FAST":`+${gap.toFixed(2)}`}</div>
                                <div
                                  onPointerEnter={(e)=>{const r=e.currentTarget.getBoundingClientRect();const card=e.currentTarget.closest('[data-tire-card]').getBoundingClientRect();setTireHover({key,x:(r.left-card.left)+r.width/2,y:(r.top-card.top)});}}
                                  onPointerLeave={()=>setTireHover(null)}
                                  style={{width:"100%",maxWidth:22,height:h,background:tc,borderRadius:0,cursor:"default",outline:isHovered?"1.5px solid var(--w70)":"none",outlineOffset:isHovered?-1:0}}
                                />
                                <div style={{textAlign:"center",minWidth:0,width:"100%"}}>
                                  <div style={{fontSize:9,fontWeight:700,letterSpacing:0.3,color:isBest?"var(--green)":"var(--w75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.driver.acronym}</div>
                                  <div style={{fontSize:8,color:"var(--w35)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>S{a.stint.stintNumber}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        </div>
                        <div style={{fontSize:10,color:"var(--w30)",marginTop:6,fontStyle:"italic"}}>Gap to the fastest stint average on this compound. Hover any bar for details.</div>
                      </div>
                    )}

                    {/* COMPOUND-BEST HEATMAP — fastest lap per driver per compound */}
                    {(()=>{
                      // Build map: { driverNumber: { compound: bestLapTime } }
                      const byKey={};
                      for(const a of analyzed){
                        const k=a.driver.number;
                        if(!byKey[k])byKey[k]={driver:a.driver,bests:{}};
                        if(!byKey[k].bests[a.compound]||a.best<byKey[k].bests[a.compound])byKey[k].bests[a.compound]=a.best;
                      }
                      const rows=Object.values(byKey).filter(r=>Object.keys(r.bests).length>0);
                      if(rows.length===0)return null;
                      // Global min/max per compound for color scaling
                      const globalRange={};
                      for(const c of compounds){
                        const vals=rows.map(r=>r.bests[c]).filter(v=>v!=null);
                        if(vals.length>0)globalRange[c]={min:Math.min(...vals),max:Math.max(...vals)};
                      }
                      // Sort drivers by their overall best lap across any compound
                      rows.sort((a,b)=>{const aBest=Math.min(...Object.values(a.bests));const bBest=Math.min(...Object.values(b.bests));return aBest-bBest;});
                      const fmtBest=(t)=>{const m=Math.floor(t/60);const r=(t%60).toFixed(3);return `${m}:${r.padStart(6,"0")}`;};
                      return(
                        <div style={{marginTop:28}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,flexWrap:"wrap",gap:8}}>
                            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600}}>Compound-best heatmap</div>
                            <div style={{fontSize:11,color:"var(--w40)"}}>Best lap per driver per compound · darker = closer to fastest</div>
                          </div>
                          <div style={{overflowX:"auto"}}>
                            <div style={{display:"grid",gridTemplateColumns:`120px repeat(${compounds.length}, minmax(110px, 1fr))`,gap:4,minWidth:120+compounds.length*110}}>
                              {/* Header row */}
                              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:0.8,color:"var(--w35)",fontWeight:600,padding:"6px 8px"}}>Driver</div>
                              {compounds.map(c=>{
                                const col=COMPOUND_COLORS[c]||"var(--ink-4)";
                                return(
                                  <div key={c} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px"}}>
                                    <div style={{width:14,height:14,borderRadius:2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:compoundInk(c)}}>{c[0]}</div>
                                    <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:0.8,color:"var(--w55)",fontWeight:600}}>{c[0]+c.slice(1).toLowerCase()}</span>
                                  </div>
                                );
                              })}
                              {/* Data rows */}
                              {rows.map(({driver,bests})=>(
                                <Fragment key={driver.number}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",fontSize:11,fontWeight:600,minWidth:0}}>
                                    <div style={{width:3,height:14,background:inkify(driver.teamColour)||"var(--fg)",borderRadius:1,flexShrink:0}}/>
                                    <div style={{minWidth:0}}>
                                      <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{driver.acronym}</div>
                                      <div style={{fontSize:9,color:"var(--w40)",fontWeight:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{normTeam(driver.team||"")}</div>
                                    </div>
                                  </div>
                                  {compounds.map(c=>{
                                    const t=bests[c];
                                    if(t==null)return(
                                      <div key={c} style={{padding:"6px 8px",fontSize:11,color:"var(--w18)",background:"var(--w015)",borderRadius:2,textAlign:"center"}}>—</div>
                                    );
                                    const range=globalRange[c];
                                    const norm=range&&range.max>range.min?(t-range.min)/(range.max-range.min):0;
                                    const isBest=norm<0.001;
                                    // Color: blend from compound color (fastest) to muted background (slowest)
                                    const col=COMPOUND_COLORS[c]||"var(--ink-4)";
                                    // Compound base color at min, fade to dark grey at max
                                    const intensity=Math.max(0.08,1-norm); // 1 = fastest, 0.08 = slowest
                                    const bgAlpha=Math.round(intensity*60).toString(16).padStart(2,"0");
                                    const gap=t-range.min;
                                    return(
                                      <div key={c} className="heatmap-cell" style={{padding:"7px 9px",borderRadius:2,background:alpha(col,parseInt(bgAlpha,16)),border:`1px solid ${isBest?col:"var(--w04)"}`,position:"relative"}}>
                                        <div style={{fontSize:11,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isBest?"var(--fg)":"var(--w85)"}}>{fmtBest(t)}</div>
                                        <div style={{fontSize:9,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:isBest?col:"var(--w45)",fontWeight:isBest?700:500,marginTop:1,letterSpacing:0.3}}>{isBest?"FASTEST":`+${gap.toFixed(3)}`}</div>
                                      </div>
                                    );
                                  })}
                                </Fragment>
                              ))}
                            </div>
                          </div>
                          <div style={{fontSize:10,color:"var(--w30)",marginTop:8,fontStyle:"italic"}}>Cell color intensity scales with how close to that compound's fastest lap. Drivers sorted by overall best lap.</div>
                        </div>
                      );
                    })()}

                    {/* STINT OVERLAY — pick stints, overlay lap-time vs lap-in-stint */}
                    {(()=>{
                      // Default selection: top 2 stints by lap count for variety
                      const sortedByLength=[...analyzed].sort((a,b)=>b.validLaps-a.validLaps);
                      const defaultKeys=new Set(sortedByLength.slice(0,2).map(a=>a.driver.number+"-"+a.stint.stintNumber));
                      const selectedKeys=stintOverlay.size>0?stintOverlay:defaultKeys;
                      const togglePick=(key)=>{
                        setStintOverlay(prev=>{
                          const cur=prev.size>0?new Set(prev):new Set(defaultKeys);
                          if(cur.has(key)){if(cur.size<=1)return cur;cur.delete(key);}
                          else if(cur.size<4){cur.add(key);}
                          return cur;
                        });
                      };
                      const picked=analyzed.filter(a=>selectedKeys.has(a.driver.number+"-"+a.stint.stintNumber));
                      if(picked.length===0)return null;
                      // Compute per-stint series: lap time vs lap-in-stint (0,1,2,...)
                      const series=picked.map(a=>{
                        const laps=(a.driver.lapTimes||[]).filter(l=>l.l>=a.lapStart&&l.l<=a.lapEnd&&!l.pit&&l.t>0).sort((x,y)=>x.l-y.l);
                        const points=laps.map(l=>({li:l.l-a.lapStart,t:l.t}));
                        return{key:a.driver.number+"-"+a.stint.stintNumber,driver:a.driver,stint:a.stint,compound:a.compound,points,slope:a.slope};
                      });
                      const maxLi=Math.max(0,...series.flatMap(s=>s.points.map(p=>p.li)));
                      const allT=series.flatMap(s=>s.points.map(p=>p.t));
                      if(allT.length<2)return null;
                      const sortedT=[...allT].sort((a,b)=>a-b);
                      const lo=sortedT[0]*0.995;
                      const hi=sortedT[Math.floor(sortedT.length*0.95)]*1.01;
                      const W=800,H=240,padL=58,padR=20,padT=18,padB=34;
                      const plotW=W-padL-padR,plotH=H-padT-padB;
                      const xOf=li=>padL+(maxLi>0?(li/maxLi)*plotW:0);
                      const yOf=t=>padT+plotH-((Math.min(t,hi)-lo)/(hi-lo))*plotH;
                      const yTicks=[lo,(lo+hi)/2,hi].map(v=>v);
                      const xTicks=Array.from({length:Math.min(6,maxLi+1)},(_,i)=>Math.round((i/(Math.min(5,maxLi)))*maxLi));
                      const onMove=(e)=>{
                        const rect=e.currentTarget.getBoundingClientRect();
                        const xView=((e.clientX-rect.left)/rect.width)*W;
                        let li=Math.round(((xView-padL)/plotW)*maxLi);
                        li=Math.max(0,Math.min(maxLi,li));
                        setOverlayHover({lapInStint:li});
                      };
                      const hLi=overlayHover?.lapInStint??null;
                      // Compounds available within the analyzed stints
                      const availCompounds=[...new Set(analyzed.map(a=>a.compound))].filter(c=>COMPOUND_COLORS[c]);
                      const compoundCounts=Object.fromEntries(availCompounds.map(c=>[c,analyzed.filter(a=>a.compound===c).length]));
                      const activeFilter=overlayCompoundFilter==="ALL"||availCompounds.includes(overlayCompoundFilter)?overlayCompoundFilter:"ALL";
                      // Drivers with at least one analyzed stint, ordered by best stint pace (theoretical-best proxy)
                      const driverStintCounts={};
                      for(const a of analyzed){driverStintCounts[a.driver.number]=(driverStintCounts[a.driver.number]||0)+1;}
                      const driverFilterOptions=[...new Set(analyzed.map(a=>a.driver.number))]
                        .map(num=>analyzed.find(a=>a.driver.number===num).driver)
                        .sort((a,b)=>a.acronym.localeCompare(b.acronym));
                      const activeDriverFilter=overlayDriverFilter==="ALL"||driverFilterOptions.find(d=>d.number===overlayDriverFilter)?overlayDriverFilter:"ALL";
                      const filteredStints=analyzed.filter(a=>{
                        if(activeFilter!=="ALL"&&a.compound!==activeFilter)return false;
                        if(activeDriverFilter!=="ALL"&&a.driver.number!==activeDriverFilter)return false;
                        return true;
                      });
                      // Selected stints (computed off full analyzed list so they remain visible if user filters)
                      const selectedAnalyzed=analyzed.filter(a=>selectedKeys.has(a.driver.number+"-"+a.stint.stintNumber));
                      return(
                        <div style={{marginTop:28}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,flexWrap:"wrap",gap:8}}>
                            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"var(--w50)",fontWeight:600}}>Stint Overlay</div>
                            <div style={{fontSize:11,color:"var(--w40)"}}>{selectedKeys.size}/4 selected</div>
                          </div>
                          {/* Selected stints — always visible */}
                          {selectedAnalyzed.length>0&&(
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,padding:"8px 10px",background:"var(--w025)",border:"1px solid var(--w06)",borderRadius:2}}>
                              <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--w35)",fontWeight:600,alignSelf:"center",marginRight:4}}>Selected</span>
                              {selectedAnalyzed.map(a=>{
                                const key=a.driver.number+"-"+a.stint.stintNumber;
                                const col=COMPOUND_COLORS[a.compound]||"var(--ink-4)";
                                const tc=inkify(a.driver.teamColour)||"var(--fg)";
                                return(
                                  <button className="chip" key={key} onClick={()=>togglePick(key)} title="Click to remove" style={{display:"flex",alignItems:"center",gap:5,padding:"3px 7px 3px 6px",borderRadius:2,border:`1px solid ${tc}`,background:`${alpha(tc,0x1a)}`,color:"var(--ink)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"var(--font-ui)"}}>
                                    <div style={{width:11,height:11,borderRadius:2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:compoundInk(a.compound)}}>{a.compound[0]}</div>
                                    <span style={{letterSpacing:0.4}}>{a.driver.acronym}</span>
                                    <span style={{fontSize:9,color:"var(--w55)",fontWeight:400}}>S{a.stint.stintNumber}</span>
                                    <span style={{marginLeft:2,fontSize:11,color:"var(--w55)",lineHeight:1}}>×</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* Compound filter */}
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:600,minWidth:54}}>Compound</span>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              <button onClick={()=>setOverlayCompoundFilter("ALL")} style={{padding:"3px 9px",borderRadius:2,border:`1px solid ${activeFilter==="ALL"?"var(--fg)":"var(--w08)"}`,background:activeFilter==="ALL"?"var(--w08)":"var(--w02)",color:activeFilter==="ALL"?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:activeFilter==="ALL"?700:500,fontFamily:"var(--font-ui)"}}>All <span style={{color:"var(--w40)",fontWeight:400,marginLeft:2}}>{analyzed.length}</span></button>
                              {availCompounds.map(c=>{
                                const col=COMPOUND_COLORS[c]||"var(--ink-4)";
                                const on=activeFilter===c;
                                return(
                                  <button key={c} onClick={()=>setOverlayCompoundFilter(c)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:2,border:`1px solid ${on?col:"var(--w08)"}`,background:on?`${alpha(col,0x22)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)"}}>
                                    <div style={{width:11,height:11,borderRadius:2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:compoundInk(c)}}>{c[0]}</div>
                                    <span>{c[0]+c.slice(1).toLowerCase()}</span>
                                    <span style={{color:"var(--w40)",fontWeight:400}}>{compoundCounts[c]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Driver filter */}
                          <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--w30)",fontWeight:600,minWidth:54,paddingTop:4}}>Driver</span>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              <button onClick={()=>setOverlayDriverFilter("ALL")} style={{padding:"3px 9px",borderRadius:2,border:`1px solid ${activeDriverFilter==="ALL"?"var(--fg)":"var(--w08)"}`,background:activeDriverFilter==="ALL"?"var(--w08)":"var(--w02)",color:activeDriverFilter==="ALL"?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:activeDriverFilter==="ALL"?700:500,fontFamily:"var(--font-ui)"}}>All <span style={{color:"var(--w40)",fontWeight:400,marginLeft:2}}>{driverFilterOptions.length}</span></button>
                              {driverFilterOptions.map(d=>{
                                const on=activeDriverFilter===d.number;
                                const tc=inkify(d.teamColour)||"var(--fg)";
                                return(
                                  <button key={d.number} onClick={()=>setOverlayDriverFilter(d.number)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:2,border:`1px solid ${on?tc:"var(--w08)"}`,background:on?`${alpha(tc,0x22)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)"}}>
                                    <div style={{width:2,height:10,background:tc,borderRadius:1}}/>
                                    <span style={{letterSpacing:0.4}}>{d.acronym}</span>
                                    <span style={{color:"var(--w40)",fontWeight:400}}>{driverStintCounts[d.number]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Available stints — already-selected items excluded since they appear above */}
                          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14,maxHeight:84,overflowY:"auto",padding:"2px 1px"}}>
                            {filteredStints.filter(a=>!selectedKeys.has(a.driver.number+"-"+a.stint.stintNumber)).map(a=>{
                              const key=a.driver.number+"-"+a.stint.stintNumber;
                              const col=COMPOUND_COLORS[a.compound]||"var(--ink-4)";
                              const tc=inkify(a.driver.teamColour)||"var(--fg)";
                              const atMax=selectedKeys.size>=4;
                              return(
                                <button className="chip" key={key} disabled={atMax} onClick={()=>togglePick(key)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 7px",borderRadius:2,border:"1px solid var(--w08)",background:"var(--w02)",color:"var(--w55)",cursor:atMax?"not-allowed":"pointer",fontSize:10,fontWeight:500,fontFamily:"var(--font-ui)",opacity:atMax?0.4:1}}>
                                  <div style={{width:11,height:11,borderRadius:2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:compoundInk(a.compound)}}>{a.compound[0]}</div>
                                  <span style={{letterSpacing:0.4,color:tc,fontWeight:600}}>{a.driver.acronym}</span>
                                  <span style={{fontSize:9,color:"var(--w40)",fontWeight:400}}>S{a.stint.stintNumber}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div style={{position:"relative"}}>
                            <svg role="img" aria-label="Tyre degradation: lap-time loss per lap of each stint" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:240,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setOverlayHover(null)}>
                              {yTicks.map((v,i)=>(
                                <g key={i}>
                                  <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke="var(--w06)"/>
                                  <text x={padL-8} y={yOf(v)+4} textAnchor="end" fill="var(--w40)" fontSize="10" fontFamily="var(--font-ui)">{(()=>{const m=Math.floor(v/60);const r=(v%60).toFixed(1);return `${m}:${r.padStart(4,"0")}`;})()}</text>
                                </g>
                              ))}
                              {xTicks.map((l,i)=>(<text key={i} x={xOf(l)} y={H-padB+18} textAnchor="middle" fill={hLi===l?"var(--fg)":"var(--w45)"} fontWeight={hLi===l?600:400} fontSize="10" fontFamily="var(--font-ui)">+{l}</text>))}
                              {hLi!==null&&(<line x1={xOf(hLi)} x2={xOf(hLi)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>)}
                              {series.map(s=>{
                                if(s.points.length<2)return null;
                                const tc=inkify(s.driver.teamColour)||"var(--fg)";
                                const path=s.points.map((p,i)=>`${i===0?"M":"L"}${xOf(p.li)},${yOf(p.t)}`).join(" ");
                                return(
                                  <g key={s.key} pointerEvents="none">
                                    <path d={path} stroke={tc} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                                    {s.points.map((p,i)=>(<circle key={i} cx={xOf(p.li)} cy={yOf(p.t)} r={2.5} fill={tc} opacity={0.7}/>))}
                                    {hLi!==null&&(()=>{const p=s.points.find(x=>x.li===hLi);return p?<circle cx={xOf(p.li)} cy={yOf(p.t)} r={4.5} fill={tc} stroke="var(--bench)" strokeWidth={1.5}/>:null;})()}
                                  </g>
                                );
                              })}
                            </svg>
                            {hLi!==null&&(()=>{
                              const rows=series
                                .map(s=>{const p=s.points.find(x=>x.li===hLi);return p?{key:s.key,acronym:s.driver.acronym,teamColour:inkify(s.driver.teamColour),compound:s.compound,stintNumber:s.stint.stintNumber,t:p.t}:null;})
                                .filter(Boolean)
                                .sort((a,b)=>a.t-b.t);
                              if(rows.length===0)return null;
                              const leftPct=(xOf(hLi)/W)*100;
                              const placeRight=leftPct<55;
                              return(
                                <div style={{position:"absolute",top:6,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:200,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:8,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>Stint lap +{hLi}</div>
                                  {rows.map(r=>(
                                    <div key={r.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:11}}>
                                      <div style={{width:10,height:10,borderRadius:2,background:COMPOUND_COLORS[r.compound]||"var(--ink-4)"}}/>
                                      <div style={{width:3,height:11,background:inkify(r.teamColour)||"var(--fg)",borderRadius:1}}/>
                                      <div style={{flex:1,fontWeight:600}}>{r.acronym} <span style={{color:"var(--w40)",fontWeight:400}}>S{r.stintNumber}</span></div>
                                      <div style={{fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:700}}>{fmtLapTime(r.t)}</div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{fontSize:10,color:"var(--w30)",marginTop:6,fontStyle:"italic"}}>X axis = lap number within each stint. Steeper rising lines = faster degradation.</div>
                        </div>
                      );
                    })()}

                    {/* Shared hover tooltip */}
                    {hoveredEntry&&(
                      <div style={{position:"absolute",left:tireHover.x,top:tireHover.y-90,transform:"translateX(-50%)",background:"var(--panel-2)",border:`1px solid ${COMPOUND_COLORS[hoveredEntry.compound]||"var(--ink-4)"}40`,borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:220,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)",zIndex:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{fontSize:9,fontWeight:800,letterSpacing:1.2,padding:"3px 8px",borderRadius:2,background:COMPOUND_COLORS[hoveredEntry.compound],color:compoundInk(hoveredEntry.compound)}}>{hoveredEntry.compound}</div>
                          <div style={{fontSize:11,color:"var(--w70)",fontWeight:600}}>{hoveredEntry.driver.acronym} · Stint {hoveredEntry.stint.stintNumber}</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"5px 14px",fontSize:11}}>
                          <div style={{color:"var(--w40)"}}>Laps</div>
                          <div style={{fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>L{hoveredEntry.lapStart} – L{hoveredEntry.lapEnd} <span style={{color:"var(--w40)",fontWeight:400}}>({hoveredEntry.validLaps} clean)</span></div>
                          <div style={{color:"var(--w40)"}}>Avg pace</div>
                          <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{fmtLapTime(hoveredEntry.avg)}</div>
                          <div style={{color:"var(--w40)"}}>Best lap</div>
                          <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:"var(--green)"}}>{fmtLapTime(hoveredEntry.best)}</div>
                          <div style={{color:"var(--w40)"}}>Degradation</div>
                          <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:hoveredEntry.slope>0.05?"var(--red)":hoveredEntry.slope<-0.02?"var(--green)":"var(--fg)"}}>{hoveredEntry.slope>=0?"+":""}{(hoveredEntry.slope*1000).toFixed(0)}ms / lap</div>
                          {benchmarks[hoveredEntry.compound]&&(<>
                            <div style={{color:"var(--w40)"}}>vs benchmark</div>
                            <div style={{fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:(hoveredEntry.avg-benchmarks[hoveredEntry.compound])<0.05?"var(--green)":"var(--gold)"}}>+{(hoveredEntry.avg-benchmarks[hoveredEntry.compound]).toFixed(3)}s</div>
                          </>)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })();
});

// ─── Position Evolution panel — owns the hover crosshair/tooltip state.
const PositionChartPanel=memo(function PositionChartPanel({maxLap,visibleDrivers,race}){
  const[telPosHover,setTelPosHover]=useState(null); // {x,lap} or null
  return (()=>{
                const W=800,H=280,padL=44,padR=20,padT=18,padB=34;
                const plotW=W-padL-padR,plotH=H-padT-padB;
                const totalPositions=22;
                const xOf=l=>padL+((l-1)/Math.max(1,maxLap-1))*plotW;
                const yOf=p=>padT+((p-1)/(totalPositions-1))*plotH;
                const xTicks=Array.from({length:6},(_,i)=>Math.round(1+(i/5)*(maxLap-1)));
                const yTicks=[1,5,10,15,20];
                const hasAny=visibleDrivers.some(d=>(d.positions||[]).length>0);
                if(!hasAny)return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,fontSize:12,color:"var(--w40)"}}>Position data not available for this race.</div>
                );
                const onMove=(e)=>{
                  const rect=e.currentTarget.getBoundingClientRect();
                  const xView=((e.clientX-rect.left)/rect.width)*W;
                  let lap=Math.round(((xView-padL)/plotW)*(maxLap-1))+1;
                  lap=Math.max(1,Math.min(maxLap,lap));
                  setTelPosHover({lap});
                };
                const hoverLap=telPosHover?.lap||null;
                const periods=race.raceControlPeriods||[];
                const periodStyle={SC:{fill:"rgba(255,218,0,0.10)",border:"rgba(255,218,0,0.45)",label:"SC",color:"var(--yellow)"},VSC:{fill:"rgba(255,152,0,0.08)",border:"rgba(255,152,0,0.40)",label:"VSC",color:"var(--amber)"},RED:{fill:"rgba(214,40,40,0.14)",border:"rgba(214,40,40,0.55)",label:"RED",color:"var(--red-ink)"}};
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                    <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Position by Lap</div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:16}}>Lines cross at overtakes — flat clusters = safety car, sharp drops = pit stops</div>
                    <div style={{position:"relative"}}>
                      <svg role="img" aria-label="Race position by lap for the selected drivers" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:280,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setTelPosHover(null)}>
                        {periods.map((p,i)=>{
                          const st=periodStyle[p.type];if(!st||!p.lapStart||!p.lapEnd)return null;
                          const x1=xOf(p.lapStart);const x2=xOf(Math.max(p.lapStart,p.lapEnd));
                          return(
                            <g key={"rc"+i}>
                              <rect x={x1} y={padT} width={Math.max(2,x2-x1)} height={plotH} fill={st.fill}/>
                              <line x1={x1} x2={x1} y1={padT} y2={padT+plotH} stroke={st.border} strokeWidth={1} strokeDasharray="2 2"/>
                              <line x1={x2} x2={x2} y1={padT} y2={padT+plotH} stroke={st.border} strokeWidth={1} strokeDasharray="2 2"/>
                              <text x={(x1+x2)/2} y={padT+10} textAnchor="middle" fill={st.color} fontSize="9" fontWeight={700} fontFamily="var(--font-ui)" letterSpacing={1}>{st.label}</text>
                            </g>
                          );
                        })}
                        {yTicks.map(p=>(
                          <g key={p}>
                            <line x1={padL} x2={W-padR} y1={yOf(p)} y2={yOf(p)} stroke="var(--w05)"/>
                            <text x={padL-8} y={yOf(p)+4} textAnchor="end" fill="var(--w40)" fontSize="10" fontFamily="var(--font-ui)">P{p}</text>
                          </g>
                        ))}
                        {xTicks.map((l,i)=>(
                          <text key={i} x={xOf(l)} y={H-padB+18} textAnchor="middle" fill={hoverLap===l?"var(--fg)":"var(--w45)"} fontWeight={hoverLap===l?600:400} fontSize="10" fontFamily="var(--font-ui)">L{l}</text>
                        ))}
                        {hoverLap&&(
                          <line x1={xOf(hoverLap)} x2={xOf(hoverLap)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>
                        )}
                        {visibleDrivers.map(d=>{
                          const pts=d.positions||[];
                          if(pts.length<2)return null;
                          const color=inkify(d.teamColour)||"var(--fg)";
                          const path=pts.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.p)}`).join(" ");
                          return(
                            <g key={d.acronym} pointerEvents="none">
                              <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
                              {hoverLap&&(()=>{const p=pts.find(x=>x.l===hoverLap);return p?<circle cx={xOf(p.l)} cy={yOf(p.p)} r={4} fill={color} stroke="var(--bench)" strokeWidth={1.5}/>:null;})()}
                            </g>
                          );
                        })}
                      </svg>
                      {hoverLap&&(()=>{
                        const rows=visibleDrivers
                          .map(d=>{
                            const p=(d.positions||[]).find(x=>x.l===hoverLap);
                            return p?{acronym:d.acronym,teamColour:inkify(d.teamColour),pos:p.p}:null;
                          })
                          .filter(Boolean)
                          .sort((a,b)=>a.pos-b.pos);
                        if(rows.length===0)return null;
                        const leftPct=(xOf(hoverLap)/W)*100;
                        const placeRight=leftPct<55;
                        return(
                          <div style={{position:"absolute",top:6,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:180,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:8}}>Lap {hoverLap}</div>
                            {rows.map(r=>(
                              <div key={r.acronym} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:11}}>
                                <div style={{width:18,color:"var(--w45)",fontWeight:600,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>P{r.pos}</div>
                                <div style={{width:3,height:11,background:inkify(r.teamColour)||"var(--fg)",borderRadius:1}}/>
                                <div style={{flex:1,fontWeight:600}}>{r.acronym}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })();
});

// ─── Race Gap delta panel — owns the A/B pickers and hover crosshair; the
// cumulative per-lap delta series is memoized so hovers skip the rebuild.
const DeltaChartPanel=memo(function DeltaChartPanel({allDrivers,maxLap,race}){
  const[deltaA,setDeltaA]=useState(null); // delta-line driver A (acronym)
  const[deltaB,setDeltaB]=useState(null); // delta-line driver B (acronym)
  const[deltaHover,setDeltaHover]=useState(null); // {lap}
                const{usable,acrA,acrB,drA,drB,deltas}=useMemo(()=>{
                  // Drivers with usable lap-time arrays
                  const usable=allDrivers.filter(d=>(d.lapTimes||[]).length>=3);
                  if(usable.length<2)return{usable};
                  // Default: top-2 finishers
                  const finalPos=(d)=>{const ps=d.positions;if(!ps||ps.length===0)return 99;return ps[ps.length-1].p;};
                  const sortedByFinish=[...usable].sort((a,b)=>finalPos(a)-finalPos(b));
                  const defA=sortedByFinish[0]?.acronym;
                  const defB=sortedByFinish[1]?.acronym;
                  const acrA=deltaA&&usable.find(d=>d.acronym===deltaA)?deltaA:defA;
                  const acrB=deltaB&&usable.find(d=>d.acronym===deltaB)?deltaB:defB;
                  const drA=usable.find(d=>d.acronym===acrA);
                  const drB=usable.find(d=>d.acronym===acrB);
                  if(!drA||!drB||drA.acronym===drB.acronym)return{usable};
                  // Cumulative race time per lap
                  const cumByLap=(driver)=>{
                    const m=new Map();
                    const sorted=[...(driver.lapTimes||[])].sort((a,b)=>a.l-b.l);
                    let cum=0;
                    for(const l of sorted){cum+=l.t;m.set(l.l,cum);}
                    return m;
                  };
                  const cA=cumByLap(drA),cB=cumByLap(drB);
                  const commonLaps=[];
                  for(const lap of cA.keys()){if(cB.has(lap))commonLaps.push(lap);}
                  commonLaps.sort((a,b)=>a-b);
                  if(commonLaps.length<2)return{usable,acrA,acrB,drA,drB};
                  const deltas=commonLaps.map(l=>({l,delta:cA.get(l)-cB.get(l)}));
                  return{usable,acrA,acrB,drA,drB,commonLaps,deltas};
                },[allDrivers,deltaA,deltaB]);
                if(usable.length<2)return null;
                if(!drA||!drB||drA.acronym===drB.acronym)return null;
                if(!deltas||deltas.length<2)return null;
                const yMin=Math.min(...deltas.map(p=>p.delta));
                const yMax=Math.max(...deltas.map(p=>p.delta));
                const yPad=Math.max(2,(yMax-yMin)*0.15);
                const yLo=yMin-yPad,yHi=yMax+yPad;
                const W=800,H=240,padL=58,padR=20,padT=18,padB=34;
                const plotW=W-padL-padR,plotH=H-padT-padB;
                const xOf=l=>padL+((l-1)/Math.max(1,maxLap-1))*plotW;
                const yOf=v=>padT+plotH-((v-yLo)/(yHi-yLo))*plotH;
                const zeroY=yOf(0);
                const yTicks=[yLo,(yLo+yHi)/2,0,yHi].filter((v,i,a)=>a.indexOf(v)===i);
                const xTicks=Array.from({length:6},(_,i)=>Math.round(1+(i/5)*(maxLap-1)));
                const tcA=inkify(drA.teamColour)||"var(--fg)";
                const tcB=inkify(drB.teamColour)||"var(--fg)";
                const onMove=(e)=>{
                  const rect=e.currentTarget.getBoundingClientRect();
                  const xView=((e.clientX-rect.left)/rect.width)*W;
                  let lap=Math.round(((xView-padL)/plotW)*(maxLap-1))+1;
                  lap=Math.max(1,Math.min(maxLap,lap));
                  setDeltaHover({lap});
                };
                const hoverLap=deltaHover?.lap||null;
                const periods=race.raceControlPeriods||[];
                const periodStyle={SC:{fill:"rgba(255,218,0,0.10)",border:"rgba(255,218,0,0.45)",label:"SC",color:"var(--yellow)"},VSC:{fill:"rgba(255,152,0,0.08)",border:"rgba(255,152,0,0.40)",label:"VSC",color:"var(--amber)"},RED:{fill:"rgba(214,40,40,0.14)",border:"rgba(214,40,40,0.55)",label:"RED",color:"var(--red-ink)"}};
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20,position:"relative"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:15,fontWeight:700}}>Race Gap · {drA.acronym} vs {drB.acronym}</div>
                      <div style={{fontSize:11,color:"var(--w40)",fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>End-of-race gap {(deltas[deltas.length-1].delta).toFixed(3)}s</div>
                    </div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:14}}>Cumulative race-time delta per lap · positive = <span style={{color:tcA}}>{drA.acronym}</span> slower than <span style={{color:tcB}}>{drB.acronym}</span>, negative = ahead</div>
                    <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:"var(--w40)",textTransform:"uppercase",letterSpacing:1}}>A</span>
                        {usable.map(d=>{const on=d.acronym===acrA;const dc=inkify(d.teamColour)||"var(--fg)";return(
                          <button key={"a-"+d.acronym} onClick={()=>setDeltaA(d.acronym)} style={{padding:"3px 8px",borderRadius:2,border:`1px solid ${on?dc:"var(--w08)"}`,background:on?`${alpha(dc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)",letterSpacing:0.4}}>{d.acronym}</button>
                        );})}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:"var(--w40)",textTransform:"uppercase",letterSpacing:1}}>B</span>
                        {usable.map(d=>{const on=d.acronym===acrB;const dc=inkify(d.teamColour)||"var(--fg)";return(
                          <button key={"b-"+d.acronym} onClick={()=>setDeltaB(d.acronym)} style={{padding:"3px 8px",borderRadius:2,border:`1px solid ${on?dc:"var(--w08)"}`,background:on?`${alpha(dc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:10,fontWeight:on?700:500,fontFamily:"var(--font-ui)",letterSpacing:0.4}}>{d.acronym}</button>
                        );})}
                      </div>
                    </div>
                    <div style={{position:"relative"}}>
                      <svg role="img" aria-label="Gap to the leader by lap for the selected drivers" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:240,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setDeltaHover(null)}>
                        {periods.map((p,i)=>{const st=periodStyle[p.type];if(!st||!p.lapStart||!p.lapEnd)return null;const x1=xOf(p.lapStart);const x2=xOf(Math.max(p.lapStart,p.lapEnd));return(<rect key={i} x={x1} y={padT} width={Math.max(2,x2-x1)} height={plotH} fill={st.fill}/>);})}
                        {yTicks.map((v,i)=>(
                          <g key={i}>
                            <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={v===0?"var(--w35)":"var(--w06)"} strokeWidth={v===0?1.2:1} strokeDasharray={v===0?"":""}/>
                            <text x={padL-8} y={yOf(v)+4} textAnchor="end" fill={v===0?"var(--w65)":"var(--w40)"} fontSize="10" fontFamily="var(--font-ui)" fontWeight={v===0?600:400}>{(v>=0?"+":"")+v.toFixed(1)}s</text>
                          </g>
                        ))}
                        {xTicks.map((l,i)=>(<text key={i} x={xOf(l)} y={H-padB+18} textAnchor="middle" fill={hoverLap===l?"var(--fg)":"var(--w45)"} fontWeight={hoverLap===l?600:400} fontSize="10" fontFamily="var(--font-ui)">L{l}</text>))}
                        {hoverLap&&(<line x1={xOf(hoverLap)} x2={xOf(hoverLap)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>)}
                        {/* Filled area between line and zero */}
                        {(()=>{
                          const seg=deltas;
                          if(seg.length<2)return null;
                          // Build a path that fills between the line and y=0, color-coded by sign
                          const aboveFill=`M${xOf(seg[0].l)},${zeroY} ${seg.map(p=>`L${xOf(p.l)},${yOf(Math.max(0,p.delta))}`).join(" ")} L${xOf(seg[seg.length-1].l)},${zeroY} Z`;
                          const belowFill=`M${xOf(seg[0].l)},${zeroY} ${seg.map(p=>`L${xOf(p.l)},${yOf(Math.min(0,p.delta))}`).join(" ")} L${xOf(seg[seg.length-1].l)},${zeroY} Z`;
                          return(<g pointerEvents="none"><path d={belowFill} fill={tcA} fillOpacity={0.12}/><path d={aboveFill} fill={tcB} fillOpacity={0.12}/></g>);
                        })()}
                        {/* Delta line */}
                        <path d={deltas.map((p,i)=>`${i===0?"M":"L"}${xOf(p.l)},${yOf(p.delta)}`).join(" ")} stroke="var(--w85)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"/>
                        {hoverLap&&(()=>{const p=deltas.find(x=>x.l===hoverLap);return p?<circle cx={xOf(p.l)} cy={yOf(p.delta)} r={4} fill="var(--fg)" stroke="var(--bench)" strokeWidth={1.5} pointerEvents="none"/>:null;})()}
                      </svg>
                      {hoverLap&&(()=>{
                        const p=deltas.find(x=>x.l===hoverLap);
                        if(!p)return null;
                        const leftPct=(xOf(hoverLap)/W)*100;
                        const placeRight=leftPct<55;
                        const ahead=p.delta<0?drA:drB;
                        const aheadCol=p.delta<0?tcA:tcB;
                        const absGap=Math.abs(p.delta);
                        return(
                          <div style={{position:"absolute",top:6,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:180,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:8}}>Lap {hoverLap}</div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:11}}>
                              <div style={{width:3,height:11,background:aheadCol,borderRadius:1}}/>
                              <div style={{flex:1,fontWeight:700}}>{ahead.acronym}</div>
                              <div style={{fontSize:10,color:"var(--w50)"}}>ahead</div>
                            </div>
                            <div style={{fontSize:18,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",color:aheadCol,letterSpacing:-0.5}}>{absGap.toFixed(3)}s</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
});

// ─── Speed Trace panel — owns its driver picks and hover crosshair so 60Hz
// mousemove updates re-render only this panel.
const SpeedTracePanel=memo(function SpeedTracePanel({allDrivers}){
  const[telTraceSel,setTelTraceSel]=useState(()=>new Set()); // acronyms selected for speed trace
  const[telTraceHover,setTelTraceHover]=useState(null); // {dist} or null
                const traceable=useMemo(()=>allDrivers.filter(d=>d.fastLapTrace&&d.fastLapTrace.trace&&d.fastLapTrace.trace.length>0),[allDrivers]);
                const defaultSel=useMemo(()=>new Set(traceable.slice(0,2).map(d=>d.acronym)),[traceable]);
                const selected=telTraceSel.size>0?telTraceSel:defaultSel;
                const visible=useMemo(()=>traceable.filter(d=>selected.has(d.acronym)),[traceable,selected]);
                // Normalize each driver's trace to 0-1 percent of lap (raw distance
                // units from OpenF1 location aren't meters and vary slightly per
                // driver due to racing line). Percent-of-lap makes comparison
                // unitless and aligns the lines for visual comparison.
                const normalized=useMemo(()=>visible.map(d=>{
                  const t=d.fastLapTrace.trace;
                  const dMax=Math.max(1,...t.map(p=>p.d));
                  return{
                    driver:d,
                    points:t.map(p=>({pct:p.d/dMax,s:p.s})),
                  };
                }),[visible]);
                if(traceable.length===0)return null;
                const toggle=(acr)=>{
                  setTelTraceSel(prev=>{
                    const cur=prev.size>0?new Set(prev):new Set(defaultSel);
                    if(cur.has(acr)){if(cur.size<=1)return cur;cur.delete(acr);}
                    else if(cur.size<4){cur.add(acr);}
                    return cur;
                  });
                };
                const allSpeed=normalized.flatMap(n=>n.points.map(p=>p.s));
                const maxSpeed=Math.max(10,...allSpeed)*1.05;
                const minSpeed=Math.min(30,...allSpeed)*0.92;
                const W=800,H=280,padL=58,padR=20,padT=18,padB=34;
                const plotW=W-padL-padR,plotH=H-padT-padB;
                const xOf=pct=>padL+pct*plotW;
                const yOf=s=>padT+plotH-((s-minSpeed)/(maxSpeed-minSpeed))*plotH;
                const xTicks=[0,0.25,0.5,0.75,1];
                const yTicks=[Math.round(minSpeed),Math.round((minSpeed+maxSpeed)/2),Math.round(maxSpeed)];
                const onMove=(e)=>{
                  const rect=e.currentTarget.getBoundingClientRect();
                  const xView=((e.clientX-rect.left)/rect.width)*W;
                  let pct=(xView-padL)/plotW;
                  pct=Math.max(0,Math.min(1,pct));
                  setTelTraceHover({pct});
                };
                const hoverPct=telTraceHover?.pct??null;
                const findNearest=(points,pct)=>{
                  if(!points.length)return null;
                  let best=points[0],bestGap=Math.abs(points[0].pct-pct);
                  for(const p of points){const g=Math.abs(p.pct-pct);if(g<bestGap){best=p;bestGap=g;}}
                  return best;
                };
                return(
                  <div style={{background:"var(--w02)",border:"1px solid var(--w06)",borderRadius:2,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:15,fontWeight:700}}>Speed Trace · Fastest race lap</div>
                      <div style={{fontSize:11,color:"var(--w40)"}}>Top 6 drivers · pick up to 4 to compare</div>
                    </div>
                    <div style={{fontSize:12,color:"var(--w35)",marginBottom:14}}>Speed (km/h) vs % of lap distance · each driver's fastest race lap · dips = braking zones, peaks = straights</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                      {traceable.map(d=>{
                        const on=selected.has(d.acronym);
                        const tc=inkify(d.teamColour)||"var(--fg)";
                        return(
                          <button className="chip" aria-pressed={on} key={d.acronym} onClick={()=>toggle(d.acronym)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:2,border:`1px solid ${on?tc:"var(--w08)"}`,background:on?`${alpha(tc,0x1a)}`:"var(--w02)",color:on?"var(--fg)":"var(--w55)",cursor:"pointer",fontSize:11,fontWeight:on?700:500,fontFamily:"var(--font-ui)"}}>
                            <div style={{width:3,height:11,background:tc,borderRadius:1,opacity:on?1:0.5}}/>
                            <span style={{letterSpacing:0.5}}>{d.acronym}</span>
                            <span style={{fontSize:9,color:"var(--w40)",fontWeight:400,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{d.fastLapTrace.lapTime.toFixed(3)}s</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{position:"relative"}}>
                      <svg role="img" aria-label="Speed against distance on each driver's fastest lap" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:280,display:"block",touchAction:"pan-y"}} onPointerMove={onMove} onPointerLeave={()=>setTelTraceHover(null)}>
                        {yTicks.map(v=>(
                          <g key={v}>
                            <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke="var(--w06)"/>
                            <text x={padL-8} y={yOf(v)+4} textAnchor="end" fill="var(--w40)" fontSize="10" fontFamily="var(--font-ui)">{v} km/h</text>
                          </g>
                        ))}
                        {xTicks.map((v,i)=>(
                          <text key={i} x={xOf(v)} y={H-padB+18} textAnchor="middle" fill="var(--w45)" fontSize="10" fontFamily="var(--font-ui)">{Math.round(v*100)}%</text>
                        ))}
                        {hoverPct!==null&&(
                          <line x1={xOf(hoverPct)} x2={xOf(hoverPct)} y1={padT} y2={padT+plotH} stroke="var(--w25)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none"/>
                        )}
                        {normalized.map(n=>{
                          if(n.points.length<2)return null;
                          const color=inkify(n.driver.teamColour)||"var(--fg)";
                          const path=n.points.map((p,i)=>`${i===0?"M":"L"}${xOf(p.pct)},${yOf(p.s)}`).join(" ");
                          return(
                            <g key={n.driver.acronym} pointerEvents="none">
                              <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                              {hoverPct!==null&&(()=>{const p=findNearest(n.points,hoverPct);return p?<circle cx={xOf(p.pct)} cy={yOf(p.s)} r={4} fill={color} stroke="var(--bench)" strokeWidth={1.5}/>:null;})()}
                            </g>
                          );
                        })}
                      </svg>
                      {hoverPct!==null&&(()=>{
                        const rows=normalized
                          .map(n=>{const p=findNearest(n.points,hoverPct);return p?{acronym:n.driver.acronym,teamColour:inkify(n.driver.teamColour),speed:p.s}:null;})
                          .filter(Boolean)
                          .sort((a,b)=>b.speed-a.speed);
                        if(rows.length===0)return null;
                        const leftPct=(xOf(hoverPct)/W)*100;
                        const placeRight=leftPct<55;
                        return(
                          <div style={{position:"absolute",top:6,[placeRight?"left":"right"]:`${placeRight?leftPct+1.5:100-leftPct+1.5}%`,background:"var(--panel-2)",border:"1px solid var(--rule)",borderRadius:2,padding:"10px 12px",pointerEvents:"none",minWidth:180,boxShadow:"0 6px 18px -4px rgba(0,0,0,0.35)"}}>
                            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"var(--w40)",fontWeight:600,marginBottom:8,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)"}}>{Math.round(hoverPct*100)}% of lap</div>
                            {rows.map(r=>(
                              <div key={r.acronym} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:11}}>
                                <div style={{width:3,height:11,background:inkify(r.teamColour)||"var(--fg)",borderRadius:1}}/>
                                <div style={{flex:1,fontWeight:600}}>{r.acronym}</div>
                                <div style={{fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-data)",fontWeight:700}}>{r.speed} km/h</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
});
