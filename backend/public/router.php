<?php
/**
 * ============================================================================
 * ROUTER PARA EL SERVIDOR EMBEBIDO DE PHP (CLI Web Server)
 * ============================================================================
 * Este archivo se utiliza al ejecutar:
 *   php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
 * 
 * Si el cliente solicita un archivo estático existente (CSS, JS, imágenes),
 * el servidor lo entrega directamente. En caso contrario, redirige la petición
 * hacia backend/public/index.php.
 * ============================================================================
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$filePath = __DIR__ . $uri;

// Si el archivo físico existe y no es un directorio, lo servimos directamente
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    return false;
}

// Si se solicita la raíz o una vista SPA (no /api) y existe index.html compilado
if (file_exists(__DIR__ . '/index.html') && !str_starts_with($uri, '/api')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

// Para todas las demás rutas de la API, procesamos con index.php
require_once __DIR__ . '/index.php';
