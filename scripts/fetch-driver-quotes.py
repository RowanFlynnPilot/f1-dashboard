#!/usr/bin/env python3
"""
fetch-driver-quotes.py
Fetches YouTube auto-captions from official F1 post-race/qualifying reaction videos,
sends them to Claude to extract 1-2 quotes per driver, and writes driver-quotes.json.

Two-phase workflow:
  1. TRANSCRIPTS (local only — YouTube blocks cloud IPs):
     python scripts/fetch-driver-quotes.py --fetch-transcripts
     → Fetches captions from YouTube, caches them in scripts/transcripts/
     → Commit these files so CI can use them

  2. QUOTES (CI or local — needs ANTHROPIC_API_KEY):
     python scripts/fetch-driver-quotes.py
     → Reads cached transcripts, sends to Claude, writes driver-quotes.json

Other usage:
  python scripts/fetch-driver-quotes.py --video-id <ID>       # Process a single video
  python scripts/fetch-driver-quotes.py --race "Japanese Grand Prix"  # Process a specific race

Requires:
  pip install youtube-transcript-api anthropic requests
  ANTHROPIC_API_KEY environment variable (for quote extraction)
"""

import argparse
import io
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET

# Fix Windows console encoding for emoji output
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

import requests

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

try:
    import anthropic
except ImportError:
    anthropic = None


SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
VIDEO_IDS_PATH = SCRIPT_DIR / "video-ids.json"
OVERRIDES_PATH = SCRIPT_DIR / "quote-overrides.json"
TRANSCRIPTS_DIR = SCRIPT_DIR / "transcripts"
DATA_JSON_PATH = PROJECT_DIR / "public" / "data.json"
OUTPUT_PATH = PROJECT_DIR / "public" / "driver-quotes.json"
SEASON = 2026

# Official F1 YouTube channel
F1_CHANNEL_ID = "UCB_qr75-ydFVKSF9Dmo6izg"
F1_RSS_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={F1_CHANNEL_ID}"

# Title patterns for driver reaction videos
# Note: F1 has been inconsistent with phrasing — "After The Race", "After To The Race",
# etc. Match all reasonable variants. Order in SESSION_PATTERNS matters: more specific
# patterns (sprintQualifying) must come before less specific ones (sprint, qualifying).
SESSION_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("sprintQualifying", re.compile(r"Drivers React (?:After|To) Sprint Qualifying \| (\d{4}) (.+)")),
    ("sprint",           re.compile(r"Drivers React (?:After|To) Sprint \| (\d{4}) (.+)")),
    ("qualifying",       re.compile(r"Drivers React (?:To|After) Qualifying \| (\d{4}) (.+)")),
    ("race",             re.compile(r"Drivers React (?:After(?: To)? The Race|To The Race) \| (\d{4}) (.+)")),
]
SESSION_TYPES = [name for name, _ in SESSION_PATTERNS]

EXTRACTION_PROMPT = """You are analyzing a transcript from an official Formula 1 YouTube video where drivers give their reactions after a {session_type} session at the {race_name}.

This is the {season} season. The COMPLETE list of drivers competing in {season} is below — every quote you extract MUST be from a driver on this list, using the team shown here. Do NOT use driver/team pairings from previous seasons. Drivers like Tsunoda, Ricciardo, Magnussen, Bottas (unless listed below) are NOT in F1 this year. If you think you hear a driver who isn't on this list, you are mistaken — either it's a different driver on the list, or the speaker is unclear and you should omit the quote.

OFFICIAL {season} DRIVER ROSTER (driver — team):
{roster}

Rules for extracting quotes:
1. Auto-generated YouTube captions have NO speaker labels. You must identify the speaker from context: the host/interviewer addressing them by name, the driver self-identifying ("as a Ferrari driver…"), or unambiguous content (e.g. discussing their own finishing position which matches results).
2. If you cannot confidently identify the speaker, OMIT the quote. Do not guess. It is much better to return fewer high-confidence quotes than to misattribute.
3. The "team" field MUST match the roster above exactly. Never use a driver's prior-season team.
4. The "driver" field MUST be a name from the roster above. Use the full name as shown.
5. Aim for 1-2 quotes per identified driver. Quotes should be complete, meaningful sentences capturing the driver's actual point. Clean up filler words and stuttering but stay faithful to what was said.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "quotes": [
    {{
      "driver": "Full Driver Name (must match roster)",
      "team": "Team Name (must match roster)",
      "quote": "The actual quote from the driver",
      "context": "Brief 3-8 word description of what they're discussing"
    }}
  ]
}}

Here is the transcript:

{transcript}"""

