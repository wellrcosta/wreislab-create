#!/usr/bin/env bash
# wreislab-create — Test Matrix
# Usage:
#   bash scripts/test-matrix.sh                        # Tier A (no Docker)
#   bash scripts/test-matrix.sh --docker               # Tier A + Tier B
#   bash scripts/test-matrix.sh --filter T01,T06,TB01  # Run specific tests only
#
# Prerequisites: pnpm build must have been run first.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_DIST="$REPO_DIR/dist/generator.js"
TEST_ROOT="/tmp/wreislab-test-matrix"
WITH_DOCKER=false
FILTER=""

for arg in "$@"; do
  [[ "$arg" == "--docker" ]]    && WITH_DOCKER=true
  [[ "$arg" == --filter=* ]]    && FILTER="${arg#--filter=}"
done

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; }
info() { echo -e "${CYAN}  → $*${NC}"; }

PASS_COUNT=0; FAIL_COUNT=0

record_pass() { echo "PASS"    > "$TEST_ROOT/$1/result"; ((PASS_COUNT++)) || true; }
record_fail() { echo "FAIL:$2" > "$TEST_ROOT/$1/result"; ((FAIL_COUNT++)) || true; }

# Returns 0 (run) or 1 (skip) based on --filter
should_run() {
  [[ -z "$FILTER" ]] && return 0
  local id="$1"
  IFS=',' read -ra IDS <<< "$FILTER"
  for f in "${IDS[@]}"; do [[ "$f" == "$id" ]] && return 0; done
  return 1
}

find_free_port() {
  python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()"
}

# run_step label log_dir <cmd...>
run_step() {
  local label="$1" log_dir="$2"; shift 2
  local log="$log_dir/.test-${label}.log"
  if "$@" >"$log" 2>&1; then ok "$label"; return 0
  else fail "$label — log: $log"; return 1; fi
}

# ── Shared: generate project (any backend) ────────────────────────────────────
# Args: id name backend preset auth db cache queue realtime frontend [ai]
generate_project() {
  local id="$1" name="$2" backend="$3" preset="$4" auth="$5" db="$6" \
        cache="$7" queue="$8" realtime="$9" frontend="${10}" ai="${11:-none}"
  local out="$TEST_ROOT/$id"
  rm -rf "$out"
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
      preset: '$preset', backend: '$backend',
      auth: '$auth', database: '$db',
      cache: '$cache', queue: '$queue', ai: '$ai',
      realtime: $rt_js, frontend: '$frontend',
      packageManager: 'pnpm'
    }).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1
}

# Resolve backend directory (api-only vs monorepo layout)
backend_dir() {
  local id="$1" frontend="$2"
  if [[ "$frontend" == "none" && -f "$TEST_ROOT/$id/package.json" ]]; then
    echo "$TEST_ROOT/$id"
  else
    echo "$TEST_ROOT/$id/backend"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# Backend runners
# Each runner: install → unit test → build → e2e / start → curl verify → stop
# Signature: run_<backend>_backend id name auth frontend
# To add a new backend: implement run_<name>_backend and add a case to test_backend
# ══════════════════════════════════════════════════════════════════════════════

run_nestjs_backend() {
  local id="$1" name="$2" auth="$3" frontend="$4"
  local bd; bd=$(backend_dir "$id" "$frontend")

  local ENV="APP_NAME=$name NODE_ENV=test"
  ENV+=" OIDC_ISSUER_URL=http://localhost:8080/realms/test"
  ENV+=" OIDC_JWKS_URI=http://localhost:8080/realms/test/certs"
  ENV+=" JWT_SECRET=test-secret-minimum-32-characters-long-xxx"
  ENV+=" SQLITE_DATABASE=$TEST_ROOT/$id/test.sqlite"
  ENV+=" SWAGGER_ENABLED=false METRICS_ENABLED=true"

  info "pnpm install"
  run_step "install"  "$bd" pnpm install --dir "$bd"                      || { record_fail "$id" "install";      return 1; }
  info "pnpm test"
  run_step "test"     "$bd" pnpm --dir "$bd" run test                     || { record_fail "$id" "test";         return 1; }
  info "pnpm build"
  run_step "build"    "$bd" pnpm --dir "$bd" run build                    || { record_fail "$id" "build";        return 1; }
  [[ -f "$bd/dist/main.js" ]] || { fail "build — dist/main.js missing"; record_fail "$id" "build:no-dist"; return 1; }
  info "pnpm test:e2e"
  run_step "test-e2e" "$bd" env $ENV pnpm --dir "$bd" run test:e2e       || { record_fail "$id" "test:e2e";     return 1; }

  info "start:prod + curl"
  local port; port=$(find_free_port)
  local slog="$bd/.test-start.log"
  env $ENV PORT="$port" node "$bd/dist/main.js" >"$slog" 2>&1 &
  local spid=$!

  local ready=false
  for _ in $(seq 1 20); do
    curl -sf "http://localhost:$port/health" >/dev/null 2>&1 && ready=true && break
    sleep 0.5
  done
  if [[ "$ready" != "true" ]]; then
    kill "$spid" 2>/dev/null || true
    fail "server did not start on port $port (log: $slog)"; tail -5 "$slog" 2>/dev/null || true
    record_fail "$id" "start"; return 1
  fi
  ok "server on port $port"

  local curl_ok=true
  curl -sf "http://localhost:$port/health" >/dev/null \
    && ok "GET /health → 200" || { fail "GET /health"; curl_ok=false; }
  curl -sf "http://localhost:$port/metrics" | grep -q "nodejs_version" \
    && ok "GET /metrics → Prometheus" || { fail "GET /metrics"; curl_ok=false; }
  case "$auth" in
    none)
      curl -sf "http://localhost:$port/hello" >/dev/null \
        && ok "GET /hello → 200" || { fail "GET /hello"; curl_ok=false; }
      ;;
    jwt|oidc)
      local s; s=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/me")
      [[ "$s" == "401" ]] && ok "GET /me → 401 (protected)" || { fail "GET /me → $s (expected 401)"; curl_ok=false; }
      curl -sf "http://localhost:$port/public" >/dev/null \
        && ok "GET /public → 200" || { fail "GET /public"; curl_ok=false; }
      ;;
  esac

  kill "$spid" 2>/dev/null || true; wait "$spid" 2>/dev/null || true
  [[ "$curl_ok" == "true" ]] || { record_fail "$id" "curl"; return 1; }
  return 0
}

