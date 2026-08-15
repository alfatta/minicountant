#!/usr/bin/env bash
# scripts/check-money.sh
# Fails the build if any financial-path file uses float literals, parseFloat, or toFixed.
# Scope: app/utils/, app/domain/, app/composables/, app/components/, app/pages/

set -u
set -o pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPES=(
  "$ROOT/app/utils"
  "$ROOT/app/domain"
  "$ROOT/app/composables"
  "$ROOT/app/components"
  "$ROOT/app/pages"
)

SCAN_PATHS=()
for s in "${SCOPES[@]}"; do
  [ -d "$s" ] && SCAN_PATHS+=("$s")
done

if [ ${#SCAN_PATHS[@]} -eq 0 ]; then
  echo "lint:no-money — no scoped paths found, nothing to scan."
  exit 0
fi

# Pick the first scanner we find.
if command -v rg >/dev/null 2>&1; then
  SCAN_CMD="rg"
elif command -v grep >/dev/null 2>&1; then
  SCAN_CMD="grep"
else
  echo "lint:no-money — neither rg nor grep found, skipping."
  exit 0
fi

FAIL=0

run_rg() {
  local pattern="$1"
  shift
  # -g globs (ripgrep) include/exclude by file path
  rg -n --color=never \
    -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.vue' \
    -g '!*.test.ts' -g '!*.spec.ts' \
    -g '!node_modules' -g '!.nuxt' -g '!.output' -g '!dist' \
    -e "$pattern" "$@"
}

run_grep() {
  local pattern="$1"
  shift
  # BSD/GNU grep: -r recursive, --include/--exclude, -E extended regex
  grep -rnE \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' \
    --exclude='*.test.ts' --exclude='*.spec.ts' \
    --exclude-dir='node_modules' --exclude-dir='.nuxt' --exclude-dir='.output' --exclude-dir='dist' \
    "$pattern" "$@"
}

scan() {
  local pattern="$1"
  local out rc
  if [ "$SCAN_CMD" = "rg" ]; then
    out=$(run_rg "$pattern" "${SCAN_PATHS[@]}")
    rc=$?
  else
    out=$(run_grep "$pattern" "${SCAN_PATHS[@]}")
    rc=$?
  fi
  # rg returns 0 with matches, 1 no matches, >1 error. grep returns 0 matches, 1 no matches, 2 error.
  if { [ "$SCAN_CMD" = "rg" ] && [ "$rc" -eq 0 ]; } || { [ "$SCAN_CMD" = "grep" ] && [ "$rc" -eq 0 ]; }; then
    [ -n "$out" ] && echo "$out"
    return 0
  fi
  return 1
}

PATTERNS=(
  'parseFloat\s*\('
  '\.toFixed\s*\('
  '\b[0-9][0-9_]*\.[0-9][0-9_]*\b'
  '\b\.[0-9][0-9_]*\b'
)

for pat in "${PATTERNS[@]}"; do
  echo "→ checking pattern: $pat"
  if scan "$pat"; then
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "lint:no-money — forbidden float / parseFloat / toFixed usage found above."
  echo "Use app/utils/money.ts helpers (toMinorUnits, fromMinorUnits, formatCurrency) instead."
  exit 1
fi

echo "lint:no-money — OK"
exit 0
