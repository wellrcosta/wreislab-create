#!/usr/bin/env bash
# wreislab-create — Safe Publish Pipeline
# Runs all checks before publishing to npm.
#
# Usage: bash scripts/publish.sh [--dry-run]
#
# Steps:
#   1. TypeScript type check
#   2. Build (tsc + template copy)
#   3. Verify shebang in dist/cli.js
#   4. Validate pack contents (no src/, no secrets)
#   5. Test matrix Tier A
#   6. Dependency audit (warn only)
#   7. Bump version (interactive)
#   8. Publish to npm
#   9. Git tag + push

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; RESET='\033[0m'

step() { echo -e "\n${BOLD}▶ $1${RESET}"; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
fail() { echo -e "${RED}✘ $1${RESET}"; exit 1; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }

cd "$REPO_DIR"

echo -e "\n${BOLD}wreislab-create — Safe Publish Pipeline${RESET}"
[[ "$DRY_RUN" == "true" ]] && warn "DRY RUN MODE — não publicará no npm"

# ── 1. TypeScript type check ─────────────────────────────────────────────────
step "1/9 TypeScript type check"
pnpm exec tsc --noEmit || fail "Erros de TypeScript encontrados — corrija antes de publicar"
ok "TypeScript OK"

# ── 2. Build ─────────────────────────────────────────────────────────────────
step "2/9 Build"
pnpm run build || fail "Build falhou"
ok "Build concluído"

# ── 3. Shebang verification ───────────────────────────────────────────────────
step "3/9 Verificar shebang"
SHEBANG=$(head -1 "$REPO_DIR/dist/cli.js")
if [[ "$SHEBANG" != "#!/usr/bin/env node" ]]; then
  fail "Shebang ausente em dist/cli.js — o arquivo não será executável via npx"
fi
ok "Shebang presente: $SHEBANG"

# ── 4. Pack validation ────────────────────────────────────────────────────────
step "4/9 Validar conteúdo do pacote"
PACK_OUT=$(npm pack --dry-run 2>&1)

# Must contain dist/
echo "$PACK_OUT" | grep -q "dist/" || fail "dist/ não está no pacote — verifique o campo 'files' no package.json"

# Must NOT contain src/ (except src in dist paths like dist/templates/...)
if echo "$PACK_OUT" | grep -v "dist/" | grep -q " src/"; then
  fail "src/ está sendo publicado — remova-o do campo 'files' ou adicione ao .npmignore"
fi

# Must NOT contain .env files or secrets
if echo "$PACK_OUT" | grep -qE "\.env$|\.env\.|credentials|secrets"; then
  fail "Arquivos sensíveis detectados no pacote — verifique antes de publicar"
fi

PACK_SIZE=$(echo "$PACK_OUT" | grep "package size:" | awk '{print $3, $4}' || echo "unknown")
ok "Pack OK${PACK_SIZE:+ (tamanho: $PACK_SIZE)}"

# ── 5. Test matrix ────────────────────────────────────────────────────────────
step "5/9 Test matrix (Tier A)"
if _SKIP_INSTALL=0 bash "$SCRIPT_DIR/test-matrix.sh"; then
  ok "Todos os testes passaram"
else
  fail "Test matrix falhou — corrija os erros antes de publicar"
fi

# ── 6. Dependency audit (warning only) ───────────────────────────────────────
step "6/9 Auditoria de dependências"
if bash "$SCRIPT_DIR/check-deps.sh" 2>/dev/null; then
  ok "Todas as dependências estão atualizadas"
else
  warn "Algumas dependências têm updates disponíveis — considere atualizar antes de publicar"
fi

# ── 7. Version bump ───────────────────────────────────────────────────────────
step "7/9 Bump de versão"
CURRENT_VERSION=$(node -p "require('$REPO_DIR/package.json').version")
echo -e "  Versão atual: ${BOLD}$CURRENT_VERSION${RESET}"
echo ""
echo "  Escolha o tipo de bump:"
echo "    [1] patch  — bug fixes (x.x.X)"
echo "    [2] minor  — new features, backwards compatible (x.X.0)"
echo "    [3] major  — breaking changes (X.0.0)"
echo "    [0] skip   — manter versão atual"
echo ""
read -r -p "  Opção (0-3): " BUMP_CHOICE

case "$BUMP_CHOICE" in
  1) BUMP_TYPE="patch" ;;
  2) BUMP_TYPE="minor" ;;
  3) BUMP_TYPE="major" ;;
  0) BUMP_TYPE="" ;;
  *) fail "Opção inválida: $BUMP_CHOICE" ;;
esac

if [[ -n "$BUMP_TYPE" ]]; then
  npm version "$BUMP_TYPE" --no-git-tag-version
  NEW_VERSION=$(node -p "require('$REPO_DIR/package.json').version")
  ok "Versão atualizada: $CURRENT_VERSION → $NEW_VERSION"
else
  NEW_VERSION="$CURRENT_VERSION"
  warn "Versão mantida: $NEW_VERSION"
fi

# ── 8. Publish ────────────────────────────────────────────────────────────────
step "8/9 Publicar no npm"
if [[ "$DRY_RUN" == "true" ]]; then
  warn "DRY RUN — publicação ignorada"
  warn "Comando que seria executado: pnpm publish --access public --no-git-checks"
else
  echo -e "  Publicando ${BOLD}wreislab-create@${NEW_VERSION}${RESET}..."
  pnpm publish --access public --no-git-checks || fail "Publicação falhou"
  ok "Publicado: wreislab-create@${NEW_VERSION}"
fi

# ── 9. Git tag ────────────────────────────────────────────────────────────────
step "9/9 Git tag"
if [[ "$DRY_RUN" == "true" ]]; then
  warn "DRY RUN — tag git ignorada"
else
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    git add package.json
    git commit -m "chore: bump to v${NEW_VERSION}" --no-verify 2>/dev/null || true
    git tag "v${NEW_VERSION}"
    ok "Tag v${NEW_VERSION} criada"
    echo -e "  ${BOLD}Para publicar a tag: git push && git push --tags${RESET}"
  else
    warn "Não é um repositório git — tag ignorada"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Pipeline concluído — wreislab-create@${NEW_VERSION}${RESET}"
[[ "$DRY_RUN" == "true" ]] && echo -e "${YELLOW}  (dry run — nada foi publicado)${RESET}"
