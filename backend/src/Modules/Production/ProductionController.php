<?php
namespace App\Modules\Production;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE PRODUCCIÓN TÉCNICA (ProductionController)
 * ============================================================================
 * Endpoints:
 * - GET    /api/produccion            -> Lista de patentes, tesis, software y ponencias
 * - GET    /api/produccion/:id        -> Detalle por ID
 * - POST   /api/produccion            -> Crear registro
 * - PUT    /api/produccion/:id        -> Actualizar registro
 * - DELETE /api/produccion/:id        -> Eliminar registro
 */
class ProductionController {
    private ProductionService $service;

    public function __construct() {
        $this->service = new ProductionService();
    }

    public function index(Request $request): void {
        $tipo = $request->getQuery('tipo');
        $search = $request->getQuery('search');

        $items = $this->service->getAllProduction($tipo, $search);
        Response::success($items, 'Producción técnica recuperada con éxito.');
    }

    public function show(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $item = $this->service->getProductionById($id);

        if (!$item) {
            Response::notFound("Registro de producción con ID {$id} no encontrado.");
            return;
        }

        Response::success($item, 'Registro recuperado exitosamente.');
    }

    public function store(Request $request): void {
        $body = $request->getBody();
        $result = $this->service->createProduction($body);

        if (!$result['success']) {
            Response::badRequest('Error al registrar la producción técnica.', $result['errors']);
            return;
        }

        Response::created($result['data'], 'Producción técnica registrada con éxito.');
    }

    public function update(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = $request->getBody();

        $result = $this->service->updateProduction($id, $body);

        if (!empty($result['notFound'])) {
            Response::notFound($result['message']);
            return;
        }

        if (!$result['success']) {
            Response::badRequest('Error al actualizar registro técnico.', $result['errors']);
            return;
        }

        Response::success($result['data'], 'Registro técnico actualizado exitosamente.');
    }

    public function destroy(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $deleted = $this->service->deleteProduction($id);

        if (!$deleted) {
            Response::notFound("No se pudo eliminar el registro especificado.");
            return;
        }

        Response::success(null, 'Registro técnico eliminado exitosamente.');
    }
}
