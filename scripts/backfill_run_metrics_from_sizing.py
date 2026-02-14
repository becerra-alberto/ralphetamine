#!/usr/bin/env python3
"""
Backfill Ralph run metrics from sizing measurements.

This script patches .ralph/runs/run-*.json files by filling missing/zero:
  - stories.<id>.tokens_in     <- actuals.total_input_tokens
  - stories.<id>.tokens_out    <- actuals.total_output_tokens
  - stories.<id>.turns         <- actuals.message_count

It only updates fields that are currently missing/zero and leaves existing
non-zero values intact. It also recomputes totals.tokens_in/tokens_out.

Safety:
  - Dry-run by default
  - On apply, writes a .bak backup per changed run file
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


STORY_PATTERNS = (
    re.compile(r"\bStory\s+(\d+\.\d+)\b", re.IGNORECASE),
    re.compile(r"\bstory-(\d+\.\d+)\b", re.IGNORECASE),
    re.compile(r"\bralph/story-(\d+\.\d+)\b", re.IGNORECASE),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill Ralph run token/turn metrics from sizing records."
    )
    parser.add_argument(
        "--project",
        dest="projects",
        action="append",
        default=[],
        help="Project directory to scan for .ralph/runs (repeatable).",
    )
    parser.add_argument(
        "--sizing-file",
        dest="sizing_files",
        action="append",
        default=[],
        help="Additional sizing measurements.jsonl file (repeatable).",
    )
    parser.add_argument(
        "--max-age-hours",
        type=int,
        default=72,
        help="Max time distance between run timestamp and sizing record (default: 72).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to run files (default is dry-run).",
    )
    return parser.parse_args()


def parse_utc_timestamp(value: str) -> Optional[dt.datetime]:
    try:
        return dt.datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=dt.timezone.utc
        )
    except Exception:
        return None


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def extract_story_id(record: Dict[str, Any]) -> Optional[str]:
    task = record.get("task") or {}
    dimensions = record.get("dimensions") or {}
    description = task.get("description") or ""
    project = dimensions.get("project") or ""
    branch = dimensions.get("git_branch") or ""

    for pattern in STORY_PATTERNS:
        match = pattern.search(description)
        if match:
            return match.group(1)

    for pattern in STORY_PATTERNS:
        match = pattern.search(project)
        if match:
            return match.group(1)

    for pattern in STORY_PATTERNS:
        match = pattern.search(branch)
        if match:
            return match.group(1)

    return None


def load_project_name(project_dir: Path) -> str:
    config_path = project_dir / ".ralph" / "config.json"
    if not config_path.exists():
        return ""
    try:
        with config_path.open() as f:
            data = json.load(f)
        return ((data.get("project") or {}).get("name") or "").strip()
    except Exception:
        return ""


def default_sizing_files(projects: List[Path]) -> List[Path]:
    files: List[Path] = []

    # Global canonical store
    files.append(Path.home() / ".claude" / "sizing-data" / "measurements.jsonl")

    # Common nearby stores
    for project in projects:
        files.append(project / "_infra" / "sizing" / "data" / "measurements.jsonl")

    # Keep order while removing duplicates
    seen = set()
    ordered: List[Path] = []
    for path in files:
        key = str(path.resolve()) if path.exists() else str(path)
        if key not in seen:
            seen.add(key)
            ordered.append(path)
    return ordered


def discover_run_files(projects: List[Path]) -> List[Path]:
    results: List[Path] = []
    for project in projects:
        runs_dir = project / ".ralph" / "runs"
        if not runs_dir.exists():
            continue
        results.extend(sorted(runs_dir.glob("run-*.json")))
    return sorted(results)


def story_start_times_from_log(project_dir: Path) -> Dict[str, List[dt.datetime]]:
    # Optional disambiguation source. Timestamps in ralph.log are local time.
    log_path = project_dir / "ralph.log"
    if not log_path.exists():
        return {}

    local_tz = dt.datetime.now().astimezone().tzinfo
    starts: Dict[str, List[dt.datetime]] = defaultdict(list)
    pattern = re.compile(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\].*Starting story (\d+\.\d+):")

    try:
        with log_path.open() as f:
            for line in f:
                match = pattern.search(line)
                if not match:
                    continue
                ts_local = dt.datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
                ts_utc = ts_local.replace(tzinfo=local_tz).astimezone(dt.timezone.utc)
                starts[match.group(2)].append(ts_utc)
    except Exception:
        return {}

    return starts


def load_sizing_records(sizing_files: List[Path]) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, int]]:
    by_story: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    seen_records = set()
    stats = {
        "files_used": 0,
        "rows_total": 0,
        "rows_with_story": 0,
        "rows_with_actuals": 0,
        "rows_deduped": 0,
    }

    for path in sizing_files:
        if not path.exists():
            continue

        stats["files_used"] += 1
        with path.open() as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                stats["rows_total"] += 1

                try:
                    row = json.loads(raw)
                except Exception:
                    continue

                sid = extract_story_id(row)
                if not sid:
                    continue
                stats["rows_with_story"] += 1

                ts_raw = row.get("timestamp")
                ts = parse_utc_timestamp(ts_raw) if isinstance(ts_raw, str) else None
                if ts is None:
                    continue

                actuals = row.get("actuals")
                has_actuals = isinstance(actuals, dict)
                if has_actuals:
                    stats["rows_with_actuals"] += 1

                dimensions = row.get("dimensions") or {}
                dedupe_key = (
                    sid,
                    ts.isoformat(),
                    dimensions.get("session_id") or "",
                    dimensions.get("project") or "",
                    dimensions.get("git_branch") or "",
                    dimensions.get("model") or "",
                    to_int((actuals or {}).get("total_input_tokens")),
                    to_int((actuals or {}).get("total_output_tokens")),
                    to_int((actuals or {}).get("total_cache_creation")),
                    to_int((actuals or {}).get("total_cache_read")),
                    to_int((actuals or {}).get("message_count")),
                )
                if dedupe_key in seen_records:
                    continue
                seen_records.add(dedupe_key)
                stats["rows_deduped"] += 1

                by_story[sid].append(
                    {
                        "timestamp": ts,
                        "session_id": dimensions.get("session_id") or "",
                        "project": dimensions.get("project") or "",
                        "git_branch": dimensions.get("git_branch") or "",
                        "model": dimensions.get("model") or "",
                        "actuals": actuals if has_actuals else None,
                    }
                )

    for records in by_story.values():
        records.sort(key=lambda r: r["timestamp"])

    return by_story, stats


def project_aliases(project_dir: Path, configured_name: str) -> List[str]:
    aliases = [project_dir.name]
    if configured_name:
        aliases.append(configured_name)
    return [norm(a) for a in aliases if a]


def candidate_rank(
    candidate: Dict[str, Any],
    sid: str,
    run_ts: dt.datetime,
    aliases: List[str],
    story_starts: Dict[str, List[dt.datetime]],
) -> Tuple[int, int, int, float]:
    cand_project = norm(candidate.get("project") or "")
    cand_branch = (candidate.get("git_branch") or "").lower()

    project_match = 0
    if cand_project and any(a and (cand_project == a or a in cand_project) for a in aliases):
        project_match = 2
    elif cand_project.startswith("story"):
        project_match = 1

    branch_match = 1 if f"story-{sid}".lower() in cand_branch else 0
    has_model = 1 if candidate.get("model") else 0

    cand_ts = candidate["timestamp"]
    delta_run = abs((run_ts - cand_ts).total_seconds())

    start_times = story_starts.get(sid) or []
    if start_times:
        delta_start = min(abs((cand_ts - st).total_seconds()) for st in start_times)
        delta = min(delta_run, delta_start)
    else:
        delta = delta_run

    # Higher is better for first three fields; lower is better for delta.
    return (project_match, branch_match, has_model, -delta)


def pick_candidate(
    sid: str,
    run_ts: dt.datetime,
    candidates: List[Dict[str, Any]],
    aliases: List[str],
    story_starts: Dict[str, List[dt.datetime]],
    max_age_hours: int,
) -> Tuple[Optional[Dict[str, Any]], bool]:
    if not candidates:
        return None, False

    max_age = max_age_hours * 3600
    usable: List[Dict[str, Any]] = []
    for candidate in candidates:
        if candidate.get("actuals") is None:
            continue
        age = abs((run_ts - candidate["timestamp"]).total_seconds())
        if age <= max_age:
            usable.append(candidate)

    if not usable:
        return None, False

    ranked = sorted(
        usable,
        key=lambda c: candidate_rank(c, sid, run_ts, aliases, story_starts),
        reverse=True,
    )

    best = ranked[0]
    ambiguous = False
    if len(ranked) > 1:
        top = candidate_rank(ranked[0], sid, run_ts, aliases, story_starts)
        second = candidate_rank(ranked[1], sid, run_ts, aliases, story_starts)
        # If affinity tier is equal and time score difference is tiny, mark ambiguous.
        same_affinity = top[:3] == second[:3]
        delta_gap = abs(top[3] - second[3])
        if same_affinity and delta_gap < 300:
            ambiguous = True

    return best, ambiguous


def to_int(value: Any) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def patch_run_file(
    run_path: Path,
    by_story: Dict[str, List[Dict[str, Any]]],
    max_age_hours: int,
    apply: bool,
) -> Dict[str, Any]:
    with run_path.open() as f:
        run_data = json.load(f)

    timestamp_raw = run_data.get("timestamp")
    run_ts = parse_utc_timestamp(timestamp_raw) if isinstance(timestamp_raw, str) else None
    if run_ts is None:
        return {
            "file": str(run_path),
            "changed": False,
            "error": "invalid_or_missing_timestamp",
        }

    project_dir = run_path.parent.parent.parent
    configured_name = load_project_name(project_dir)
    aliases = project_aliases(project_dir, configured_name)
    story_starts = story_start_times_from_log(project_dir)

    stories = run_data.get("stories")
    if not isinstance(stories, dict):
        return {
            "file": str(run_path),
            "changed": False,
            "error": "missing_stories_map",
        }

    changed = False
    touched_stories = 0
    skipped_ambiguous = []
    missing_candidates = []
    patched_fields = {"tokens_in": 0, "tokens_out": 0, "turns": 0}

    for sid, story in stories.items():
        if not isinstance(story, dict):
            continue

        needs_tin = to_int(story.get("tokens_in")) <= 0
        needs_tout = to_int(story.get("tokens_out")) <= 0
        needs_turns = to_int(story.get("turns")) <= 0
        if not (needs_tin or needs_tout or needs_turns):
            continue

        candidate, ambiguous = pick_candidate(
            sid=sid,
            run_ts=run_ts,
            candidates=by_story.get(sid, []),
            aliases=aliases,
            story_starts=story_starts,
            max_age_hours=max_age_hours,
        )

        if candidate is None:
            missing_candidates.append(sid)
            continue
        if ambiguous:
            skipped_ambiguous.append(sid)
            continue

        actuals = candidate.get("actuals") or {}
        new_tin = to_int(actuals.get("total_input_tokens"))
        new_tout = to_int(actuals.get("total_output_tokens"))
        new_turns = to_int(actuals.get("message_count"))

        updated_this_story = False
        if needs_tin and new_tin > 0:
            story["tokens_in"] = new_tin
            patched_fields["tokens_in"] += 1
            updated_this_story = True
        if needs_tout and new_tout > 0:
            story["tokens_out"] = new_tout
            patched_fields["tokens_out"] += 1
            updated_this_story = True
        if needs_turns and new_turns > 0:
            story["turns"] = new_turns
            patched_fields["turns"] += 1
            updated_this_story = True

        if updated_this_story:
            touched_stories += 1
            changed = True

    if changed:
        totals = run_data.setdefault("totals", {})
        totals["tokens_in"] = sum(to_int((s or {}).get("tokens_in")) for s in stories.values())
        totals["tokens_out"] = sum(to_int((s or {}).get("tokens_out")) for s in stories.values())

    backup_path = None
    if changed and apply:
        ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = run_path.with_suffix(run_path.suffix + f".bak-{ts}")
        shutil.copy2(run_path, backup_path)
        with run_path.open("w") as f:
            json.dump(run_data, f, indent=2)
            f.write("\n")

    return {
        "file": str(run_path),
        "project_dir": str(project_dir),
        "project_name": configured_name or project_dir.name,
        "changed": changed,
        "touched_stories": touched_stories,
        "patched_fields": patched_fields,
        "missing_candidates": sorted(set(missing_candidates)),
        "skipped_ambiguous": sorted(set(skipped_ambiguous)),
        "backup": str(backup_path) if backup_path else "",
        "stories_total": len(stories),
    }


def main() -> int:
    args = parse_args()

    project_paths = [Path(p).resolve() for p in args.projects]
    if not project_paths:
        print("error: at least one --project is required", file=sys.stderr)
        return 2

    run_files = discover_run_files(project_paths)
    if not run_files:
        print("No run files found under provided projects.")
        return 0

    sizing_paths = default_sizing_files(project_paths)
    sizing_paths.extend(Path(p).resolve() for p in args.sizing_files)
    # Dedupe resolved paths while preserving order
    seen = set()
    deduped: List[Path] = []
    for path in sizing_paths:
        key = str(path)
        if key not in seen:
            seen.add(key)
            deduped.append(path)
    sizing_paths = deduped

    by_story, sizing_stats = load_sizing_records(sizing_paths)
    if not by_story:
        print("No usable sizing records found; nothing to patch.")
        return 1

    print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Projects: {', '.join(str(p) for p in project_paths)}")
    print(f"Run files discovered: {len(run_files)}")
    print(
        "Sizing sources used: "
        f"{sizing_stats['files_used']} files, "
        f"{sizing_stats['rows_total']} rows, "
        f"{sizing_stats['rows_with_story']} story-tagged, "
        f"{sizing_stats['rows_with_actuals']} with actuals, "
        f"{sizing_stats['rows_deduped']} after dedupe"
    )
    print("")

    summaries = [
        patch_run_file(
            run_path=run_path,
            by_story=by_story,
            max_age_hours=args.max_age_hours,
            apply=args.apply,
        )
        for run_path in run_files
    ]

    changed_count = 0
    touched_story_total = 0
    missing_total = 0
    ambiguous_total = 0

    for summary in summaries:
        file_path = summary["file"]
        if summary.get("error"):
            print(f"[SKIP] {file_path} ({summary['error']})")
            continue

        changed = summary["changed"]
        status = "PATCHED" if changed and args.apply else ("WOULD_PATCH" if changed else "UNCHANGED")
        print(
            f"[{status}] {file_path} "
            f"stories={summary['stories_total']} "
            f"touched={summary['touched_stories']} "
            f"tin={summary['patched_fields']['tokens_in']} "
            f"tout={summary['patched_fields']['tokens_out']} "
            f"turns={summary['patched_fields']['turns']}"
        )

        if summary["missing_candidates"]:
            print(f"  missing candidates: {', '.join(summary['missing_candidates'])}")
        if summary["skipped_ambiguous"]:
            print(f"  skipped ambiguous: {', '.join(summary['skipped_ambiguous'])}")
        if summary["backup"]:
            print(f"  backup: {summary['backup']}")

        if changed:
            changed_count += 1
            touched_story_total += summary["touched_stories"]
        missing_total += len(summary["missing_candidates"])
        ambiguous_total += len(summary["skipped_ambiguous"])

    print("")
    print(
        "Summary: "
        f"files_changed={changed_count}, "
        f"stories_touched={touched_story_total}, "
        f"missing_candidates={missing_total}, "
        f"ambiguous_skipped={ambiguous_total}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
