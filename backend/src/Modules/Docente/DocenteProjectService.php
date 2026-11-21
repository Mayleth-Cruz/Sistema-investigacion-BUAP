<?php
namespace App\Modules\Docente;

use App\Core\Database;
use App\Modules\Eje3\Eje3Fields;
use App\Modules\Eje3\Eje3ProjectService;

/**
 * ============================================================================
 * SERVICIO DE PROYECTOS DEL DOCENTE (DocenteProjectService)
 * ============================================================================
 * El docente registra SUS proyectos (investigación, semilleros y titulación) con apartados y
 * evento público opcional. Flujo de registro: borrador -> enviado -> aprobado | devuelto
 * (el docente edita y borra solo en borrador o devuelto).
 *
 * Seguridad:
 *  - Propiedad: todo se resuelve contra el investigador_id de la SESIÓN; un proyecto ajeno
 *    responde "no encontrado" (404), nunca 403, para no filtrar su existencia.
 *  - Asignación masiva: solo se leen los campos de docenteSpec(); investigador_principal_id,
 *    codigo, registro_estado, comentario_revision, revisado_* y creado_por_* se ignoran
 *    silenciosamente aunque vengan en el cuerpo.
 */
class DocenteProjectService extends Eje3ProjectService {
    /** Estados de registro en los que el docente puede editar, borrar o (re)enviar. */
    public const EDITABLES = ['borrador', 'devuelto'];
    /** Estado del proyecto (ciclo de vida) permitido al docente. */
    public const ESTADOS_DOCENTE = ['propuesta', 'en_ejecucion', 'completado'];
    /** Tope de proyectos (todos los estados) por docente: evita que una cuenta llene la base con altas masivas. */
    public const MAX_PROYECTOS = 300;

    /** Claves devueltas al docente (contrato). */
    private const ROW_KEYS = ['id', 'codigo', 'titulo', 'resumen', 'tipo', 'estado', 'registro_estado', 'comentario_revision',
        'enviado_en', 'revisado_en', 'fecha_inicio', 'fecha_fin', 'linea_investigacion', 'evento_id', 'evento_nombre',
        'co_investigadores', 'articulado_civ', 'presupuesto', 'entidad_financiadora', 'total_apartados'];

    /**
     * Campos que llena el docente. `codigo` lo genera el sistema; el investigador principal es el de la sesión.
     */
    private function docenteSpec(?string $currentEstado = null): array {
        // Si el administrador dejó el proyecto en otro estado (p. ej. 'suspendido'), el docente puede conservarlo
        $estados = self::ESTADOS_DOCENTE;
        if ($currentEstado !== null && !in_array($currentEstado, $estados, true)) {
            $estados[] = $currentEstado;
        }
        return [
            'titulo'               => ['type' => 'string', 'required' => true, 'max' => 255, 'label' => 'titulo',
                                       'required_message' => 'El título del proyecto es obligatorio.'],
            'tipo'                 => ['type' => 'enum', 'values' => self::TIPOS, 'required' => true,
                                       'required_message' => 'El tipo de proyecto es obligatorio.'],
            'resumen'              => ['type' => 'text'],
            'linea_investigacion'  => ['type' => 'string', 'max' => 150],
            'fecha_inicio'         => ['type' => 'date', 'default' => date('Y-m-d'), 'required' => true],
            'fecha_fin'            => ['type' => 'date'],
            'estado'               => ['type' => 'enum', 'values' => $estados, 'default' => 'en_ejecucion', 'required' => true],
            'evento_id'            => ['type' => 'fk', 'table' => 'eventos_investigacion',
                                       'missing_message' => 'El evento indicado no existe.'],
            'co_investigadores'    => ['type' => 'text'],
            'articulado_civ'       => ['type' => 'bool', 'default' => 0],
            'presupuesto'          => ['type' => 'decimal', 'min' => 0, 'default' => 0],
            'entidad_financiadora' => ['type' => 'string', 'max' => 150, 'default' => 'Fondos Internos Institucionales'],
        ];
    }

