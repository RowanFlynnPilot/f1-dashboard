#!/usr/bin/env bash
# Commit this run's fetched data back to main (deploy.yml explains why).
#
# The newest run's data is the right data to keep, so rather than rebasing the
# data commit (which failed on files the quotes step touches, and on the data
# commit a queued run finds its predecessor already pushed), this snapshots the
# outputs, moves to the latest main, lays the outputs back on top and pushes.
# scripts/video-ids.json is merged instead of overwritten, so an ID added by
# hand while this run was in flight survives. A lost push race is retried.
set -euo pipefail

DATA=(public/data.json public/openf1 public/driver-quotes.json)
IDS=scripts/video-ids.json

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

snap="$(mktemp -d)"
present=()
has_openf1=0
for p in "${DATA[@]}"; do
  if [ -e "$p" ]; then present+=("$p"); fi
  if [ "$p" = public/openf1 ] && [ -d "$p" ]; then has_openf1=1; fi
done
tar -cf "$snap/data.tar" "${present[@]}"
cp "$IDS" "$snap/video-ids.json"

for attempt in 1 2 3; do
  git fetch --quiet origin main
  git reset --quiet --hard origin/main
  # Mirror deletions too: the OpenF1 script prunes meeting files it no longer lists
  if [ "$has_openf1" = 1 ]; then rm -rf public/openf1; fi
  tar -xf "$snap/data.tar"
  node scripts/merge-video-ids.mjs "$IDS" "$snap/video-ids.json" "$IDS"
  git add -A -- "${DATA[@]}" "$IDS"
  if git diff --cached --quiet; then
    echo "No data changes to commit"
    exit 0
  fi
  git commit --quiet -m "data: refresh $(date -u +'%Y-%m-%d %H:%M UTC') [skip ci]"
  if git push --quiet origin HEAD:main; then
    echo "Pushed data commit $(git rev-parse --short HEAD) on attempt $attempt"
    exit 0
  fi
  echo "::warning::Data push attempt $attempt lost a race with another commit — retrying"
  sleep $((attempt * 5))
done

echo "::error::Could not push the data commit after 3 attempts. The deploy shipped, but the OpenF1 cache and the validator baseline were not saved."
exit 1
