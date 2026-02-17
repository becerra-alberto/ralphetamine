#!/usr/bin/env bash
# Ralphetamine — Run metrics persistence and stats dashboard
# Stores per-run JSON files in .ralph/runs/ for cumulative analysis.

RALPH_RUNS_DIR=".ralph/runs"

# Persist run statistics to a JSON file in .ralph/runs/
# Called at the end of _run_summary() after all stats are computed.
_persist_run_stats() {
    local mode="${1:-sequential}"

    mkdir -p "$RALPH_RUNS_DIR"

    local timestamp
    timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    local filename="run-$(date '+%Y-%m-%dT%H:%M:%S').json"

    # Elapsed time
    local duration_secs=0
    if [[ -n "${_RALPH_RUN_START_TIME:-}" ]]; then
        duration_secs=$(( $(date '+%s') - _RALPH_RUN_START_TIME ))
    fi

    # Build stories JSON object
    local stories_json="{}"
    for sid in "${!_STORY_OUTCOMES[@]}"; do
        local outcome="${_STORY_OUTCOMES[$sid]}"
        local dur="${_STORY_TIMINGS[$sid]:-0}"
        local tokens_in="${_STORY_TOKENS_IN[$sid]:-0}"
        local tokens_out="${_STORY_TOKENS_OUT[$sid]:-0}"
        local cost="${_STORY_COST[$sid]:-0}"
        local turns="${_STORY_TURNS[$sid]:-0}"

        stories_json=$(echo "$stories_json" | jq \
            --arg sid "$sid" \
            --arg outcome "$outcome" \
            --argjson dur "$dur" \
            --argjson tin "$tokens_in" \
            --argjson tout "$tokens_out" \
            --arg cost "$cost" \
            --argjson turns "$turns" \
            '.[$sid] = {outcome: $outcome, duration_secs: $dur, tokens_in: $tin, tokens_out: $tout, cost_usd: ($cost | tonumber), turns: $turns}')
    done

    # Compute totals
    local completed=0 tentative=0 failed=0 absorbed=0
    local total_tokens_in=0 total_tokens_out=0 total_cost=0
    for sid in "${!_STORY_OUTCOMES[@]}"; do
        case "${_STORY_OUTCOMES[$sid]}" in
            done)      completed=$((completed + 1)) ;;
            tentative) tentative=$((tentative + 1)) ;;
            failed)    failed=$((failed + 1)) ;;
            absorbed)  absorbed=$((absorbed + 1)) ;;
        esac
        total_tokens_in=$((total_tokens_in + ${_STORY_TOKENS_IN[$sid]:-0}))
        total_tokens_out=$((total_tokens_out + ${_STORY_TOKENS_OUT[$sid]:-0}))
    done

    # Sum costs (floating point via awk)
    for sid in "${!_STORY_COST[@]}"; do
        total_cost=$(awk "BEGIN {printf \"%.4f\", $total_cost + ${_STORY_COST[$sid]:-0}}")
    done

    # Git stats
    local commit_count=0 insertions=0 deletions=0
    if [[ -n "${_RALPH_RUN_START_COMMIT:-}" ]]; then
        commit_count=$(git rev-list --count "${_RALPH_RUN_START_COMMIT}..HEAD" 2>/dev/null) || commit_count=0
        local shortstat
        shortstat=$(git diff --shortstat "${_RALPH_RUN_START_COMMIT}..HEAD" 2>/dev/null) || true
        if [[ -n "$shortstat" ]]; then
            insertions=$(echo "$shortstat" | grep -o '[0-9]* insertion' | grep -o '[0-9]*') || insertions=0
            deletions=$(echo "$shortstat" | grep -o '[0-9]* deletion' | grep -o '[0-9]*') || deletions=0
        fi
    fi

    # Learnings count
    local learnings_count="${_RALPH_LEARNINGS_EXTRACTED:-0}"
    if [[ "$learnings_count" -eq 0 ]]; then
        learnings_count=$(_display_count_learnings 2>/dev/null || echo 0)
    fi

    # Build final JSON
    jq -n \
        --arg ts "$timestamp" \
        --arg mode "$mode" \
        --argjson dur "$duration_secs" \
        --argjson stories "$stories_json" \
        --argjson completed "$completed" \
        --argjson tentative "$tentative" \
        --argjson failed "$failed" \
        --argjson absorbed "$absorbed" \
        --argjson tin "$total_tokens_in" \
        --argjson tout "$total_tokens_out" \
        --arg cost "$total_cost" \
        --argjson commits "${commit_count:-0}" \
        --argjson ins "${insertions:-0}" \
        --argjson dels "${deletions:-0}" \
        --argjson learnings "$learnings_count" \
        '{
            timestamp: $ts,
            mode: $mode,
            duration_secs: $dur,
            stories: $stories,
            totals: {
                completed: $completed,
                tentative: $tentative,
                failed: $failed,
                absorbed: $absorbed,
                tokens_in: $tin,
                tokens_out: $tout,
                cost_usd: ($cost | tonumber)
            },
            git: { commits: $commits, insertions: $ins, deletions: $dels },
            learnings_extracted: $learnings
        }' > "${RALPH_RUNS_DIR}/${filename}"

    log_debug "Run stats saved to ${RALPH_RUNS_DIR}/${filename}"
}

