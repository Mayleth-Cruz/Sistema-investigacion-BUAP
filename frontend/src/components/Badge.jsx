import React from 'react';

/**
 * ============================================================================
 * COMPONENTE BADGE (Etiquetas de Cuartil y Estado)
 * ============================================================================
 * Estandariza la visualización de cuartiles científicos (Q1, Q2, Q3, Q4)
 * y fases de proyectos (en ejecución, completado, propuesta).
 */
export default function Badge({ type, label }) {
  if (type === 'quartile') {
    const qLower = (label || '').toLowerCase();
    let badgeClass = 'badge-q-none';

    if (qLower === 'q1') badgeClass = 'badge-q1';
    else if (qLower === 'q2') badgeClass = 'badge-q2';
    else if (qLower === 'q3') badgeClass = 'badge-q3';
    else if (qLower === 'q4') badgeClass = 'badge-q4';

    return <span className={`badge ${badgeClass}`}>{label || 'Sin cuartil'}</span>;
  }

  if (type === 'status') {
    const statusMap = {
      en_ejecucion: { text: 'En Ejecución', class: 'badge-status-en_ejecucion' },
      completado:   { text: 'Completado',   class: 'badge-status-completado' },
      propuesta:    { text: 'Propuesta',    class: 'badge-status-propuesta' },
      suspendido:   { text: 'Suspendido',   class: 'badge-status-suspendido' }
    };

    const config = statusMap[label] || { text: label, class: 'badge-status-en_ejecucion' };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  }

  return <span className="badge badge-q-none">{label}</span>;
}
