<?php
namespace App\Modules\Eje3;

use App\Core\Database;

/**
 * ============================================================================
 * SERVICIO GENÉRICO DE CATÁLOGOS (RegistryService)
 * ============================================================================
 * Validación y lógica de negocio común a participantes de evento, retribución
 * social y actividades de egresados. Los campos, enums y filtros salen de
 * RegistryConfig; la validación la hace Eje3Fields.
 */
class RegistryService {
    private array $config;
    private RegistryRepository $repository;

    public function __construct(string $resource) {
        $this->config = RegistryConfig::get($resource) ?? throw new \InvalidArgumentException("Recurso desconocido: {$resource}");
        $this->repository = new RegistryRepository($this->config);
    }

    public function list(array $query): array {
        return $this->repository->findAll($query);
    }

    public function get(int $id): array {
        $row = $this->repository->findById($id);
        return $row ? ['success' => true, 'data' => $row] : $this->notFound($id);
    }

    public function create(array $data): array {
        [$clean, $errors] = Eje3Fields::process($this->config['fields'], $data, [], Database::getConnection());
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }
        $id = $this->repository->create($clean);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }

    public function update(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return $this->notFound($id);
        }
        [$clean, $errors] = Eje3Fields::process($this->config['fields'], $data, $existing, Database::getConnection());
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }
        $this->repository->update($id, $clean);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }

    public function delete(int $id): array {
        if (!$this->repository->findById($id)) {
            return $this->notFound($id);
        }
        $this->repository->delete($id);
        return ['success' => true, 'data' => null];
    }

    private function notFound(int $id): array {
        return ['success' => false, 'notFound' => true, 'message' => "El {$this->config['singular']} con ID {$id} no fue encontrado."];
    }
}