    public function listFor(int $teacherId, array $filters): array {
        $filters['investigador_id'] = $teacherId;
        $filters['orden_reciente'] = true;
        return array_map([$this, 'present'], $this->repository->findAll($filters));
    }

    public function getFor(int $teacherId, int $id): array {
        $project = $this->repository->findOwned($id, $teacherId);
        if (!$project) {
            return $this->notFound($id);
        }
        return ['success' => true, 'data' => $this->detail($id)];
    }

    /**
     * Crea un proyecto en 'borrador' del docente de la sesión.
     */
    public function createFor(array $user, array $data): array {
        $teacherId = (int)$user['investigador_id'];
        $db = Database::getConnection();

        if ($this->repository->countOwned($teacherId) >= self::MAX_PROYECTOS) {
            return $this->conflict('limite_proyectos', 'Alcanzaste el máximo de ' . self::MAX_PROYECTOS . ' proyectos registrados. Elimina borradores que ya no necesites o contacta al administrador.');
        }

        [$clean, $errors] = Eje3Fields::process($this->docenteSpec(), $data, [], $db);
        $errors = $this->checkDates($clean, $errors);
        $errors = $this->checkPublicEvent($clean['evento_id'] ?? null, $errors, null);
        [$sections, $errors] = $this->parseSections($data, $errors);
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $clean = $this->normalize($clean);
        $clean['investigador_principal_id'] = $teacherId;

        // El código se autogenera; si dos altas simultáneas eligen el mismo, se reintenta con el siguiente
        $id = 0;
        for ($attempt = 0; $attempt < 3 && $id === 0; $attempt++) {
            $clean['codigo'] = $this->generateCode($clean['tipo'], $clean['fecha_inicio'] ?? null);
            try {
                $id = $this->repository->create($clean, $sections, 'borrador', (int)$user['id']);
            } catch (\PDOException $e) {
                if ($attempt === 2 || !$this->repository->codeExists($clean['codigo'])) {
                    throw $e;
                }
            }
        }

        return ['success' => true, 'data' => $this->detail($id)];
    }

    /**
     * Edición parcial: solo propio y en borrador o devuelto (si no, 409 proyecto_bloqueado).
     */
    public function updateFor(int $teacherId, int $id, array $data): array {
        $existing = $this->repository->findOwned($id, $teacherId);
        if (!$existing) {
            return $this->notFound($id);
        }
        if (!in_array($existing['registro_estado'], self::EDITABLES, true)) {
            return $this->locked();
        }

        $db = Database::getConnection();
        [$clean, $errors] = Eje3Fields::process($this->docenteSpec($existing['estado']), $data, $existing, $db);
        $errors = $this->checkDates($clean, $errors);
        // Solo se valida la visibilidad del evento si el docente lo envía y cambia
        $newEvent = array_key_exists('evento_id', $data) ? ($clean['evento_id'] ?? null) : null;
        $errors = $this->checkPublicEvent($newEvent, $errors, $existing['evento_id']);
        [$sections, $errors] = $this->parseSections($data, $errors);
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $result = $this->repository->updateOwned($id, $teacherId, self::EDITABLES, $this->normalize($clean) + ['codigo' => $existing['codigo']], $sections);
        if ($result === 'notfound') {
            return $this->notFound($id);
        }
        if ($result === 'locked') {
            return $this->locked();
        }
        return ['success' => true, 'data' => $this->detail($id)];
    }

    public function deleteFor(int $teacherId, int $id): array {
        $result = $this->repository->deleteOwned($id, $teacherId, self::EDITABLES);
        if ($result === 'notfound') {
            return $this->notFound($id);
        }
        if ($result === 'locked') {
            return $this->locked();
        }
        return ['success' => true, 'data' => null];
    }

