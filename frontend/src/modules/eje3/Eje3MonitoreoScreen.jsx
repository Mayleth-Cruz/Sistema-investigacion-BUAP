import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { IconChevronDown, IconChevronRight, IconSearch } from '../../components/Icons';
import { eje3Service, EJE3_LOAD_ERROR, formatApiErrors } from '../../services/eje3Service';
import { Eje3Notice, Eje3PageHeader, Eje3TableMessage, Eje3ModalShell, Eje3ErrorList } from './Eje3Common';
import { useEje3Data, useDebounced, formatNumber } from './eje3Hooks';

const NIVELES_SNII = ['Candidato', 'I', 'II', 'III'];

const FILTROS_SNII = [
  { value: 'todos', label: 'Todos los docentes' },
  { value: 'en_snii', label: 'En el SNII' },
  { value: 'elegibles', label: 'Elegibles al SNII' },
  { value: 'sin', label: 'Sin SNII' }
];

/**
 * ============================================================================
 * SCREEN: EJE 3 · MONITOREO (Eje3MonitoreoScreen)
 * ============================================================================
 * Cuatro indicadores con listas de detalle expandibles, desglose del SNII por
 * nivel y tabla de docentes con edición de nivel SNII / elegibilidad.
 */
export default function Eje3MonitoreoScreen({ onNavigate, showToast }) {
  const monitoreo = useEje3Data(() => eje3Service.getMonitoreo(), []);

  const [search, setSearch] = useState('');
  const [snii, setSnii] = useState('todos');
  const debouncedSearch = useDebounced(search, 300);
  const docentes = useEje3Data(
    () => eje3Service.getDocentes({ search: debouncedSearch, snii: snii === 'todos' ? '' : snii }),
    [debouncedSearch, snii]
  );

  const [editing, setEditing] = useState(null);

  const m = monitoreo.data;
  const detalle = (m && m.detalle) || {};

  const indicadores = m
    ? [
        {
          key: 'docentes_con_proyectos',
          label: 'Docentes con proyectos de investigación registrados',
          value: m.docentes_con_proyectos,
          items: detalle.con_proyectos || [],
          extra: (it) => (it.total !== undefined ? `${it.total} ${Number(it.total) === 1 ? 'proyecto' : 'proyectos'}` : '')
        },
        {
          key: 'docentes_titulacion_civ',
          label: 'Docentes con proyectos de titulación articulados al CIV',
          value: m.docentes_titulacion_civ,
          items: detalle.titulacion_civ || [],
          extra: (it) => (it.total !== undefined ? `${it.total} ${Number(it.total) === 1 ? 'proyecto' : 'proyectos'}` : '')
        },
        {
          key: 'profesores_snii',
          label: 'Profesores en el SNII',
          value: m.profesores_snii,
          items: detalle.en_snii || [],
          extra: (it) => (it.snii_nivel ? `Nivel ${it.snii_nivel}` : '')
        },
        {
          key: 'profesores_elegibles_snii',
          label: 'Profesores elegibles en el SNII',
          value: m.profesores_elegibles_snii,
          items: detalle.elegibles || [],
          extra: () => ''
        }
      ]
    : [];

  const nivelData = (m && m.snii_por_nivel) || {};
  const maxNivel = Math.max(1, ...NIVELES_SNII.map((n) => Number(nivelData[n] || 0)));

  const docentesList = Array.isArray(docentes.data) ? docentes.data : [];

  const handleSaved = () => {
    if (showToast) showToast('Datos del SNII actualizados.');
    monitoreo.reload();
    docentes.reload();
  };

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar activeNav="eje3-monitoreo" onNavigate={onNavigate} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Monitoreo de investigación"
          subtitle="Eje 3 · Indicadores de docentes con proyectos y su situación en el SNII."
        />

        {monitoreo.failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
        {monitoreo.loading && !m && <p className="muted">Cargando indicadores...</p>}

        {m && (
          <>
            <div className="eje3-kpi-grid">
              {indicadores.map((ind) => (
                <IndicatorCard key={ind.key} indicador={ind} totalDocentes={m.total_docentes} />
              ))}
            </div>

            <div className="eje3-two-col">
              <div className="card" style={{ padding: '24px' }}>
                <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
                  Profesores en el SNII por nivel
                </h2>
                <div className="eje3-bars" role="list">
                  {NIVELES_SNII.map((nivel) => {
                    const value = Number(nivelData[nivel] || 0);
                    return (
                      <div key={nivel} className="eje3-bar-row" role="listitem" aria-label={`Nivel ${nivel}: ${value}`}>
                        <span className="eje3-bar-label">{nivel === 'Candidato' ? 'Candidato' : `Nivel ${nivel}`}</span>
                        <span className="eje3-bar-track">
                          <span className="eje3-bar-fill" style={{ width: `${(value / maxNivel) * 100}%`, background: '#003B5C' }} />
                        </span>
                        <span className="eje3-bar-value">{formatNumber(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: '24px' }}>
                <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
                  Resumen de la planta docente
                </h2>
                <dl className="eje3-summary">
                  <div>
                    <dt>Docentes activos</dt>
                    <dd>{formatNumber(m.total_docentes)}</dd>
                  </div>
                  <div>
                    <dt>Docentes con proyectos de semilleros</dt>
                    <dd>{formatNumber(m.docentes_con_semilleros)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </>
        )}

        <div className="card" style={{ padding: '24px' }}>
          <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
            Docentes y situación en el SNII
          </h2>

          <div className="eje3-toolbar">
            <div className="eje3-search">
              <IconSearch size={16} color="#64748B" />
              <input
                type="search"
                aria-label="Buscar docente"
                placeholder="Buscar docente por nombre, correo o línea..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="eje3-filter">
              <select aria-label="Filtrar por situación en el SNII" value={snii} onChange={(e) => setSnii(e.target.value)}>
                {FILTROS_SNII.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {docentes.failed && <Eje3Notice style={{ marginBottom: '16px' }}>{EJE3_LOAD_ERROR}</Eje3Notice>}

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Afiliación</th>
                  <th>Línea de investigación</th>
                  <th style={{ textAlign: 'center' }}>Proyectos</th>
                  <th>Nivel SNII</th>
                  <th>Elegible</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docentes.loading && docentes.data === null ? (
                  <Eje3TableMessage colSpan={7}>Cargando docentes...</Eje3TableMessage>
                ) : docentes.failed ? (
                  <Eje3TableMessage colSpan={7}>No hay información disponible.</Eje3TableMessage>
                ) : docentesList.length === 0 ? (
                  <Eje3TableMessage colSpan={7}>No se encontraron docentes.</Eje3TableMessage>
                ) : (
                  docentesList.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                        {d.nombre_completo}
                        {d.correo && <span className="muted" style={{ display: 'block', fontWeight: 400, fontSize: '12.5px' }}>{d.correo}</span>}
                      </td>
                      <td>{d.afiliacion || '—'}</td>
                      <td>{d.linea_investigacion || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{d.total_proyectos ?? 0}</td>
                      <td>
                        {d.snii_nivel ? <span className="tag">{d.snii_nivel}</span> : <span className="muted">Sin nivel</span>}
                      </td>
                      <td>{Number(d.snii_elegible) === 1 || d.snii_elegible === true ? 'Sí' : 'No'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="eje3-link-btn"
                          aria-label={`Editar SNII de ${d.nombre_completo}`}
                          onClick={() => setEditing(d)}
                        >
                          Editar SNII
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <SniiModal docente={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tarjeta de indicador con detalle expandible
 * ------------------------------------------------------------------------- */
function IndicatorCard({ indicador, totalDocentes }) {
  const [open, setOpen] = useState(false);
  const panelId = `eje3-detalle-${indicador.key}`;

  return (
    <div className="card eje3-kpi" data-testid={`indicador-${indicador.key}`}>
      <div className="eje3-kpi-label">{indicador.label}</div>
      <div className="eje3-kpi-value titulo-gotham-black">{formatNumber(indicador.value)}</div>
      {totalDocentes !== undefined && totalDocentes !== null && (
        <div className="muted" style={{ fontSize: '12.5px' }}>de {formatNumber(totalDocentes)} docentes activos</div>
      )}
      <button
        type="button"
        className="eje3-link-btn eje3-kpi-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <span>{open ? 'Ocultar detalle' : 'Ver detalle'}</span>
      </button>
      {open && (
        <ul id={panelId} className="eje3-detail-list">
          {indicador.items.length === 0 ? (
            <li className="muted">Sin docentes en este indicador.</li>
          ) : (
            indicador.items.map((it) => (
              <li key={it.id}>
                <span>{it.nombre_completo}</span>
                {indicador.extra(it) && <span className="tag">{indicador.extra(it)}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Modal de edición de SNII
 * ------------------------------------------------------------------------- */
function SniiModal({ docente, onClose, onSaved }) {
  const [nivel, setNivel] = useState(docente.snii_nivel || '');
  const [elegible, setElegible] = useState(Number(docente.snii_elegible) === 1 || docente.snii_elegible === true);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const res = await eje3Service.updateSnii(docente.id, {
        snii_nivel: nivel === '' ? null : nivel,
        snii_elegible: elegible ? 1 : 0
      });
      if (!res || !res.success) {
        setErrors(formatApiErrors(res));
        return;
      }
      onSaved(res);
      onClose();
    } catch {
      setErrors(['Ocurrió un error al guardar. Intenta de nuevo.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Eje3ModalShell
      title="Editar situación en el SNII"
      subtitle={docente.nombre_completo}
      onClose={onClose}
      maxWidth="460px"
    >
      <Eje3ErrorList messages={errors} />
      <form onSubmit={handleSubmit}>
        <div className="eje3-field" style={{ marginBottom: '16px' }}>
          <label htmlFor="eje3-snii-nivel">Nivel SNII</label>
          <select id="eje3-snii-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Sin nivel</option>
            {NIVELES_SNII.map((n) => (
              <option key={n} value={n}>
                {n === 'Candidato' ? 'Candidato' : `Nivel ${n}`}
              </option>
            ))}
          </select>
        </div>
        <label className="eje3-check" htmlFor="eje3-snii-elegible">
          <input
            id="eje3-snii-elegible"
            type="checkbox"
            checked={elegible}
            onChange={(e) => setElegible(e.target.checked)}
          />
          <span>Elegible para el SNII</span>
        </label>
        <p className="muted" style={{ fontSize: '12.5px', margin: '6px 0 0' }}>
          Marca manual: el indicador cuenta como elegibles a quienes no tienen nivel asignado.
        </p>
        <div className="eje3-modal-actions">
          <button type="button" className="btn btn2" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Eje3ModalShell>
  );
}
