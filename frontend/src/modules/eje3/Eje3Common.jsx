import React, { useEffect } from 'react';
import { IconAlertTriangle, IconX } from '../../components/Icons';
import { labelRegistroEstado } from './registroConfig';

/**
 * ============================================================================
 * PIEZAS COMPARTIDAS DEL EJE 3 (aviso, modal, confirmación, carga de datos)
 * ============================================================================
 */

/** Aviso visible (error o información). */
export function Eje3Notice({ children, tone = 'error', style }) {
  const palette = tone === 'info'
    ? { bg: '#EBF5FA', border: '#00B5E2', color: '#003B5C', icon: '#003B5C' }
    : { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '#DC2626' };
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className="eje3-notice"
      style={{
        backgroundColor: palette.bg,
        borderLeft: `4px solid ${palette.border}`,
        color: palette.color,
        ...style
      }}
    >
      <IconAlertTriangle size={18} color={palette.icon} />
      <div>{children}</div>
    </div>
  );
}

/** Lista de mensajes de error dentro de un aviso. */
export function Eje3ErrorList({ messages }) {
  if (!messages || messages.length === 0) return null;
  if (messages.length === 1) {
    return <Eje3Notice style={{ marginBottom: '16px' }}>{messages[0]}</Eje3Notice>;
  }
  return (
    <Eje3Notice style={{ marginBottom: '16px' }}>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </Eje3Notice>
  );
}

/** Contenedor de modal con el mismo estilo que CategoryModal. */
export function Eje3ModalShell({ title, subtitle, onClose, children, maxWidth = '560px', label }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="eje3-modal-overlay" onClick={onClose}>
      <div
        className="eje3-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={label || title}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eje3-modal-head">
          <div>
            <h2 className="titulo-gotham-black" style={{ fontSize: '22px', margin: 0, color: 'var(--text-dark, #0F172A)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="eje3-icon-btn" onClick={onClose} aria-label="Cerrar">
            <IconX size={20} color="#64748B" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Diálogo de confirmación para eliminar. */
export function Eje3ConfirmModal({
  title,
  message,
  confirmLabel = 'Eliminar',
  busyLabel = 'Eliminando...',
  tone = 'danger',
  label,
  busy,
  errors,
  onConfirm,
  onCancel,
  children
}) {
  return (
    <Eje3ModalShell title={title} onClose={onCancel} maxWidth="460px" label={label || (tone === 'danger' ? 'Confirmar eliminación' : title)}>
      <Eje3ErrorList messages={errors} />
      <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, color: '#334155' }}>{message}</p>
      {children}
      <div className="eje3-modal-actions">
        <button type="button" className="btn btn2" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className={tone === 'danger' ? 'btn btn-danger' : 'btn'} onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Eje3ModalShell>
  );
}

/** Etiqueta con el estado de registro de un proyecto (borrador, en revisión...). */
export function RegistroEstadoTag({ value }) {
  if (!value) return null;
  return (
    <span className={`tag docente-estado docente-estado-${value}`} data-estado={value}>
      {labelRegistroEstado(value)}
    </span>
  );
}

/** Encabezado de pantalla (título, subtítulo y acciones). */
export function Eje3PageHeader({ title, subtitle, children }) {
  return (
    <div className="eje3-page-header">
      <div>
        <h1 className="titulo-gotham-black" style={{ fontSize: '30px', margin: 0, color: 'var(--text-dark, #0F172A)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '14.5px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="eje3-page-actions">{children}</div>}
    </div>
  );
}

/** Mensaje de carga / vacío para celdas de tabla. */
export function Eje3TableMessage({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
        {children}
      </td>
    </tr>
  );
}
