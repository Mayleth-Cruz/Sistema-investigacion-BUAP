import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FolderGit2, 
  BookOpenCheck, 
  Lightbulb, 
  TrendingUp, 
  Award, 
  DollarSign, 
  Share2 
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import QuartileChart from './QuartileChart';
import { metricsService } from '../../services/metricsService';

/**
 * ============================================================================
 * MÓDULO DASHBOARD (Visualización y Monitoreo Integral)
 * ============================================================================
 * Centraliza la visualización de los KPIs institucionales:
 * - Investigadores en activo
 * - Proyectos en ejecución y presupuesto total captado
 * - Publicaciones totales, porcentaje de Open Access y citas
 * - Gráfico de cuartiles Q1-Q4
 * - Ranking de investigadores con mayor impacto
 */
export default function DashboardModule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const summary = await metricsService.getDashboardSummary();
    setData(summary);
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        Cargando indicadores de investigación...
      </div>
    );
  }

  const { kpis, cuartiles, top_investigadores, proyectos_por_estado } = data;

  // Formateador de moneda para presupuestos
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div>
      {/* 1. Cuadrícula de KPIs Principales */}
      <div className="stat-card-grid">
        <StatCard
          title="Investigadores"
          value={kpis?.investigadores?.total || 0}
          icon={Users}
          accent="blue"
          subtext={`${kpis?.investigadores?.activos || 0} activos en el sistema`}
        />

        <StatCard
          title="Proyectos I+D"
          value={kpis?.proyectos?.total || 0}
          icon={FolderGit2}
          accent="emerald"
          subtext={`${kpis?.proyectos?.en_ejecucion || 0} en fase de ejecución`}
        />

        <StatCard
          title="Presupuesto Gestionado"
          value={formatMoney(kpis?.proyectos?.presupuesto_total)}
          icon={DollarSign}
          accent="amber"
          subtext="Fondos internos y convocatorias"
        />

        <StatCard
          title="Artículos Científicos"
          value={kpis?.publicaciones?.total || 0}
          icon={BookOpenCheck}
          accent="cyan"
          subtext={`${kpis?.publicaciones?.total_q1 || 0} indexados en Cuartil Q1`}
        />

        <StatCard
          title="Citas Totales"
          value={kpis?.publicaciones?.total_citas || 0}
          icon={TrendingUp}
          accent="rose"
          subtext="Impacto bibliométrico estimado"
        />

        <StatCard
          title="Producción Técnica"
          value={kpis?.produccion?.total || 0}
          icon={Lightbulb}
          accent="blue"
          subtext={`${kpis?.produccion?.patentes || 0} patentes registradas`}
        />
      </div>

      {/* 2. Sección de Gráficos y Tableros Analíticos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Gráfico de Distribución por Cuartiles */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Distribución por Cuartil (Q1 - Q4)</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Indexación según factor de impacto (Scopus / Web of Science)
              </p>
            </div>
            <Award size={20} color="var(--accent-cyan)" />
          </div>

          <QuartileChart cuartiles={cuartiles} />

          <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <span><strong>Indicador Clave:</strong> El <strong>{cuartiles?.find(q => q.cuartil === 'Q1')?.porcentaje || 0}%</strong> de las publicaciones institucionales se sitúan en el cuartil superior (Q1).</span>
          </div>
        </div>

        {/* Monitoreo de Fases de Proyectos de Investigación */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Monitoreo de Proyectos de I+D</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Estado actual del ciclo de vida y financiamiento asignado
              </p>
            </div>
            <FolderGit2 size={20} color="var(--accent-emerald)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectos_por_estado?.map((p) => {
              const labelMap = {
                en_ejecucion: { name: 'En Ejecución', color: '#60a5fa' },
                completado:   { name: 'Completados',   color: '#34d399' },
                propuesta:    { name: 'Propuestas en Evaluación', color: '#fbbf24' },
                suspendido:   { name: 'Suspendidos',   color: '#f87171' }
              };
              const item = labelMap[p.estado] || { name: p.estado, color: '#9ca3af' };

              return (
                <div key={p.estado} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{p.cantidad} proyectos</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{formatMoney(p.presupuesto_subtotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Tabla de Investigadores Destacados por Impacto */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Ranking de Productividad e Impacto Científico</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Investigadores con mayor número de publicaciones indexadas y citaciones
            </p>
          </div>
          <TrendingUp size={20} color="var(--accent-blue)" />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Investigador</th>
                <th>Escalafón / Categoría</th>
                <th style={{ textAlign: 'center' }}>Artículos</th>
                <th style={{ textAlign: 'center' }}>Citas Estimadas</th>
                <th style={{ textAlign: 'right' }}>Línea de Investigación</th>
              </tr>
            </thead>
            <tbody>
              {top_investigadores?.map((inv, idx) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : '#b45309', fontSize: '0.9rem' }}>
                        #{idx + 1}
                      </span>
                      <img 
                        src={inv.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'} 
                        alt={inv.nombre_completo}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 600 }}>{inv.nombre_completo}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                      {inv.categoria}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {inv.total_publicaciones}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-rose)' }}>
                    {inv.total_citas}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {inv.linea_investigacion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
