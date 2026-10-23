<?php
namespace App\Modules\Projects;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE PROYECTOS (ProjectController)
 * ============================================================================
 * Endpoints:
 * - GET    /api/proyectos         -> Lista con filtros por estado o búsqueda
 * - GET    /api/proyectos/:id     -> Detalle de proyecto
 * - POST   /api/proyectos         -> Crear proyecto
 * - PUT    /api/proyectos/:id     -> Actualizar proyecto
 * - DELETE /api/proyectos/:id     -> Eliminar proyecto
 */
class ProjectController {
    private ProjectService $service;

    public function __construct() {
        $this->service = new ProjectService();
    }

    /**
     * Lista todos los proyectos con filtros de monitoreo.
     */
    public function index(Request $request): void {
        $estado = $request->getQuery('estado');
        $search = $request->getQuery('search');

        $projects = $this->service->getAllProjects($estado, $search);
        Response::success($projects, 'Proyectos obtenidos exitosamente.');
    }

    /**
     * Muestra la información de un proyecto.
     */
    public function show(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $project = $this->service->getProjectById($id);

        if (!$project) {
            Response::notFound("El proyecto con ID {$id} no fue encontrado.");
            return;
        }

        Response::success($project, 'Proyecto cargado correctamente.');
    }

    /**
     * Crea un nuevo proyecto de investigación.
     */
    public function store(Request $request): void {
        $body = $request->getBody();
        $result = $this->service->createProject($body);

        if (!$result['success']) {
            Response::badRequest('Error al registrar el proyecto de investigación.', $result['errors']);
            return;
        }

        Response::created($result['data'], 'Proyecto registrado exitosamente.');
    }

    /**
     * Actualiza un proyecto existente.
     */
    public function update(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = $request->getBody();

        $result = $this->service->updateProject($id, $body);

        if (!empty($result['notFound'])) {
            Response::notFound($result['message']);
            return;
        }

        if (!$result['success']) {
            Response::badRequest('Error al actualizar el proyecto.', $result['errors']);
            return;
        }

        Response::success($result['data'], 'Proyecto actualizado correctamente.');
    }

    /**
     * Elimina un proyecto.
     */
    public function destroy(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $deleted = $this->service->deleteProject($id);

        if (!$deleted) {
            Response::notFound("No fue posible eliminar el proyecto. Puede que tenga publicaciones vinculadas.");
            return;
        }

        Response::success(null, 'Proyecto eliminado correctamente.');
    }
}
