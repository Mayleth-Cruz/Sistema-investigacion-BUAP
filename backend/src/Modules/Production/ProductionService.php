<?php
namespace App\Modules\Production;

use App\Core\Validator;

/**
 * ============================================================================
 * SERVICIO DE PRODUCCIÓN TÉCNICA (ProductionService)
 * ============================================================================
 * Lógica de negocio para patentes, propiedad intelectual y formación:
 * - Valida tipos válidos: patente, software, tesis_dirigida, ponencia, modelo_utilidad.
 * - Valida campos obligatorios y números de registro.
 */
class ProductionService {
    private ProductionRepository $repository;

    public function __construct() {
        $this->repository = new ProductionRepository();
    }

    public function getAllProduction(?string $tipo = null, ?string $search = null): array {
        return $this->repository->findAll($tipo, $search);
    }

    public function getProductionById(int $id): ?array {
        return $this->repository->findById($id);
    }

    public function createProduction(array $data): array {
        $validator = new Validator();
        $validator
            ->required($data['tipo'] ?? null, 'tipo', 'El tipo de producción técnica es obligatorio.')
            ->required($data['titulo'] ?? null, 'titulo', 'El título o denominación es obligatorio.')
            ->required($data['investigador_id'] ?? null, 'investigador_id', 'Debes seleccionar el investigador responsable.')
            ->numeric($data['investigador_id'] ?? null, 'investigador_id')
            ->required($data['autores'] ?? null, 'autores', 'Los autores o inventores son obligatorios.')
            ->required($data['anio'] ?? null, 'anio', 'El año de registro o sustentación es obligatorio.')
            ->numeric($data['anio'] ?? null, 'anio');

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

    public function updateProduction(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return [
                'success' => false,
                'notFound'=> true,
                'message' => "El registro técnico con ID {$id} no fue encontrado."
            ];
        }

        $validator = new Validator();
        $validator
            ->required($data['tipo'] ?? null, 'tipo')
            ->required($data['titulo'] ?? null, 'titulo')
            ->required($data['investigador_id'] ?? null, 'investigador_id')
            ->numeric($data['investigador_id'] ?? null, 'investigador_id')
            ->required($data['autores'] ?? null, 'autores')
            ->required($data['anio'] ?? null, 'anio')
            ->numeric($data['anio'] ?? null, 'anio');

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

    public function deleteProduction(int $id): bool {
        return $this->repository->delete($id);
    }
}
