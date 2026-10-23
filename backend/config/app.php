<?php
/**
 * ============================================================================
 * ARCHIVO DE CONFIGURACIÓN GENERAL DE LA APLICACIÓN
 * ============================================================================
 * Aquí se definen las directivas generales del sistema:
 * - Nombre de la plataforma
 * - Modos de ejecución (desarrollo / producción)
 * - Configuración de CORS para permitir peticiones desde React
 * - Zona horaria para registro de auditoría y fechas
 */

return [
    // Nombre formal del sistema de investigación
    'app_name' => 'Sistema Integral de Información para la Investigación (SI3)',

    // Versión actual de la API
    'version' => '1.0.0',

    // Entorno actual: 'development' muestra errores detallados; 'production' los oculta
    'env' => getenv('APP_ENV') ?: 'development',

    // Zona horaria predeterminada para el cálculo de fechas y horas
    'timezone' => 'America/Mexico_City',

    // Configuración de CORS (Cross-Origin Resource Sharing)
    // Permite que el frontend en React (ej: http://localhost:5173) acceda a esta API
    'cors' => [
        'allowed_origins' => [
            'http://localhost:5173', // Servidor de desarrollo de Vite por defecto
            'http://localhost:3000', // Servidor alternativo o Create React App
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            '*'                      // En desarrollo permitimos todos los orígenes
        ],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With']
    ]
];
