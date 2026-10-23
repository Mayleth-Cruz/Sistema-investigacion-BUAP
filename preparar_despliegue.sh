#!/bin/bash
# ============================================================================
# SCRIPT DE PREPARACIÓN AUTOMÁTICA PARA SUBIR A SERVIDOR GRATUITO (BUAP SI3)
# ============================================================================
# Este script:
# 1. Compila el frontend React optimizado para producción.
# 2. Copia los archivos estáticos generados dentro de backend/public/.
# 3. Empaqueta el sistema en un archivo zip listo para subir a cualquier
#    hosting PHP gratuito (InfinityFree, Alwaysdata, Hostinger, cPanel, etc.).
# ============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  PREPARANDO PROYECTO BUAP PARA DESPLIEGUE EN PRODUCCIÓN"
echo "=========================================================="

# 1. Compilar Frontend
echo "[1/3] Compilando frontend en React..."
cd frontend
npm run build
cd "$DIR"

# 2. Sincronizar archivos estáticos con backend/public
echo "[2/3] Integrando aplicación web dentro de backend/public/..."
cp frontend/dist/index.html backend/public/index.html
cp -r frontend/dist/assets backend/public/
[ -f frontend/dist/campus-buap.jpg ] && cp frontend/dist/campus-buap.jpg backend/public/
[ -f frontend/dist/favicon.svg ] && cp frontend/dist/favicon.svg backend/public/
[ -f frontend/dist/icons.svg ] && cp frontend/dist/icons.svg backend/public/

# 3. Crear paquete ZIP listo para subir
echo "[3/3] Creando archivo comprimido 'paquete_servidor.zip'..."
rm -f paquete_servidor.zip
zip -r -q paquete_servidor.zip backend/ -x "backend/.git*" -x "*/.DS_Store"

echo "=========================================================="
echo "  ¡TODO LISTO PARA SUBIR AL SERVIDOR GRATUITO!"
echo "=========================================================="
echo "Se ha generado el archivo: paquete_servidor.zip"
echo "Todo el sistema (Frontend React + Backend PHP + Base de datos) está unificado."
echo "=========================================================="
