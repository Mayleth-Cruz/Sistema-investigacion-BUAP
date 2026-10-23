<?php
namespace App\Core;

/**
 * ============================================================================
 * CLASE RESPONSE (Abstracción de la Respuesta HTTP en formato JSON)
 * ============================================================================
 * Esta clase estandariza todas las salidas de la API REST hacia el frontend.
 * Asegura que todas las respuestas tengan una estructura predecible:
 * {
 *   "success": true | false,
 *   "message": "Mensaje legible para humanos o para mostrar en la interfaz",
 *   "data": { ... } | [ ... ] | null,
 *   "errors": [ ... ] | null
 * }
 */
class Response {
    /**
     * Aplica las cabeceras HTTP necesarias para habilitar CORS (Cross-Origin Resource Sharing).
     * Esto permite que React haga peticiones sin ser bloqueado por la política del mismo origen.
     */
    public static function applyCorsHeaders(): void {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        
        header("Access-Control-Allow-Origin: {$origin}");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
        header("Access-Control-Max-Age: 86400"); // Cache de opciones por 24 horas

        // Cabeceras de seguridad HTTP
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: SAMEORIGIN");
        header("X-XSS-Protection: 1; mode=block");
    }

    /**
     * Envía una respuesta HTTP en formato JSON y termina la ejecución del script.
     *
     * @param int $statusCode Código de estado HTTP (200, 201, 400, 404, 500, etc.)
     * @param array $payload Datos a codificar en JSON
     */
    public static function json(int $statusCode, array $payload): void {
        self::applyCorsHeaders();

        // Establecemos el código de estado y el tipo de contenido
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        // Enviamos el cuerpo JSON
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Envía una respuesta exitosa estandarizada (HTTP 200 OK).
     *
     * @param mixed $data Datos devueltos al cliente (lista, objeto, conteo)
     * @param string $message Mensaje informativo
     */
    public static function success($data = null, string $message = 'Operación realizada con éxito'): void {
        self::json(200, [
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Envía una respuesta de recurso creado exitosamente (HTTP 201 Created).
     *
     * @param mixed $data Datos del nuevo recurso creado (incluyendo el ID generado)
     * @param string $message Mensaje descriptivo
     */
    public static function created($data = null, string $message = 'Recurso creado exitosamente'): void {
        self::json(201, [
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Envía una respuesta de error del cliente o validación (HTTP 400 Bad Request).
     *
     * @param string $message Motivo del error
     * @param array|null $errors Lista de detalles o campos con fallas de validación
     */
    public static function badRequest(string $message = 'Petición inválida', ?array $errors = null): void {
        self::json(400, [
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ]);
    }

    /**
     * Envía una respuesta de no autenticado / credenciales inválidas (HTTP 401 Unauthorized).
     */
    public static function unauthorized(string $message = 'Credenciales no autorizadas o sesión vencida', ?array $errors = null): void {
        self::json(401, [
            'success' => false,
            'message' => $message,
            'errors'  => $errors
        ]);
    }

    /**
     * Envía una respuesta de acceso prohibido / rol insuficiente (HTTP 403 Forbidden).
     */
    public static function forbidden(string $message = 'Acceso denegado: no cuentas con los permisos requeridos', ?array $errors = null): void {
        self::json(403, [
            'success' => false,
            'message' => $message,
            'errors'  => $errors
        ]);
    }

    /**
     * Envía una respuesta de recurso no encontrado (HTTP 404 Not Found).
     *
     * @param string $message Mensaje descriptivo
     */
    public static function notFound(string $message = 'El recurso solicitado no fue encontrado'): void {
        self::json(404, [
            'success' => false,
            'message' => $message,
            'data' => null
        ]);
    }

    /**
     * Envía una respuesta de error interno en el servidor (HTTP 500 Internal Server Error).
     *
     * @param string $message Descripción del error
     * @param mixed $debugInfo Información adicional para depuración en modo desarrollo
     */
    public static function serverError(string $message = 'Ocurrió un error interno en el servidor', $debugInfo = null): void {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        // Solo adjuntamos detalles técnicos si no estamos en producción estricta
        if ($debugInfo !== null) {
            $payload['debug'] = $debugInfo;
        }

        self::json(500, $payload);
    }
}
