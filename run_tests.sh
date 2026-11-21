#!/usr/bin/env bash

# ============================================================================
# EJECUTOR ÚNICO DE PRUEBAS - SI3 (BUAP)
# ============================================================================
# Corre, en orden:
#   1. Backend  : backend/tests/run.php  (PHP puro; levanta php -S con una COPIA
#                 temporal de la BD, nunca toca backend/src/Database/database.sqlite)
#   2. Frontend : npm test               (Vitest + Testing Library + jsdom)
#   3. Build    : npm run build          (verifica que compila; borra frontend/dist)
#   4. Flujo    : tests/validar_flujo.mjs (valida flujo.html contra el código real)
#
# Uso:  ./run_tests.sh            -> todo
#       ./run_tests.sh backend    -> solo backend
#       ./run_tests.sh frontend   -> solo frontend (tests + build)
#       ./run_tests.sh flujo      -> solo la validación de flujo.html
# ============================================================================

BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

TARGET="${1:-all}"
FAILED=()

run_step() {
    local name="$1"; shift
    echo -e "\n${CYAN}${BOLD}=== ${name} ===${NC}"
    if "$@"; then
        echo -e "${GREEN}✔ ${name}${NC}"
    else
        echo -e "${RED}✘ ${name}${NC}"
        FAILED+=("$name")
    fi
}

PHP_BIN="$(command -v php || true)"
[ -z "$PHP_BIN" ] && [ -x /opt/homebrew/bin/php ] && PHP_BIN=/opt/homebrew/bin/php

backend_tests() {
    if [ -z "$PHP_BIN" ]; then echo "PHP no encontrado"; return 1; fi
    (cd "$BASE_DIR" && "$PHP_BIN" backend/tests/run.php)
}

frontend_tests() {
    (cd "$BASE_DIR/frontend" && { [ -d node_modules ] || npm install; } && npm test)
}

frontend_build() {
    local had_dist=0
    [ -d "$BASE_DIR/frontend/dist" ] && had_dist=1
    (cd "$BASE_DIR/frontend" && npm run build >/dev/null)
    local rc=$?
    # No dejar artefactos de build si no existían antes
    [ "$had_dist" -eq 0 ] && rm -rf "$BASE_DIR/frontend/dist"
    return $rc
}

flujo_tests() {
    if [ ! -f "$BASE_DIR/tests/validar_flujo.mjs" ]; then echo "tests/validar_flujo.mjs no existe"; return 1; fi
    (cd "$BASE_DIR" && node tests/validar_flujo.mjs)
}

case "$TARGET" in
    backend)  run_step "Backend (PHP)" backend_tests ;;
    frontend) run_step "Frontend (Vitest)" frontend_tests
              run_step "Frontend (build)" frontend_build ;;
    flujo)    run_step "flujo.html" flujo_tests ;;
    all)      run_step "Backend (PHP)" backend_tests
              run_step "Frontend (Vitest)" frontend_tests
              run_step "Frontend (build)" frontend_build
              run_step "flujo.html" flujo_tests ;;
    *) echo "Uso: $0 [all|backend|frontend|flujo]"; exit 2 ;;
esac

echo
if [ ${#FAILED[@]} -eq 0 ]; then
    echo -e "${GREEN}${BOLD}TODAS LAS PRUEBAS PASARON${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}FALLARON:${NC} ${FAILED[*]}"
    exit 1
fi