# Show full stats dashboard from .ralph/runs/*.json files
metrics_show() {
    local last_n="${1:-0}"    # 0 = show latest + cumulative

    if [[ ! -d "$RALPH_RUNS_DIR" ]]; then
        echo "No run data found. Run 'ralph run' first."
        return 0
    fi

    local run_files=()
    while IFS= read -r f; do
        [[ -n "$f" ]] && run_files+=("$f")
    done < <(ls -1 "$RALPH_RUNS_DIR"/run-*.json 2>/dev/null | sort)

    if [[ ${#run_files[@]} -eq 0 ]]; then
        echo "No run data found. Run 'ralph run' first."
        return 0
    fi

    # If --last N specified, limit to last N files
    if [[ "$last_n" -gt 0 && ${#run_files[@]} -gt $last_n ]]; then
        local start=$(( ${#run_files[@]} - last_n ))
        run_files=("${run_files[@]:$start}")
    fi

    local latest="${run_files[-1]}"

    echo ""
    printf '╔'; printf '═%.0s' $(seq 1 62); printf '╗\n'
    printf '║%*s%s%*s║\n' 19 "" "RALPH RUN STATS" 28 ""
    printf '╚'; printf '═%.0s' $(seq 1 62); printf '╝\n'
    echo ""

    # ── Latest run ──────────────────────────────────────────
    local ts mode dur
    ts=$(jq -r '.timestamp' "$latest")
    mode=$(jq -r '.mode' "$latest")
    dur=$(jq -r '.duration_secs' "$latest")
    local dur_str
    dur_str=$(_metrics_fmt_duration "$dur")

    printf "  ${CLR_DIM}Last Run:${CLR_RESET} %s  ${CLR_DIM}│${CLR_RESET}  Mode: %s  ${CLR_DIM}│${CLR_RESET}  Duration: %s\n" \
        "${ts%T*}" "$mode" "$dur_str"
    echo ""

    # Stories summary
    local comp tent fail abso
    comp=$(jq '.totals.completed' "$latest")
    tent=$(jq '.totals.tentative' "$latest")
    fail=$(jq '.totals.failed' "$latest")
    abso=$(jq '.totals.absorbed' "$latest")

    echo "  ┌─ Stories ─────────────────────────────────────────────────┐"
    printf "  │  ${CLR_GREEN}Completed: %-4d${CLR_RESET}  ${CLR_YELLOW}Tentative: %-4d${CLR_RESET}  ${CLR_RED}Failed: %-4d${CLR_RESET}  Absorbed: %-2d│\n" \
        "$comp" "$tent" "$fail" "$abso"
    echo "  └───────────────────────────────────────────────────────────┘"
    echo ""

    # Token usage table (last run)
    local story_count
    story_count=$(jq '.stories | length' "$latest")

    if [[ "$story_count" -gt 0 ]]; then
        echo "  ┌─ Token Usage (last run) ──────────────────────────────────┐"
        printf "  │  ${CLR_DIM}%-9s│ %10s │ %10s │ %8s │ %-5s${CLR_RESET}   │\n" \
            "Story" "Tokens In" "Tokens Out" "Cost" "Turns"

        jq -r '.stories | to_entries | sort_by(.key) | .[] | "\(.key)|\(.value.tokens_in)|\(.value.tokens_out)|\(.value.cost_usd)|\(.value.turns)"' "$latest" | \
        while IFS='|' read -r sid tin tout cost turns; do
            local flag=""
            [[ "$turns" -gt 6 ]] && flag=" ⚠"
            local tin_fmt tout_fmt cost_fmt
            tin_fmt=$(printf "%'d" "$tin" 2>/dev/null || echo "$tin")
            tout_fmt=$(printf "%'d" "$tout" 2>/dev/null || echo "$tout")
            cost_fmt=$(printf '$%.2f' "$cost" 2>/dev/null || echo "\$$cost")
            printf "  │  %-9s│ %10s │ %10s │ %8s │ %3s%-2s   │\n" \
                "$sid" "$tin_fmt" "$tout_fmt" "$cost_fmt" "$turns" "$flag"
        done

        echo "  └───────────────────────────────────────────────────────────┘"
        echo "  ⚠ = high turn count (likely context compaction)"
        echo ""
    fi

    # ── Cumulative stats ──────────────────────────────────────
    local total_runs=${#run_files[@]}
    local cum_stories=0 cum_cost=0 cum_tin=0 cum_tout=0

    for f in "${run_files[@]}"; do
        local sc tc ic oc
        sc=$(jq '[.totals.completed, .totals.tentative] | add' "$f")
        tc=$(jq '.totals.cost_usd' "$f")
        ic=$(jq '.totals.tokens_in' "$f")
        oc=$(jq '.totals.tokens_out' "$f")
        cum_stories=$((cum_stories + sc))
        cum_tin=$((cum_tin + ic))
        cum_tout=$((cum_tout + oc))
        cum_cost=$(awk "BEGIN {printf \"%.2f\", $cum_cost + $tc}")
    done

    local avg_cost="0.00"
    local avg_tin=0 avg_tout=0
    if [[ "$cum_stories" -gt 0 ]]; then
        avg_cost=$(awk "BEGIN {printf \"%.2f\", $cum_cost / $cum_stories}")
        avg_tin=$((cum_tin / cum_stories))
        avg_tout=$((cum_tout / cum_stories))
    fi

    echo "  ┌─ Cumulative (all runs) ───────────────────────────────────┐"
    printf "  │  Runs: %-4d│  Stories: %-5d│  Total Cost: \$%-11s  │\n" \
        "$total_runs" "$cum_stories" "$cum_cost"
    local avg_tin_k
    avg_tin_k=$(awk "BEGIN {printf \"%.0fK\", $avg_tin / 1000}")
    local avg_tout_k
    avg_tout_k=$(awk "BEGIN {printf \"%.0fK\", $avg_tout / 1000}")
    printf "  │  Avg cost/story: \$%-6s│  Avg tokens: %s in, %s out   │\n" \
        "$avg_cost" "$avg_tin_k" "$avg_tout_k"
    echo "  └───────────────────────────────────────────────────────────┘"
    echo ""

    # ── Cost trend ────────────────────────────────────────────
    if [[ $total_runs -gt 1 ]]; then
        echo "  ┌─ Cost Trend ──────────────────────────────────────────────┐"

        # Find max cost for bar scaling
        local max_cost=1
        for f in "${run_files[@]}"; do
            local c
            c=$(jq '.totals.cost_usd' "$f")
            local is_larger
            is_larger=$(awk "BEGIN {print ($c > $max_cost) ? 1 : 0}")
            [[ "$is_larger" -eq 1 ]] && max_cost="$c"
        done

        # Show last 10 runs max in trend
        local trend_files=("${run_files[@]}")
        if [[ ${#trend_files[@]} -gt 10 ]]; then
            local tstart=$(( ${#trend_files[@]} - 10 ))
            trend_files=("${trend_files[@]:$tstart}")
        fi

        for f in "${trend_files[@]}"; do
            local date_str cost_val sc
            date_str=$(jq -r '.timestamp' "$f" | cut -c6-10)
            cost_val=$(jq '.totals.cost_usd' "$f")
            sc=$(jq '[.totals.completed, .totals.tentative] | add' "$f")

            local bar_len
            bar_len=$(awk "BEGIN {printf \"%d\", ($cost_val / $max_cost) * 20}")
            [[ "$bar_len" -lt 1 ]] && bar_len=1

            local bar=""
            local i
            for (( i=0; i<bar_len; i++ )); do
                bar="${bar}█"
            done

            printf "  │  %s  %-20s \$%-8.2f (%d stories)%*s│\n" \
                "$date_str" "$bar" "$cost_val" "$sc" $(( 8 - ${#sc} )) ""
        done

        echo "  └───────────────────────────────────────────────────────────┘"
        echo ""
    fi
}

# Show stats for a specific story across all runs
metrics_show_story() {
    local story_id="$1"

    if [[ ! -d "$RALPH_RUNS_DIR" ]]; then
        echo "No run data found."
        return 0
    fi

    echo ""
    echo "  Story $story_id across runs:"
    divider

    printf "  ${CLR_DIM}%-12s %-10s %10s %10s %8s %5s${CLR_RESET}\n" \
        "Date" "Outcome" "Tokens In" "Tokens Out" "Cost" "Turns"

    for f in "$RALPH_RUNS_DIR"/run-*.json; do
        [[ -f "$f" ]] || continue
        local has_story
        has_story=$(jq --arg sid "$story_id" 'has("stories") and (.stories | has($sid))' "$f" 2>/dev/null)
        [[ "$has_story" != "true" ]] && continue

        local date_str outcome tin tout cost turns
        date_str=$(jq -r '.timestamp' "$f" | cut -c1-10)
        outcome=$(jq -r --arg sid "$story_id" '.stories[$sid].outcome' "$f")
        tin=$(jq -r --arg sid "$story_id" '.stories[$sid].tokens_in' "$f")
        tout=$(jq -r --arg sid "$story_id" '.stories[$sid].tokens_out' "$f")
        cost=$(jq -r --arg sid "$story_id" '.stories[$sid].cost_usd' "$f")
        turns=$(jq -r --arg sid "$story_id" '.stories[$sid].turns' "$f")

        local tin_fmt tout_fmt cost_fmt
        tin_fmt=$(printf "%'d" "$tin" 2>/dev/null || echo "$tin")
        tout_fmt=$(printf "%'d" "$tout" 2>/dev/null || echo "$tout")
        cost_fmt=$(printf '$%.2f' "$cost" 2>/dev/null || echo "\$$cost")

        printf "  %-12s %-10s %10s %10s %8s %5s\n" \
            "$date_str" "$outcome" "$tin_fmt" "$tout_fmt" "$cost_fmt" "$turns"
    done
    echo ""
}

# Format duration helper for metrics display
_metrics_fmt_duration() {
    local secs="$1"
    [[ -z "$secs" || "$secs" == "null" ]] && secs=0
    local h=$(( secs / 3600 ))
    local m=$(( (secs % 3600) / 60 ))
    local s=$(( secs % 60 ))
    if [[ $h -gt 0 ]]; then
        printf '%02d:%02d:%02d' "$h" "$m" "$s"
    else
        printf '%02d:%02d' "$m" "$s"
    fi
}
