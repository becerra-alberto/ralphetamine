#!/usr/bin/env bash
# Integration test: provenance tracking end-to-end
#
# Exercises the full provenance lifecycle using the run-sequential sandbox:
#   1. Record a PRD conversion → provenance.json, spec source_prd, stories.txt header, PRD frontmatter
#   2. `ralph verify` → all green
#   3. Delete a story from stories.txt → verify detects missing story
#   4. Edit the PRD → verify detects hash mismatch
#   5. Delete a spec file → verify detects missing spec
#   6. Add an orphan spec → verify detects untracked spec
#   7. Graceful no-provenance → verify handles missing provenance.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0
TESTS=0

pass() { TESTS=$((TESTS + 1)); echo "  PASS: $1"; }
fail() { TESTS=$((TESTS + 1)); FAILURES=$((FAILURES + 1)); echo "  FAIL: $1"; }

# ── Setup: copy sandbox to temp dir ───────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Provenance Tracking ==="
echo "  Work dir: $WORK_DIR"
echo ""

# Copy sandbox structure
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/tasks"

# Fresh state
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Create a fake PRD (simulating what /ralph would have read)
cat > "$WORK_DIR/tasks/prd-greeter.md" << 'PRDEOF'
# PRD: Greeter CLI

## Overview
A simple bash greeting script that outputs personalized greetings.

## Epic 1: Core Greeter

### Story 1.1: Create greeting script
Create src/greeter.sh that outputs "Hello, <name>!" with a default of "Stranger".

### Story 1.2: Add test suite
Create tests/test-greeter.sh with basic assertions.

### Story 1.3: Enhance with flags and formatting
Add --uppercase, --shout, and --time flags.
PRDEOF

# Init git
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

cd "$WORK_DIR"

# ── Phase 1: Record provenance via library functions ──────────────────────
echo "--- Phase 1: Record provenance ---"

# Source libraries in the right order (matching how ralph does it)
export RALPH_DIR
export RALPH_VERBOSE=false
source "$RALPH_DIR/lib/ui.sh"
source "$RALPH_DIR/lib/config.sh"
source "$RALPH_DIR/lib/state.sh"
source "$RALPH_DIR/lib/stories.sh"
source "$RALPH_DIR/lib/specs.sh"
source "$RALPH_DIR/lib/provenance.sh"

config_load

# 1a. provenance_init — should create provenance.json
provenance_init
if [[ -f ".ralph/provenance.json" ]]; then
    pass "provenance_init created .ralph/provenance.json"
else
    fail "provenance_init did not create .ralph/provenance.json"
fi

# Verify it's valid JSON
if jq empty .ralph/provenance.json 2>/dev/null; then
    pass "provenance.json is valid JSON"
else
    fail "provenance.json is not valid JSON"
fi

# 1b. provenance_record — record the conversion
STORIES_CSV="1.1,1.2,1.3"
SPECS_CSV="specs/epic-1/story-1.1-create-greeter.md,specs/epic-1/story-1.2-add-tests.md,specs/epic-1/story-1.3-enhance-output.md"

provenance_record "tasks/prd-greeter.md" "$STORIES_CSV" "$SPECS_CSV"

# Verify conversion was recorded
CONV_COUNT=$(jq '.conversions | length' .ralph/provenance.json)
if [[ "$CONV_COUNT" == "1" ]]; then
    pass "provenance_record created 1 conversion entry"
else
    fail "Expected 1 conversion, got $CONV_COUNT"
fi

# Verify PRD path
PRD_IN_PROV=$(jq -r '.conversions[0].prd' .ralph/provenance.json)
if [[ "$PRD_IN_PROV" == "tasks/prd-greeter.md" ]]; then
    pass "Conversion entry has correct PRD path"
else
    fail "PRD path: expected 'tasks/prd-greeter.md', got '$PRD_IN_PROV'"
fi

# Verify sha256 is present and non-empty
SHA_IN_PROV=$(jq -r '.conversions[0].prd_sha256' .ralph/provenance.json)
if [[ -n "$SHA_IN_PROV" && "$SHA_IN_PROV" != "null" ]]; then
    pass "Conversion entry has sha256 hash"
else
    fail "sha256 hash is missing or null"
fi

# Verify stories_expected
STORY_COUNT=$(jq '.conversions[0].stories_expected | length' .ralph/provenance.json)
if [[ "$STORY_COUNT" == "3" ]]; then
    pass "stories_expected has 3 entries"
