#!/usr/bin/env bash
# wreislab-create — Test Matrix
# Usage:
#   bash scripts/test-matrix.sh           # Tier A (no Docker required)
#   bash scripts/test-matrix.sh --docker  # Tier A + Tier B (requires Docker daemon)
#
# Prerequisites: pnpm build must have been run first.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_DIST="$REPO_DIR/dist/generator.js"
TEST_ROOT="/tmp/wreislab-test-matrix"
WITH_DOCKER=false

for arg in "$@"; do
  [[ "$arg" == "--docker" ]] && WITH_DOCKER=true
done

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; }
info() { echo -e "${CYAN}  → $*${NC}"; }

# Results stored as files: $TEST_ROOT/<id>/result  (PASS or FAIL:<step>)
PASS_COUNT=0
FAIL_COUNT=0

record_pass() { echo "PASS" > "$TEST_ROOT/$1/result"; ((PASS_COUNT++)) || true; }
record_fail() { echo "FAIL:$2" > "$TEST_ROOT/$1/result"; ((FAIL_COUNT++)) || true; }

# ── Helper: find free port ───────────────────────────────────────────────────
find_free_port() {
  python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()"
}

# ── Helper: run a step ───────────────────────────────────────────────────────
run_step() {
  local label="$1"; local log_dir="$2"; shift 2
  local log="$log_dir/.test-${label}.log"
  if "$@" >"$log" 2>&1; then ok "$label"; return 0
  else fail "$label — log: $log"; return 1; fi
}

# ── Helper: generate project ─────────────────────────────────────────────────
generate_project() {
  local id="$1" name="$2" preset="$3" auth="$4" db="$5" cache="$6" queue="$7" realtime="$8" frontend="$9" ai="${10:-none}"
  local out="$TEST_ROOT/$id"
  rm -rf "$out"
  # Convert realtime string to JS array: "none"→[], "websocket"→["websocket"], "websocket+webhook"→["websocket","webhook"]
  local rt_js
  case "$realtime" in
    none)              rt_js="[]" ;;
    websocket)         rt_js='["websocket"]' ;;
    webhook)           rt_js='["webhook"]' ;;
    websocket+webhook) rt_js='["websocket","webhook"]' ;;
    *)                 rt_js="[]" ;;
  esac
  _SKIP_INSTALL=1 node -e "
    const { generate } = require('$CLI_DIST');
    generate({
      name: '$name', outputDir: '$out',
      preset: '$preset', backend: 'nestjs',
      auth: '$auth', database: '$db',
      cache: '$cache', queue: '$queue',
      ai: '$ai',
      realtime: $rt_js, frontend: '$frontend',
      packageManager: 'pnpm'
    }).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1
}

# ── Helper: test one backend config ──────────────────────────────────────────
test_backend() {
  local id="$1" name="$2" auth="$3" frontend="$4"

  # Determine backend dir (api-only vs monorepo)
  local bd
  if [[ "$frontend" == "none" && -f "$TEST_ROOT/$id/package.json" ]]; then
    bd="$TEST_ROOT/$id"
  else
    bd="$TEST_ROOT/$id/backend"
  fi

  # Shared env vars (safe test defaults)
  local EPREFIX="APP_NAME=$name NODE_ENV=test"
  EPREFIX+=" OIDC_ISSUER_URL=http://localhost:8080/realms/test"
  EPREFIX+=" OIDC_JWKS_URI=http://localhost:8080/realms/test/certs"
  EPREFIX+=" JWT_SECRET=test-secret-minimum-32-characters-long-xxx"
  EPREFIX+=" SQLITE_DATABASE=$TEST_ROOT/$id/test.sqlite"
  EPREFIX+=" SWAGGER_ENABLED=false METRICS_ENABLED=true"

  # Install
  info "pnpm install"
  run_step "install" "$bd" pnpm install --dir "$bd" || { record_fail "$id" "install"; return 1; }

  # Unit tests
  info "pnpm test"
  run_step "test" "$bd" pnpm --dir "$bd" run test || { record_fail "$id" "test"; return 1; }

  # Build
  info "pnpm build"
  run_step "build" "$bd" pnpm --dir "$bd" run build || { record_fail "$id" "build"; return 1; }
  [[ -f "$bd/dist/main.js" ]] || { fail "build — dist/main.js missing"; record_fail "$id" "build:no-dist"; return 1; }

  # E2E
  info "pnpm test:e2e"
  run_step "test-e2e" "$bd" env $EPREFIX pnpm --dir "$bd" run test:e2e || { record_fail "$id" "test:e2e"; return 1; }

  # Start + curls
  info "start:prod + curls"
  local port; port=$(find_free_port)
  local slog="$bd/.test-start.log"

  env $EPREFIX PORT="$port" node "$bd/dist/main.js" >"$slog" 2>&1 &
  local spid=$!

  local ready=false
  for _ in $(seq 1 20); do
    curl -sf "http://localhost:$port/health" >/dev/null 2>&1 && ready=true && break
    sleep 0.5
  done

  if [[ "$ready" != "true" ]]; then
    kill "$spid" 2>/dev/null || true
    fail "server did not start on port $port (log: $slog)"
    tail -5 "$slog" 2>/dev/null || true
    record_fail "$id" "start:prod"; return 1
  fi
  ok "server running on port $port"

  local curl_ok=true

  # /health — always public
  curl -sf "http://localhost:$port/health" >/dev/null \
    && ok "GET /health → 200" || { fail "GET /health"; curl_ok=false; }

  # /metrics — always public
  curl -sf "http://localhost:$port/metrics" | grep -q "nodejs_version" \
    && ok "GET /metrics → Prometheus" || { fail "GET /metrics"; curl_ok=false; }

  # auth-specific
  case "$auth" in
    none)
      curl -sf "http://localhost:$port/hello" >/dev/null \
        && ok "GET /hello → 200 (no auth)" || { fail "GET /hello"; curl_ok=false; }
      ;;
    jwt|oidc)
      local s; s=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/me")
      [[ "$s" == "401" ]] \
        && ok "GET /me → 401 (protected)" || { fail "GET /me → $s (expected 401)"; curl_ok=false; }
      curl -sf "http://localhost:$port/public" >/dev/null \
        && ok "GET /public → 200" || { fail "GET /public"; curl_ok=false; }
      ;;
  esac

  kill "$spid" 2>/dev/null || true
  wait "$spid" 2>/dev/null || true

  [[ "$curl_ok" == "true" ]] || { record_fail "$id" "curl"; return 1; }
  return 0
}

