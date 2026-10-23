<?php
namespace App\Modules\Metrics;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE MÉTRICAS (MetricsController)
 * ============================================================================
 * Endpoints:
 * - GET /api/metricas/dashboard  -> Resumen integral de indicadores, cuartiles y rankings
 */
class MetricsController {
    private MetricsService $service;

    public function __construct() {
        $this->service = new MetricsService();
    }

    /**
     * Devuelve el consolidado de métricas para la visualización en gráficos y tableros.
     */
    public function dashboard(Request $request): void {
        $summary = $this->service->getDashboardSummary();
        Response::success($summary, 'Métricas del sistema de investigación obtenidas con éxito.');
    }
}
