<?php
namespace App\Modules\Publications;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE PUBLICACIONES (PublicationController)
 * ============================================================================
 * Endpoints:
 * - GET    /api/publicaciones         -> Lista con filtros por cuartil, año, indexación, etc.
 * - GET    /api/publicaciones/:id     -> Detalle de publicación
 * - POST   /api/publicaciones         -> Crear publicación
 * - PUT    /api/publicaciones/:id     -> Actualizar publicación
 * - DELETE /api/publicaciones/:id     -> Eliminar publicación
 */
class PublicationController {
    private PublicationService $service;

    public function __construct() {
        $this->service = new PublicationService();
    }

    /**
     * Lista todas las publicaciones aplicando filtros recibidos por Query String.
     */
    public function index(Request $request): void {
        $filters = [
            'cuartil'           => $request->getQuery('cuartil'),
            'anio'              => $request->getQuery('anio'),
            'indexacion'        => $request->getQuery('indexacion'),
            'tipo'              => $request->getQuery('tipo'),
            'investigador_id'   => $request->getQuery('investigador_id'),
            'search'            => $request->getQuery('search'),
            'area_conocimiento' => $request->getQuery('area_conocimiento'),
            'categoria'         => $request->getQuery('categoria'),
            'evento'            => $request->getQuery('evento'),
            'autor'             => $request->getQuery('autor'),
            'estado'            => $request->getQuery('estado'),
            'include_drafts'    => $request->getQuery('include_drafts')
        ];

        $publications = $this->service->getAllPublications($filters);
        Response::success($publications, 'Publicaciones recuperadas con éxito.');
    }

    /**
     * Lista todos los eventos académicos y congresos registrados en el repositorio.
     */
    public function events(Request $request): void {
        $events = $this->service->getDistinctEvents();
        Response::success($events, 'Eventos académicos recuperados exitosamente.');
    }

    /**
     * Retorna los artículos organizados en carpetas virtuales por año.
     */
    public function folders(Request $request): void {
        $folders = $this->service->getArticlesGroupedByYear();
        Response::success($folders, 'Carpetas de artículos por año recuperadas con éxito.');
    }

    /**
     * Detalle de una publicación.
     */
    public function show(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $publication = $this->service->getPublicationById($id);

        if (!$publication) {
            Response::notFound("La publicación con ID {$id} no fue encontrada.");
            return;
        }

        Response::success($publication, 'Publicación cargada exitosamente.');
    }

    /**
     * Registra explícitamente una visualización de la publicación en BD.
     */
    public function recordView(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $publication = $this->service->getPublicationById($id);

        if (!$publication) {
            Response::notFound("La publicación con ID {$id} no fue encontrada.");
            return;
        }

        $this->service->incrementViews($id);
        $newViews = ((int)($publication['vistas'] ?? 0)) + 1;

        Response::success([
            'id' => $id, 
            'vistas' => $newViews
        ], 'Visualización registrada correctamente en la base de datos.');
    }

    /**
     * Registra una descarga del documento PDF asociado.
     */
    public function recordDownload(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $publication = $this->service->getPublicationById($id);

        if (!$publication) {
            Response::notFound("No fue posible registrar la descarga del documento.");
            return;
        }

        $this->service->recordDownload($id);
        $newDownloads = ((int)($publication['descargas'] ?? 0)) + 1;

        Response::success([
            'id' => $id, 
            'descargas' => $newDownloads
        ], 'Descarga registrada correctamente en la base de datos.');
    }

    /**
     * Devuelve las estadísticas agregadas del repositorio calculadas directamente en BD.
     * Protegido estrictamente para administradores.
     */
    public function adminStats(Request $request): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $stats = $this->service->getAdminStats();
        Response::success($stats, 'Estadísticas agregadas recuperadas con éxito.');
    }

    /**
     * Registra una nueva publicación científica.
     */
    public function store(Request $request): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $body = $request->getBody();
        $result = $this->service->createPublication($body);

        if (!$result['success']) {
            Response::badRequest('Error al registrar la publicación.', $result['errors']);
            return;
        }

        Response::created($result['data'], 'Publicación registrada exitosamente.');
    }

    /**
     * Actualiza una publicación existente.
     */
    public function update(Request $request, array $params): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $body = $request->getBody();

        $result = $this->service->updatePublication($id, $body);

        if (!empty($result['notFound'])) {
            Response::notFound($result['message']);
            return;
        }

        if (!$result['success']) {
            Response::badRequest('Error al actualizar la publicación.', $result['errors']);
            return;
        }

        Response::success($result['data'], 'Publicación actualizada exitosamente.');
    }

    /**
     * Elimina una publicación.
     */
    public function destroy(Request $request, array $params): void {
        $admin = \App\Modules\Auth\AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $deleted = $this->service->deletePublication($id);

        if (!$deleted) {
            Response::notFound("No fue posible eliminar la publicación solicitada.");
            return;
        }

        Response::success(null, 'Publicación eliminada correctamente.');
    }
}
