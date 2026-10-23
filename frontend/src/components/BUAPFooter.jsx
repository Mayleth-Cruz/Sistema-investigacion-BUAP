import React from 'react';
import BUAPLogo from './BUAPLogo';

/**
 * ============================================================================
 * COMPONENTE FOOTER INSTITUCIONAL BUAP
 * ============================================================================
 * Incluye los datos formales de la institución conforme al Manual de Identidad.
 */
export default function BUAPFooter() {
  return (
    <footer className="buap-footer">
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <BUAPLogo variant="azul" showText={false} size="normal" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--buap-blue-302)' }}>
              Benemérita Universidad Autónoma de Puebla
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Torre de Gestión Académica y Servicios Administrativos, 5to. Piso, Ciudad Universitaria.
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div>Vicerrectoría de Investigación y Estudios de Posgrado (VIEP)</div>
          <div>© {new Date().getFullYear()} BUAP. Todos los derechos reservados.</div>
        </div>
      </div>
    </footer>
  );
}
