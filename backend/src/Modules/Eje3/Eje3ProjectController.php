<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE PROYECTOS DEL EJE 3 (Eje3ProjectController)
 * ============================================================================
 * Todos los endpoints requieren administrador [A].
 * - GET    /api/eje3/proyectos      -> Lista (filtros: tipo, evento_id, estado, search)
 * - GET    /api/eje3/proyectos/:id  -> Detalle con `apartados`
 * - POST   /api/eje3/proyectos      -> Crear (requeridos: titulo, investigador_principal_id, tipo)
 * - PUT    /api/eje3/proyectos/:id  -> Actualizar
 * - DELETE /api/eje3/proyectos/:id  -> Eliminar
 * - GET    /api/eje3/revision               -> Bandeja de proyectos enviados por docentes
 * - POST   /api/eje3/proyectos/:id/revision -> Aprobar o devolver (con comentario) un proyecto enviado
 */
class Eje3ProjectController extends Eje3Controller {
    private Eje3ProjectService $service;

    public function __construct() {
        $this->service = new Eje3ProjectService();
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $filters = [
            'tipo'      => $this->queryString($request, 'tipo'),
            'evento_id' => $this->queryString($request, 'evento_id'),
            'estado'    => $this->queryString($request, 'estado'),
            'registro_estado' => $this->queryString($request, 'registro_estado'),
            'search'    => $this->queryString($request, 'search'),
        ];
        Response::success($this->service->list($filters), 'Proyectos obtenidos exitosamente.');
    }

    public function show(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->get((int)($params['id'] ?? 0)), 'Proyecto cargado correctamente.', 'No fue posible cargar el proyecto.');
    }

    public function store(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->create($request->getBody()), 'Proyecto registrado exitosamente.', 'Error al registrar el proyecto.', true);
    }

    public function update(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->update((int)($params['id'] ?? 0), $request->getBody()), 'Proyecto actualizado correctamente.', 'Error al actualizar el proyecto.');
    }

    public function destroy(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->delete((int)($params['id'] ?? 0)), 'Proyecto eliminado correctamente.', 'No fue posible eliminar el proyecto.');
    }

    public function pending(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        Response::success($this->service->pending(), 'Bandeja de revisión obtenida exitosamente.');
    }

    public function review(Request $request, array $params): void {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return;
        }
        $this->respond($this->service->review((int)($params['id'] ?? 0), $admin, $request->getBody()),
            'Revisión registrada correctamente.', 'No fue posible registrar la revisión.');
    }
}
