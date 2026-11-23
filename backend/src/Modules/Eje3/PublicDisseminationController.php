<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE DIFUSIÓN PÚBLICA DEL EJE 3 (PublicDisseminationController) [P]
 * ============================================================================
 * - GET /api/eje3/difusion                -> semilleros, congreso, otros_eventos y próximos
 * - GET /api/eje3/difusion/eventos/:id    -> detalle de un evento público
 */
class PublicDisseminationController extends Eje3Controller {
    private PublicDisseminationService $service;

    public function __construct() {
        $this->service = new PublicDisseminationService();
    }

    public function index(Request $request): void {
        Response::success($this->service->overview(), 'Datos de difusión obtenidos exitosamente.');
    }

    public function showEvent(Request $request, array $params): void {
        $this->respond(
            $this->service->eventDetail((int)($params['id'] ?? 0)),
            'Evento cargado correctamente.',
            'No fue posible cargar el evento.'
        );
    }
}
