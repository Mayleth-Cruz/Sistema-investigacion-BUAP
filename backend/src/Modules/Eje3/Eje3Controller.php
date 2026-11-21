<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\AuthController;

/**
 * ============================================================================
 * CONTROLADOR BASE DEL EJE 3 (Eje3Controller)
 * ============================================================================
 * Reúne la lógica común a los controladores del Eje 3:
 * - Exigir sesión de administrador ([A]) o detectarla de forma opcional ([P*]).
 * - Traducir el resultado estándar de un servicio
 *   ['success','errors','data','notFound','message'] a la respuesta HTTP.
 */
abstract class Eje3Controller {
    /**
     * Exige un administrador autenticado. Si falla, checkAdmin() ya envió la
     * respuesta 401/403 y aquí se devuelve null para detener el flujo.
     */
    protected function requireAdmin(Request $request): ?array {
        return AuthController::checkAdmin($request);
    }

    /**
     * Devuelve el administrador de la sesión (o null) sin enviar respuesta.
     */
    protected function optionalAdmin(Request $request): ?array {
        return AuthController::optionalAdmin($request);
    }

    /**
     * Parámetro de consulta como texto, o null si falta o no es escalar
     * (p. ej. ?search[]=x llega como arreglo y no debe provocar errores 500).
     */
    protected function queryString(Request $request, string $key): ?string {
        $value = $request->getQuery($key);
        return is_scalar($value) ? (string)$value : null;
    }

    /**
     * Envía la respuesta HTTP correspondiente al resultado de un servicio.
     *
     * @param array  $result      Resultado del servicio (['conflict' => true] responde 409)
     * @param string $okMessage   Mensaje de éxito
     * @param string $failMessage Mensaje cuando hay errores de validación (400)
     * @param bool   $created     true para responder 201 en vez de 200
     */
    protected function respond(array $result, string $okMessage, string $failMessage, bool $created = false): void {
        if (!empty($result['notFound'])) {
            Response::notFound($result['message'] ?? 'El recurso solicitado no fue encontrado');
            return;
        }

        if (!empty($result['conflict'])) {
            Response::conflict($result['message'] ?? 'La operación no es posible en el estado actual del recurso', $result['errors'] ?? null);
            return;
        }

        if (empty($result['success'])) {
            Response::badRequest($result['message'] ?? $failMessage, $result['errors'] ?? null);
            return;
        }

        if ($created) {
            Response::created($result['data'] ?? null, $okMessage);
            return;
        }

        Response::success($result['data'] ?? null, $okMessage);
    }
}
