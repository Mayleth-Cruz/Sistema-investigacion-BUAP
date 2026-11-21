import React, { useState, useEffect } from 'react';
import {
  IconChart,
  IconClipboard,
  IconLock,
  IconMenu,
  IconX,
  IconArrowLeft
} from './Icons';
import BUAPLogo from './BUAPLogo';

// Menú propio y corto del docente
const DOCENTE_ITEMS = [
  { nav: 'mi-espacio', view: 'docente-mi-espacio', label: 'Mi espacio', title: 'Mi espacio', Icon: IconChart },
  { nav: 'proyectos', view: 'docente-proyectos', label: 'Mis proyectos', title: 'Mis proyectos', Icon: IconClipboard },
  { nav: 'cuenta', view: 'docente-cuenta', label: 'Mi cuenta', title: 'Mi cuenta', Icon: IconLock }
];

/**
 * ============================================================================
 * COMPONENTE DOCENTE SIDEBAR (DESKTOP + MOBILE DRAWER)
 * ============================================================================
 * Mismo patrón que AdminSidebar: columna lateral en escritorio y, en móvil
 * (<= 860px), botón disparador con drawer deslizable.
 * - soloCuenta: mientras el docente deba cambiar su contraseña temporal solo
 *   "Mi cuenta" está disponible; el resto del menú se muestra deshabilitado.
 */
export default function DocenteSidebar({ activeNav = 'mi-espacio', onNavigate, soloCuenta = false, nombre = '' }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeItem = DOCENTE_ITEMS.find((i) => i.nav === activeNav) || DOCENTE_ITEMS[0];

  const handleItemClick = (destination, nav) => {
    if (soloCuenta && nav && nav !== 'cuenta') return;
    setIsMobileOpen(false);
    if (onNavigate) onNavigate(destination);
  };

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const bloqueado = (nav) => soloCuenta && nav !== 'cuenta';

  return (
    <>
      {/* 1. Barra disparadora móvil (visible solo <= 860px) */}
      <div className="admin-mobile-nav-bar">
        <button
          type="button"
          className="admin-mobile-menu-trigger"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Abrir menú del docente"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#E0F2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconMenu size={18} color="var(--buap-blue-302)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', display: 'block', fontWeight: 700, letterSpacing: '0.04em' }}>
                Docente
              </span>
              <strong style={{ fontSize: '14.5px', color: 'var(--buap-blue-302)', fontFamily: 'var(--font-source)' }}>
                {activeItem.title}
              </strong>
            </div>
          </div>
        </button>
      </div>

      {/* 2. Sidebar de escritorio */}
      <aside className="side admin-desktop-sidebar docente-side">
        <h3 className="encabezado-source-black">
          Docente
        </h3>
        {nombre && <div className="docente-side-user" title={nombre}>{nombre}</div>}
        {DOCENTE_ITEMS.map(({ nav, view, label, Icon }) => (
          <a
            key={nav}
            className={`${activeNav === nav ? 'on' : ''}${bloqueado(nav) ? ' docente-nav-disabled' : ''}`.trim()}
            aria-disabled={bloqueado(nav) ? 'true' : undefined}
            aria-current={activeNav === nav ? 'page' : undefined}
            onClick={() => handleItemClick(view, nav)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}
      </aside>

      {/* 3. Drawer móvil */}
      {isMobileOpen && (
        <>
          <div
            className="mobile-sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menú del docente">
            <div className="mobile-sidebar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BUAPLogo variant="azul" showText={false} size="small" />
                <div>
                  <span className="titulo-gotham-black" style={{ fontSize: '14px', color: 'var(--buap-blue-302)', display: 'block', lineHeight: 1.1 }}>
                    BUAP Docente
                  </span>
                  <span className="encabezado-source-black" style={{ fontSize: '11px', color: 'var(--buap-cyan-306)', margin: 0 }}>
                    Menú del docente
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-sidebar-close-btn"
                aria-label="Cerrar menú"
                onClick={() => setIsMobileOpen(false)}
              >
                <IconX size={20} color="var(--buap-blue-302)" />
              </button>
            </div>

            <div className="mobile-sidebar-content">
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', marginBottom: '10px' }}>
                Mi espacio docente
              </div>

              <nav className="mobile-nav-links">
                {DOCENTE_ITEMS.map(({ nav, view, label, Icon }) => (
                  <button
                    key={nav}
                    type="button"
                    className={`mobile-nav-item ${activeNav === nav ? 'active' : ''}${bloqueado(nav) ? ' docente-nav-disabled' : ''}`}
                    disabled={bloqueado(nav)}
                    onClick={() => handleItemClick(view, nav)}
                  >
                    <Icon size={18} color={activeNav === nav ? 'var(--buap-blue-302)' : '#64748B'} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              <div className="mobile-sidebar-divider" />

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn2"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '13.5px' }}
                  onClick={() => handleItemClick('home')}
                >
                  <IconArrowLeft size={14} />
                  <span>Ver portal público</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
