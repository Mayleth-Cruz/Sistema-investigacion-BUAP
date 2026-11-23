<?php
namespace App\Modules\Eje3;

use App\Core\Database;

/**
 * ============================================================================
 * SERVICIO DE PROYECTOS DEL EJE 3 (Eje3ProjectService)
 * ============================================================================
 * Proyectos de investigación, de semilleros y de titulación (articulados o no
 * al CIV). Valida los datos, genera códigos únicos (INV-/SEM-/TIT-AAAA-NNN) y
 * gestiona los apartados anexos del proyecto (se reemplazan por completo
 * cuando el cuerpo incluye `apartados`).
 */
class Eje3ProjectService {
    public const TIPOS = ['investigacion', 'semillero', 'titulacion'];
    public const ESTADOS = ['propuesta', 'en_ejecucion', 'completado', 'suspendido'];
    protected const MAX_APARTADOS = 100;
    private const PREFIJOS = ['investigacion' => 'INV', 'semillero' => 'SEM', 'titulacion' => 'TIT'];

    protected Eje3ProjectRepository $repository;

    public function __construct() {
        $this->repository = new Eje3ProjectRepository();
    }

    /**
     * Especificación de campos del proyecto.
     */
    protected function spec(): array {
        return [
            'codigo'                    => ['type' => 'string', 'max' => 50],
            'titulo'                    => ['type' => 'string', 'required' => true, 'max' => 255, 'label' => 'titulo',
                                            'required_message' => 'El título del proyecto es obligatorio.'],
            'resumen'                   => ['type' => 'text'],
            'investigador_principal_id' => ['type' => 'fk', 'table' => 'investigadores', 'required' => true,
                                            'label' => 'investigador_principal_id',
                                            'required_message' => 'Debes seleccionar un investigador principal.',
                                            'missing_message' => 'El investigador principal indicado no existe.'],
            'co_investigadores'         => ['type' => 'text'],
            'estado'                    => ['type' => 'enum', 'values' => self::ESTADOS, 'default' => 'en_ejecucion', 'required' => true],
            'fecha_inicio'              => ['type' => 'date', 'default' => date('Y-m-d'), 'required' => true],
            'fecha_fin'                 => ['type' => 'date'],
            'presupuesto'               => ['type' => 'decimal', 'min' => 0, 'default' => 0],
            'entidad_financiadora'      => ['type' => 'string', 'max' => 150, 'default' => 'Fondos Internos Institucionales'],
            'linea_investigacion'       => ['type' => 'string', 'max' => 150, 'default' => 'General', 'required' => true],
            'tipo'                      => ['type' => 'enum', 'values' => self::TIPOS, 'required' => true,
                                            'required_message' => 'El tipo de proyecto es obligatorio.'],
            'evento_id'                 => ['type' => 'fk', 'table' => 'eventos_investigacion',
                                            'missing_message' => 'El evento indicado no existe.'],
            'articulado_civ'            => ['type' => 'bool', 'default' => 0],
        ];
    }

    public function list(array $filters): array {
        return $this->repository->findAll($filters);
    }

    public function get(int $id): array {
        $project = $this->repository->findDetail($id);
        if (!$project) {
            return $this->notFound($id);
        }
        return ['success' => true, 'data' => $project];
    }

    /**
     * Valida y crea un proyecto (con apartados opcionales).
     */
    public function create(array $data): array {
        [$clean, $errors] = Eje3Fields::process($this->spec(), $data, [], Database::getConnection());
        $errors = $this->checkDates($clean, $errors);
        [$sections, $errors] = $this->parseSections($data, $errors);

        if (empty($errors['codigo'])) {
            if (empty($clean['codigo'])) {
                if (!empty($clean['tipo']) && empty($errors['tipo'])) {
                    $clean['codigo'] = $this->generateCode($clean['tipo'], $clean['fecha_inicio'] ?? null);
                }
            } elseif ($this->repository->codeExists($clean['codigo'])) {
                $errors['codigo'][] = "El código '{$clean['codigo']}' ya está registrado en otro proyecto.";
            }
        }

        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $id = $this->repository->create($clean, $sections);
        return ['success' => true, 'data' => $this->repository->findDetail($id)];
    }

    /**
     * Valida y actualiza un proyecto (acepta cuerpos parciales).
     */
    public function update(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return $this->notFound($id);
        }

        [$clean, $errors] = Eje3Fields::process($this->spec(), $data, $existing, Database::getConnection());
        $errors = $this->checkDates($clean, $errors);
        [$sections, $errors] = $this->parseSections($data, $errors);

