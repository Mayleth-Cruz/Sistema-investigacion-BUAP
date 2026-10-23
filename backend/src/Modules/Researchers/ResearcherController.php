<?php
namespace App\Modules\Researchers;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE INVESTIGADORES (ResearcherController)
 * ============================================================================
 * Este controlador procesa las peticiones HTTP dirigidas al recurso /api/investigadores:
 * - GET    /api/investigadores        -> Listado general con opción de búsqueda
 * - GET    /api/investigadores/:id    -> Obtener información detallada por ID
 * - POST   /api/investigadores        -> Registrar un nuevo investigador
 * - PUT    /api/investigadores/:id    -> Modificar datos de un investigador
 * - DELETE /api/investigadores/:id    -> Eliminar un registro
 */
class ResearcherController {
    private ResearcherService $service;

    public function __construct() {
        $this->service = new ResearcherService();
    }

    /**
     * Lista todos los investigadores.
     * Permite filtrar mediante el parámetro query ?search=termino
     */
    public function index(Request $request): void {
        $search = $request->getQuery('search');
        $researchers = $this->service->getAllResearchers($search);

        Response::success($researchers, 'Listado de investigadores obtenido con éxito.');
    }

    /**
     * Obtiene el perfil completo de un investigador por su identificador numérico.
     */
    public function show(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $researcher = $this->service->getResearcherById($id);

        if (!$researcher) {
            Response::notFound("El investigador con ID {$id} no fue encontrado.");
            return;
        }

        Response::success($researcher, 'Detalles del investigador obtenidos exitosamente.');
    }

    /**
     * Registra un nuevo investigador a partir del cuerpo JSON enviado por React.
     */
    public function store(Request $request): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $body = $request->getBody();
        $result = $this->service->createResearcher($body);

        if (!$result['success']) {
            Response::badRequest('No fue posible registrar al investigador. Corrige los datos.', $result['errors']);
            return;
        }

        Response::created($result['data'], 'Investigador registrado exitosamente en el sistema.');
    }

    /**
     * Actualiza la información de un investigador existente.
     */
    public function update(Request $request, array $params): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $body = $request->getBody();

        $result = $this->service->updateResearcher($id, $body);

        if (!empty($result['notFound'])) {
            Response::notFound($result['message']);
            return;
        }

        if (!$result['success']) {
            Response::badRequest('Error al actualizar investigador.', $result['errors']);
            return;
        }

        Response::success($result['data'], 'Datos del investigador actualizados correctamente.');
    }

    /**
     * Elimina a un investigador del sistema.
     */
    public function destroy(Request $request, array $params): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $deleted = $this->service->deleteResearcher($id);

        if (!$deleted) {
            Response::notFound("No se pudo eliminar el investigador. Verifica si tiene publicaciones asociadas.");
            return;
        }

        Response::success(null, 'Investigador eliminado satisfactoriamente.');
    }
}
