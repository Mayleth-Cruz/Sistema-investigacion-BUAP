import { apiGet } from './api';
import { mockMetricsSummary } from '../data/mockData';

/**
 * ============================================================================
 * SERVICIO DE MÉTRICAS Y MONITOREO (FRONTEND)
 * ============================================================================
 * Obtiene el resumen de KPIs, cuartiles, proyectos y ranking de investigadores.
 */
export const metricsService = {
  async getDashboardSummary() {
    return await apiGet('/metricas/dashboard', mockMetricsSummary);
  }
};
