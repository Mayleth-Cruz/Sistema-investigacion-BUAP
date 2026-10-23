import React from 'react';

/**
 * ============================================================================
 * COMPONENTE STATCARD (Tarjeta de Métrica / KPI)
 * ============================================================================
 * Muestra un valor numérico prominente con icono temático, borde iluminado
 * y texto de soporte.
 */
export default function StatCard({ title, value, icon: Icon, subtext, accent = 'cyan', color }) {
  const getGradient = () => {
    switch (accent) {
      case 'emerald': return 'var(--gradient-emerald)';
      case 'blue':    return 'var(--gradient-primary)';
      case 'amber':   return 'var(--gradient-amber)';
      case 'rose':    return 'var(--gradient-rose)';
      default:        return 'var(--gradient-cyan)';
    }
  };

  return (
    <div 
      className="stat-card" 
      style={{ 
        '--stat-accent': getGradient(),
        '--stat-color': color || 'var(--accent-cyan)'
      }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-card-icon">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-value">{value}</div>

      {subtext && (
        <div className="stat-card-subtext">
          {subtext}
        </div>
      )}
    </div>
  );
}