    /**
     * Envía a revisión: solo propio y en borrador o devuelto (si no, 409 transicion_invalida) y con
     * titulo, resumen y linea_investigacion completos (si no, 400). Limpia el comentario del revisor.
     */
    public function submitFor(int $teacherId, int $id): array {
        $project = $this->repository->findOwned($id, $teacherId);
        if (!$project) {
            return $this->notFound($id);
        }
        if (!in_array($project['registro_estado'], self::EDITABLES, true)) {
            return $this->conflict('transicion_invalida', 'Solo se pueden enviar proyectos en borrador o devueltos.');
        }

        $labels = ['titulo' => 'título', 'resumen' => 'resumen', 'linea_investigacion' => 'línea de investigación'];
        $errors = [];
        foreach ($labels as $field => $label) {
            if (trim((string)($project[$field] ?? '')) === '') {
                $errors[$field][] = "Para enviar a revisión debes completar el campo '{$label}'.";
            }
        }
        if ($errors) {
            return ['success' => false, 'errors' => $errors, 'message' => 'Completa los campos obligatorios antes de enviar el proyecto a revisión.'];
        }

        // Los campos obligatorios se vuelven a exigir DENTRO del UPDATE: si una edición simultánea los
        // vació después de la validación anterior, el envío no se aplica (sin esa condición quedaba 'enviado' incompleto).
        $applied = $this->repository->transition($id, self::EDITABLES, 'enviado', [
            'comentario_revision' => null,
            'enviado_en'          => date('Y-m-d H:i:s'),
        ], $teacherId, array_keys($labels));
        if (!$applied) {
            $current = $this->repository->findOwned($id, $teacherId);
            if ($current && in_array($current['registro_estado'], self::EDITABLES, true)) {
                return ['success' => false, 'message' => 'Completa los campos obligatorios antes de enviar el proyecto a revisión.',
                        'errors' => ['resumen' => ['Para enviar a revisión debes completar título, resumen y línea de investigación.']]];
            }
            return $this->conflict('transicion_invalida', 'Solo se pueden enviar proyectos en borrador o devueltos.');
        }
        return ['success' => true, 'data' => $this->detail($id)];
    }

    /**
     * El evento debe ser público. Se omite si no cambia respecto al ya ligado al proyecto.
     */
    private function checkPublicEvent($eventId, array $errors, $currentEventId): array {
        if ($eventId === null || !empty($errors['evento_id']) || ($currentEventId !== null && (int)$eventId === (int)$currentEventId)) {
            return $errors;
        }
        $stmt = Database::getConnection()->prepare("SELECT publico FROM eventos_investigacion WHERE id = :id");
        $stmt->execute([':id' => (int)$eventId]);
        $public = $stmt->fetchColumn();
        if ($public === false || (int)$public !== 1) {
            // Mismo mensaje que para un evento inexistente: no se revela que un evento privado existe
            $errors['evento_id'][] = 'El evento indicado no existe.';
        }
        return $errors;
    }

    /**
     * Normaliza antes de guardar: la línea nunca es NULL (columna NOT NULL; vacía = pendiente de
     * completar) y articulado_civ solo aplica a titulación.
     */
    private function normalize(array $clean): array {
        $clean['linea_investigacion'] = $clean['linea_investigacion'] ?? '';
        $clean['articulado_civ'] = (($clean['tipo'] ?? null) === 'titulacion' && !empty($clean['articulado_civ'])) ? 1 : 0;
        return $clean;
    }

    private function locked(): array {
        return $this->conflict('proyecto_bloqueado', 'El proyecto no se puede modificar en su estado actual. Solo se editan o eliminan proyectos en borrador o devueltos.');
    }

    /** Fila con las claves del contrato docente. */
    private function present(array $row): array {
        return array_intersect_key($row, array_flip(self::ROW_KEYS));
    }

    private function detail(int $id): array {
        $project = $this->repository->findDetail($id);
        $apartados = $project['apartados'];
        $row = $this->present($project);
        $row['apartados'] = $apartados;
        return $row;
    }
}
