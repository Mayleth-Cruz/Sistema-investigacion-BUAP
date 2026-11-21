<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE MONITOREO DEL EJE 3 (MonitoringController) [A]
 * ============================================================================
 * GET /api/eje3/monitoreo -> los 4 indicadores (docentes con proyectos de
 * investigación, docentes con titulación articulada al CIV, profesores en el
 * SNII y profesores elegibles) con su detalle.
 */
class MonitoringController extends Eje3Controller {
    private MonitoringService $service;

    public function __construct() {
        $this->service = new MonitoringService();
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        Response::success($this->service->indicators(), 'Indicadores de monitoreo calculados exitosamente.');
    }
}