run_bun_backend() {
  local id="$1" name="$2" auth="$3" frontend="$4"
  local bd; bd=$(backend_dir "$id" "$frontend")

  info "bun install"
  run_step "install" "$bd" bash -c "bun install --cwd '$bd'"                                                  || { record_fail "$id" "install"; return 1; }
  info "bun test"
  run_step "test"    "$bd" bash -c "cd '$bd' && bun test"                                                      || { record_fail "$id" "test";    return 1; }
  info "bun build"
  run_step "build"   "$bd" bash -c "cd '$bd' && bun build src/index.ts --target=bun --outfile=dist/index.js"  || { record_fail "$id" "build";   return 1; }
  [[ -f "$bd/dist/index.js" ]] || { fail "build — dist/index.js missing"; record_fail "$id" "build:no-dist"; return 1; }

  info "start + curl"
  local port; port=$(find_free_port)
  local slog="$bd/.test-start.log"
  APP_NAME="$name" APP_ENV="test" PORT="$port" SWAGGER_ENABLED="false" \
    bash -c "cd '$bd' && bun dist/index.js" >"$slog" 2>&1 &
  local spid=$!

  local ready=false
  for _ in $(seq 1 20); do
    curl -sf "http://localhost:$port/health" >/dev/null 2>&1 && ready=true && break
    sleep 0.5
  done
  if [[ "$ready" != "true" ]]; then
    kill "$spid" 2>/dev/null || true
    fail "server did not start on port $port (log: $slog)"; tail -5 "$slog" 2>/dev/null || true
    record_fail "$id" "start"; return 1
  fi
  ok "server on port $port"

  local curl_ok=true
  curl -sf "http://localhost:$port/health" | grep -q '"ok"' \
    && ok "GET /health → ok" || { fail "GET /health"; curl_ok=false; }
  curl -sf "http://localhost:$port/metrics" | grep -q "process_cpu\|nodejs_version" \
    && ok "GET /metrics → Prometheus" || { fail "GET /metrics"; curl_ok=false; }
  if [[ "$auth" == "jwt" ]]; then
    local s; s=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d '{"username":"wrong","password":"wrong"}' \
      "http://localhost:$port/auth/login")
    [[ "$s" =~ ^[45] ]] && ok "POST /auth/login → $s (rejects bad creds)" || { fail "POST /auth/login → $s"; curl_ok=false; }
  fi

  kill "$spid" 2>/dev/null || true; wait "$spid" 2>/dev/null || true
  [[ "$curl_ok" == "true" ]] || { record_fail "$id" "curl"; return 1; }
  return 0
}

# ── Dispatch: routes to the right runner by backend name ─────────────────────
# To support a new backend (e.g. go): implement run_go_backend and add "go)" here.
test_backend() {
  local id="$1" name="$2" backend="$3" auth="$4" frontend="$5"
  case "$backend" in
    nestjs) run_nestjs_backend "$id" "$name" "$auth" "$frontend" ;;
    bun)    run_bun_backend    "$id" "$name" "$auth" "$frontend" ;;
    *) fail "Backend '$backend' not yet wired in test matrix"; record_fail "$id" "unsupported-backend"; return 1 ;;
  esac
}

