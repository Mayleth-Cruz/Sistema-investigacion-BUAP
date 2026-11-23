import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { IconCheckCircle } from '../../components/Icons';
import { eje3Service, formatApiErrors, EJE3_LOAD_ERROR } from '../../services/eje3Service';
import { Eje3Notice, Eje3PageHeader, Eje3ModalShell, Eje3ErrorList } from './Eje3Common';
import { useEje3Data, formatNumber } from './eje3Hooks';
import { formatFecha, labelTipoProyecto } from './registroConfig';
import ProyectoDetalle from './ProyectoDetalle';

export const COMENTARIO_MIN = 3;
export const COMENTARIO_MAX = 2000;

/**
 * ============================================================================
 * SCREEN: DOCENTES · REVISIÓN DE PROYECTOS (AdminDocentesRevisionScreen)
 * ============================================================================
 * Bandeja de proyectos enviados por los docentes (más antiguos primero). El
 * administrador puede ver el detalle con sus apartados, aprobarlos (comentario
 * opcional) o devolverlos (comentario obligatorio).
 */
export default function AdminDocentesRevisionScreen({ onNavigate, showToast }) {
  const { data, loading, failed, reload } = useEje3Data(() => eje3Service.revision(), []);
  const [detalle, setDetalle] = useState(null);
  const [revision, setRevision] = useState(null); // { proyecto, accion }
  const [actionError, setActionError] = useState('');

  const proyectos = data && Array.isArray(data.proyectos) ? data.proyectos : [];
  const pendientes = data && Number.isFinite(Number(data.pendientes)) ? Number(data.pendientes) : null;

  const openDetail = async (p) => {
    setActionError('');
    const detail = await eje3Service.resources.proyectos.get(p.id);
    if (!detail) {
      setActionError('No se pudo cargar el detalle del proyecto. Intenta de nuevo.');
      return;
    }
    setDetalle({ ...p, ...detail });
  };

  const startRevision = (proyecto, accion) => {
    setDetalle(null);
    setRevision({ proyecto, accion });
  };

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar
        activeNav="docentes-revision"
        onNavigate={onNavigate}
        pendientes={pendientes === null ? null : pendientes}
      />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Revisión de proyectos"
          subtitle="Proyectos que los docentes enviaron para su aprobación."
        />

        {failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
        {actionError && <Eje3Notice>{actionError}</Eje3Notice>}

        <div className="card" style={{ padding: '24px' }}>
          <div className="muted" style={{ fontSize: '13px', margin: '0 0 12px' }} aria-live="polite">
            {failed ? '' : loading && data === null
              ? 'Cargando...'
              : `${formatNumber(pendientes === null ? proyectos.length : pendientes)} ${(pendientes === null ? proyectos.length : pendientes) === 1 ? 'proyecto pendiente' : 'proyectos pendientes'}`}
          </div>

          {loading && data === null ? (
            <p className="docente-vacio muted">Cargando proyectos...</p>
          ) : failed ? (
            <p className="docente-vacio muted">No hay información disponible.</p>
          ) : proyectos.length === 0 ? (
            <p className="docente-vacio muted">No hay proyectos pendientes de revisión.</p>
          ) : (
            <ul className="docente-proyectos-list">
              {proyectos.map((p) => (
                <li key={p.id} className="docente-proyecto" data-estado="enviado">
                  <div className="docente-proyecto-head">
                    <div className="docente-proyecto-titulo">
                      <strong>{p.titulo}</strong>
                      <span className="muted">
                        {[p.codigo, labelTipoProyecto(p.tipo)].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                  <div className="docente-proyecto-meta muted">
                    <span>Docente: {p.investigador_principal_nombre || 'Sin docente'}</span>
                    {p.enviado_en && <span>Enviado el {formatFecha(p.enviado_en)}</span>}
                    <span>{Number(p.total_apartados) || 0} {Number(p.total_apartados) === 1 ? 'apartado' : 'apartados'}</span>
                  </div>
                  <div className="docente-proyecto-acciones">
                    <button type="button" className="btn" onClick={() => startRevision(p, 'aprobar')} aria-label={`Aprobar ${p.titulo}`}>
                      <IconCheckCircle size={14} />
                      <span>Aprobar</span>
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => startRevision(p, 'devolver')} aria-label={`Devolver ${p.titulo}`}>
                      Devolver
                    </button>
                    <button type="button" className="eje3-link-btn" onClick={() => openDetail(p)} aria-label={`Ver detalle ${p.titulo}`}>
                      Ver detalle
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {detalle && (
        <ProyectoDetalle proyecto={detalle} showDocente onClose={() => setDetalle(null)}>
          <div className="eje3-modal-actions">
            <button type="button" className="btn btn-danger" onClick={() => startRevision(detalle, 'devolver')}>
              Devolver
            </button>
            <button type="button" className="btn" onClick={() => startRevision(detalle, 'aprobar')}>
              Aprobar
            </button>
          </div>
        </ProyectoDetalle>
      )}

      {revision && (
        <RevisionModal
          proyecto={revision.proyecto}
          accion={revision.accion}
          onClose={() => setRevision(null)}
          onDone={(message) => {
            setRevision(null);
            if (showToast) showToast(message);
            reload();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * MODAL: aprobar (comentario opcional) o devolver (comentario obligatorio)
 * ------------------------------------------------------------------------- */
function RevisionModal({ proyecto, accion, onClose, onDone }) {
  const devolver = accion === 'devolver';
  const [comentario, setComentario] = useState('');
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    const texto = comentario.trim();

    if (devolver && texto.length < COMENTARIO_MIN) {
      setErrors([`Escribe un comentario de al menos ${COMENTARIO_MIN} caracteres para que el docente sepa qué corregir.`]);
      return;
    }
    if (texto.length > COMENTARIO_MAX) {
      setErrors([`El comentario no puede superar ${COMENTARIO_MAX} caracteres.`]);
      return;
    }

    setSaving(true);
    try {
      const res = await eje3Service.revisar(proyecto.id, { accion, comentario: texto });
      if (!res || !res.success) {
        setErrors(formatApiErrors(res));
        return;
      }
      onDone(res.message || (devolver ? 'Proyecto devuelto al docente.' : 'Proyecto aprobado.'));
    } catch {
      setErrors(['Ocurrió un error al registrar la revisión. Intenta de nuevo.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Eje3ModalShell
      title={devolver ? 'Devolver proyecto' : 'Aprobar proyecto'}
      subtitle={proyecto.titulo}
      onClose={onClose}
      maxWidth="560px"
    >
      <Eje3ErrorList messages={errors} />
      <form onSubmit={handleSubmit} noValidate>
        <p style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: 1.5, color: '#334155' }}>
          {devolver
            ? 'El docente podrá editar el proyecto y volver a enviarlo. Indica qué debe corregir.'
            : 'El proyecto quedará aprobado y se incluirá en el monitoreo, la visualización y la difusión.'}
        </p>
        <label htmlFor="revision-comentario">
          Comentario {devolver ? <span style={{ color: '#EF4444' }}>*</span> : <span className="muted">(opcional)</span>}
        </label>
        <textarea
          id="revision-comentario"
          rows={4}
          maxLength={COMENTARIO_MAX}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={devolver ? 'Ej. Falta detallar la metodología en el apartado 2.' : 'Comentario para el docente'}
        />
        <div className="eje3-modal-actions">
          <button type="button" className="btn btn2" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className={devolver ? 'btn btn-danger' : 'btn'} disabled={saving}>
            {saving ? 'Guardando...' : devolver ? 'Devolver al docente' : 'Aprobar proyecto'}
          </button>
        </div>
      </form>
    </Eje3ModalShell>
  );
}
