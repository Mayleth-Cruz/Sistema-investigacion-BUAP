<?php
/**
 * ============================================================================
 * ARCHIVO DE CONFIGURACIÓN DE BASE DE DATOS (MySQL)
 * ============================================================================
 * Este archivo centraliza los parámetros de conexión con el servidor MySQL.
 * Permite tomar los valores desde variables de entorno (.env) o utilizar
 * valores predeterminados para desarrollo local (como root sin contraseña en XAMPP/MAMP).
 *
 * Puedes cambiar estos valores según tu entorno local (puerto 3306 o 8889 para MAMP).
 */

return [
    // Dirección del servidor MySQL (ej: localhost o 127.0.0.1)
    'host' => getenv('DB_HOST') ?: '127.0.0.1',

    // Puerto de escucha de MySQL (3306 es el estándar, 3307 o 8889 en algunos entornos)
    'port' => getenv('DB_PORT') ?: '3306',

    // Nombre de la base de datos para el sistema de investigación
    'database' => getenv('DB_NAME') ?: 'investigacion_db',

    // Usuario con permisos para consultar y modificar tablas
    'username' => getenv('DB_USER') ?: 'root',

    // Contraseña del usuario MySQL (por defecto vacía en XAMPP local)
    'password' => getenv('DB_PASS') !== false ? getenv('DB_PASS') : '',

    // Juego de caracteres recomendado para admitir acentos, caracteres especiales y emojis científicos
    'charset' => 'utf8mb4',

    // Opciones adicionales para PDO (Conexiones persistentes, emulación de prepares desactivada)
    'options' => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
];
