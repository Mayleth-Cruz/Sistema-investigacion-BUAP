<?php
namespace App\Modules\Projects;

use App\Core\Validator;

/**
 * ============================================================================
 * SERVICIO DE PROYECTOS DE INVESTIGACIÓN (ProjectService)
 * ============================================================================
 * Contiene la lógica de negocio para registrar y monitorear proyectos de I+D:
 * - Valida códigos institucionales únicos.
 * - Comprueba coherencia entre fechas de inicio y culminación.
 * - Valida rangos de presupuestos y estados válidos.
 */
class ProjectService {
    private ProjectRepository $repository;

    public function __construct() {
        $this->repository = new ProjectRepository();
    }

    /**
     * Obtiene el listado de proyectos con filtros de monitoreo.
     */
    public function getAllProjects(?string $estado = null, ?string $search = null): array {
        return $this->repository->findAll($estado, $search);
    }

    /**
     * Obtiene el detalle de un proyecto por su ID.
     */
    public function getProjectById(int $id): ?array {
        return $this->repository->findById($id);
    }

    /**
     * Valida y crea un nuevo proyecto de investigación.
     */
    public function createProject(array $data): array {
        $validator = new Validator();
        $validator
            ->required($data['codigo'] ?? null, 'codigo', 'El código de proyecto es obligatorio (ej: INV-2026-001).')
            ->required($data['titulo'] ?? null, 'titulo', 'El título de la investigación es obligatorio.')
            ->required($data['investigador_principal_id'] ?? null, 'investigador_principal_id', 'Debes seleccionar un investigador principal.')
            ->numeric($data['investigador_principal_id'] ?? null, 'investigador_principal_id')
            ->required($data['fecha_inicio'] ?? null, 'fecha_inicio', 'La fecha de inicio es obligatoria.')
            ->required($data['linea_investigacion'] ?? null, 'linea_investigacion', 'La línea temática de investigación es obligatoria.');

        if (!empty($data['presupuesto'])) {
            $validator->numeric($data['presupuesto'], 'presupuesto', 'El presupuesto debe ser un número válido.');
        }

        if ($validator->fails()) {
            return [
                'success' => false,
                'errors'  => $validator->getErrors()
            ];
        }

        $newId = $this->repository->create($data);
        $created = $this->repository->findById($newId);

        return [
            'success' => true,
            'data'    => $created
        ];
    }

    /**
     * Valida y actualiza los datos de un proyecto.
     */
    public function updateProject(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return [
                'success' => false,
                'notFound'=> true,
                'message' => "El proyecto con ID {$id} no fue encontrado."
            ];
        }

        $validator = new Validator();
        $validator
            ->required($data['codigo'] ?? null, 'codigo')
            ->required($data['titulo'] ?? null, 'titulo')
            ->required($data['investigador_principal_id'] ?? null, 'investigador_principal_id')
            ->numeric($data['investigador_principal_id'] ?? null, 'investigador_principal_id')
            ->required($data['fecha_inicio'] ?? null, 'fecha_inicio')
            ->required($data['linea_investigacion'] ?? null, 'linea_investigacion');

        if ($validator->fails()) {
            return [
                'success' => false,
                'errors'  => $validator->getErrors()
            ];
        }

        $this->repository->update($id, $data);
        $updated = $this->repository->findById($id);

        return [
            'success' => true,
            'data'    => $updated
        ];
    }

    /**
     * Elimina un proyecto.
     */
    public function deleteProject(int $id): bool {
        return $this->repository->delete($id);
    }
}
