import React, { useState } from 'react';
import DocenteSidebar from '../../components/DocenteSidebar';
import { IconPlus, IconSearch, IconSend, IconLock } from '../../components/Icons';
import { docenteService } from '../../services/docenteService';
import { eje3Service, formatApiErrors, EJE3_LOAD_ERROR } from '../../services/eje3Service';
import { Eje3Notice, Eje3PageHeader, Eje3ConfirmModal, RegistroEstadoTag } from '../eje3/Eje3Common';
import { useEje3Data, useDebounced } from '../eje3/eje3Hooks';
import {
  REGISTRO_ESTADOS,
  TIPOS_PROYECTO,
  formatRangoFechas,
  labelTipoProyecto,
  labelEstadoProyecto
} from '../eje3/registroConfig';
import Eje3FormModal from '../eje3/Eje3FormModal';
import ProyectoDetalle from '../eje3/ProyectoDetalle';
import { DOCENTE_PROYECTO_FORM, esEditable, motivoBloqueo } from './docenteConfig';

/**
 * ============================================================================
 * SCREEN: DOCENTE · MIS PROYECTOS (DocenteProyectosScreen)
 * ============================================================================
 * Lista completa de los proyectos del docente con filtros y buscador. Permite
 * registrar, editar y borrar mientras el proyecto está en borrador o devuelto,
 * y enviarlo a revisión. Los proyectos en revisión o aprobados se muestran
 * bloqueados (solo lectura). El comentario del administrador es visible en
 * los proyectos devueltos.
 */