else
    fail "Expected 3 stories_expected, got $STORY_COUNT"
fi

# Verify spec_files
SPEC_COUNT=$(jq '.conversions[0].spec_files | length' .ralph/provenance.json)
if [[ "$SPEC_COUNT" == "3" ]]; then
    pass "spec_files has 3 entries"
else
    fail "Expected 3 spec_files, got $SPEC_COUNT"
fi

# 1c. provenance_get_prd_status — should return "converted" (unchanged)
STATUS=$(provenance_get_prd_status "tasks/prd-greeter.md")
if [[ "$STATUS" == "converted" ]]; then
    pass "provenance_get_prd_status returns 'converted' for unmodified PRD"
else
    fail "Expected 'converted', got '$STATUS'"
fi

# 1d. provenance_add_source_prd_to_spec — add source_prd to each spec
for spec in specs/epic-1/story-1.1-create-greeter.md specs/epic-1/story-1.2-add-tests.md specs/epic-1/story-1.3-enhance-output.md; do
    provenance_add_source_prd_to_spec "$spec" "tasks/prd-greeter.md"
done

# Verify source_prd was added to spec frontmatter
if grep -q '^source_prd: "tasks/prd-greeter.md"' specs/epic-1/story-1.1-create-greeter.md; then
    pass "source_prd added to story-1.1 spec frontmatter"
else
    fail "source_prd missing from story-1.1 spec"
    echo "    Frontmatter:"
    sed -n '1,/^---$/p' specs/epic-1/story-1.1-create-greeter.md | head -15 | sed 's/^/    /'
fi

if grep -q '^source_prd: "tasks/prd-greeter.md"' specs/epic-1/story-1.2-add-tests.md; then
    pass "source_prd added to story-1.2 spec frontmatter"
else
    fail "source_prd missing from story-1.2 spec"
fi

# Verify original frontmatter is still intact
if grep -q '^id: "1.1"' specs/epic-1/story-1.1-create-greeter.md; then
    pass "Original frontmatter preserved after source_prd injection"
else
    fail "Original frontmatter damaged after source_prd injection"
fi

# 1e. provenance_add_stories_header — add provenance header to stories.txt
provenance_add_stories_header "tasks/prd-greeter.md" "$STORIES_CSV"

if grep -q '^# Source: tasks/prd-greeter.md$' .ralph/stories.txt; then
    pass "Provenance source header added to stories.txt"
else
    fail "Provenance source header missing from stories.txt"
fi

if grep -q '^# Generated: ' .ralph/stories.txt; then
    pass "Provenance generated timestamp added to stories.txt"
else
    fail "Provenance generated timestamp missing from stories.txt"
fi

if grep -q '^# Stories: ' .ralph/stories.txt; then
    pass "Provenance stories list added to stories.txt"
else
    fail "Provenance stories list missing from stories.txt"
fi

# Verify stories.txt still has the actual stories (not clobbered)
STORY_IDS=$(stories_list_all)
if echo "$STORY_IDS" | grep -q "^1.1$"; then
    pass "stories.txt still contains story 1.1 after header injection"
else
    fail "stories.txt lost story 1.1 after header injection"
    echo "    stories.txt contents:"
    cat .ralph/stories.txt | sed 's/^/    /'
fi

# 1f. provenance_update_prd_frontmatter — add ralph_status to PRD
provenance_update_prd_frontmatter "tasks/prd-greeter.md" "1.1-1.3" "specs/"

if grep -q '^ralph_status: converted' tasks/prd-greeter.md; then
    pass "PRD frontmatter has ralph_status: converted"
else
    fail "PRD missing ralph_status frontmatter"
fi

if grep -q '^ralph_converted_at: ' tasks/prd-greeter.md; then
    pass "PRD frontmatter has ralph_converted_at timestamp"
else
    fail "PRD missing ralph_converted_at frontmatter"
fi

if head -1 tasks/prd-greeter.md | grep -q '^---$'; then
    pass "PRD frontmatter block starts with ---"
else
    fail "PRD frontmatter block malformed"
    echo "    First 5 lines:"
    head -5 tasks/prd-greeter.md | sed 's/^/    /'
fi

