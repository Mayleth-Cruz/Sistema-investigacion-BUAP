<?php
namespace App\Modules\Dissemination;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE DIFUSIÓN CIENTÍFICA (DisseminationController)
 * ============================================================================
 * Endpoints públicos para divulgación:
 * - GET /api/difusion/buscar?q=termino  -> Búsqueda global en el repositorio
 * - GET /api/difusion/perfil/:id       -> Perfil público del investigador
 * - GET /api/difusion/bibtex/:id       -> Exportación de cita en formato BibTeX
 */
class DisseminationController {
    private DisseminationService $service;

    public function __construct() {
        $this->service = new DisseminationService();
    }

    /**
     * Búsqueda general en el catálogo institucional.
     */
    public function search(Request $request): void {
        $query = trim((string)$request->getQuery('q', ''));

        if (empty($query)) {
            Response::badRequest("Debes proporcionar un término de búsqueda en el parámetro 'q'.");
            return;
        }

        $results = $this->service->search($query);
        Response::success($results, "Resultados de búsqueda para '{$query}'.");
    }

    /**
     * Perfil público consolidado del investigador.
     */
    public function profile(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $profile = $this->service->getResearcherProfile($id);

        if (!$profile) {
            Response::notFound("Perfil de investigador con ID {$id} no encontrado.");
            return;
        }

        Response::success($profile, 'Perfil público cargado exitosamente.');
    }

    /**
     * Descarga / visualización de la cita académica en formato BibTeX.
     */
    public function bibtex(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $bibtexString = $this->service->generateBibTeX($id);

        if (!$bibtexString) {
            Response::notFound("Publicación con ID {$id} no encontrada para generar BibTeX.");
            return;
        }

        Response::success([
            'id'     => $id,
            'bibtex' => $bibtexString
        ], 'Cita BibTeX generada exitosamente.');
    }
}
