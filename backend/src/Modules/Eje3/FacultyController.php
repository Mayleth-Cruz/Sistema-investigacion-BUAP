<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE DOCENTES / SNII (FacultyController) [A]
 * ============================================================================
 * - GET /api/eje3/docentes           -> Lista (filtros: search, snii = todos|en_snii|elegibles|sin)
 * - PUT /api/eje3/docentes/:id/snii  -> Edita nivel SNII y marca de elegibilidad
 */
class FacultyController extends Eje3Controller {
    private FacultyService $service;

    public function __construct() {
        $this->service = new FacultyService();
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $rows = $this->service->list($this->queryString($request, 'search'), $this->queryString($request, 'snii'));
        Response::success($rows, 'Docentes obtenidos exitosamente.');
    }

    public function updateSnii(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $result = $this->service->updateSnii((int)($params['id'] ?? 0), $request->getBody());
        $this->respond($result, 'Marca SNII actualizada correctamente.', 'Error al actualizar la marca SNII.');
    }
}