# Verify PRD content is still intact after frontmatter injection
if grep -q '## Epic 1: Core Greeter' tasks/prd-greeter.md; then
    pass "PRD content preserved after frontmatter injection"
else
    fail "PRD content lost after frontmatter injection"
fi

echo ""

# ── Phase 2: ralph verify — all green ────────────────────────────────────
echo "--- Phase 2: ralph verify (all green) ---"

# We need to commit the changes for git to be clean
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "provenance recorded"

VERIFY_OUTPUT="$WORK_DIR/verify-stdout.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT" 2>&1 || true

if grep -q '\[OK\]' "$VERIFY_OUTPUT"; then
    pass "ralph verify reports [OK] for valid provenance"
else
    fail "ralph verify did not report [OK]"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT" | sed 's/^/    /'
fi

if grep -q 'stories present' "$VERIFY_OUTPUT"; then
    pass "ralph verify shows stories present count"
else
    fail "ralph verify missing stories present count"
fi

# Should NOT have warnings about missing stories/specs
if grep -q '\[WARN\].*missing' "$VERIFY_OUTPUT"; then
    fail "ralph verify has unexpected missing warnings"
    grep '\[WARN\]' "$VERIFY_OUTPUT" | sed 's/^/    /'
else
    pass "ralph verify has no missing-item warnings"
fi

echo ""

# ── Phase 3: Delete a story from stories.txt → detect gap ────────────────
echo "--- Phase 3: Missing story detection ---"

# Remove story 1.2 from stories.txt
grep -v '^1.2 |' .ralph/stories.txt > .ralph/stories.txt.tmp
mv .ralph/stories.txt.tmp .ralph/stories.txt

VERIFY_OUTPUT_3="$WORK_DIR/verify-phase3.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT_3" 2>&1 || true

if grep -q '\[WARN\].*1.2.*missing' "$VERIFY_OUTPUT_3"; then
    pass "ralph verify detects story 1.2 missing from stories.txt"
else
    fail "ralph verify did not detect missing story 1.2"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT_3" | sed 's/^/    /'
fi

# Restore stories.txt
git -C "$WORK_DIR" checkout -- .ralph/stories.txt

echo ""

# ── Phase 4: Edit the PRD → detect hash mismatch ─────────────────────────
echo "--- Phase 4: PRD modification detection ---"

# Append to the PRD to change its hash
echo -e "\n## Epic 2: Advanced Features\nNew content after conversion." >> tasks/prd-greeter.md

VERIFY_OUTPUT_4="$WORK_DIR/verify-phase4.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT_4" 2>&1 || true

if grep -q '\[WARN\].*modified since conversion' "$VERIFY_OUTPUT_4"; then
    pass "ralph verify detects PRD modified after conversion (hash mismatch)"
else
    fail "ralph verify did not detect PRD hash mismatch"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT_4" | sed 's/^/    /'
fi

# Also check via library function
STATUS_AFTER_EDIT=$(provenance_get_prd_status "tasks/prd-greeter.md")
if [[ "$STATUS_AFTER_EDIT" == "modified" ]]; then
    pass "provenance_get_prd_status returns 'modified' after PRD edit"
else
    fail "Expected 'modified', got '$STATUS_AFTER_EDIT'"
fi

# Restore PRD
git -C "$WORK_DIR" checkout -- tasks/prd-greeter.md

echo ""

# ── Phase 5: Delete a spec file → detect missing spec ────────────────────
echo "--- Phase 5: Missing spec file detection ---"

rm -f specs/epic-1/story-1.3-enhance-output.md

VERIFY_OUTPUT_5="$WORK_DIR/verify-phase5.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT_5" 2>&1 || true

if grep -q '\[WARN\].*Spec file missing.*1.3' "$VERIFY_OUTPUT_5"; then
    pass "ralph verify detects missing spec file for story 1.3"
else
    fail "ralph verify did not detect missing spec file"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT_5" | sed 's/^/    /'
fi

# Restore spec
git -C "$WORK_DIR" checkout -- specs/

echo ""

# ── Phase 6: Add an orphan spec → detect untracked spec ──────────────────
echo "--- Phase 6: Orphaned spec detection ---"

mkdir -p specs/epic-2
cat > specs/epic-2/story-2.1-orphan-feature.md << 'SPECEOF'
---
id: "2.1"
epic: 2
title: "Orphan Feature"
status: pending
---
# Story 2.1 — Orphan Feature
This spec is not tracked by any PRD.
SPECEOF

