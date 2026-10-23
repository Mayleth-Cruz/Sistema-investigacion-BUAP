import React from 'react';
import BUAPLogo from './BUAPLogo';
import { IconArrowLeft } from './Icons';

/**
 * ============================================================================
 * COMPONENTE HEADER / NAVBAR INSTITUCIONAL BUAP
 * ============================================================================
 * Reproduce exactamente la barra superior del prototipo institucional.
 * Al hacer clic en "Acceso administrador", redirige a la pantalla de Login
 * o al Panel si ya se encuentra autenticado.
 */
export default function BUAPHeader({ currentView, onNavigate, isAuthenticated, onLogout }) {
  const isAdminView = currentView.startsWith('admin');
  const isLoginView = currentView === 'login';

  return (
    <header className="nav">
      <div 
        onClick={() => onNavigate('home')} 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        <BUAPLogo variant="azul" showText={false} size="normal" />
        <span style={{ 
          color: '#CBD5E1', 
          fontSize: '22px', 
          fontWeight: 300, 
          display: 'inline-block' 
        }}>
          |
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="titulo-gotham-black" style={{ 
            fontSize: '15px', 
            color: 'var(--buap-blue-302)',
            lineHeight: 1.15,
            letterSpacing: '0.02em'
          }}>
            BUAP
          </span>
          <span className="encabezado-source-black" style={{ 
            fontSize: '13px', 
            color: 'var(--buap-cyan-306)',
            margin: 0,
            letterSpacing: '0.01em'
          }}>
            Repositorio de Investigación
          </span>
        </div>
      </div>

      <nav className="nav-links">
        <a 
          className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          Inicio
        </a>
        <a 
          className={`nav-link ${currentView === 'carpetas' ? 'active' : ''}`}
          onClick={() => onNavigate('carpetas')}
        >
          Carpetas por Año
        </a>
        <a 
          className={`nav-link ${currentView === 'acerca' ? 'active' : ''}`}
          onClick={() => onNavigate('acerca')}
        >
          Acerca de
        </a>

        {/* Botón de Acceso / Salida de Administración */}
        {isAdminView ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn2"
              onClick={() => onNavigate('home')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconArrowLeft size={14} />
              <span>Ver portal público</span>
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              style={{ minHeight: '38px', padding: '0 12px', fontSize: '13.5px' }}
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        ) : isLoginView ? (
          <button 
            type="button" 
            className="btn btn2"
            onClick={() => onNavigate('home')}
            style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconArrowLeft size={14} />
            <span>Volver al inicio</span>
          </button>
        ) : (
          <button 
            type="button" 
            className="btn btn2"
            onClick={() => {
              if (isAuthenticated) {
                onNavigate('admin-panel');
              } else {
                onNavigate('login');
              }
            }}
            style={{ marginLeft: '12px' }}
          >
            Acceso administrador
          </button>
        )}
      </nav>
    </header>
  );
}
