<?php
namespace App\Modules\Categories;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\AuthController;

/**
 * ============================================================================
 * CONTROLADOR DE CATEGORÍAS (CategoryController)
 * ============================================================================
 * Endpoints:
 * - GET    /api/categorias         -> Listar categorías (público / administrativo)
 * - GET    /api/categorias/:id     -> Detalle de categoría
 * - POST   /api/categorias         -> Crear categoría (Solo Administrador)
 * - PUT    /api/categorias/:id     -> Actualizar categoría (Solo Administrador)
 * - DELETE /api/categorias/:id     -> Eliminar categoría (Solo Administrador)
 */
class CategoryController {
    private CategoryService $service;

    public function __construct() {
        $this->service = new CategoryService();
    }

    public function index(Request $request): void {
        $filters = [
            'tipo'   => $request->getQuery('tipo'),
            'search' => $request->getQuery('search'),
            'activo' => $request->getQuery('activo')
        ];

        $categories = $this->service->getAll($filters);
        Response::success($categories, 'Categorías recuperadas con éxito.');
    }

    public function show(Request $request, array $params): void {
        $id = (int)($params['id'] ?? 0);
        $category = $this->service->getById($id);

        if (!$category) {
            Response::notFound("Categoría no encontrada.");
            return;
        }

        Response::success($category, 'Categoría obtenida correctamente.');
    }

    public function store(Request $request): void {
        $admin = AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $body = $request->getBody();
        $result = $this->service->create($body);

        if (!$result['success']) {
            Response::badRequest('No se pudo registrar la categoría.', $result['errors']);
            return;
        }

        Response::created($result['data'], 'Categoría creada exitosamente.');
    }

    public function update(Request $request, array $params): void {
        $admin = AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $body = $request->getBody();
        $result = $this->service->update($id, $body);

        if (!empty($result['notFound'])) {
            Response::notFound($result['message']);
            return;
        }

        if (!$result['success']) {
            Response::badRequest('No se pudo actualizar la categoría.', $result['errors']);
            return;
        }

        Response::success($result['data'], 'Categoría actualizada exitosamente.');
    }

    public function destroy(Request $request, array $params): void {
        $admin = AuthController::checkAdmin($request);
        if (!$admin) {
            return;
        }

        $id = (int)($params['id'] ?? 0);
        $deleted = $this->service->delete($id);

        if (!$deleted) {
            Response::notFound("No fue posible eliminar la categoría solicitada.");
            return;
        }

        Response::success(null, 'Categoría eliminada satisfactoriamente.');
    }
}
