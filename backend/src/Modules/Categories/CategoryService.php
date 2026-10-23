<?php
namespace App\Modules\Categories;

use App\Core\Validator;

/**
 * ============================================================================
 * SERVICIO DE CATEGORÍAS (CategoryService)
 * ============================================================================
 * Lógica de negocio para administración de categorías:
 * - Valida unicidad de nombres.
 * - Asigna códigos normalizados automáticamente si no se especifican.
 * - Soporta áreas del conocimiento y géneros de publicación.
 */
class CategoryService {
    private CategoryRepository $repository;

    public function __construct() {
        $this->repository = new CategoryRepository();
    }

    public function getAll(array $filters = []): array {
        return $this->repository->findAll($filters);
    }

    public function getById(int $id): ?array {
        return $this->repository->findById($id);
    }

    public function create(array $data): array {
        $validator = new Validator();
        $validator
            ->required($data['nombre'] ?? null, 'nombre', 'El nombre de la categoría es obligatorio.');

        if ($validator->fails()) {
            return ['success' => false, 'errors' => $validator->getErrors()];
        }

        // Verificar unicidad de nombre
        $existing = $this->repository->findByName($data['nombre']);
        if ($existing) {
            return [
                'success' => false,
                'errors'  => ['nombre' => ["Ya existe una categoría registrada con el nombre '{$data['nombre']}'."]]
            ];
        }

        if (empty($data['codigo'])) {
            $data['codigo'] = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $data['nombre']), 0, 15)) . '_' . rand(100, 999);
        }

        if (empty($data['tipo'])) {
            $data['tipo'] = 'area_conocimiento';
        }

        if (empty($data['color'])) {
            $data['color'] = '#003B5C';
        }

        if (empty($data['icono'])) {
            $data['icono'] = $data['tipo'] === 'genero_publicacion' ? '📄' : '⚙️';
        }

        $id = $this->repository->create($data);
        $created = $this->repository->findById($id);

        return [
            'success' => true,
            'data'    => $created
        ];
    }

    public function update(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return ['success' => false, 'notFound' => true, 'message' => "Categoría no encontrada."];
        }

        $validator = new Validator();
        $validator->required($data['nombre'] ?? null, 'nombre', 'El nombre de la categoría es obligatorio.');

        if ($validator->fails()) {
            return ['success' => false, 'errors' => $validator->getErrors()];
        }

        // Verificar que no duplique a otra existente
        $duplicate = $this->repository->findByName($data['nombre'], $id);
        if ($duplicate) {
            return [
                'success' => false,
                'errors'  => ['nombre' => ["Ya existe otra categoría registrada con el nombre '{$data['nombre']}'."]]
            ];
        }

        $data['codigo'] = !empty($data['codigo']) ? $data['codigo'] : $existing['codigo'];
        $data['tipo'] = !empty($data['tipo']) ? $data['tipo'] : $existing['tipo'];
        $data['descripcion'] = $data['descripcion'] ?? $existing['descripcion'];
        $data['color'] = !empty($data['color']) ? $data['color'] : $existing['color'];
        $data['icono'] = !empty($data['icono']) ? $data['icono'] : $existing['icono'];
        $data['activo'] = isset($data['activo']) ? (int)$data['activo'] : ($existing['activo'] ?? 1);

        $this->repository->update($id, $data);
        $updated = $this->repository->findById($id);

        return [
            'success' => true,
            'data'    => $updated
        ];
    }

    public function delete(int $id): bool {
        return $this->repository->delete($id);
    }
}
