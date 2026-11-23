import React from 'react';
import { Eje3ModalShell, RegistroEstadoTag } from './Eje3Common';
import {
  formatFecha,
  labelTipoProyecto,
  labelEstadoProyecto
} from './registroConfig';

const dinero = (v) =>
  Number(v) > 0
    ? Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
    : '';

/**
 * Detalle de solo lectura de un proyecto (con apartados). Se reutiliza en
 * "Mis proyectos" del docente y en la bandeja de Revisión del administrador.
 * `children` permite añadir acciones al pie (aprobar, devolver...).
 */
export default function ProyectoDetalle({ proyecto, onClose, showDocente = false, children }) {
  const p = proyecto || {};
  const apartados = Array.isArray(p.apartados) ? p.apartados : [];

  const filas = [
    showDocente ? ['Docente principal', p.investigador_principal_nombre] : null,
    ['Tipo', labelTipoProyecto(p.tipo)],
    ['Estado del proyecto', p.estado ? labelEstadoProyecto(p.estado) : ''],
    ['Línea de investigación', p.linea_investigacion],
    ['Evento', p.evento_nombre],
    ['Inicio', formatFecha(p.fecha_inicio)],
    ['Término', formatFecha(p.fecha_fin)],
    ['Coinvestigadores', p.co_investigadores],
    ['Entidad financiadora', p.entidad_financiadora],
    ['Presupuesto', dinero(p.presupuesto)],
    p.tipo === 'titulacion' ? ['Articulado al CIV', Number(p.articulado_civ) === 1 ? 'Sí' : 'No'] : null,
    p.enviado_en ? ['Enviado', formatFecha(p.enviado_en)] : null
  ].filter((f) => f && f[1]);

  return (
    <Eje3ModalShell
      title={p.titulo || 'Proyecto'}
      subtitle={p.codigo}
      onClose={onClose}
      maxWidth="720px"
      label={`Detalle del proyecto ${p.titulo || ''}`.trim()}
    >
      <div style={{ marginBottom: '14px' }}>
        <RegistroEstadoTag value={p.registro_estado} />
      </div>

      {p.comentario_revision && (
        <div className="docente-comentario" role="note">
          <strong>Comentario de revisión</strong>
          <p>{p.comentario_revision}</p>
        </div>
      )}

      <dl className="docente-datos">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {p.resumen && (
        <div className="eje3-apartados-view" style={{ borderTop: 'none', marginTop: '4px', paddingTop: 0 }}>
          <h5>Resumen</h5>
          <p>{p.resumen}</p>
        </div>
      )}

      <div className="eje3-apartados-view">
        <h5 style={{ fontSize: '15px' }}>Apartados ({apartados.length})</h5>
        {apartados.length === 0 && (
          <p className="muted">Este proyecto no tiene apartados.</p>
        )}
        {apartados.map((a, i) => (
          <div key={a.id || i}>
            <h5>{a.apartado}</h5>
            <p>{a.contenido || 'Sin contenido.'}</p>
          </div>
        ))}
      </div>

      {children}
    </Eje3ModalShell>
  );
}