VERIFY_OUTPUT_6="$WORK_DIR/verify-phase6.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT_6" 2>&1 || true

if grep -q '\[WARN\].*story-2.1.*not tracked' "$VERIFY_OUTPUT_6"; then
    pass "ralph verify detects orphaned spec not tracked by any PRD"
else
    fail "ralph verify did not detect orphaned spec"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT_6" | sed 's/^/    /'
fi

# Cleanup orphan
rm -rf specs/epic-2

echo ""

# ── Phase 7: Graceful handling of no provenance ──────────────────────────
echo "--- Phase 7: Graceful no-provenance handling ---"

# Remove provenance.json
rm -f .ralph/provenance.json

VERIFY_OUTPUT_7="$WORK_DIR/verify-phase7.txt"
$TIMEOUT_CMD 15 "$RALPH_DIR/bin/ralph" verify > "$VERIFY_OUTPUT_7" 2>&1 || true

if grep -q '\[WARN\].*No provenance file' "$VERIFY_OUTPUT_7"; then
    pass "ralph verify gracefully handles missing provenance.json"
else
    fail "ralph verify did not handle missing provenance.json gracefully"
    echo "    verify output:"
    cat "$VERIFY_OUTPUT_7" | sed 's/^/    /'
fi

echo ""

# ── Phase 8: provenance_list output ──────────────────────────────────────
echo "--- Phase 8: provenance_list ---"

# Re-init and re-record for list test
provenance_init
provenance_record "tasks/prd-greeter.md" "$STORIES_CSV" "$SPECS_CSV"

LIST_OUTPUT="$WORK_DIR/list-output.txt"
provenance_list > "$LIST_OUTPUT" 2>&1

if grep -q 'tasks/prd-greeter.md' "$LIST_OUTPUT"; then
    pass "provenance_list shows PRD path"
else
    fail "provenance_list missing PRD path"
    echo "    list output:"
    cat "$LIST_OUTPUT" | sed 's/^/    /'
fi

if grep -q '3 stories' "$LIST_OUTPUT"; then
    pass "provenance_list shows correct story count"
else
    fail "provenance_list missing story count"
fi

echo ""

# ── Phase 9: Append-only — second conversion accumulates ─────────────────
echo "--- Phase 9: Append-only (multiple conversions) ---"

# Create a second PRD and record it
cat > "$WORK_DIR/tasks/prd-advanced.md" << 'PRD2EOF'
# PRD: Advanced Features

## Epic 2: Extensions

### Story 2.1: Export feature
Add export to JSON.
PRD2EOF

provenance_record "tasks/prd-advanced.md" "2.1" "specs/epic-2/story-2.1-export.md"

CONV_COUNT_2=$(jq '.conversions | length' .ralph/provenance.json)
if [[ "$CONV_COUNT_2" == "2" ]]; then
    pass "Second conversion appended (2 total entries)"
else
    fail "Expected 2 conversions, got $CONV_COUNT_2"
fi

# Verify both PRDs are present
PRD_1=$(jq -r '.conversions[0].prd' .ralph/provenance.json)
PRD_2=$(jq -r '.conversions[1].prd' .ralph/provenance.json)
if [[ "$PRD_1" == "tasks/prd-greeter.md" && "$PRD_2" == "tasks/prd-advanced.md" ]]; then
    pass "Both PRD paths preserved in provenance"
else
    fail "PRD paths incorrect: [$PRD_1, $PRD_2]"
fi

echo ""

# ── Phase 10: Idempotent stories.txt header ──────────────────────────────
echo "--- Phase 10: Idempotent stories header ---"

# Call provenance_add_stories_header twice for same PRD
provenance_add_stories_header "tasks/prd-greeter.md" "$STORIES_CSV"
provenance_add_stories_header "tasks/prd-greeter.md" "$STORIES_CSV"

HEADER_COUNT=$(grep -c '^# Source: tasks/prd-greeter.md$' .ralph/stories.txt)
if [[ "$HEADER_COUNT" == "1" ]]; then
    pass "stories.txt header is idempotent (1 header after 2 calls)"
else
    fail "stories.txt header duplicated: $HEADER_COUNT occurrences"
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────────────
echo "=== Results: $((TESTS - FAILURES))/$TESTS passed ==="
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
