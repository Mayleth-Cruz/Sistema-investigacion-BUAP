<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE VISUALIZACIÓN DEL EJE 3 (VisualizationRepository)
 * ============================================================================
 * Agregados para las gráficas públicas: publicaciones por origen y año, y
 * producción académica por docente. Solo se consideran publicaciones en
 * estado 'publicado' y proyectos 'aprobado'. SQL estándar compatible con MySQL y SQLite.
 */
class VisualizationRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Conteo de publicaciones publicadas por origen (evento, revista_pyad, otra).
     */
    public function publicationsByOrigin(): array {
        $rows = $this->db->query("SELECT origen, COUNT(*) AS total FROM publicaciones
                                  WHERE estado = 'publicado' GROUP BY origen")->fetchAll();
        $result = ['evento' => 0, 'revista_pyad' => 0, 'otra' => 0];
        foreach ($rows as $row) {
            if (isset($result[$row['origen']])) {
                $result[$row['origen']] = (int)$row['total'];
            }
        }
        return $result;
    }

    /**
     * Conteo de publicaciones publicadas por año y origen (año ascendente).
     */
    public function publicationsByYear(): array {
        $rows = $this->db->query("SELECT anio, origen, COUNT(*) AS total FROM publicaciones
                                  WHERE estado = 'publicado' GROUP BY anio, origen ORDER BY anio ASC")->fetchAll();
        $years = [];
        foreach ($rows as $row) {
            $year = (int)$row['anio'];
            if (!isset($years[$year])) {
                $years[$year] = ['anio' => $year, 'evento' => 0, 'revista_pyad' => 0, 'otra' => 0, 'total' => 0];
            }
            if (isset($years[$year][$row['origen']])) {
                $years[$year][$row['origen']] += (int)$row['total'];
            }
            $years[$year]['total'] += (int)$row['total'];
        }
        ksort($years);
        return array_values($years);
    }

    /**
     * Producción por docente activo: publicaciones publicadas, proyectos (como principal)
     * y producción técnica. Devuelve todas las filas; el servicio filtra y ordena.
     */
    public function productionByTeacher(): array {
        $rows = $this->db->query("SELECT i.id AS investigador_id, i.nombre_completo, i.afiliacion,
                (SELECT COUNT(*) FROM publicaciones pub WHERE pub.investigador_id = i.id AND pub.estado = 'publicado') AS publicaciones,
                (SELECT COUNT(*) FROM proyectos pr WHERE pr.investigador_principal_id = i.id AND pr.registro_estado = 'aprobado') AS proyectos,
                (SELECT COUNT(*) FROM produccion_tecnica pt WHERE pt.investigador_id = i.id) AS produccion_tecnica
            FROM investigadores i
            WHERE i.activo = 1")->fetchAll();
        foreach ($rows as &$row) {
            foreach (['investigador_id', 'publicaciones', 'proyectos', 'produccion_tecnica'] as $key) {
                $row[$key] = (int)$row[$key];
            }
        }
        unset($row);
        return $rows;
    }

    /**
     * Totales globales del sistema.
     */
    public function totals(): array {
        $count = fn(string $sql): int => (int)$this->db->query($sql)->fetchColumn();
        return [
            'publicaciones'      => $count("SELECT COUNT(*) FROM publicaciones WHERE estado = 'publicado'"),
            'proyectos'          => $count("SELECT COUNT(*) FROM proyectos WHERE registro_estado = 'aprobado'"),
            'produccion_tecnica' => $count("SELECT COUNT(*) FROM produccion_tecnica"),
            'docentes'           => $count("SELECT COUNT(*) FROM investigadores WHERE activo = 1"),
        ];
    }
}
