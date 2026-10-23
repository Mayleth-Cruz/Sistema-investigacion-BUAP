<?php
namespace App\Modules\Metrics;

/**
 * ============================================================================
 * SERVICIO DE MÉTRICAS Y MONITOREO (MetricsService)
 * ============================================================================
 * Procesa y estructura la información estadística agregada para el Dashboard
 * y la visualización gerencial de la producción científica.
 */
class MetricsService {
    private MetricsRepository $repository;

    public function __construct() {
        $this->repository = new MetricsRepository();
    }

    /**
     * Construye el consolidado completo de métricas para la pantalla de inicio / dashboard.
     */
    public function getDashboardSummary(): array {
        return [
            'kpis'                 => $this->repository->getGlobalKPIs(),
            'cuartiles'            => $this->repository->getPublicationsByQuartile(),
            'evolucion_anual'      => $this->repository->getPublicationsEvolution(),
            'top_investigadores'   => $this->repository->getTopResearchers(5),
            'proyectos_por_estado' => $this->repository->getProjectsByStatus()
        ];
    }
}
