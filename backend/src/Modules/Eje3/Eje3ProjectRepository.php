<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE PROYECTOS DEL EJE 3 (Eje3ProjectRepository)
 * ============================================================================
 * Opera sobre la misma tabla `proyectos` que el módulo de proyectos clásico,
 * pero expone los campos del Eje 3 (tipo, evento, articulación al CIV) y los
 * apartados anexos (`proyecto_apartados`).
 */
class Eje3ProjectRepository {
    private PDO $db;

    /** Estados de registro (flujo de revisión de proyectos de docentes). */
    public const REGISTRO_ESTADOS = ['borrador', 'enviado', 'aprobado', 'devuelto'];

    /** Columnas editables de un proyecto. */
    public const COLUMNS = [
        'codigo', 'titulo', 'resumen', 'investigador_principal_id', 'co_investigadores', 'estado',
        'fecha_inicio', 'fecha_fin', 'presupuesto', 'entidad_financiadora', 'linea_investigacion',
        'tipo', 'evento_id', 'articulado_civ',
    ];

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Consulta base: proyecto + investigador principal + evento + total de apartados.
     */
    private function baseSelect(): string {
        return "SELECT p.id, p.codigo, p.titulo, p.resumen, p.investigador_principal_id,
                    i.nombre_completo AS investigador_principal_nombre,
                    p.co_investigadores, p.estado, p.fecha_inicio, p.fecha_fin, p.presupuesto,
                    p.entidad_financiadora, p.linea_investigacion, p.tipo, p.evento_id,
                    e.nombre AS evento_nombre, p.articulado_civ,
                    p.registro_estado, p.comentario_revision, p.enviado_en, p.revisado_en,
                    (SELECT COUNT(*) FROM proyecto_apartados a WHERE a.proyecto_id = p.id) AS total_apartados
                FROM proyectos p
                JOIN investigadores i ON i.id = p.investigador_principal_id
                LEFT JOIN eventos_investigacion e ON e.id = p.evento_id";
    }

    /**
     * Normaliza los tipos numéricos de una fila.
     */
    private function cast(array $row): array {
        foreach (['id', 'investigador_principal_id', 'articulado_civ', 'total_apartados'] as $key) {
            if (array_key_exists($key, $row)) {
                $row[$key] = (int)$row[$key];
            }
        }
        if (array_key_exists('evento_id', $row) && $row['evento_id'] !== null) {
            $row['evento_id'] = (int)$row['evento_id'];
        }
        if (array_key_exists('presupuesto', $row)) {
            $row['presupuesto'] = (float)$row['presupuesto'];
        }
        return $row;
    }

    /**
     * Lista proyectos con filtros (tipo, evento_id, estado, search).
     */
    public function findAll(array $filters = []): array {
        $conditions = [];
        $params = [];

        if (!empty($filters['tipo'])) {
            $conditions[] = "p.tipo = :tipo";
            $params[':tipo'] = $filters['tipo'];
        }
        if (!empty($filters['evento_id'])) {
            $conditions[] = "p.evento_id = :evento_id";
            $params[':evento_id'] = (int)$filters['evento_id'];
        }
        if (!empty($filters['estado'])) {
            $conditions[] = "p.estado = :estado";
            $params[':estado'] = $filters['estado'];
        }
        if (!empty($filters['registro_estado'])) {
            $conditions[] = "p.registro_estado = :registro_estado";
            $params[':registro_estado'] = $filters['registro_estado'];
        }
        if (!empty($filters['investigador_id'])) {
            $conditions[] = "p.investigador_principal_id = :investigador_id";
            $params[':investigador_id'] = (int)$filters['investigador_id'];
        }
        if (!empty($filters['search'])) {
            // Un parámetro distinto por columna: MySQL (prepares nativos) no admite repetir nombres
            $conditions[] = "(p.titulo LIKE :s1 OR p.codigo LIKE :s2 OR p.resumen LIKE :s3
                              OR p.linea_investigacion LIKE :s4 OR i.nombre_completo LIKE :s5)";
            foreach ([':s1', ':s2', ':s3', ':s4', ':s5'] as $name) {
                $params[$name] = "%{$filters['search']}%";
            }
        }

