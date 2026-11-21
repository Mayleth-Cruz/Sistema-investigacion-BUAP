<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE MONITOREO DEL EJE 3 (MonitoringRepository)
 * ============================================================================
 * Consultas de los 4 indicadores de monitoreo y su detalle. Solo SQL estándar
 * (sin funciones exclusivas de MySQL) para funcionar igual en SQLite. Los indicadores de proyectos
 * cuentan SOLO proyectos aprobados (registro_estado = 'aprobado').
 */
class MonitoringRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Docentes (investigador principal) con proyectos de un tipo; `total` = cantidad de proyectos.
     *
     * @param string $tipo         investigacion | semillero | titulacion
     * @param bool   $soloCiv      true para exigir articulado_civ = 1
     */
    public function teachersWithProjects(string $tipo, bool $soloCiv = false): array {
        $sql = "SELECT i.id, i.nombre_completo, COUNT(p.id) AS total
                FROM proyectos p
                JOIN investigadores i ON i.id = p.investigador_principal_id
                WHERE p.tipo = :tipo AND p.registro_estado = 'aprobado'" . ($soloCiv ? " AND p.articulado_civ = 1" : "") . "
                GROUP BY i.id, i.nombre_completo
                ORDER BY total DESC, i.nombre_completo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':tipo' => $tipo]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['total'] = (int)$row['total'];
        }
        unset($row);
        return $rows;
    }

    /**
     * Profesores activos con nivel SNII asignado (ordenados de mayor a menor nivel).
     */
    public function teachersInSnii(): array {
        $rows = $this->db->query("SELECT id, nombre_completo, snii_nivel FROM investigadores
            WHERE activo = 1 AND snii_nivel IS NOT NULL AND snii_nivel <> ''
            ORDER BY CASE snii_nivel WHEN 'III' THEN 1 WHEN 'II' THEN 2 WHEN 'I' THEN 3 WHEN 'Candidato' THEN 4 ELSE 5 END,
                     nombre_completo ASC")->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
        }
        unset($row);
        return $rows;
    }

    /**
     * Profesores activos marcados como elegibles al SNII que aún no tienen nivel.
     */
    public function eligibleTeachers(): array {
        $rows = $this->db->query("SELECT id, nombre_completo FROM investigadores
            WHERE activo = 1 AND snii_elegible = 1 AND (snii_nivel IS NULL OR snii_nivel = '')
            ORDER BY nombre_completo ASC")->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
        }
        unset($row);
        return $rows;
    }

    /**
     * Total de docentes (investigadores) activos.
     */
    public function totalActiveTeachers(): int {
        return (int)$this->db->query("SELECT COUNT(*) FROM investigadores WHERE activo = 1")->fetchColumn();
    }
}