# ── Frontend runner ───────────────────────────────────────────────────────────
test_frontend() {
  local id="$1"
  local fd="$TEST_ROOT/$id/frontend"
  [[ -d "$fd" ]] || { fail "frontend dir missing"; record_fail "$id" "frontend:missing"; return 1; }

  info "frontend pnpm install"
  run_step "frontend-install" "$fd" pnpm install --dir "$fd"    || { record_fail "$id" "frontend:install"; return 1; }
  info "frontend pnpm build"
  run_step "frontend-build"   "$fd" pnpm --dir "$fd" run build  || { record_fail "$id" "frontend:build";   return 1; }
  [[ -f "$fd/dist/index.html" ]] \
    && ok "frontend dist/index.html ✓" || { fail "frontend dist/index.html missing"; record_fail "$id" "frontend:no-dist"; return 1; }
  return 0
}

# ── Main entry point for a single test ───────────────────────────────────────
# Args: id name backend preset auth db cache queue realtime frontend [ai]
run_test() {
  local id="$1" name="$2" backend="$3" preset="$4" auth="$5" db="$6" \
        cache="$7" queue="$8" realtime="$9" frontend="${10}" ai="${11:-none}"

  should_run "$id" || return 0

  echo ""
  echo -e "${BOLD}━━━ $id │ backend=$backend auth=$auth db=$db cache=$cache queue=$queue ai=$ai realtime=$realtime frontend=$frontend ━━━${NC}"
  mkdir -p "$TEST_ROOT/$id"

  info "generate"
  if ! generate_project "$id" "$name" "$backend" "$preset" "$auth" "$db" "$cache" "$queue" "$realtime" "$frontend" "$ai"; then
    fail "generate"; record_fail "$id" "generate"; return
  fi

  if [[ "$preset" == "frontend-only" ]]; then
    ok "generate (frontend-only)"
    test_frontend "$id" && record_pass "$id"
    return
  fi

  local bd; bd=$(backend_dir "$id" "$frontend")
  [[ -f "$bd/package.json" ]] \
    || { fail "backend package.json missing at $bd"; record_fail "$id" "generate:no-pkg"; return; }
  ok "generate"

  if test_backend "$id" "$name" "$backend" "$auth" "$frontend"; then
    if [[ "$frontend" != "none" ]]; then
      test_frontend "$id" || return
    fi
    record_pass "$id"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# TEST DEFINITIONS
# Format: run_test  ID  name  backend  preset  auth  db  cache  queue  realtime  frontend  [ai]
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   wreislab-create — Test Matrix          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo -e "  CLI:       $CLI_DIST"
echo -e "  Test root: $TEST_ROOT"
echo -e "  Docker:    $WITH_DOCKER"
[[ -n "$FILTER" ]] && echo -e "  Filter:    $FILTER"
mkdir -p "$TEST_ROOT"

echo ""
echo -e "${BOLD}── Tier A — NestJS ─────────────────────────${NC}"
#         ID      name          backend   preset           auth    db       cache  queue  realtime             frontend
run_test "T01"  "base-app"     "nestjs"  "quick"          "none"  "none"   "none" "none" "none"               "none"
run_test "T02"  "db-app"       "nestjs"  "quick"          "none"  "sqlite" "none" "none" "none"               "none"
run_test "T03"  "jwt-app"      "nestjs"  "crud"           "jwt"   "sqlite" "none" "none" "none"               "none"
run_test "T04"  "oidc-app"     "nestjs"  "oidc-full"      "oidc"  "sqlite" "none" "none" "none"               "none"
run_test "T05"  "wh-app"       "nestjs"  "quick"          "jwt"   "sqlite" "none" "none" "webhook"            "none"
run_test "T06"  "ws-app"       "nestjs"  "quick"          "none"  "sqlite" "none" "none" "websocket"          "none"
run_test "T07"  "react-app"    "nestjs"  "frontend-only"  "none"  "none"   "none" "none" "none"               "react"
run_test "T08"  "full-app"     "nestjs"  "oidc-full"      "oidc"  "sqlite" "none" "none" "none"               "react"
run_test "T09"  "ws-wh-app"    "nestjs"  "quick"          "none"  "sqlite" "none" "none" "websocket+webhook"  "none"
run_test "T10"  "ai-app"       "nestjs"  "quick"          "none"  "sqlite" "none" "none" "none"               "none"   "multi"

echo ""
echo -e "${BOLD}── Tier A — Bun ────────────────────────────${NC}"
#         ID      name          backend  preset   auth    db       cache  queue  realtime    frontend
run_test "TB01" "bun-base"     "bun"    "quick"  "none"  "none"   "none" "none" "none"      "none"
run_test "TB02" "bun-jwt"      "bun"    "crud"   "jwt"   "sqlite" "none" "none" "none"      "none"
run_test "TB03" "bun-oidc"     "bun"    "quick"  "oidc"  "sqlite" "none" "none" "none"      "none"
run_test "TB04" "bun-ws"       "bun"    "quick"  "none"  "sqlite" "none" "none" "websocket" "none"
run_test "TB05" "bun-ai"       "bun"    "quick"  "none"  "sqlite" "none" "none" "none"      "none"   "multi"
run_test "TB06" "bun-wh"       "bun"    "quick"  "jwt"   "sqlite" "none" "none" "webhook"   "none"

echo ""
echo -e "${BOLD}── Tier A — Add Mode ───────────────────────${NC}"
(
  ADD_ID="T-add"
  ADD_OUT="$TEST_ROOT/$ADD_ID"

  should_run "$ADD_ID" || exit 0

  echo -e "\n${BOLD}━━━ T-add │ nestjs quick → add sqlite ━━━${NC}"
  rm -rf "$ADD_OUT"; mkdir -p "$ADD_OUT"

  _SKIP_INSTALL=1 node -e "
    const { generate } = require('$CLI_DIST');
    generate({
      name: 'add-test', outputDir: '$ADD_OUT',
      preset: 'quick', backend: 'nestjs',
      auth: 'none', database: 'none', cache: 'none', queue: 'none',
      ai: 'none', realtime: [], frontend: 'none', packageManager: 'pnpm'
    }).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1 && info "generate OK" || { fail "generate failed"; echo "FAIL:generate" > "$TEST_ROOT/T-add/result"; exit 1; }

  [[ -f "$ADD_OUT/.wreislab.json" ]] || { fail ".wreislab.json not created"; echo "FAIL:no-wreislab-json" > "$TEST_ROOT/T-add/result"; exit 1; }
  ok ".wreislab.json present"

  _SKIP_INSTALL=1 node -e "
    const { addFeature } = require('$CLI_DIST');
    const existing = require('$ADD_OUT/.wreislab.json');
    addFeature(
      { feature: 'database', value: 'sqlite', packageManager: 'pnpm' },
      existing, '$ADD_OUT'
    ).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  " 2>&1 && info "addFeature OK" || { fail "addFeature failed"; echo "FAIL:addFeature" > "$TEST_ROOT/T-add/result"; exit 1; }

  [[ -d "$ADD_OUT/src/database" ]] || { fail "src/database/ missing after addFeature"; echo "FAIL:no-database-dir" > "$TEST_ROOT/T-add/result"; exit 1; }
  ok "src/database/ present"

  DB_VAL=$(node -p "require('$ADD_OUT/.wreislab.json').database" 2>/dev/null || echo "unknown")
  if [[ "$DB_VAL" == "sqlite" ]]; then
    ok ".wreislab.json updated: database=sqlite"
  else
    fail ".wreislab.json database=$DB_VAL (expected sqlite)"
    echo "FAIL:bad-wreislab-json" > "$TEST_ROOT/T-add/result"
    exit 1
  fi

  echo "PASS" > "$TEST_ROOT/T-add/result"; ok "T-add PASS"
) || true

if [[ "$WITH_DOCKER" == "true" ]]; then
  echo ""
  echo -e "${BOLD}── Tier B — NestJS + Docker ────────────────${NC}"
  #         ID      name          backend   preset       auth    db         cache        queue      realtime     frontend
  run_test "TD01" "pg-app"       "nestjs"  "quick"      "none"  "postgres" "none"       "none"     "none"       "none"
  run_test "TD02" "pg-redis"     "nestjs"  "crud"       "jwt"   "postgres" "redis"      "none"     "none"       "none"
  run_test "TD03" "mysql-df"     "nestjs"  "oidc-full"  "oidc"  "mysql"    "dragonfly"  "none"     "none"       "none"
  run_test "TD04" "mongo-rmq"    "nestjs"  "quick"      "none"  "mongo"    "none"       "rabbitmq" "none"       "none"
  run_test "TD05" "rmq-ws"       "nestjs"  "quick"      "jwt"   "sqlite"   "none"       "rabbitmq" "websocket"  "none"
  run_test "TD06" "oidc-ws-full" "nestjs"  "oidc-full"  "oidc"  "mysql"    "none"       "none"     "websocket"  "react"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━ FINAL RESULTS ━━━━━━━━━━━━━━━${NC}"
echo ""

PASS_COUNT=0; FAIL_COUNT=0
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