# Structured-output schema matching the JSON shape in EXTRACTION_PROMPT — the API
# guarantees the response parses against this, so no fence-stripping/retry needed.
QUOTES_SCHEMA = {
    "type": "object",
    "properties": {
        "quotes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "driver": {"type": "string"},
                    "team": {"type": "string"},
                    "quote": {"type": "string"},
                    "context": {"type": "string"},
                },
                "required": ["driver", "team", "quote", "context"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["quotes"],
    "additionalProperties": False,
}


def transcript_path(video_id: str) -> Path:
    """Return the cached transcript file path for a video."""
    return TRANSCRIPTS_DIR / f"{video_id}.txt"


def load_roster() -> tuple[str, dict[str, str]]:
    """Load the current-season driver roster from data.json.

    Returns (formatted_roster_block, {driver_name_lower: team}) for prompt
    injection and post-filtering. Falls back to an empty roster (no filtering)
    if data.json is missing — extraction still runs but loses the safety net.
    """
    if not DATA_JSON_PATH.exists():
        print(f"  ⚠️  {DATA_JSON_PATH} not found — roster filter disabled")
        return "(roster unavailable)", {}

    with open(DATA_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    drivers = data.get("drivers", [])
    if not drivers:
        return "(roster unavailable)", {}

    # Group by team for a readable prompt block
    by_team: dict[str, list[str]] = {}
    roster_map: dict[str, str] = {}
    for d in drivers:
        name = d.get("name", "").strip()
        team = d.get("team", "").strip()
        if not name or not team:
            continue
        by_team.setdefault(team, []).append(name)
        roster_map[name.lower()] = team

    lines = []
    for team in sorted(by_team):
        for name in sorted(by_team[team]):
            lines.append(f"  - {name} — {team}")

    return "\n".join(lines), roster_map


def load_overrides() -> list[dict]:
    """Load manual quote overrides; empty list if file missing or malformed."""
    if not OVERRIDES_PATH.exists():
        return []
    try:
        with open(OVERRIDES_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("overrides", [])
    except (json.JSONDecodeError, OSError) as e:
        print(f"  ⚠️  Could not load {OVERRIDES_PATH}: {e}")
        return []


def apply_overrides(rounds_data: list[dict], overrides: list[dict]) -> int:
    """Apply manual driver/team overrides to extracted quotes. Returns count applied."""
    if not overrides:
        return 0
    applied = 0
    for r in rounds_data:
        for session_name, session in r.get("sessions", {}).items():
            for q in session.get("quotes", []):
                quote_text = (q.get("quote") or "").lower()
                for rule in overrides:
                    if rule.get("round") != r.get("round"):
                        continue
                    if rule.get("session") != session_name:
                        continue
                    match = (rule.get("matchText") or "").lower()
                    if match and match in quote_text:
                        new_driver = rule.get("newDriver")
                        new_team = rule.get("newTeam")
                        if not new_driver or not new_team:
                            print(f"      ⚠️  Skipping malformed override rule (needs newDriver+newTeam): {rule}")
                            continue
                        old_driver = q.get("driver")
                        q["driver"] = new_driver
                        q["team"] = new_team
                        print(f"      ✍️  Override applied: R{r['round']} {session_name} — "
                              f"'{old_driver}' → '{rule['newDriver']}' "
                              f"(matched: '{rule.get('matchText')}')")
                        applied += 1
                        break
    return applied


def filter_quotes(quotes: list[dict], roster_map: dict[str, str]) -> list[dict]:
    """Drop quotes whose driver isn't on the current roster; fix any team mismatch."""
    if not roster_map:
        return quotes
    kept = []
    for q in quotes:
        name = (q.get("driver") or "").strip()
        canonical_team = roster_map.get(name.lower())
        if not canonical_team:
            print(f"      🚫 Dropping quote — '{name}' not on {SEASON} roster")
            continue
        if q.get("team") != canonical_team:
            print(f"      🔧 Correcting team for {name}: '{q.get('team')}' → '{canonical_team}'")
            q["team"] = canonical_team
        kept.append(q)
    return kept


def discover_new_videos(season_videos: dict) -> int:
    """Check the F1 YouTube RSS feed for new 'Drivers React' videos and update video-ids.json."""
    race_to_round = {}
    if DATA_JSON_PATH.exists():
        try:
            with open(DATA_JSON_PATH, encoding="utf-8") as f:
                data = json.load(f)
            for race in data.get("schedule", []):
                race_to_round[race["name"]] = race["round"]
        except Exception:
            pass

    if not race_to_round:
        print("  ⚠️  Could not load race schedule from data.json, skipping auto-discovery")
        return 0

    print("🔍 Checking F1 YouTube channel for new reaction videos...")
    try:
        resp = requests.get(F1_RSS_URL, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ⚠️  Could not fetch RSS feed: {e}")
        return 0

    root = ET.fromstring(resp.text)
    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}

    found = 0
    for entry in root.findall("atom:entry", ns):
        title = entry.findtext("atom:title", "", ns)
        video_id_el = entry.find("yt:videoId", ns)
        if video_id_el is None:
            continue
        video_id = video_id_el.text

        for session_type, pattern in SESSION_PATTERNS:
            m = pattern.match(title)
            if m and int(m.group(1)) == SEASON:
                race_name = m.group(2).strip()
                round_num = race_to_round.get(race_name)
                if round_num:
                    rkey = str(round_num)
                    if rkey not in season_videos:
                        season_videos[rkey] = {"raceName": race_name}
                    if not season_videos[rkey].get(session_type):
                        season_videos[rkey][session_type] = video_id
                        season_videos[rkey]["raceName"] = race_name
                        print(f"  ✨ Discovered {session_type} video for R{round_num} {race_name}: {video_id}")
                        found += 1
                else:
                    # YouTube title naming may not match Jolpica raceName exactly
                    # (2026 has BOTH "Barcelona Grand Prix" and "Spanish Grand Prix" —
                    # don't auto-alias; add the ID to video-ids.json manually instead)
                    print(f"  ⚠️  '{race_name}' from video title doesn't match any round in data.json "
                          f"— add {video_id} to video-ids.json manually if it belongs to this season")
                break  # Don't try less-specific patterns against the same title

    if found > 0:
        with open(VIDEO_IDS_PATH, encoding="utf-8") as f:
            all_ids = json.load(f)
        all_ids[str(SEASON)] = season_videos
        with open(VIDEO_IDS_PATH, "w", encoding="utf-8") as f:
            json.dump(all_ids, f, indent=2)
        print(f"  📝 Updated video-ids.json with {found} new video(s)")
    else:
        print("  ℹ️  No new reaction videos found")

    return found


def fetch_transcript_from_youtube(video_id: str) -> str | None:
    """Fetch auto-generated captions from YouTube and cache to disk."""
    if YouTubeTranscriptApi is None:
        print("      ⚠️  youtube-transcript-api not installed. Run: pip install youtube-transcript-api")
        return None
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        full_text = " ".join(snippet.text for snippet in transcript)
        # Cache to disk
        TRANSCRIPTS_DIR.mkdir(exist_ok=True)
        transcript_path(video_id).write_text(full_text, encoding="utf-8")
        print(f"      💾 Cached transcript ({len(full_text)} chars)")
        return full_text
    except Exception as e:
        print(f"      ⚠️  Could not fetch transcript for {video_id}: {e}")
        return None


def get_transcript(video_id: str) -> str | None:
    """Get transcript from cache, or return None if not cached."""
    cached = transcript_path(video_id)
    if cached.exists():
        text = cached.read_text(encoding="utf-8")
        print(f"      📂 Using cached transcript ({len(text)} chars)")
        return text
    return None


def extract_quotes(transcript: str, race_name: str, session_type: str,
                   roster_block: str, roster_map: dict[str, str]) -> list[dict]:
    """Send transcript to Claude and extract driver quotes."""
    if anthropic is None:
        print("      ⚠️  anthropic not installed. Run: pip install anthropic")
        return []

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("      ⚠️  ANTHROPIC_API_KEY not set, skipping quote extraction")
        return []

    client = anthropic.Anthropic(api_key=api_key)

    if len(transcript) > 15000:
        print(f"      ⚠️  Transcript truncated {len(transcript)} → 15000 chars — "
              "quotes from drivers interviewed late in the video may be missed")

    prompt = EXTRACTION_PROMPT.format(
        season=SEASON,
        session_type=session_type,
        race_name=race_name,
        roster=roster_block,
        transcript=transcript[:15000],
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            temperature=0,  # extraction wants determinism, not creativity
            output_config={"format": {"type": "json_schema", "schema": QUOTES_SCHEMA}},
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = message.content[0].text.strip()
        print(f"      📨 Claude response length: {len(response_text)} chars")

        # Strip markdown code fences if Claude wrapped the JSON in them
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*\n?", "", response_text)
            response_text = re.sub(r"\n?\s*```\s*$", "", response_text)

        data = json.loads(response_text)
        quotes = data.get("quotes", [])
        return filter_quotes(quotes, roster_map)
    except json.JSONDecodeError as e:
        print(f"      ⚠️  Failed to parse Claude response as JSON: {e}")
        print(f"      ⚠️  Raw response: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"      ⚠️  Claude API error: {type(e).__name__}: {e}")
        return []


def process_video(video_id: str, race_name: str, session_type: str,
                  roster_block: str = "", roster_map: dict[str, str] | None = None,
                  fetch_only: bool = False) -> dict:
    """Process a single video: get transcript (from cache or YouTube), optionally extract quotes."""
    print(f"    📹 {session_type}: {video_id}")

    # Try cache first, then YouTube
    transcript = get_transcript(video_id)
    if not transcript:
        print(f"      ⬇️  Not cached, fetching from YouTube...")
        transcript = fetch_transcript_from_youtube(video_id)
    if not transcript:
        return {"videoId": video_id, "quotes": []}

    if fetch_only:
        return {"videoId": video_id, "quotes": []}

    print(f"      🤖 Extracting quotes via Claude...")
    time.sleep(1)

    quotes = extract_quotes(transcript, race_name, session_type, roster_block, roster_map or {})
    print(f"      ✅ Extracted {len(quotes)} quotes")
    return {"videoId": video_id, "quotes": quotes}


def load_existing_quotes() -> dict:
    """Load existing driver-quotes.json if it exists."""
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass
    return {"season": SEASON, "fetchedAt": None, "rounds": []}


def main():
    parser = argparse.ArgumentParser(description="Fetch F1 driver quotes from YouTube")
    parser.add_argument("--video-id", help="Process a single YouTube video ID")
    parser.add_argument("--race", help="Process a specific race by name")
    parser.add_argument("--fetch-transcripts", action="store_true",
                        help="Only fetch and cache transcripts from YouTube (run locally, then commit)")
    parser.add_argument("--force", action="store_true",
                        help="Re-extract quotes for all rounds, ignoring existing driver-quotes.json")
    args = parser.parse_args()

    print(f"\n💬 F1 Driver Quotes — {SEASON} season\n")

    if args.fetch_transcripts:
        print("📥 Mode: Fetch & cache transcripts from YouTube\n")
    else:
        print("📤 Mode: Extract quotes from cached transcripts via Claude\n")

    # Load video IDs
    if not VIDEO_IDS_PATH.exists():
        print(f"❌ {VIDEO_IDS_PATH} not found")
        sys.exit(1)

    with open(VIDEO_IDS_PATH, encoding="utf-8") as f:
        video_ids = json.load(f)

    season_videos = video_ids.get(str(SEASON), {})

    # Load roster once for the whole run (skip in fetch-only mode — no Claude call)
    roster_block, roster_map = ("", {})
    if not args.fetch_transcripts:
        roster_block, roster_map = load_roster()
        if roster_map:
            print(f"📋 Loaded {SEASON} roster: {len(roster_map)} drivers\n")

    # Auto-discover new videos from RSS
    if not args.video_id:
        discover_new_videos(season_videos)

    # Single video mode
    if args.video_id:
        result = process_video(args.video_id, "Unknown Race", "race",
                               roster_block=roster_block, roster_map=roster_map,
                               fetch_only=args.fetch_transcripts)
        if not args.fetch_transcripts:
            print(json.dumps(result, indent=2))
        return

    # Load existing data to preserve already-fetched quotes
    existing = load_existing_quotes()
    existing_rounds = {r["round"]: r for r in existing.get("rounds", [])}

    rounds_data = []
    cached_count = 0
    missing_count = 0

    for round_num, videos in sorted(season_videos.items(), key=lambda x: int(x[0])):
        round_int = int(round_num)
        race_name = videos.get("raceName", f"Round {round_num}")

        if args.race and args.race.lower() not in race_name.lower():
            if round_int in existing_rounds:
                rounds_data.append(existing_rounds[round_int])
            continue

        print(f"🏁 Round {round_num}: {race_name}")

        # Sessions that have video IDs configured for this round
        configured_sessions = [s for s in SESSION_TYPES if videos.get(s)]

        # In extract mode, skip rounds where every configured session already has quotes
        if not args.fetch_transcripts and round_int in existing_rounds and not args.race and not args.force:
            existing_round = existing_rounds[round_int]
            existing_sessions = existing_round.get("sessions", {})
            all_done = all(
                existing_sessions.get(s, {}).get("quotes")
                for s in configured_sessions
            )
            if configured_sessions and all_done:
                print(f"  ⏭️  Already have quotes for all configured sessions, skipping (use --race to re-fetch)")
                rounds_data.append(existing_round)
                continue

        sessions = {}
        existing_session_data = existing_rounds.get(round_int, {}).get("sessions", {}) if round_int in existing_rounds else {}

        for session_type in configured_sessions:
            vid = videos.get(session_type)
            if not vid:
                continue

            if args.fetch_transcripts:
                # Only check if we need to fetch
                if transcript_path(vid).exists():
                    print(f"    📂 {session_type}: {vid} (already cached)")
                    cached_count += 1
                else:
                    result = process_video(vid, race_name, session_type, fetch_only=True)
                    if transcript_path(vid).exists():
                        cached_count += 1
                    else:
                        missing_count += 1
                continue

            # Preserve existing per-session quotes unless --force or --race targets this round
            existing_quotes = existing_session_data.get(session_type, {}).get("quotes")
            if existing_quotes and not args.force and not args.race:
                print(f"    📂 {session_type}: preserving {len(existing_quotes)} existing quote(s)")
                sessions[session_type] = existing_session_data[session_type]
                continue

            # Warn loudly if a transcript will need to be fetched here — CI usually
            # can't reach YouTube. Local runs are fine.
            if not transcript_path(vid).exists():
                in_ci = os.environ.get("GITHUB_ACTIONS") == "true"
                if in_ci:
                    print(f"    ⚠️  {session_type}: {vid} not cached. "
                          f"YouTube likely blocks CI — transcript fetch will fail. "
                          f"Run 'python scripts/fetch-driver-quotes.py --fetch-transcripts' "
                          f"locally and commit scripts/transcripts/.")
            sessions[session_type] = process_video(
                vid, race_name, session_type,
                roster_block=roster_block, roster_map=roster_map,
            )
            time.sleep(2)

        if not args.fetch_transcripts:
            rounds_data.append({
                "round": round_int,
                "raceName": race_name,
                "sessions": sessions,
            })

    if args.fetch_transcripts:
        print(f"\n✅ Transcripts: {cached_count} cached, {missing_count} failed")
        print(f"   Commit scripts/transcripts/ and push to let CI extract quotes.\n")
        return

    # Apply manual overrides (for misattributions Claude can't resolve from captions alone)
    overrides = load_overrides()
    if overrides:
        applied = apply_overrides(rounds_data, overrides)
        if applied:
            print(f"\n✍️  Applied {applied} manual override(s) from quote-overrides.json")

    # Write output
    output = {
        "season": SEASON,
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rounds": sorted(rounds_data, key=lambda r: r["round"]),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    total_quotes = sum(
        len(s.get("quotes", []))
        for r in output["rounds"]
        for s in r.get("sessions", {}).values()
    )
    print(f"\n✅ Wrote {len(output['rounds'])} rounds, {total_quotes} total quotes to {OUTPUT_PATH}\n")


if __name__ == "__main__":
    main()
