#!/usr/bin/env bash
# wreislab-create — Dependency Version Audit
# Checks all template package.json / package.patch.json against npm registry.
# Rule: only suggest updating to versions published > 7 days ago (stability gate).
#
# Usage:
#   bash scripts/check-deps.sh                        # audit only
#   bash scripts/check-deps.sh --fix                  # auto-apply safe updates
#   bash scripts/check-deps.sh --force pkg1,pkg2      # bypass 7-day gate for specific packages
#   bash scripts/check-deps.sh --fix --force typeorm  # combine both flags

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIX_MODE=false
FORCE_PACKAGES=""

_prev_arg=""
for arg in "$@"; do
  [[ "$arg" == "--fix" ]] && FIX_MODE=true
  [[ "$_prev_arg" == "--force" ]] && FORCE_PACKAGES="$arg"
  _prev_arg="$arg"
done

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; CYAN='\033[0;36m'; RESET='\033[0m'

SEVEN_DAYS_MS=$((7 * 24 * 60 * 60 * 1000))
NOW_MS=$(node -e "console.log(Date.now())")

OUTDATED=0
WAITING=0
UPTODATE=0
ERRORS=0

print_header() {
  echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${CYAN}║   wreislab-create — Dependency Audit (>7 days stability gate) ║${RESET}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
  [[ -n "$FORCE_PACKAGES" ]] && echo -e "  ${YELLOW}⚡ Gate bypass active for: ${FORCE_PACKAGES}${RESET}"
  echo ""
}