        $sql = $this->baseSelect();
        if ($conditions) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        // Los docentes ven primero lo que tocaron más recientemente; el administrador, por fecha de inicio
        $sql .= !empty($filters['orden_reciente'])
            ? " ORDER BY p.updated_at DESC, p.id DESC"
            : " ORDER BY p.fecha_inicio DESC, p.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    /**
     * Proyectos en revisión (registro_estado = 'enviado'), del más antiguo al más reciente.
     */
    public function findPending(): array {
        $stmt = $this->db->prepare($this->baseSelect() . " WHERE p.registro_estado = :estado
                                   ORDER BY p.enviado_en ASC, p.id ASC");
        $stmt->execute([':estado' => 'enviado']);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    public function countPending(): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM proyectos WHERE registro_estado = :estado");
        $stmt->execute([':estado' => 'enviado']);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Conteo de proyectos de un docente por estado de registro (todas las claves presentes).
     */
    public function countByRegistroEstado(int $teacherId): array {
        $counts = array_fill_keys(self::REGISTRO_ESTADOS, 0);
        $stmt = $this->db->prepare("SELECT registro_estado, COUNT(*) AS total FROM proyectos
                                    WHERE investigador_principal_id = :i GROUP BY registro_estado");
        $stmt->execute([':i' => $teacherId]);
        foreach ($stmt->fetchAll() as $row) {
            if (array_key_exists($row['registro_estado'], $counts)) {
                $counts[$row['registro_estado']] = (int)$row['total'];
            }
        }
        return $counts;
    }

    /** Total de proyectos (todos los estados) de un docente como investigador principal. */
    public function countOwned(int $teacherId): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM proyectos WHERE investigador_principal_id = :i");
        $stmt->execute([':i' => $teacherId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Proyecto de un docente: null si no existe O si pertenece a otro (así no se filtra su existencia).
     */
    public function findOwned(int $id, int $teacherId): ?array {
        $project = $this->findById($id);
        return ($project && (int)$project['investigador_principal_id'] === $teacherId) ? $project : null;
    }

    /**
     * Obtiene un proyecto por id (sin apartados) o null.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare($this->baseSelect() . " WHERE p.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        $stmt->closeCursor(); // sin cursor abierto, el UPDATE siguiente espera el bloqueo en vez de fallar (SQLite/WAL)
        return $row ? $this->cast($row) : null;
    }

    /**
     * Obtiene un proyecto con su lista de apartados.
     */
    public function findDetail(int $id): ?array {
        $project = $this->findById($id);
        if (!$project) {
            return null;
        }
        $project['apartados'] = $this->findSections($id);
        return $project;
    }

    /**
     * Apartados de un proyecto, ordenados.
     */
    public function findSections(int $projectId): array {
        $stmt = $this->db->prepare("SELECT id, apartado, contenido, orden FROM proyecto_apartados
                                    WHERE proyecto_id = :id ORDER BY orden ASC, id ASC");
        $stmt->execute([':id' => $projectId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['orden'] = (int)$row['orden'];
        }
        unset($row);
        return $rows;
    }

    /**
     * Indica si un código de proyecto ya existe (opcionalmente excluyendo un id).
     */
    public function codeExists(string $code, ?int $exceptId = null): bool {
        $sql = "SELECT COUNT(*) FROM proyectos WHERE codigo = :codigo";
        $params = [':codigo' => $code];
        if ($exceptId !== null) {
            $sql .= " AND id <> :id";
            $params[':id'] = $exceptId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Cantidad de proyectos cuyo código comienza con el prefijo dado (para autogenerar códigos).
     */
    public function countByCodePrefix(string $prefix): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM proyectos WHERE codigo LIKE :prefix");
        $stmt->execute([':prefix' => $prefix . '%']);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Inserta un proyecto y sus apartados de forma atómica. Devuelve el id.
     *
     * @param string   $registroEstado Estado de registro inicial ('aprobado' cuando lo captura el administrador)
     * @param int|null $creadoPor      Usuario que lo creó (docente), o null
     */
    public function create(array $data, ?array $sections, string $registroEstado = 'aprobado', ?int $creadoPor = null): int {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("INSERT INTO proyectos
                (codigo, titulo, resumen, investigador_principal_id, co_investigadores, estado, fecha_inicio, fecha_fin,
                 presupuesto, entidad_financiadora, linea_investigacion, tipo, evento_id, articulado_civ,
                 registro_estado, creado_por_usuario_id)
                VALUES (:codigo, :titulo, :resumen, :investigador_principal_id, :co_investigadores, :estado, :fecha_inicio, :fecha_fin,
                        :presupuesto, :entidad_financiadora, :linea_investigacion, :tipo, :evento_id, :articulado_civ,
                        :registro_estado, :creado_por)");
            $stmt->execute($this->bind($data) + [':registro_estado' => $registroEstado, ':creado_por' => $creadoPor]);
            $id = (int)$this->db->lastInsertId();
            if ($sections !== null) {
                $this->replaceSections($id, $sections);
            }
            $this->db->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Actualiza un proyecto y, si se envían, reemplaza todos sus apartados.
     */
    public function update(int $id, array $data, ?array $sections): void {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE proyectos SET
                    codigo = :codigo, titulo = :titulo, resumen = :resumen,
                    investigador_principal_id = :investigador_principal_id, co_investigadores = :co_investigadores,
                    estado = :estado, fecha_inicio = :fecha_inicio, fecha_fin = :fecha_fin, presupuesto = :presupuesto,
                    entidad_financiadora = :entidad_financiadora, linea_investigacion = :linea_investigacion,
                    tipo = :tipo, evento_id = :evento_id, articulado_civ = :articulado_civ,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id");
            $stmt->execute($this->bind($data) + [':id' => $id]);
            if ($sections !== null) {
                $this->replaceSections($id, $sections);
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Elimina un proyecto (sus apartados se eliminan en cascada; las publicaciones
     * derivadas conservan su registro con proyecto_id NULL).
     */
    public function delete(int $id): bool {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE publicaciones SET proyecto_id = NULL WHERE proyecto_id = :id")->execute([':id' => $id]);
            $this->db->prepare("DELETE FROM proyecto_apartados WHERE proyecto_id = :id")->execute([':id' => $id]);
            $stmt = $this->db->prepare("DELETE FROM proyectos WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $this->db->commit();
            return $stmt->rowCount() > 0;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Actualización del DOCENTE: solo si el proyecto es suyo y su registro_estado está en $allowed.
     * Estado y propiedad se leen dentro de la transacción (con bloqueo de fila en MySQL) para que un
     * envío concurrente no se cruce con la edición. No modifica el registro_estado.
     *
     * @return string 'ok' | 'notfound' (no existe o es ajeno) | 'locked' (estado no editable)
     */
    public function updateOwned(int $id, int $teacherId, array $allowed, array $data, ?array $sections): string {
        $this->beginWrite();
        try {
            $state = $this->lockState($id, $teacherId);
            if ($state === null) {
                $this->rollbackWrite();
                return 'notfound';
            }
            if (!in_array($state, $allowed, true)) {
                $this->rollbackWrite();
                return 'locked';
            }
            $stmt = $this->db->prepare("UPDATE proyectos SET
                    titulo = :titulo, resumen = :resumen, co_investigadores = :co_investigadores,
                    estado = :estado, fecha_inicio = :fecha_inicio, fecha_fin = :fecha_fin, presupuesto = :presupuesto,
                    entidad_financiadora = :entidad_financiadora, linea_investigacion = :linea_investigacion,
                    tipo = :tipo, evento_id = :evento_id, articulado_civ = :articulado_civ,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND investigador_principal_id = :owner");
            $params = $this->bind($data);
            unset($params[':codigo'], $params[':investigador_principal_id']);
            $stmt->execute($params + [':id' => $id, ':owner' => $teacherId]);
            if ($sections !== null) {
                $this->replaceSections($id, $sections);
            }
            $this->commitWrite();
            return 'ok';
        } catch (\Throwable $e) {
            $this->rollbackWrite();
            throw $e;
        }
    }

    /**
     * Borrado del DOCENTE (mismas garantías que updateOwned).
     *
     * @return string 'ok' | 'notfound' | 'locked'
     */
    public function deleteOwned(int $id, int $teacherId, array $allowed): string {
        $this->beginWrite();
        try {
            $state = $this->lockState($id, $teacherId);
            if ($state === null) {
                $this->rollbackWrite();
                return 'notfound';
            }
            if (!in_array($state, $allowed, true)) {
                $this->rollbackWrite();
                return 'locked';
            }
            $this->db->prepare("UPDATE publicaciones SET proyecto_id = NULL WHERE proyecto_id = :id")->execute([':id' => $id]);
            $this->db->prepare("DELETE FROM proyecto_apartados WHERE proyecto_id = :id")->execute([':id' => $id]);
            $this->db->prepare("DELETE FROM proyectos WHERE id = :id AND investigador_principal_id = :owner")
                ->execute([':id' => $id, ':owner' => $teacherId]);
            $this->commitWrite();
            return 'ok';
        } catch (\Throwable $e) {
            $this->rollbackWrite();
            throw $e;
        }
    }

    /**
     * Transición de registro_estado condicionada al estado de origen. El estado cambia siempre,
     * así que rowCount() es confiable también en MySQL.
     *
     * @param array $fields columnas adicionales a fijar (comentario_revision, enviado_en, revisado_en, revisado_por)
     * @param array $requireFilled columnas de texto que deben seguir NO vacías al aplicar la transición
     *        (se comprueban en el mismo UPDATE: una edición simultánea no puede vaciarlas entre la validación y el cambio)
     * @return bool true si la transición se aplicó (el proyecto seguía en un estado de origen permitido)
     */
    public function transition(int $id, array $fromStates, string $toState, array $fields, ?int $teacherId = null, array $requireFilled = []): bool {
        $sets = ["registro_estado = :to_estado", "updated_at = CURRENT_TIMESTAMP"];
        $params = [':to_estado' => $toState, ':id' => $id];
        foreach (['comentario_revision', 'enviado_en', 'revisado_en', 'revisado_por'] as $column) {
            if (array_key_exists($column, $fields)) {
                $sets[] = "{$column} = :f_{$column}";
                $params[":f_{$column}"] = $fields[$column];
            }
        }
        $in = [];
        foreach (array_values($fromStates) as $i => $state) {
            $in[] = ":from{$i}";
            $params[":from{$i}"] = $state;
        }
        $sql = "UPDATE proyectos SET " . implode(', ', $sets) . " WHERE id = :id AND registro_estado IN (" . implode(', ', $in) . ")";
        if ($teacherId !== null) {
            $sql .= " AND investigador_principal_id = :owner";
            $params[':owner'] = $teacherId;
        }
        // Solo columnas de la lista blanca de COLUMNS (nunca texto del cliente)
        foreach (array_intersect($requireFilled, self::COLUMNS) as $column) {
            $sql .= " AND TRIM(COALESCE({$column}, '')) <> ''";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    /**
     * Inicia una transacción de ESCRITURA. En SQLite se usa BEGIN IMMEDIATE: la lectura del estado y el
     * UPDATE ocurren ya con el bloqueo de escritura (un BEGIN diferido fallaba con "database is locked"
     * si otra petición escribía en medio). En MySQL se usa la transacción normal (+ FOR UPDATE en lockState).
     */
    private function beginWrite(): void {
        if (Database::getDriver() === 'sqlite') {
            $this->db->exec('BEGIN IMMEDIATE');
        } else {
            $this->db->beginTransaction();
        }
    }

    private function commitWrite(): void {
        if (Database::getDriver() === 'sqlite') {
            $this->db->exec('COMMIT');
        } else {
            $this->db->commit();
        }
    }

    /** Revierte si hay una transacción abierta (no falla si ya se cerró). */
    private function rollbackWrite(): void {
        if (Database::getDriver() === 'sqlite') {
            try { $this->db->exec('ROLLBACK'); } catch (\Throwable $e) { /* sin transacción abierta */ }
        } elseif ($this->db->inTransaction()) {
            $this->db->rollBack();
        }
    }

    /**
     * Lee el registro_estado del proyecto de un docente dentro de la transacción en curso
     * (FOR UPDATE en MySQL; SQLite serializa las escrituras). null si no existe o es ajeno.
     */
    private function lockState(int $id, int $teacherId): ?string {
        $sql = "SELECT registro_estado FROM proyectos WHERE id = :id AND investigador_principal_id = :owner";
        if (Database::getDriver() === 'mysql') {
            $sql .= " FOR UPDATE";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id, ':owner' => $teacherId]);
        $value = $stmt->fetchColumn();
        $stmt->closeCursor();
        return $value === false ? null : (string)$value;
    }

    /**
     * Reemplaza por completo el conjunto de apartados (el orden sigue el de la lista).
     * Debe llamarse dentro de una transacción.
     */
    private function replaceSections(int $projectId, array $sections): void {
        $this->db->prepare("DELETE FROM proyecto_apartados WHERE proyecto_id = :id")->execute([':id' => $projectId]);
        $insert = $this->db->prepare("INSERT INTO proyecto_apartados (proyecto_id, apartado, contenido, orden)
                                      VALUES (:pid, :apartado, :contenido, :orden)");
        foreach (array_values($sections) as $order => $section) {
            $insert->execute([
                ':pid'       => $projectId,
                ':apartado'  => $section['apartado'],
                ':contenido' => $section['contenido'],
                ':orden'     => $order,
            ]);
        }
    }

    /**
     * Prepara los parámetros nombrados de INSERT/UPDATE.
     */
    private function bind(array $data): array {
        $params = [];
        foreach (self::COLUMNS as $column) {
            $params[':' . $column] = $data[$column] ?? null;
        }
        return $params;
    }
}
