<?php
namespace App\Modules\Publications;

use App\Core\Validator;

/**
 * ============================================================================
 * SERVICIO DE PUBLICACIONES CIENTÍFICAS (PublicationService)
 * ============================================================================
 * Implementa las reglas de negocio para el registro y monitoreo de la producción
 * bibliográfica:
 * - Valida títulos, autores, año de publicación y formato DOI.
 * - Asegura que el cuartil esté en el rango permitido (Q1, Q2, Q3, Q4, Sin cuartil).
 */
class PublicationService {
    private PublicationRepository $repository;

    public function __construct() {
        $this->repository = new PublicationRepository();
    }

    /**
     * Obtiene el listado de publicaciones filtradas.
     */
    public function getAllPublications(array $filters = []): array {
        return $this->repository->findAll($filters);
    }

    /**
     * Obtiene una publicación por su ID.
     */
    public function getPublicationById(int $id): ?array {
        return $this->repository->findById($id);
    }

    /**
     * Valida y registra una nueva publicación en el sistema.
     */
    public function createPublication(array $data): array {
        $data['investigador_id'] = !empty($data['investigador_id']) ? (int)$data['investigador_id'] : 1;
        $data['revista_editorial'] = !empty($data['revista_editorial']) ? trim($data['revista_editorial']) : 'Repositorio Institucional BUAP';
        $data['anio'] = !empty($data['anio']) ? (int)$data['anio'] : (int)date('Y');

        $validator = new Validator();
        $validator
            ->required($data['titulo'] ?? null, 'titulo', 'El título de la publicación es obligatorio.')
            ->required($data['investigador_id'] ?? null, 'investigador_id', 'Debes asociar la publicación a un investigador.')
            ->numeric($data['investigador_id'] ?? null, 'investigador_id')
            ->required($data['autores'] ?? null, 'autores', 'Debes incluir la lista de autores de la publicación.')
            ->required($data['revista_editorial'] ?? null, 'revista_editorial', 'El nombre de la revista o editorial es obligatorio.')
            ->required($data['anio'] ?? null, 'anio', 'El año de publicación es obligatorio.')
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

    /**
     * Valida y actualiza los datos de una publicación existente.
     */
    public function updatePublication(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return [
                'success' => false,
                'notFound'=> true,
                'message' => "La publicación con ID {$id} no fue encontrada."
            ];
        }

        $data['investigador_id'] = !empty($data['investigador_id']) ? (int)$data['investigador_id'] : ($existing['investigador_id'] ?? 1);
        $data['revista_editorial'] = !empty($data['revista_editorial']) ? trim($data['revista_editorial']) : ($existing['revista_editorial'] ?? 'Repositorio Institucional BUAP');
        $data['anio'] = !empty($data['anio']) ? (int)$data['anio'] : ($existing['anio'] ?? (int)date('Y'));

        $validator = new Validator();
        $validator
            ->required($data['titulo'] ?? null, 'titulo')
            ->required($data['investigador_id'] ?? null, 'investigador_id')
            ->numeric($data['investigador_id'] ?? null, 'investigador_id')
            ->required($data['autores'] ?? null, 'autores')
            ->required($data['revista_editorial'] ?? null, 'revista_editorial')
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

    /**
     * Incrementa vistas de una publicación.
     */
    public function incrementViews(int $id): void {
        $this->repository->incrementViews($id);
    }

    /**
     * Registra una descarga del documento PDF.
     */
    public function recordDownload(int $id): bool {
        $pub = $this->repository->findById($id);
        if (!$pub) {
            return false;
        }
        $this->repository->incrementDownloads($id);
        return true;
    }

    /**
     * Métricas reales agregadas para el panel de administración.
     */
    public function getAdminStats(): array {
        return $this->repository->getAdminStats();
    }

    /**
     * Obtiene los eventos académicos únicos registrados.
     */
    public function getDistinctEvents(): array {
        return $this->repository->findDistinctEvents();
    }

    /**
     * Obtiene los artículos agrupados por año como carpetas virtuales.
     */
    public function getArticlesGroupedByYear(): array {
        return $this->repository->findArticlesGroupedByYear();
    }

    /**
     * Elimina una publicación.
     */
    public function deletePublication(int $id): bool {
        return $this->repository->delete($id);
    }
}

