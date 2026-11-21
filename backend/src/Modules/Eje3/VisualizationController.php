<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE VISUALIZACIÓN DEL EJE 3 (VisualizationController) [A]
 * ============================================================================
 * GET /api/eje3/visualizar -> SOLO ADMINISTRADOR: número de publicaciones
 * resultado de eventos y revista PYAD y producción académica de docentes
 * investigadores (vive dentro de la zona de administración, no en el portal).
 */
class VisualizationController extends Eje3Controller {
    private VisualizationService $service;

    public function __construct() {
        $this->service = new VisualizationService();
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return; // requireAdmin ya envió la respuesta 401/403
        }
        Response::success($this->service->overview(), 'Datos de producción académica obtenidos exitosamente.');
    }
}