# ── Helper: test frontend ────────────────────────────────────────────────────
test_frontend() {
  local id="$1"
  local fd="$TEST_ROOT/$id/frontend"
  [[ -d "$fd" ]] || { fail "frontend dir missing"; record_fail "$id" "frontend:missing"; return 1; }

  info "frontend pnpm install"
  run_step "frontend-install" "$fd" pnpm install --dir "$fd" || { record_fail "$id" "frontend:install"; return 1; }

  info "frontend pnpm build"
  run_step "frontend-build" "$fd" pnpm --dir "$fd" run build || { record_fail "$id" "frontend:build"; return 1; }

  [[ -f "$fd/dist/index.html" ]] \
    && ok "frontend dist/index.html ✓" || { fail "frontend dist/index.html missing"; record_fail "$id" "frontend:no-dist"; return 1; }
  return 0
}

# ── Main: run one test config ─────────────────────────────────────────────────
run_test() {
  local id="$1" name="$2" preset="$3" auth="$4" db="$5" cache="$6" queue="$7" realtime="$8" frontend="$9" ai="${10:-none}"

  echo ""
  echo -e "${BOLD}━━━ $id │ auth=$auth db=$db cache=$cache queue=$queue ai=$ai realtime=$realtime frontend=$frontend ━━━${NC}"

  mkdir -p "$TEST_ROOT/$id"

  info "generate"
  if ! generate_project "$id" "$name" "$preset" "$auth" "$db" "$cache" "$queue" "$realtime" "$frontend" "$ai"; then
    fail "generate"; record_fail "$id" "generate"; return
  fi

  # Detect backend dir
  local bd
  if [[ "$frontend" == "none" && -f "$TEST_ROOT/$id/package.json" ]]; then
    bd="$TEST_ROOT/$id"
  else
    bd="$TEST_ROOT/$id/backend"
  fi

  # Frontend-only preset: no backend dir expected
  if [[ "$preset" == "frontend-only" ]]; then
    ok "generate (frontend-only)"
    test_frontend "$id" && record_pass "$id"
    return
  fi

  [[ -f "$bd/package.json" ]] || { fail "backend package.json missing at $bd"; record_fail "$id" "generate:no-pkg"; return; }
  ok "generate"

  if test_backend "$id" "$name" "$auth" "$frontend"; then
    if [[ "$frontend" != "none" ]]; then
      test_frontend "$id" || return
    fi
    record_pass "$id"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# TEST DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   wreislab-create — Test Matrix          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo -e "  CLI: $CLI_DIST"
echo -e "  Test root: $TEST_ROOT"
echo -e "  Docker: $WITH_DOCKER"
mkdir -p "$TEST_ROOT"

echo ""
echo -e "${BOLD}── Tier A — Sem Docker ─────────────────────${NC}"
#          ID     name        preset        auth    db       cache  queue  realtime             frontend
run_test  "T01"  "base-app"  "quick"       "none"  "none"   "none" "none" "none"               "none"
run_test  "T02"  "db-app"    "quick"       "none"  "sqlite" "none" "none" "none"               "none"
run_test  "T03"  "jwt-app"   "crud"        "jwt"   "sqlite" "none" "none" "none"               "none"
run_test  "T04"  "oidc-app"  "oidc-full"   "oidc"  "sqlite" "none" "none" "none"               "none"
run_test  "T05"  "wh-app"    "quick"       "jwt"   "sqlite" "none" "none" "webhook"            "none"
run_test  "T06"  "ws-app"    "quick"       "none"  "sqlite" "none" "none" "websocket"          "none"
run_test  "T07"  "react-app" "frontend-only" "none" "none"  "none" "none" "none"               "react"
run_test  "T08"  "full-app"  "oidc-full"   "oidc"  "sqlite" "none" "none" "none"               "react"
run_test  "T09"  "ws-wh-app" "quick"       "none"  "sqlite" "none" "none" "websocket+webhook"  "none"
#                                                                                                          ai↓
run_test  "T10-ai" "ai-app" "quick"       "none"  "sqlite" "none" "none" "none"               "none" "multi"

# Tier A — Add mode: generate base, then add sqlite via add-feature flow
echo ""
echo -e "${BOLD}── Tier A — Add Mode ───────────────────────${NC}"
(
  ADD_ID="T10-add"
  ADD_OUT="$TEST_ROOT/$ADD_ID"
  rm -rf "$ADD_OUT"
  mkdir -p "$ADD_OUT"
  echo -e "\n${BOLD}━━━ T10 │ add-mode: quick → add sqlite ━━━${NC}"

  # Generate base quick project
  _SKIP_INSTALL=1 node -e "
    const { generate } = require('$CLI_DIST');
    generate({
      name: 'add-test', outputDir: '$ADD_OUT',
      preset: 'quick', backend: 'nestjs',
      auth: 'none', database: 'none',
      cache: 'none', queue: 'none',
      ai: 'none',
      realtime: [], frontend: 'none',
      packageManager: 'pnpm'
    }).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1 && info "generate OK" || { fail "generate failed"; echo "FAIL:generate" > "$TEST_ROOT/T10-add/result"; exit 1; }

  # Verify .wreislab.json was created
  if [[ ! -f "$ADD_OUT/.wreislab.json" ]]; then
    fail "T10: .wreislab.json not created after generate"
    echo "FAIL:no-wreislab-json" > "$TEST_ROOT/T10-add/result"
    exit 1
  fi
  ok ".wreislab.json presente"

  # Apply add-feature for sqlite
  _SKIP_INSTALL=1 node -e "
    const { addFeature } = require('$CLI_DIST');
    const existing = require('$ADD_OUT/.wreislab.json');
    addFeature(
      { feature: 'database', value: 'sqlite', packageManager: 'pnpm' },
      existing,
      '$ADD_OUT'
    ).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1 && info "addFeature OK" || { fail "addFeature failed"; echo "FAIL:addFeature" > "$TEST_ROOT/T10-add/result"; exit 1; }

  # Verify database overlay was applied
  if [[ ! -d "$ADD_OUT/src/database" ]]; then
    fail "T10: src/database/ not created after addFeature"
    echo "FAIL:no-database-dir" > "$TEST_ROOT/T10-add/result"
    exit 1
  fi
  ok "src/database/ presente após add"

  # Verify .wreislab.json updated
  local DB_VAL
  DB_VAL=$(node -p "require('$ADD_OUT/.wreislab.json').database" 2>/dev/null || echo "unknown")
  if [[ "$DB_VAL" == "sqlite" ]]; then
    ok ".wreislab.json atualizado: database=sqlite"
  else
    fail "T10: .wreislab.json database=$DB_VAL (expected sqlite)"
    echo "FAIL:bad-wreislab-json" > "$TEST_ROOT/T10-add/result"
    exit 1
  fi

  echo "PASS" > "$TEST_ROOT/T10-add/result"
  ok "T10 PASS"
) || true

if [[ "$WITH_DOCKER" == "true" ]]; then
  echo ""
  echo -e "${BOLD}── Tier B — Com Docker ─────────────────────${NC}"
  run_test  "T11"  "pg-app"    "quick"       "none"  "postgres" "none"      "none"     "none"      "none"
  run_test  "T12"  "pg-redis"  "crud"        "jwt"   "postgres" "redis"     "none"     "none"      "none"
  run_test  "T13"  "mysql-df"  "oidc-full"   "oidc"  "mysql"    "dragonfly" "none"     "none"      "none"
  run_test  "T14"  "mongo-rmq" "quick"       "none"  "mongo"    "none"      "rabbitmq" "none"      "none"
  run_test  "T15"  "rmq-ws"    "quick"       "jwt"   "sqlite"   "none"      "rabbitmq" "websocket" "none"
  run_test  "T16"  "oidc-mysql-ws" "oidc-full" "oidc" "mysql"  "none"      "none"     "websocket" "react"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━ RESULTADO FINAL ━━━━━━━━━━━━━${NC}"
echo ""

PASS_COUNT=0; FAIL_COUNT=0

# Read results from files (bash 3 compatible)
for result_file in "$TEST_ROOT"/*/result; do
  [[ -f "$result_file" ]] || continue
  id=$(basename "$(dirname "$result_file")")
  status=$(cat "$result_file")
  if [[ "$status" == "PASS" ]]; then
    echo -e "  ${GREEN}✓ PASS${NC}  $id"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    step="${status#FAIL:}"
    echo -e "  ${RED}✗ FAIL${NC}  $id  (step: $step)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
if [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}PASSED: $PASS_COUNT/$TOTAL ✓${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}FAILED: $FAIL_COUNT/$TOTAL${NC}"
  echo -e "  Logs: $TEST_ROOT/<id>/.test-<step>.log"
  exit 1
fi
