import React, { useState, useEffect } from 'react';
import BUAPLogo from './BUAPLogo';
import { IconArrowLeft, IconMenu, IconX } from './Icons';

/**
 * ============================================================================
 * COMPONENTE HEADER / NAVBAR INSTITUCIONAL BUAP CON SIDEBAR MÓVIL
 * ============================================================================
 * - En Desktop / Tablet: muestra la barra de navegación horizontal oficial.
 * - En Mobile (<= 860px): colapsa los enlaces en un Sidebar lateral deslizable
 *   con fondo difuminado y botón hamburguesa accesible.
 */
export default function BUAPHeader({ currentView, onNavigate, isAuthenticated, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdminView = currentView.startsWith('admin');
  const isLoginView = currentView === 'login';

  const handleNavClick = (view) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  // Prevenir scroll en body al abrir el sidebar móvil
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Cerrar sidebar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="nav">
        {/* Identidad institucional BUAP */}
        <div 
          onClick={() => handleNavClick('home')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
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

        {/* 1. Navegación Desktop (Visible solo en computadoras y tabletas) */}
        <nav className="nav-links desktop-only">
          <a 
            className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Inicio
          </a>
          <a 
            className={`nav-link ${currentView === 'carpetas' ? 'active' : ''}`}
            onClick={() => handleNavClick('carpetas')}
          >
            Carpetas por Año
          </a>
          <a 
            className={`nav-link ${currentView === 'acerca' ? 'active' : ''}`}
            onClick={() => handleNavClick('acerca')}
          >
            Acerca de
          </a>

          {/* Botón de Acceso / Salida de Administración */}
          {isAdminView ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn2"
                onClick={() => handleNavClick('home')}
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
              onClick={() => handleNavClick('home')}
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
                  handleNavClick('admin-panel');
                } else {
                  handleNavClick('login');
                }
              }}
              style={{ marginLeft: '12px' }}
            >
              Acceso administrador
            </button>
          )}
        </nav>

        {/* 2. Botón Hamburguesa Móvil (Visible solo en pantallas pequeñas) */}
        <button
          type="button"
          className="nav-hamburger-btn"
          aria-label="Abrir menú de navegación"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <IconMenu size={24} color="var(--buap-blue-302)" />
        </button>
      </header>

      {/* 3. Sidebar Móvil (Drawer deslizable lateral) */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="mobile-sidebar-backdrop" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="mobile-sidebar-drawer" role="dialog" aria-modal="true" aria-label="Menú principal móvil">
            <div className="mobile-sidebar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BUAPLogo variant="azul" showText={false} size="small" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="titulo-gotham-black" style={{ fontSize: '14px', color: 'var(--buap-blue-302)', lineHeight: 1.1 }}>
                    BUAP
                  </span>
                  <span className="encabezado-source-black" style={{ fontSize: '11.5px', color: 'var(--buap-cyan-306)', margin: 0 }}>
                    Menú Institucional
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-sidebar-close-btn"
                aria-label="Cerrar menú"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <IconX size={20} color="var(--buap-blue-302)" />
              </button>
            </div>

            <div className="mobile-sidebar-content">
              <nav className="mobile-nav-links">
                <button
                  type="button"
                  className={`mobile-nav-item ${currentView === 'home' ? 'active' : ''}`}
                  onClick={() => handleNavClick('home')}
                >
                  <span>Inicio</span>
                </button>
                <button
                  type="button"
                  className={`mobile-nav-item ${currentView === 'carpetas' ? 'active' : ''}`}
                  onClick={() => handleNavClick('carpetas')}
                >
                  <span>Carpetas por Año</span>
                </button>
                <button
                  type="button"
                  className={`mobile-nav-item ${currentView === 'acerca' ? 'active' : ''}`}
                  onClick={() => handleNavClick('acerca')}
                >
                  <span>Acerca de</span>
                </button>
              </nav>

              <div className="mobile-sidebar-divider" />

              <div className="mobile-sidebar-actions">
                {isAdminView ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn2"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleNavClick('home')}
                    >
                      <IconArrowLeft size={14} />
                      <span>Ver portal público</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                ) : isLoginView ? (
                  <button 
                    type="button" 
                    className="btn btn2"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleNavClick('home')}
                  >
                    <IconArrowLeft size={14} />
                    <span>Volver al inicio</span>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      if (isAuthenticated) {
                        handleNavClick('admin-panel');
                      } else {
                        handleNavClick('login');
                      }
                    }}
                  >
                    Acceso administrador
                  </button>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