        if (empty($clean['codigo'])) {
            $clean['codigo'] = $existing['codigo']; // el código nunca queda vacío
        }
        if (empty($errors['codigo']) && $this->repository->codeExists($clean['codigo'], $id)) {
            $errors['codigo'][] = "El código '{$clean['codigo']}' ya está registrado en otro proyecto.";
        }

        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $this->repository->update($id, $clean, $sections);
        return ['success' => true, 'data' => $this->repository->findDetail($id)];
    }

    /**
     * Bandeja de revisión: proyectos enviados por docentes, del más antiguo al más reciente.
     */
    public function pending(): array {
        $projects = $this->repository->findPending();
        return ['pendientes' => count($projects), 'proyectos' => $projects];
    }

    /**
     * Revisión del administrador de un proyecto 'enviado': aprobar (comentario opcional) o devolver
     * (comentario obligatorio de 3 a 2000 caracteres). Orden de comprobaciones: 404, 400, 409.
     */
    public function review(int $id, array $admin, array $data): array {
        $project = $this->repository->findById($id);
        if (!$project) {
            return $this->notFound($id);
        }

        $errors = [];
        $accion = $data['accion'] ?? null;
        if (!is_string($accion) || !in_array($accion, ['aprobar', 'devolver'], true)) {
            $errors['accion'][] = "El campo 'accion' debe ser 'aprobar' o 'devolver'.";
        }
        $comment = '';
        if (isset($data['comentario'])) {
            if (!is_scalar($data['comentario'])) {
                $errors['comentario'][] = "El campo 'comentario' tiene un formato inválido.";
            } else {
                $comment = trim((string)$data['comentario']);
            }
        }
        if (empty($errors['comentario'])) {
            if (mb_strlen($comment) > 2000) {
                $errors['comentario'][] = "El comentario no debe exceder 2000 caracteres.";
            } elseif ($accion === 'devolver' && mb_strlen($comment) < 3) {
                $errors['comentario'][] = "Para devolver un proyecto debes escribir un comentario (mínimo 3 caracteres).";
            }
        }
        if ($errors) {
            return ['success' => false, 'errors' => $errors, 'message' => 'Datos de revisión inválidos.'];
        }

        $to = $accion === 'aprobar' ? 'aprobado' : 'devuelto';
        $applied = $project['registro_estado'] === 'enviado' && $this->repository->transition($id, ['enviado'], $to, [
            'comentario_revision' => $comment === '' ? null : $comment,
            'revisado_en'         => date('Y-m-d H:i:s'),
            'revisado_por'        => (int)$admin['id'],
        ]);
        if (!$applied) {
            return $this->conflict('transicion_invalida', 'Solo se pueden revisar proyectos en estado \'enviado\'.');
        }

        return ['success' => true, 'data' => $this->repository->findDetail($id)];
    }

    public function delete(int $id): array {
        if (!$this->repository->findById($id)) {
            return $this->notFound($id);
        }
        $this->repository->delete($id);
        return ['success' => true, 'data' => null];
    }

    /**
     * Interpreta `apartados`: null si no viene (no se tocan), o la lista normalizada.
     *
     * @return array{0:?array,1:array}
     */
    protected function parseSections(array $data, array $errors): array {
        if (!array_key_exists('apartados', $data) || $data['apartados'] === null) {
            return [null, $errors];
        }
        if (!is_array($data['apartados'])) {
            $errors['apartados'][] = "El campo 'apartados' debe ser una lista de objetos {apartado, contenido}.";
            return [null, $errors];
        }

        if (count($data['apartados']) > self::MAX_APARTADOS) {
            $errors['apartados'][] = "Un proyecto admite como máximo " . self::MAX_APARTADOS . " apartados.";
            return [null, $errors];
        }

        $sections = [];
        foreach (array_values($data['apartados']) as $index => $item) {
            $position = $index + 1;
            if (!is_array($item)) {
                $errors['apartados'][] = "El apartado #{$position} tiene un formato inválido.";
                continue;
            }
            if (isset($item['apartado']) && !is_scalar($item['apartado'])) {
                $errors['apartados'][] = "El título del apartado #{$position} tiene un formato inválido.";
                continue;
            }
            $title = trim((string)($item['apartado'] ?? ''));
            if ($title === '') {
                $errors['apartados'][] = "El apartado #{$position} necesita un título.";
                continue;
            }
            if (mb_strlen($title) > 200) {
                $errors['apartados'][] = "El título del apartado #{$position} no debe exceder 200 caracteres.";
                continue;
            }
            if (isset($item['contenido']) && !is_scalar($item['contenido'])) {
                $errors['apartados'][] = "El contenido del apartado #{$position} tiene un formato inválido.";
                continue;
            }
            $content = isset($item['contenido']) ? trim((string)$item['contenido']) : '';
            if (strlen($content) > Eje3Fields::MAX_TEXT_BYTES) {
                $errors['apartados'][] = "El contenido del apartado #{$position} no debe exceder " . Eje3Fields::MAX_TEXT_BYTES . ' bytes.';
                continue;
            }
            $sections[] = ['apartado' => $title, 'contenido' => $content === '' ? null : $content];
        }

        return [$sections, $errors];
    }

    /**
     * Genera un código único INV-/SEM-/TIT-AAAA-NNN según el tipo y el año de inicio.
     */
    protected function generateCode(string $tipo, ?string $startDate): string {
        $year = ($startDate && preg_match('/^(\d{4})-/', $startDate, $m)) ? $m[1] : date('Y');
        $prefix = self::PREFIJOS[$tipo] . '-' . $year . '-';
        $number = $this->repository->countByCodePrefix($prefix) + 1;
        do {
            $code = $prefix . str_pad((string)$number, 3, '0', STR_PAD_LEFT);
            $number++;
        } while ($this->repository->codeExists($code));
        return $code;
    }

    /**
     * La fecha de fin no puede ser anterior a la de inicio.
     */
    protected function checkDates(array $clean, array $errors): array {
        if (!empty($clean['fecha_inicio']) && !empty($clean['fecha_fin']) && $clean['fecha_fin'] < $clean['fecha_inicio']
            && empty($errors['fecha_inicio']) && empty($errors['fecha_fin'])) {
            $errors['fecha_fin'][] = "La fecha de fin no puede ser anterior a la fecha de inicio.";
        }
        return $errors;
    }

    /**
     * Resultado de conflicto de estado (HTTP 409) con el código de motivo en errors.codigo.
     */
    protected function conflict(string $code, string $message): array {
        return ['success' => false, 'conflict' => true, 'message' => $message, 'errors' => ['codigo' => [$code]]];
    }

    protected function notFound(int $id): array {
        return ['success' => false, 'notFound' => true, 'message' => "El proyecto con ID {$id} no fue encontrado."];
    }
}
