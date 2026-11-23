<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE DOCENTES Y SNII (FacultyRepository)
 * ============================================================================
 * Los "docentes" son los registros de `investigadores`. Aquí se consultan junto
 * con su marca SNII (snii_nivel / snii_elegible) y su cantidad de proyectos.
 */
class FacultyRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function baseSelect(): string {
        return "SELECT i.id, i.nombre_completo, i.correo, i.afiliacion, i.categoria, i.linea_investigacion,
                    i.snii_nivel, i.snii_elegible, i.activo,
                    (SELECT COUNT(*) FROM proyectos p WHERE p.investigador_principal_id = i.id AND p.registro_estado = 'aprobado') AS total_proyectos
                FROM investigadores i";
    }

    private function cast(array $row): array {
        foreach (['id', 'snii_elegible', 'activo', 'total_proyectos'] as $key) {
            $row[$key] = (int)($row[$key] ?? 0);
        }
        return $row;
    }

    /**
     * Lista docentes con búsqueda y filtro SNII:
     *  - en_snii:   con nivel SNII asignado
     *  - elegibles: marcados como elegibles y sin nivel
     *  - sin:       sin nivel y sin marca de elegibilidad
     */
    public function findAll(?string $search, string $snii = 'todos'): array {
        $conditions = [];
        $params = [];

        if ($search !== null && $search !== '') {
            // Un parámetro distinto por columna: MySQL (prepares nativos) no admite repetir nombres
            $conditions[] = "(i.nombre_completo LIKE :s1 OR i.correo LIKE :s2
                              OR i.afiliacion LIKE :s3 OR i.linea_investigacion LIKE :s4)";
            foreach ([':s1', ':s2', ':s3', ':s4'] as $name) {
                $params[$name] = "%{$search}%";
            }
        }

        $hasLevel = "(i.snii_nivel IS NOT NULL AND i.snii_nivel <> '')";
        $noLevel = "(i.snii_nivel IS NULL OR i.snii_nivel = '')";
        if ($snii === 'en_snii') {
            $conditions[] = $hasLevel;
        } elseif ($snii === 'elegibles') {
            $conditions[] = "i.snii_elegible = 1 AND {$noLevel}";
        } elseif ($snii === 'sin') {
            $conditions[] = "{$noLevel} AND i.snii_elegible = 0";
        }

        $sql = $this->baseSelect();
        if ($conditions) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        $sql .= " ORDER BY i.nombre_completo ASC, i.id ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare($this->baseSelect() . " WHERE i.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->cast($row) : null;
    }

    /**
     * Actualiza la marca SNII (nivel y/o elegibilidad) de un docente.
     */
    public function updateSnii(int $id, array $fields): void {
        $sets = [];
        $params = [':id' => $id];
        if (array_key_exists('snii_nivel', $fields)) {
            $sets[] = "snii_nivel = :nivel";
            $params[':nivel'] = $fields['snii_nivel'];
        }
        if (array_key_exists('snii_elegible', $fields)) {
            $sets[] = "snii_elegible = :elegible";
            $params[':elegible'] = $fields['snii_elegible'];
        }
        if (!$sets) {
            return;
        }
        $sets[] = "updated_at = CURRENT_TIMESTAMP";
        $stmt = $this->db->prepare("UPDATE investigadores SET " . implode(', ', $sets) . " WHERE id = :id");
        $stmt->execute($params);
    }
}
