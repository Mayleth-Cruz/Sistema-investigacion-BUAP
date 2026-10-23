import React from 'react';

/**
 * ============================================================================
 * COMPONENTE QUARTILE CHART (Visualizador de Cuartiles Científicos)
 * ============================================================================
 * Muestra barras de progreso animadas para cada cuartil (Q1 a Q4)
 * con la cantidad de artículos y el porcentaje respecto al total.
 */
export default function QuartileChart({ cuartiles = [] }) {
  const getFillClass = (cuartil) => {
    switch (cuartil) {
      case 'Q1': return 'fill-q1';
      case 'Q2': return 'fill-q2';
      case 'Q3': return 'fill-q3';
      case 'Q4': return 'fill-q4';
      default:   return 'fill-sin-cuartil';
    }
  };

  return (
    <div className="quartile-chart-container">
      {cuartiles.map((item) => (
        <div key={item.cuartil} className="quartile-bar-row">
          <div className="quartile-bar-info">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${item.cuartil === 'Q1' ? 'badge-q1' : item.cuartil === 'Q2' ? 'badge-q2' : item.cuartil === 'Q3' ? 'badge-q3' : item.cuartil === 'Q4' ? 'badge-q4' : 'badge-q-none'}`}>
                {item.cuartil}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {item.cantidad} artículo{item.cantidad !== 1 ? 's' : ''}
              </span>
            </span>
            <span style={{ color: 'var(--text-light)', fontFamily: 'var(--font-mono)' }}>
              {item.porcentaje}%
            </span>
          </div>

          <div className="quartile-progress-track">
            <div 
              className={`quartile-progress-fill ${getFillClass(item.cuartil)}`}
              style={{ width: `${Math.max(item.porcentaje, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
