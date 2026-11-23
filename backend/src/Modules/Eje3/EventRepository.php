<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE EVENTOS DE INVESTIGACIÓN (EventRepository)
 * ============================================================================
 * Persistencia de la tabla `eventos_investigacion`. Cada fila incluye los
 * totales de proyectos, participantes y publicaciones ligados al evento.
 * Solo se cuentan las publicaciones en estado 'publicado' y los proyectos 'aprobado'
 * para no filtrar borradores ni proyectos en revisión en el portal público.
 */
class EventRepository {
    private PDO $db;

    /** Columnas editables del evento. */
    public const COLUMNS = ['nombre', 'tipo', 'edicion', 'fecha_inicio', 'fecha_fin', 'sede', 'descripcion', 'estado', 'publico'];

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Consulta base con los totales calculados.
     */
    private function baseSelect(): string {
        return "SELECT e.*,
                    (SELECT COUNT(*) FROM proyectos p WHERE p.evento_id = e.id AND p.registro_estado = 'aprobado') AS total_proyectos,
                    (SELECT COUNT(*) FROM participantes_evento pe WHERE pe.evento_id = e.id) AS total_participantes,
                    (SELECT COUNT(*) FROM publicaciones pub WHERE pub.evento_id = e.id AND pub.estado = 'publicado') AS total_publicaciones
                FROM eventos_investigacion e";
    }

    /**
     * Normaliza tipos numéricos de una fila.
     */
    private function cast(array $row): array {
        foreach (['id', 'publico', 'total_proyectos', 'total_participantes', 'total_publicaciones'] as $key) {
            if (array_key_exists($key, $row)) {
                $row[$key] = (int)$row[$key];
            }
        }
        return $row;
    }

    /**
     * Lista eventos con filtros opcionales.
     *
     * @param array $filters    tipo, estado, search, desde (fecha_inicio >= desde)
     * @param bool  $onlyPublic Si es true solo devuelve eventos con publico = 1
     * @param int|null $limit   Límite de filas (opcional)
     */
    public function findAll(array $filters = [], bool $onlyPublic = false, ?int $limit = null): array {
        $conditions = [];
        $params = [];

        if ($onlyPublic) {
            $conditions[] = "e.publico = 1";
        }
        if (!empty($filters['tipo'])) {
            $conditions[] = "e.tipo = :tipo";
            $params[':tipo'] = $filters['tipo'];
        }
        if (!empty($filters['estado'])) {
            $conditions[] = "e.estado = :estado";
            $params[':estado'] = $filters['estado'];
        }
        if (!empty($filters['desde'])) {
            $conditions[] = "e.fecha_inicio >= :desde";
            $params[':desde'] = $filters['desde'];
        }
        if (!empty($filters['search'])) {
            // Un parámetro distinto por columna: MySQL (prepares nativos) no admite repetir nombres
            $conditions[] = "(e.nombre LIKE :s1 OR e.sede LIKE :s2 OR e.edicion LIKE :s3 OR e.descripcion LIKE :s4)";
            foreach ([':s1', ':s2', ':s3', ':s4'] as $name) {
                $params[$name] = "%{$filters['search']}%";
            }
        }

        $sql = $this->baseSelect();
        if ($conditions) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        $sql .= !empty($filters['orden_asc'])
            ? " ORDER BY e.fecha_inicio ASC, e.id ASC"
            : " ORDER BY e.fecha_inicio DESC, e.id DESC";
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    /**
     * Obtiene un evento por id (con totales) o null si no existe.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare($this->baseSelect() . " WHERE e.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->cast($row) : null;
    }

    /**
     * Inserta un evento y devuelve su id.
     */
    public function create(array $data): int {
        $stmt = $this->db->prepare("INSERT INTO eventos_investigacion
            (nombre, tipo, edicion, fecha_inicio, fecha_fin, sede, descripcion, estado, publico)
            VALUES (:nombre, :tipo, :edicion, :fecha_inicio, :fecha_fin, :sede, :descripcion, :estado, :publico)");
        $stmt->execute($this->bind($data));
        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza un evento (updated_at se fija de forma explícita por compatibilidad con SQLite).
     */
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare("UPDATE eventos_investigacion SET
                nombre = :nombre, tipo = :tipo, edicion = :edicion, fecha_inicio = :fecha_inicio,
                fecha_fin = :fecha_fin, sede = :sede, descripcion = :descripcion, estado = :estado,
                publico = :publico, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id");
        return $stmt->execute($this->bind($data) + [':id' => $id]);
    }

    /**
     * Elimina un evento. Los proyectos, participantes y publicaciones ligados
     * conservan su registro con evento_id = NULL.
     */
    public function delete(int $id): bool {
        $this->db->beginTransaction();
        try {
            foreach (['proyectos', 'participantes_evento', 'publicaciones'] as $table) {
                $this->db->prepare("UPDATE {$table} SET evento_id = NULL WHERE evento_id = :id")->execute([':id' => $id]);
            }
            $stmt = $this->db->prepare("DELETE FROM eventos_investigacion WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $this->db->commit();
            return $stmt->rowCount() > 0;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Proyectos presentados en un evento, con sus apartados (para el portal público).
     */
    public function findProjectsWithSections(int $eventId): array {
        $stmt = $this->db->prepare("SELECT p.id, p.codigo, p.titulo, p.tipo, i.nombre_completo AS investigador_principal_nombre
            FROM proyectos p
            JOIN investigadores i ON i.id = p.investigador_principal_id
            WHERE p.evento_id = :id AND p.registro_estado = 'aprobado'
            ORDER BY p.titulo ASC, p.id ASC");
        $stmt->execute([':id' => $eventId]);
        $projects = $stmt->fetchAll();

        $sections = $this->db->prepare("SELECT apartado, contenido FROM proyecto_apartados WHERE proyecto_id = :pid ORDER BY orden ASC, id ASC");
        foreach ($projects as &$project) {
            $project['id'] = (int)$project['id'];
            $sections->execute([':pid' => $project['id']]);
            $project['apartados'] = $sections->fetchAll();
        }
        unset($project);

        return $projects;
    }

    /**
     * Publicaciones (publicadas) ligadas a un evento.
     */
    public function findPublications(int $eventId): array {
        $stmt = $this->db->prepare("SELECT id, titulo, autores, anio FROM publicaciones
            WHERE evento_id = :id AND estado = 'publicado'
            ORDER BY anio DESC, id DESC");
        $stmt->execute([':id' => $eventId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['anio'] = (int)$row['anio'];
        }
        unset($row);
        return $rows;
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