export default function DocenteProyectosScreen({ onNavigate, showToast, user }) {
  const [search, setSearch] = useState('');
  const [registroEstado, setRegistroEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const [modal, setModal] = useState(null); // { row } | null
  const [detalle, setDetalle] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toSend, setToSend] = useState(null);
  const [confirmState, setConfirmState] = useState({ busy: false, errors: [] });
  const [actionError, setActionError] = useState('');

  const { data: eventos, loading: loadingEv } = useEje3Data(() => eje3Service.getEventos(), []);
  const { data: rows, loading, failed, reload } = useEje3Data(
    () => docenteService.proyectos.list({ registro_estado: registroEstado, tipo, search: debouncedSearch }),
    [registroEstado, tipo, debouncedSearch]
  );
  const list = Array.isArray(rows) ? rows : [];
  const nombre = user && user.nombre ? user.nombre : '';

  const loadDetail = async (row) => {
    setActionError('');
    const detail = await docenteService.proyectos.get(row.id);
    if (!detail) {
      setActionError('No se pudo cargar el detalle del proyecto. Intenta de nuevo.');
      return null;
    }
    return detail;
  };

  const openCreate = () => {
    setActionError('');
    setModal({ row: null });
  };

  const openEdit = async (row) => {
    const detail = await loadDetail(row);
    if (detail) setModal({ row: detail });
  };

  const openDetail = async (row) => {
    const detail = await loadDetail(row);
    if (detail) setDetalle(detail);
  };

  const handleSubmit = (payload, isNew) =>
    isNew ? docenteService.proyectos.create(payload) : docenteService.proyectos.update(modal.row.id, payload);

  const handleSaved = (result, isNew) => {
    if (showToast) showToast(isNew ? 'Proyecto guardado como borrador.' : 'Proyecto actualizado.');
    reload();
  };

  const confirmDelete = async () => {
    setConfirmState({ busy: true, errors: [] });
    const res = await docenteService.proyectos.remove(toDelete.id);
    if (!res || !res.success) {
      setConfirmState({ busy: false, errors: formatApiErrors(res) });
      reload();
      return;
    }
    if (showToast) showToast(res.message || 'Proyecto eliminado.');
    setToDelete(null);
    setConfirmState({ busy: false, errors: [] });
    reload();
  };

  const confirmSend = async () => {
    setConfirmState({ busy: true, errors: [] });
    const res = await docenteService.proyectos.enviar(toSend.id);
    if (!res || !res.success) {
      setConfirmState({ busy: false, errors: formatApiErrors(res) });
      reload();
      return;
    }
    if (showToast) showToast(res.message || 'Proyecto enviado a revisión.');
    setToSend(null);
    setConfirmState({ busy: false, errors: [] });
    reload();
  };

  const hayFiltros = Boolean(registroEstado || tipo || search);

  return (
    <div className="admin-layout-wrapper">
      <DocenteSidebar activeNav="proyectos" onNavigate={onNavigate} nombre={nombre} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Mis proyectos"
          subtitle="Registra tus proyectos de investigación, semilleros y titulación y envíalos a revisión."
        >
          <button type="button" className="btn" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <IconPlus size={14} />
            <span>Nuevo proyecto</span>
          </button>
        </Eje3PageHeader>

        {failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
        {actionError && <Eje3Notice>{actionError}</Eje3Notice>}

        <div className="card" style={{ padding: '24px' }}>
          <div className="eje3-toolbar">
            <div className="eje3-search">
              <IconSearch size={16} color="#64748B" />
              <input
                type="search"
                aria-label="Buscar en mis proyectos"
                placeholder="Buscar por título, código o línea..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="eje3-filter">
              <select
                aria-label="Filtrar por estado de registro"
                value={registroEstado}
                onChange={(e) => setRegistroEstado(e.target.value)}
              >
                <option value="">Registro: todos</option>
                {REGISTRO_ESTADOS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="eje3-filter">
              <select
                aria-label="Filtrar por tipo de proyecto"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">Tipo: todos</option>
                {TIPOS_PROYECTO.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="muted" style={{ fontSize: '13px', margin: '0 0 12px' }} aria-live="polite">
            {failed ? '' : loading && rows === null ? 'Cargando...' : `${list.length} ${list.length === 1 ? 'proyecto' : 'proyectos'}`}
          </div>

          {loading && rows === null ? (
            <p className="docente-vacio muted">Cargando proyectos...</p>
          ) : failed ? (
            <p className="docente-vacio muted">No hay información disponible.</p>
          ) : list.length === 0 ? (
            <p className="docente-vacio muted">
              {hayFiltros
                ? 'No se encontraron proyectos con esos filtros.'
                : 'Aún no has registrado proyectos. Usa "Nuevo proyecto" para comenzar.'}
            </p>
          ) : (
            <ul className="docente-proyectos-list">
              {list.map((p) => {
                const editable = esEditable(p);
                return (
                  <li key={p.id} className="docente-proyecto" data-estado={p.registro_estado}>
                    <div className="docente-proyecto-head">
                      <div className="docente-proyecto-titulo">
                        <strong>{p.titulo}</strong>
                        <span className="muted">
                          {[p.codigo, labelTipoProyecto(p.tipo), p.estado ? labelEstadoProyecto(p.estado) : null].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <RegistroEstadoTag value={p.registro_estado} />
                    </div>

                    <div className="docente-proyecto-meta muted">
                      {p.evento_nombre && <span>Evento: {p.evento_nombre}</span>}
                      {(p.fecha_inicio || p.fecha_fin) && <span>{formatRangoFechas(p.fecha_inicio, p.fecha_fin)}</span>}
                      <span>{Number(p.total_apartados) || 0} {Number(p.total_apartados) === 1 ? 'apartado' : 'apartados'}</span>
                    </div>

                    {p.registro_estado === 'devuelto' && p.comentario_revision && (
                      <div className="docente-comentario" role="note">
                        <strong>Comentario del administrador</strong>
                        <p>{p.comentario_revision}</p>
                      </div>
                    )}

                    {!editable && (
                      <p className="docente-bloqueo">
                        <IconLock size={14} />
                        <span>{motivoBloqueo(p)}</span>
                      </p>
                    )}

                    <div className="docente-proyecto-acciones">
                      {editable ? (
                        <>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setConfirmState({ busy: false, errors: [] });
                              setToSend(p);
                            }}
                            aria-label={`Enviar a revisión ${p.titulo}`}
                          >
                            <IconSend size={14} />
                            <span>Enviar a revisión</span>
                          </button>
                          <button
                            type="button"
                            className="eje3-link-btn"
                            onClick={() => openEdit(p)}
                            aria-label={`Editar ${p.titulo}`}
                          >
                            Editar
                          </button>
                          <span style={{ color: '#8A9794' }}>·</span>
                          <button
                            type="button"
                            className="eje3-link-btn eje3-link-danger"
                            onClick={() => {
                              setConfirmState({ busy: false, errors: [] });
                              setToDelete(p);
                            }}
                            aria-label={`Eliminar ${p.titulo}`}
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="eje3-link-btn"
                          onClick={() => openDetail(p)}
                          aria-label={`Ver detalle ${p.titulo}`}
                        >
                          Ver detalle
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {modal && (
        <Eje3FormModal
          config={DOCENTE_PROYECTO_FORM}
          row={modal.row}
          subtitle={modal.row ? modal.row.codigo : 'Se guardará como borrador'}
          lookups={{ eventos: loadingEv ? [] : eventos }}
          onSubmit={handleSubmit}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {detalle && <ProyectoDetalle proyecto={detalle} onClose={() => setDetalle(null)} />}

      {toDelete && (
        <Eje3ConfirmModal
          title="Eliminar proyecto"
          message={`¿Seguro que deseas eliminar "${toDelete.titulo}"? Esta acción no se puede deshacer.`}
          busy={confirmState.busy}
          errors={confirmState.errors}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {toSend && (
        <Eje3ConfirmModal
          title="Enviar a revisión"
          tone="primary"
          confirmLabel="Enviar a revisión"
          busyLabel="Enviando..."
          message={`Vas a enviar "${toSend.titulo}" al administrador. Mientras esté en revisión no podrás editarlo ni eliminarlo. Para enviarlo se requiere título, resumen y línea de investigación.`}
          busy={confirmState.busy}
          errors={confirmState.errors}
          onConfirm={confirmSend}
          onCancel={() => setToSend(null)}
        />
      )}
    </div>
  );
}
