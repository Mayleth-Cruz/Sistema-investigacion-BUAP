import React from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { eje3Service, EJE3_LOAD_ERROR } from '../../services/eje3Service';
import { Eje3Notice, Eje3PageHeader } from './Eje3Common';
import { useEje3Data, formatNumber } from './eje3Hooks';

/** Colores por origen de publicación (paleta BUAP). */
const ORIGENES = [
  { key: 'evento', label: 'Eventos', color: '#003B5C' },
  { key: 'revista_pyad', label: 'Revista PYAD', color: '#00B5E2' },
  { key: 'otra', label: 'Otras publicaciones', color: '#94A3B8' }
];

const SUBTITULO =
  'Publicaciones de docentes resultado de eventos y de la revista PYAD, y producción académica de los docentes investigadores.';

/**
 * ============================================================================
 * PANEL REUTILIZABLE DE VISUALIZACIÓN (Eje 3)
 * ============================================================================
 * Presenta los datos de GET /api/eje3/visualizar con gráficas en CSS/SVG:
 * KPI de publicaciones (evento + PYAD), barras por origen, columnas apiladas
 * por año y ranking de producción de docentes.
 */
export function Eje3VisualizarPanel({ data }) {
  const origen = data.por_origen || {};
  const anios = Array.isArray(data.por_anio) ? data.por_anio : [];
  const docentes = Array.isArray(data.produccion_docentes) ? data.produccion_docentes : [];
  const totales = data.totales || {};

  const maxOrigen = Math.max(1, ...ORIGENES.map((o) => Number(origen[o.key] || 0)));
  const maxAnio = Math.max(1, ...anios.map((a) => Number(a.total || 0)));
  const maxDocente = Math.max(1, ...docentes.map((d) => Number(d.total || 0)));

  return (
    <>
      <div className="eje3-kpi-grid">
        <div className="card eje3-kpi eje3-kpi-main" data-testid="kpi-publicaciones-evento-pyad">
          <div className="eje3-kpi-label">Publicaciones de docentes resultado de eventos y revista PYAD</div>
          <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(data.publicaciones_evento_pyad)}</div>
          <div className="muted" style={{ fontSize: '12.5px' }}>
            {formatNumber(origen.evento)} de eventos · {formatNumber(origen.revista_pyad)} de la revista PYAD
          </div>
        </div>
        <div className="card eje3-kpi">
          <div className="eje3-kpi-label">Publicaciones</div>
          <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(totales.publicaciones)}</div>
        </div>
        <div className="card eje3-kpi">
          <div className="eje3-kpi-label">Proyectos</div>
          <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(totales.proyectos)}</div>
        </div>
        <div className="card eje3-kpi">
          <div className="eje3-kpi-label">Producción técnica</div>
          <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(totales.produccion_tecnica)}</div>
        </div>
        <div className="card eje3-kpi">
          <div className="eje3-kpi-label">Docentes investigadores</div>
          <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(totales.docentes)}</div>
        </div>
      </div>

      <div className="eje3-two-col">
        <section className="card" style={{ padding: '24px' }} aria-label="Publicaciones por origen">
          <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
            Publicaciones por origen
          </h2>
          <div className="eje3-bars" role="list">
            {ORIGENES.map((o) => {
              const value = Number(origen[o.key] || 0);
              return (
                <div key={o.key} className="eje3-bar-row" role="listitem" aria-label={`${o.label}: ${value}`}>
                  <span className="eje3-bar-label">{o.label}</span>
                  <span className="eje3-bar-track">
                    <span className="eje3-bar-fill" style={{ width: `${(value / maxOrigen) * 100}%`, background: o.color }} />
                  </span>
                  <span className="eje3-bar-value">{formatNumber(value)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card" style={{ padding: '24px' }} aria-label="Publicaciones por año">
          <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
            Publicaciones por año
          </h2>
          {anios.length === 0 ? (
            <p className="muted">Aún no hay publicaciones registradas por año.</p>
          ) : (
            <>
              <div className="eje3-legend">
                {ORIGENES.map((o) => (
                  <span key={o.key} className="eje3-legend-item">
                    <span className="eje3-legend-swatch" style={{ background: o.color }} />
                    {o.label}
                  </span>
                ))}
              </div>
              <div className="eje3-columns" role="list">
                {anios.map((a) => {
                  const total = Number(a.total || 0);
                  return (
                    <div
                      key={a.anio}
                      className="eje3-column"
                      role="listitem"
                      aria-label={`${a.anio}: ${total} publicaciones`}
                    >
                      <span className="eje3-column-total">{formatNumber(total)}</span>
                      <span className="eje3-column-stack" style={{ height: `${(total / maxAnio) * 100}%` }}>
                        {ORIGENES.map((o) => {
                          const v = Number(a[o.key] || 0);
                          if (v <= 0) return null;
                          return (
                            <span
                              key={o.key}
                              title={`${o.label}: ${v}`}
                              style={{ flex: v, background: o.color, minHeight: '3px' }}
                            />
                          );
                        })}
                      </span>
                      <span className="eje3-column-label">{a.anio}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card" style={{ padding: '24px' }} aria-label="Producción de docentes investigadores">
        <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
          Producción académica de docentes investigadores
        </h2>
        {docentes.length === 0 ? (
          <p className="muted">Aún no hay producción académica registrada.</p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>#</th>
                  <th>Docente</th>
                  <th style={{ textAlign: 'center' }}>Publicaciones</th>
                  <th style={{ textAlign: 'center' }}>Proyectos</th>
                  <th style={{ textAlign: 'center' }}>Prod. técnica</th>
                  <th style={{ minWidth: '180px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {docentes.map((d, i) => (
                  <tr key={d.investigador_id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong style={{ color: 'var(--text-dark)' }}>{d.nombre_completo}</strong>
                      {d.afiliacion && <span className="muted" style={{ display: 'block', fontSize: '12.5px' }}>{d.afiliacion}</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{formatNumber(d.publicaciones)}</td>
                    <td style={{ textAlign: 'center' }}>{formatNumber(d.proyectos)}</td>
                    <td style={{ textAlign: 'center' }}>{formatNumber(d.produccion_tecnica)}</td>
                    <td>
                      <div className="eje3-bar-row" style={{ gridTemplateColumns: '1fr 36px' }}>
                        <span className="eje3-bar-track">
                          <span
                            className="eje3-bar-fill"
                            style={{ width: `${(Number(d.total || 0) / maxDocente) * 100}%`, background: '#00B5E2' }}
                          />
                        </span>
                        <span className="eje3-bar-value">{formatNumber(d.total)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Pantalla de visualización (solo zona de administración; el backend exige
 * token de administrador en GET /api/eje3/visualizar).
 */
export default function Eje3VisualizarScreen({ onNavigate }) {
  const { data, loading, failed } = useEje3Data(() => eje3Service.getVisualizar(), []);

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar activeNav="eje3-visualizar" onNavigate={onNavigate} />
      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader title="Visualizar producción" subtitle={SUBTITULO} />
        {failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
        {loading && !data && <p className="muted">Cargando información...</p>}
        {data && <Eje3VisualizarPanel data={data} />}
      </div>
    </div>
  );
}
