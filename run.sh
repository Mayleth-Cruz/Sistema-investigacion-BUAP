#!/usr/bin/env bash

# ============================================================================
# SCRIPT DE INICIO LOCAL AUTOMATIZADO - SI3 RESEARCH
# ============================================================================
# Este script inicia tanto el backend en PHP como el frontend en React (Vite).
# Maneja la verificación de dependencias, configuración de puertos y cierre limpio
# de procesos en segundo plano al presionar Ctrl+C.
# ============================================================================

# Colores para la terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # Sin color

# Directorio base del proyecto
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

# Banner de Presentación
echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    🔬  SISTEMA INTEGRAL DE INFORMACIÓN PARA LA INVESTIGACIÓN (SI3)  "
echo "        Plataforma para Registrar, Monitorear, Visualizar y Difundir "
echo "======================================================================"
echo -e "${NC}"

# 1. Verificar PHP
PHP_BIN=""
if command -v php &> /dev/null; then
    PHP_BIN="php"
elif [ -f "/opt/homebrew/bin/php" ]; then
    PHP_BIN="/opt/homebrew/bin/php"
elif [ -f "/usr/local/bin/php" ]; then
    PHP_BIN="/usr/local/bin/php"
fi

if [ -z "$PHP_BIN" ]; then
    echo -e "${RED}[ERROR] No se encontró PHP instalado en el sistema.${NC}"
    echo -e "Instálalo usando Homebrew: ${YELLOW}brew install php${NC}"
    exit 1
else
    PHP_VERSION=$($PHP_BIN -r 'echo PHP_VERSION;')
    echo -e "${GREEN}✔ PHP detectado:${NC} versión $PHP_VERSION ($PHP_BIN)"
fi

# 2. Verificar Node.js y npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js no está instalado.${NC}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm no está instalado.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Node.js detectado:${NC} $(node -v)"
echo -e "${GREEN}✔ npm detectado:${NC} $(npm -v)"

# 3. Comprobar dependencias del Frontend
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "\n${YELLOW}Instalando paquetes del Frontend con npm...${NC}"
    cd "$FRONTEND_DIR" && npm install
    cd "$BASE_DIR"
fi

# 4. Información sobre MySQL y Base de Datos
echo -e "\n${PURPLE}--- Configuración de Base de Datos MySQL ---${NC}"
echo -e "El backend está configurado para la base de datos: ${BOLD}investigacion_db${NC}"
echo -e "Para importar las tablas y los datos de prueba, puedes ejecutar en tu terminal:"
echo -e "  ${YELLOW}mysql -u root -p < backend/src/Database/schema.sql${NC}"
echo -e "  ${YELLOW}mysql -u root -p < backend/src/Database/seed.sql${NC}"
echo -e "${CYAN}Nota: Si aún no configuras MySQL, el Frontend usará datos de demostración de respaldo.${NC}\n"

# 5. Iniciar Servidor Backend en PHP (Puerto 8000)
echo -e "${CYAN}Iniciando Backend en PHP (http://127.0.0.1:8000)...${NC}"
$PHP_BIN -S 127.0.0.1:8000 -t "$BACKEND_DIR/public" "$BACKEND_DIR/public/router.php" &
BACKEND_PID=$!

# 6. Iniciar Servidor Frontend en React (Vite)
echo -e "${GREEN}Iniciando Frontend en React con Vite...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
cd "$BASE_DIR"

# 7. Manejador de Terminación Limpia (Ctrl+C)
cleanup() {
    echo -e "\n${YELLOW}Deteniendo servidores locales...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servidores detenidos correctamente. ¡Hasta pronto! 👋${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD} ✔ SISTEMA EN EJECUCIÓN SATISFACTORIAMENTE${NC}"
echo -e "   🌐 Frontend React: ${CYAN}http://localhost:5173${NC}"
echo -e "   🔌 Backend PHP:    ${CYAN}http://127.0.0.1:8000/api${NC}"
echo -e "   💡 Presiona ${RED}Ctrl + C${NC} en esta terminal para detener todo el sistema."
echo -e "${GREEN}${BOLD}======================================================================${NC}\n"

# Mantener el script en espera hasta que el usuario presione Ctrl+C
wait
