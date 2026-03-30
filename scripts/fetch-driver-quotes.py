#!/usr/bin/env python3
"""
fetch-driver-quotes.py
Fetches YouTube auto-captions from official F1 post-race/qualifying reaction videos,
sends them to Claude to extract 1-2 quotes per driver, and writes driver-quotes.json.

Usage:
  python scripts/fetch-driver-quotes.py                       # Process all videos in video-ids.json
  python scripts/fetch-driver-quotes.py --video-id <ID>       # Process a single video
  python scripts/fetch-driver-quotes.py --race "Japanese Grand Prix"  # Process a specific race

Requires:
  pip install youtube-transcript-api anthropic
  ANTHROPIC_API_KEY environment variable
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
    print("❌ youtube-transcript-api not installed. Run: pip install youtube-transcript-api")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("❌ anthropic not installed. Run: pip install anthropic")
    sys.exit(1)


SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
VIDEO_IDS_PATH = SCRIPT_DIR / "video-ids.json"
DATA_JSON_PATH = PROJECT_DIR / "public" / "data.json"
OUTPUT_PATH = PROJECT_DIR / "public" / "driver-quotes.json"
SEASON = 2026

# Official F1 YouTube channel
F1_CHANNEL_ID = "UCB_qr75-ydFVKSF9Dmo6izg"
F1_RSS_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={F1_CHANNEL_ID}"

# Title patterns for driver reaction videos
RACE_PATTERN = re.compile(r"Drivers React After The Race \| (\d{4}) (.+)")
QUAL_PATTERN = re.compile(r"Drivers React To Qualifying \| (\d{4}) (.+)")

EXTRACTION_PROMPT = """You are analyzing a transcript from an official Formula 1 YouTube video where drivers give their reactions after a {session_type} session at the {race_name}.

Extract 1-2 direct quotes from each driver mentioned in the transcript. For each quote:
- The quote should be a complete, meaningful sentence or two that captures the driver's thoughts
- Clean up any transcript artifacts (stuttering, filler words) but keep the quote faithful to what was said
- Include brief context about what the quote is about

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "quotes": [
    {{
      "driver": "Full Driver Name",
      "team": "Team Name",
      "quote": "The actual quote from the driver",
      "context": "Brief 3-8 word description of what they're discussing"
    }}
  ]
}}

Use these official 2026 team names: Mercedes, Ferrari, McLaren, Red Bull, Racing Bulls, Alpine, Aston Martin, Haas, Williams, Audi.
Use full driver names (e.g. "George Russell", "Lewis Hamilton", "Max Verstappen").

Here is the transcript:

{transcript}"""


def discover_new_videos(season_videos: dict) -> int:
    """Check the F1 YouTube RSS feed for new 'Drivers React' videos and update video-ids.json."""
    # Build race name -> round number lookup from data.json
    race_to_round = {}
    if DATA_JSON_PATH.exists():
        try:
            with open(DATA_JSON_PATH) as f:
                data = json.load(f)
            for race in data.get("schedule", []):
                race_to_round[race["name"]] = race["round"]
        except Exception:
            pass

    if not race_to_round:
        print("  ⚠️  Could not load race schedule from data.json, skipping auto-discovery")
        return 0

    # Fetch RSS feed
    print("🔍 Checking F1 YouTube channel for new reaction videos...")
    try:
        resp = requests.get(F1_RSS_URL, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ⚠️  Could not fetch RSS feed: {e}")
        return 0

    # Parse XML — strip namespaces for easier parsing
    root = ET.fromstring(resp.text)
    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}

    found = 0
    for entry in root.findall("atom:entry", ns):
        title = entry.findtext("atom:title", "", ns)
        video_id_el = entry.find("yt:videoId", ns)
        if video_id_el is None:
            continue
        video_id = video_id_el.text

        # Check race reaction pattern
        m = RACE_PATTERN.match(title)
        if m and int(m.group(1)) == SEASON:
            race_name = m.group(2).strip()
            round_num = race_to_round.get(race_name)
            if round_num:
                rkey = str(round_num)
                if rkey not in season_videos:
                    season_videos[rkey] = {"raceName": race_name}
                if not season_videos[rkey].get("race"):
                    season_videos[rkey]["race"] = video_id
                    season_videos[rkey]["raceName"] = race_name
                    print(f"  ✨ Discovered race video for R{round_num} {race_name}: {video_id}")
                    found += 1

        # Check qualifying reaction pattern
        m = QUAL_PATTERN.match(title)
        if m and int(m.group(1)) == SEASON:
            race_name = m.group(2).strip()
            round_num = race_to_round.get(race_name)
            if round_num:
                rkey = str(round_num)
                if rkey not in season_videos:
                    season_videos[rkey] = {"raceName": race_name}
                if not season_videos[rkey].get("qualifying"):
                    season_videos[rkey]["qualifying"] = video_id
                    season_videos[rkey]["raceName"] = race_name
                    print(f"  ✨ Discovered qualifying video for R{round_num} {race_name}: {video_id}")
                    found += 1

    if found > 0:
        # Save updated video-ids.json
        with open(VIDEO_IDS_PATH) as f:
            all_ids = json.load(f)
        all_ids[str(SEASON)] = season_videos
        with open(VIDEO_IDS_PATH, "w") as f:
            json.dump(all_ids, f, indent=2)
        print(f"  📝 Updated video-ids.json with {found} new video(s)")
    else:
        print("  ℹ️  No new reaction videos found")

    return found


def get_transcript(video_id: str) -> str | None:
    """Fetch auto-generated captions from a YouTube video."""
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        # Combine all snippets into one text block
        full_text = " ".join(snippet.text for snippet in transcript)
        return full_text
    except Exception as e:
        print(f"      ⚠️  Could not fetch transcript for {video_id}: {e}")
        return None


def extract_quotes(transcript: str, race_name: str, session_type: str) -> list[dict]:
    """Send transcript to Claude and extract driver quotes."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("      ⚠️  ANTHROPIC_API_KEY not set, skipping quote extraction")
        return []

    client = anthropic.Anthropic(api_key=api_key)

    prompt = EXTRACTION_PROMPT.format(
        session_type=session_type,
        race_name=race_name,
        transcript=transcript[:15000],  # Truncate very long transcripts
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = message.content[0].text.strip()
        print(f"      📨 Claude response length: {len(response_text)} chars")

        # Parse JSON response
        data = json.loads(response_text)
        return data.get("quotes", [])
    except json.JSONDecodeError as e:
        print(f"      ⚠️  Failed to parse Claude response as JSON: {e}")
        print(f"      ⚠️  Raw response: {response_text[:500]}")
        return []
    except anthropic.APIError as e:
        print(f"      ⚠️  Claude API error ({e.status_code}): {e.message}")
        return []
    except Exception as e:
        print(f"      ⚠️  Unexpected error: {type(e).__name__}: {e}")
        return []


def process_video(video_id: str, race_name: str, session_type: str) -> dict:
    """Process a single video: fetch transcript, extract quotes."""
    print(f"    📹 Fetching transcript for {session_type}: {video_id}")
    transcript = get_transcript(video_id)
    if not transcript:
        return {"videoId": video_id, "quotes": []}

    print(f"      📝 Transcript length: {len(transcript)} chars")
    print(f"      🤖 Extracting quotes via Claude...")
    time.sleep(1)  # Be polite to the API

    quotes = extract_quotes(transcript, race_name, session_type)
    print(f"      ✅ Extracted {len(quotes)} quotes")
    return {"videoId": video_id, "quotes": quotes}


def load_existing_quotes() -> dict:
    """Load existing driver-quotes.json if it exists."""
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH) as f:
                return json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass
    return {"season": SEASON, "fetchedAt": None, "rounds": []}


