<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR BASE DE CATÁLOGOS CRUD (RegistryController)
 * ============================================================================
 * Implementa list/show/store/update/destroy [A] para un recurso definido en
 * RegistryConfig. Cada catálogo concreto solo indica su recurso:
 *  - ParticipantController  -> /api/eje3/participantes
 *  - SocialReturnController -> /api/eje3/retribucion-social
 *  - GraduateController     -> /api/eje3/egresados
 */
abstract class RegistryController extends Eje3Controller {
    protected RegistryService $service;

    /** Clave del recurso en RegistryConfig. */
    abstract protected function resource(): string;

    public function __construct() {
        $this->service = new RegistryService($this->resource());
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        Response::success($this->service->list(array_filter($request->getAllQueries(), 'is_scalar')), 'Registros obtenidos exitosamente.');
    }

    public function show(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->get((int)($params['id'] ?? 0)), 'Registro cargado correctamente.', 'No fue posible cargar el registro.');
    }

    public function store(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->create($request->getBody()), 'Registro creado exitosamente.', 'Error al registrar los datos.', true);
    }

    public function update(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->update((int)($params['id'] ?? 0), $request->getBody()), 'Registro actualizado correctamente.', 'Error al actualizar el registro.');
    }

    public function destroy(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->delete((int)($params['id'] ?? 0)), 'Registro eliminado correctamente.', 'No fue posible eliminar el registro.');
    }
}
