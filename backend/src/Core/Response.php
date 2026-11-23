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
     * Indica si la aplicación está en modo depuración (APP_DEBUG=1 o true).
     * Solo en ese modo se muestran detalles técnicos de los errores.
     */
    public static function isDebug(): bool {
        $value = strtolower(trim((string)getenv('APP_DEBUG')));
        return in_array($value, ['1', 'true', 'on', 'yes'], true);
    }

    /**
     * Aplica las cabeceras HTTP necesarias para habilitar CORS (Cross-Origin Resource Sharing).
     * - Si CORS_ALLOWED_ORIGINS (lista separada por comas) está definida, solo se refleja
     *   el origen de la petición cuando aparece en la lista.
     * - Si la variable no está definida, se permite cualquier origen con "*".
     * No se envía Access-Control-Allow-Credentials: la API usa tokens Bearer, no cookies.
     */
    public static function applyCorsHeaders(): void {
        $configured = getenv('CORS_ALLOWED_ORIGINS');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($configured === false || trim($configured) === '') {
            header("Access-Control-Allow-Origin: *");
        } else {
            $allowed = array_filter(array_map('trim', explode(',', $configured)));
            if (in_array('*', $allowed, true)) {
                header("Access-Control-Allow-Origin: *");
            } elseif ($origin !== '' && in_array($origin, $allowed, true)) {
                header("Access-Control-Allow-Origin: {$origin}");
                header("Vary: Origin");
            }
        }

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
        header("Access-Control-Max-Age: 86400"); // Cache de opciones por 24 horas

        // Cabeceras de seguridad HTTP
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: SAMEORIGIN");
        header("X-XSS-Protection: 1; mode=block");
    }

    /** ¿La petición trae credenciales (cabecera Authorization)? */
    private static function requestHasAuthorization(): bool {
        if (!empty($_SERVER['HTTP_AUTHORIZATION']) || !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return true;
        }
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strcasecmp((string)$name, 'Authorization') === 0 && $value !== '') {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Envía una respuesta HTTP en formato JSON y termina la ejecución del script.
     *
     * @param int $statusCode Código de estado HTTP (200, 201, 400, 404, 500, etc.)
     * @param array $payload Datos a codificar en JSON
     */
    public static function json(int $statusCode, array $payload): void {
        self::applyCorsHeaders();

        // Las respuestas a peticiones con sesión (datos personales de docentes, revisión, contraseñas
        // temporales, token de login) no deben quedar en cachés del navegador ni de proxies.
        if (self::requestHasAuthorization()) {
            $hasCacheControl = false;
            foreach (headers_list() as $line) {
                if (stripos($line, 'Cache-Control:') === 0) { $hasCacheControl = true; break; }
            }
            if (!$hasCacheControl) {
                header('Cache-Control: no-store');
                header('Pragma: no-cache');
            }
        }

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
     * Envía una respuesta de conflicto de estado (HTTP 409 Conflict): la petición es válida
     * pero el recurso no está en un estado que la permita (p. ej. proyecto bloqueado).
     * `errors.codigo[0]` identifica el motivo para el cliente.
     */
    public static function conflict(string $message = 'La operación no es posible en el estado actual del recurso', ?array $errors = null): void {
        self::json(409, [
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
