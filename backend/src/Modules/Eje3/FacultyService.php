<?php
namespace App\Modules\Eje3;

/**
 * ============================================================================
 * SERVICIO DE DOCENTES Y SNII (FacultyService)
 * ============================================================================
 * Consulta de docentes y edición de su marca SNII: nivel
 * (null | Candidato | I | II | III) y elegibilidad (marca manual del administrador).
 */
class FacultyService {
    public const NIVELES = ['Candidato', 'I', 'II', 'III'];
    public const FILTROS_SNII = ['todos', 'en_snii', 'elegibles', 'sin'];

    private FacultyRepository $repository;

    public function __construct() {
        $this->repository = new FacultyRepository();
    }

    public function list(?string $search, ?string $snii): array {
        $snii = in_array($snii, self::FILTROS_SNII, true) ? $snii : 'todos';
        return $this->repository->findAll($search, $snii);
    }

    /**
     * Valida y guarda la marca SNII. Acepta cuerpos parciales, pero exige al menos
     * uno de los dos campos.
     */
    public function updateSnii(int $id, array $data): array {
        if (!$this->repository->findById($id)) {
            return ['success' => false, 'notFound' => true, 'message' => "El docente con ID {$id} no fue encontrado."];
        }

        $errors = [];
        $fields = [];

        if (!array_key_exists('snii_nivel', $data) && !array_key_exists('snii_elegible', $data)) {
            $errors['snii_nivel'][] = "Debes enviar 'snii_nivel' y/o 'snii_elegible'.";
        }

        if (array_key_exists('snii_nivel', $data)) {
            $nivel = is_string($data['snii_nivel']) ? trim($data['snii_nivel']) : $data['snii_nivel'];
            if ($nivel === null || $nivel === '') {
                $fields['snii_nivel'] = null;
            } elseif (is_string($nivel) && in_array($nivel, self::NIVELES, true)) {
                $fields['snii_nivel'] = $nivel;
            } else {
                $errors['snii_nivel'][] = "El nivel SNII debe ser vacío o uno de: " . implode(', ', self::NIVELES) . '.';
            }
        }

        if (array_key_exists('snii_elegible', $data)) {
            $bool = Eje3Fields::toBool($data['snii_elegible']);
            if ($bool === null) {
                $errors['snii_elegible'][] = "El campo 'snii_elegible' debe ser verdadero o falso (1 o 0).";
            } else {
                $fields['snii_elegible'] = $bool;
            }
        }

        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $this->repository->updateSnii($id, $fields);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }
}
