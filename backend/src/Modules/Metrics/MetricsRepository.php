<?php
namespace App\Modules\Metrics;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE MÉTRICAS Y MONITOREO (MetricsRepository)
 * ============================================================================
 * Este repositorio ejecuta consultas de agregación analítica (COUNT, SUM, GROUP BY)
 * para alimentar los tableros de control (dashboards) y gráficos del sistema.
 */
class MetricsRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Calcula los indicadores clave de desempeño (KPIs) globales de la institución.
     */
    public function getGlobalKPIs(): array {
        // Total de investigadores
        $stmtInv = $this->db->query("SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos
        FROM investigadores");
        $kpiInv = $stmtInv->fetch() ?: ['total' => 0, 'activos' => 0];

        // Total de proyectos y presupuesto total
        $stmtProy = $this->db->query("SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(presupuesto), 0) AS presupuesto_total,
            SUM(CASE WHEN estado = 'en_ejecucion' THEN 1 ELSE 0 END) AS en_ejecucion,
            SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) AS completados,
            SUM(CASE WHEN estado = 'propuesta' THEN 1 ELSE 0 END) AS propuestas
        FROM proyectos");
        $kpiProy = $stmtProy->fetch() ?: ['total' => 0, 'presupuesto_total' => 0];

        // Total de publicaciones, citas y porcentaje de Open Access
        $stmtPub = $this->db->query("SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(citas_estimadas), 0) AS total_citas,
            SUM(CASE WHEN acceso_abierto = 1 THEN 1 ELSE 0 END) AS open_access,
            SUM(CASE WHEN cuartil = 'Q1' THEN 1 ELSE 0 END) AS total_q1
        FROM publicaciones");
        $kpiPub = $stmtPub->fetch() ?: ['total' => 0, 'total_citas' => 0, 'open_access' => 0, 'total_q1' => 0];

        // Total de producción técnica y patentes
        $stmtProd = $this->db->query("SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN tipo = 'patente' THEN 1 ELSE 0 END) AS patentes,
            SUM(CASE WHEN tipo = 'software' THEN 1 ELSE 0 END) AS software,
            SUM(CASE WHEN tipo = 'tesis_dirigida' THEN 1 ELSE 0 END) AS tesis
        FROM produccion_tecnica");
        $kpiProd = $stmtProd->fetch() ?: ['total' => 0, 'patentes' => 0];

        return [
            'investigadores' => $kpiInv,
            'proyectos'      => $kpiProy,
            'publicaciones'  => $kpiPub,
            'produccion'     => $kpiProd
        ];
    }

    /**
     * Obtiene la distribución de publicaciones científicas por cuartil (Q1, Q2, Q3, Q4, Sin cuartil).
     */
    public function getPublicationsByQuartile(): array {
        $sql = "SELECT 
                    cuartil, 
                    COUNT(*) AS cantidad,
                    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM publicaciones)), 1) AS porcentaje
                FROM publicaciones 
                GROUP BY cuartil 
                ORDER BY FIELD(cuartil, 'Q1', 'Q2', 'Q3', 'Q4', 'Sin cuartil')";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene la evolución histórica de publicaciones y citas agrupadas por año.
     */
    public function getPublicationsEvolution(): array {
        $sql = "SELECT 
                    anio, 
                    COUNT(*) AS total_articulos,
                    SUM(citas_estimadas) AS total_citas
                FROM publicaciones 
                GROUP BY anio 
                ORDER BY anio ASC";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene el ranking de investigadores más productivos.
     */
    public function getTopResearchers(int $limit = 5): array {
        $sql = "SELECT 
                    i.id,
                    i.nombre_completo,
                    i.categoria,
                    i.linea_investigacion,
                    i.avatar_url,
                    COUNT(DISTINCT pub.id) AS total_publicaciones,
                    COALESCE(SUM(pub.citas_estimadas), 0) AS total_citas
                FROM investigadores i
                LEFT JOIN publicaciones pub ON pub.investigador_id = i.id
                GROUP BY i.id
                ORDER BY total_publicaciones DESC, total_citas DESC
                LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Obtiene la distribución de proyectos por estado actual de monitoreo.
     */
    public function getProjectsByStatus(): array {
        $sql = "SELECT 
                    estado, 
                    COUNT(*) AS cantidad,
                    SUM(presupuesto) AS presupuesto_subtotal
                FROM proyectos 
                GROUP BY estado";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }
}