def main():
    parser = argparse.ArgumentParser(description="Fetch F1 driver quotes from YouTube")
    parser.add_argument("--video-id", help="Process a single YouTube video ID")
    parser.add_argument("--race", help="Process a specific race by name")
    args = parser.parse_args()

    print(f"\n💬 Fetching driver quotes for {SEASON} season...\n")

    # Load video IDs
    if not VIDEO_IDS_PATH.exists():
        print(f"❌ {VIDEO_IDS_PATH} not found")
        sys.exit(1)

    with open(VIDEO_IDS_PATH) as f:
        video_ids = json.load(f)

    season_videos = video_ids.get(str(SEASON), {})

    # Auto-discover new videos from the F1 YouTube RSS feed
    if not args.video_id:
        discover_new_videos(season_videos)

    # Single video mode
    if args.video_id:
        result = process_video(args.video_id, "Unknown Race", "race")
        print(json.dumps(result, indent=2))
        return

    # Load existing data to preserve already-fetched quotes
    existing = load_existing_quotes()
    existing_rounds = {r["round"]: r for r in existing.get("rounds", [])}

    rounds_data = []

    for round_num, videos in sorted(season_videos.items(), key=lambda x: int(x[0])):
        round_int = int(round_num)
        race_name = videos.get("raceName", f"Round {round_num}")

        # Filter by race name if specified
        if args.race and args.race.lower() not in race_name.lower():
            # Keep existing data for this round if we have it
            if round_int in existing_rounds:
                rounds_data.append(existing_rounds[round_int])
            continue

        print(f"🏁 Round {round_num}: {race_name}")

        # Check if we already have quotes for this round
        if round_int in existing_rounds and not args.race:
            existing_round = existing_rounds[round_int]
            has_race = existing_round.get("sessions", {}).get("race", {}).get("quotes", [])
            has_qual = existing_round.get("sessions", {}).get("qualifying", {}).get("quotes", [])
            if has_race and has_qual:
                print(f"  ⏭️  Already have quotes, skipping (use --race to re-fetch)")
                rounds_data.append(existing_round)
                continue

        sessions = {}

        # Process race video
        if videos.get("race"):
            sessions["race"] = process_video(videos["race"], race_name, "race")
            time.sleep(2)

        # Process qualifying video
        if videos.get("qualifying"):
            sessions["qualifying"] = process_video(videos["qualifying"], race_name, "qualifying")
            time.sleep(2)

        rounds_data.append({
            "round": round_int,
            "raceName": race_name,
            "sessions": sessions,
        })

    # Write output
    output = {
        "season": SEASON,
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rounds": sorted(rounds_data, key=lambda r: r["round"]),
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    total_quotes = sum(
        len(s.get("quotes", []))
        for r in output["rounds"]
        for s in r.get("sessions", {}).values()
    )
    print(f"\n✅ Wrote {len(output['rounds'])} rounds, {total_quotes} total quotes to {OUTPUT_PATH}\n")


if __name__ == "__main__":
    main()