# Check a single package
# Args: pkg_name declared_range source_file
check_pkg() {
  local pkg="$1" range="$2" src="$3"

  local info
  info=$(node -e "
    try {
      const { execSync } = require('child_process');
      const d = JSON.parse(execSync('npm view ${pkg} --json 2>/dev/null', {encoding:'utf8', timeout:15000}));
      const latest = d['dist-tags']?.latest ?? '';
      const published = d.time?.[latest] ?? '';
      const ageMs = published ? Date.now() - new Date(published).getTime() : -1;
      console.log(JSON.stringify({ latest, published: published.slice(0,10), ageMs }));
    } catch(e) { console.log(JSON.stringify({ error: e.message })); }
  " 2>/dev/null)

  if echo "$info" | grep -q '"error"'; then
    echo -e "  ${YELLOW}?${RESET} ${pkg} — npm query failed"
    ((ERRORS++)) || true
    return
  fi

  local latest published age_days
  latest=$(echo "$info" | node -e "process.stdin|0; const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.latest)" 2>/dev/null || echo "$info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['latest'])" 2>/dev/null || echo "")
  published=$(echo "$info" | node -e "process.stdin|0; const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.published)" 2>/dev/null || echo "$info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['published'])" 2>/dev/null || echo "")
  age_days=$(node -e "
    const d = JSON.parse('$(echo "$info" | tr "'" '"')');
    const ms = d.ageMs ?? -1;
    console.log(ms >= 0 ? Math.floor(ms / 86400000) : -1);
  " 2>/dev/null || echo "-1")

  if [[ -z "$latest" ]]; then
    echo -e "  ${YELLOW}?${RESET} ${pkg} — could not parse npm response"
    ((ERRORS++)) || true
    return
  fi

  # Strip ^ or ~ from declared range to get current minimum
  local declared_min="${range#^}"; declared_min="${declared_min#~}"

  # Compare using semver (node handles this)
  local needs_update
  needs_update=$(node -e "
    const [a, b] = ['$declared_min', '$latest'].map(v => v.split('.').map(Number));
    const outdated = b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) || (b[0] === a[0] && b[1] === a[1] && b[2] > a[2]);
    console.log(outdated ? 'yes' : 'no');
  " 2>/dev/null || echo "no")

  if [[ "$needs_update" == "no" ]]; then
    echo -e "  ${GREEN}✓${RESET} ${pkg} ${range} — up to date (latest: ${latest})"
    ((UPTODATE++)) || true
    return
  fi

  # Check if this package is in the --force bypass list
  local is_forced=false
  if [[ -n "$FORCE_PACKAGES" ]]; then
    local _fp
    IFS=',' read -ra _force_list <<< "$FORCE_PACKAGES"
    for _fp in "${_force_list[@]}"; do
      [[ "$_fp" == "$pkg" ]] && is_forced=true && break
    done
  fi

  # Check if latest is > 7 days old (skip gate for forced packages)
  if [[ "$is_forced" == "false" && "$age_days" -lt 7 ]] 2>/dev/null; then
    echo -e "  ${YELLOW}⏳${RESET} ${pkg} ${range} → ${latest} (${age_days}d old — WAIT >7 days)"
    ((WAITING++)) || true
    return
  fi

  # Determine if it's a major bump
  local declared_major latest_major
  declared_major=$(echo "$declared_min" | cut -d. -f1)
  latest_major=$(echo "$latest" | cut -d. -f1)

  local _force_tag=""
  [[ "$is_forced" == "true" && "$age_days" -lt 7 ]] && _force_tag=" ⚡ FORÇADO (${age_days}d)"

  if [[ "$latest_major" -gt "$declared_major" ]] 2>/dev/null; then
    echo -e "  ${RED}↑ MAJOR${RESET} ${pkg} ${range} → ^${latest}${_force_tag} — breaking change, verify manually | ${src}"
    ((OUTDATED++)) || true
  else
    echo -e "  ${YELLOW}↑${RESET} ${pkg} ${range} → ^${latest}${_force_tag} | ${src}"
    ((OUTDATED++)) || true
  fi
}

# Extract and check all packages from a JSON file
check_file() {
  local file="$1"
  local rel="${file#$REPO_DIR/}"

  [[ -f "$file" ]] || return

  echo -e "\n${BOLD}── ${rel}${RESET}"

  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$file', 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, range] of Object.entries(all)) {
      console.log(name + '|' + range);
    }
  " 2>/dev/null | while IFS='|' read -r pkg range; do
    [[ -n "$pkg" && -n "$range" ]] && check_pkg "$pkg" "$range" "$rel"
  done
}

print_header

# All files to audit
FILES=(
  "$REPO_DIR/package.json"
  "$REPO_DIR/src/templates/backends/nestjs/_base/package.json"
  "$REPO_DIR/src/templates/backends/nestjs/_auth-jwt/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_auth-oidc/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_db-postgres/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_db-mysql/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_db-sqlite/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_db-mongo/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_cache-redis/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_cache-dragonfly/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_msg-rabbitmq/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_realtime-websocket/package.patch.json"
  "$REPO_DIR/src/templates/backends/nestjs/_ai/package.patch.json"
  "$REPO_DIR/src/templates/frontends/react/_base/package.json"
  "$REPO_DIR/src/templates/frontends/react/_auth-oidc/package.patch.json"
  "$REPO_DIR/src/templates/frontends/react/_realtime/package.patch.json"
)

for f in "${FILES[@]}"; do
  check_file "$f"
done

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━ RESULTS ━━━━━━━━━━━━━${RESET}"
echo -e "  ${GREEN}✓ Up to date:${RESET}  $UPTODATE"
echo -e "  ${YELLOW}↑ Outdated:${RESET}    $OUTDATED"
echo -e "  ${YELLOW}⏳ Waiting:${RESET}     $WAITING  (< 7 days)"
[[ $ERRORS -gt 0 ]] && echo -e "  ${YELLOW}? Errors:${RESET}      $ERRORS"
echo ""

if [[ $OUTDATED -gt 0 ]]; then
  echo -e "${YELLOW}${BOLD}$OUTDATED dependency/dependencies have updates available.${RESET}"
  exit 1
else
  echo -e "${GREEN}${BOLD}All dependencies are up to date or waiting for stabilization.${RESET}"
  exit 0
fi
