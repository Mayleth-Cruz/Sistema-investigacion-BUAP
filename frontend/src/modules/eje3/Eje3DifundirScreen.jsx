import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { IconPlus, IconSearch } from '../../components/Icons';
import { eje3Service, EJE3_LOAD_ERROR, formatApiErrors } from '../../services/eje3Service';
import { EVENTO_FORM, TIPOS_EVENTO, ESTADOS_EVENTO, formatCell } from './registroConfig';
import { Eje3Notice, Eje3PageHeader, Eje3TableMessage, Eje3ConfirmModal } from './Eje3Common';
import { useEje3Data, useDebounced } from './eje3Hooks';
import Eje3FormModal from './Eje3FormModal';
import { Eje3DifusionContent } from './Eje3DifusionPublicScreen';

const labelOf = (options, value) => (options.find((o) => o.value === value) || {}).label || value || '—';

/**
 * ============================================================================
 * SCREEN: EJE 3 · DIFUNDIR (Eje3DifundirScreen)
 * ============================================================================
 * Administración de eventos de investigación (semilleros, congreso, revista
 * PYAD y otros), con interruptor de publicación y vista previa de lo que ve
 * el público en /eje3/difusion.
 */
export default function Eje3DifundirScreen({ onNavigate, showToast }) {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const eventos = useEje3Data(
    () => eje3Service.getEventos({ search: debouncedSearch, tipo, estado }),
    [debouncedSearch, tipo, estado]
  );
  const preview = useEje3Data(() => eje3Service.getDifusion(), []);

  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, errors: [] });
  const [actionError, setActionError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const list = Array.isArray(eventos.data) ? eventos.data : [];

  const refresh = () => {
    eventos.reload();
    preview.reload();
  };

  const handleSubmit = (payload, isNew) =>
    isNew ? eje3Service.createEvento(payload) : eje3Service.updateEvento(modal.row.id, payload);

  const handleSaved = (result, isNew) => {
    if (showToast) showToast(isNew ? 'Evento creado.' : 'Evento actualizado.');
    refresh();
  };

  const togglePublico = async (evento) => {
    setActionError('');
    setTogglingId(evento.id);
    const nuevo = Number(evento.publico) === 1 || evento.publico === true ? 0 : 1;
    // Se envía el evento completo por si el backend valida los campos requeridos en PUT
    const res = await eje3Service.updateEvento(evento.id, {
      nombre: evento.nombre,
      tipo: evento.tipo,
      edicion: evento.edicion ?? null,
      fecha_inicio: evento.fecha_inicio ?? null,
      fecha_fin: evento.fecha_fin ?? null,
      sede: evento.sede ?? null,
      descripcion: evento.descripcion ?? null,
      estado: evento.estado,
      publico: nuevo
    });
    setTogglingId(null);
    if (!res || !res.success) {
      setActionError(formatApiErrors(res).join(' '));
      return;
    }
    if (showToast) showToast(nuevo ? `"${evento.nombre}" ahora es público.` : `"${evento.nombre}" dejó de ser público.`);
    refresh();
  };

  const confirmDelete = async () => {
    setDeleteState({ busy: true, errors: [] });
    const res = await eje3Service.deleteEvento(toDelete.id);
    if (!res || !res.success) {
      setDeleteState({ busy: false, errors: [(res && res.message) || 'No se pudo eliminar el evento.'] });
      return;
    }
    if (showToast) showToast(res.message || 'Evento eliminado.');
    setToDelete(null);
    setDeleteState({ busy: false, errors: [] });
    refresh();
  };

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar activeNav="eje3-difundir" onNavigate={onNavigate} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Difusión de eventos"
          subtitle="Eje 3 · Eventos de semilleros, Congreso Internacional y revista PYAD que se publican en el portal."
        >
          <button
            type="button"
            className="btn"
            onClick={() => {
              setActionError('');
              setModal({ row: null });
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <IconPlus size={14} />
            <span>Nuevo evento</span>
          </button>
        </Eje3PageHeader>

        {eventos.failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
        {actionError && <Eje3Notice>{actionError}</Eje3Notice>}

        <div className="card" style={{ padding: '24px' }}>
          <div className="eje3-toolbar">
            <div className="eje3-search">
              <IconSearch size={16} color="#64748B" />
              <input
                type="search"
                aria-label="Buscar evento"
                placeholder="Buscar por nombre, sede o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="eje3-filter">
              <select aria-label="Filtrar por tipo de evento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Tipo: todos</option>
                {TIPOS_EVENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="eje3-filter">
              <select aria-label="Filtrar por estado del evento" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Estado: todos</option>
                {ESTADOS_EVENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Tipo</th>
                  <th>Fechas</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Proyectos</th>
                  <th>Público</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {eventos.loading && eventos.data === null ? (
                  <Eje3TableMessage colSpan={7}>Cargando eventos...</Eje3TableMessage>
                ) : eventos.failed ? (
                  <Eje3TableMessage colSpan={7}>No hay información disponible.</Eje3TableMessage>
                ) : list.length === 0 ? (
                  <Eje3TableMessage colSpan={7}>No se encontraron eventos.</Eje3TableMessage>
                ) : (
                  list.map((ev) => {
                    const esPublico = Number(ev.publico) === 1 || ev.publico === true;
                    return (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                          {ev.nombre}
                          {(ev.edicion || ev.sede) && (
                            <span className="muted" style={{ display: 'block', fontWeight: 400, fontSize: '12.5px' }}>
                              {[ev.edicion, ev.sede].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </td>
                        <td>{labelOf(TIPOS_EVENTO, ev.tipo)}</td>
                        <td>
                          {formatCell({ key: 'fecha_inicio', type: 'date' }, ev)}
                          {ev.fecha_fin ? ` – ${formatCell({ key: 'fecha_fin', type: 'date' }, ev)}` : ''}
                        </td>
                        <td>
                          <span className="tag">{labelOf(ESTADOS_EVENTO, ev.estado)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{ev.total_proyectos ?? 0}</td>
                        <td>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={esPublico}
                            aria-label={`Publicar ${ev.nombre}`}
                            className={`eje3-switch ${esPublico ? 'on' : ''}`}
                            disabled={togglingId === ev.id}
                            onClick={() => togglePublico(ev)}
                          >
                            <span className="eje3-switch-knob" />
                          </button>
                          <span className="eje3-switch-text">{esPublico ? 'Público' : 'Oculto'}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="eje3-link-btn"
                            aria-label={`Editar ${ev.nombre}`}
                            onClick={() => {
                              setActionError('');
                              setModal({ row: ev });
                            }}
                          >
                            Editar
                          </button>
                          <span style={{ color: '#8A9794', margin: '0 8px' }}>·</span>
                          <button
                            type="button"
                            className="eje3-link-btn eje3-link-danger"
                            aria-label={`Eliminar ${ev.nombre}`}
                            onClick={() => {
                              setDeleteState({ busy: false, errors: [] });
                              setToDelete(ev);
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <section className="eje3-preview" aria-label="Vista previa de lo publicado">
          <h2 className="titulo-gotham-black" style={{ fontSize: '22px', margin: 0 }}>
            Vista previa de lo publicado
          </h2>
          <p className="muted" style={{ margin: '4px 0 16px', fontSize: '14px' }}>
            Así se ve actualmente en el portal público. Solo aparecen los eventos marcados como públicos.
          </p>
          {preview.failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
          {preview.loading && !preview.data && <p className="muted">Cargando vista previa...</p>}
          {preview.data && <Eje3DifusionContent data={preview.data} interactive={false} />}
        </section>
      </div>

      {modal && (
        <Eje3FormModal
          config={EVENTO_FORM}
          row={modal.row}
          onSubmit={handleSubmit}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {toDelete && (
        <Eje3ConfirmModal
          title="Eliminar evento"
          message={`¿Seguro que deseas eliminar "${toDelete.nombre}"? Los proyectos y participantes ligados quedarán sin evento.`}
          busy={deleteState.busy}
          errors={deleteState.errors}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
