import React, { useState, useEffect } from 'react';
import { 
  IconChart, 
  IconPlus, 
  IconUser, 
  IconTag, 
  IconMenu, 
  IconX,
  IconArrowLeft 
} from './Icons';
import BUAPLogo from './BUAPLogo';

/**
 * ============================================================================
 * COMPONENTE ADMIN SIDEBAR (DESKTOP + MOBILE DRAWER)
 * ============================================================================
 * - En Desktop / Tablet: Columna vertical lateral institucional BUAP.
 * - En Mobile (<= 860px): Se oculta la barra estática superior y se transforma
 *   en un botón disparador con Sidebar Drawer deslizable, permitiendo que
 *   todo el contenido del panel (métricas, tablas, formularios) se adapte
 *   al 100% del ancho de la pantalla de un celular.
 */
export default function AdminSidebar({ activeNav = 'panel', onNavigate, onUploadClick }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getTitle = () => {
    switch (activeNav) {
      case 'panel': return 'Panel de administración';
      case 'subir': return 'Subir artículo';
      case 'autores': return 'Directorio de autores';
      case 'categorias': return 'Categorías y áreas';
      default: return 'Administración';
    }
  };

  const handleItemClick = (destination, action) => {
    setIsMobileOpen(false);
    if (action) {
      action();
    } else if (onNavigate) {
      onNavigate(destination);
    }
  };

  // Prevenir scroll en body al abrir el sidebar en móvil
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* 1. Barra Disparadora Móvil (Visible SOLO en móviles <= 860px) */}
      <div className="admin-mobile-nav-bar">
        <button
          type="button"
          className="admin-mobile-menu-trigger"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Abrir menú de administración"
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
              color: 'var(--buap-blue-302)',
              flexShrink: 0
            }}>
              <IconMenu size={18} color="var(--buap-blue-302)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', display: 'block', fontWeight: 700, letterSpacing: '0.04em' }}>
                Administración
              </span>
              <strong style={{ fontSize: '14.5px', color: 'var(--buap-blue-302)', fontFamily: 'var(--font-source)' }}>
                {getTitle()}
              </strong>
            </div>
          </div>
        </button>
      </div>

      {/* 2. Sidebar Desktop (Visible en computadoras y tabletas) */}
      <aside className="side admin-desktop-sidebar">
        <h3 className="encabezado-source-black">
          Administración
        </h3>
        <a 
          className={activeNav === 'panel' ? 'on' : ''} 
          onClick={() => handleItemClick('admin-panel')}
        >
          <IconChart size={16} />
          <span>Panel</span>
        </a>
        <a 
          className={activeNav === 'subir' ? 'on' : ''} 
          onClick={() => handleItemClick('admin-upload', onUploadClick)}
        >
          <IconPlus size={16} />
          <span>Subir artículo</span>
        </a>
        <a 
          className={activeNav === 'autores' ? 'on' : ''} 
          onClick={() => handleItemClick('admin-authors')}
        >
          <IconUser size={16} />
          <span>Autores</span>
        </a>
        <a 
          className={activeNav === 'categorias' ? 'on' : ''} 
          onClick={() => handleItemClick('admin-categories')}
        >
          <IconTag size={16} />
          <span>Categorías</span>
        </a>
      </aside>

      {/* 3. Sidebar Móvil Flotante / Drawer (Slide-in) */}
      {isMobileOpen && (
        <>
          <div 
            className="mobile-sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menú de administración">
            <div className="mobile-sidebar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BUAPLogo variant="azul" showText={false} size="small" />
                <div>
                  <span className="titulo-gotham-black" style={{ fontSize: '14px', color: 'var(--buap-blue-302)', display: 'block', lineHeight: 1.1 }}>
                    BUAP Admin
                  </span>
                  <span className="encabezado-source-black" style={{ fontSize: '11px', color: 'var(--buap-cyan-306)', margin: 0 }}>
                    Menú de Administración
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
                Secciones de Administración
              </div>

              <nav className="mobile-nav-links">
                <button
                  type="button"
                  className={`mobile-nav-item ${activeNav === 'panel' ? 'active' : ''}`}
                  onClick={() => handleItemClick('admin-panel')}
                >
                  <IconChart size={18} color={activeNav === 'panel' ? 'var(--buap-blue-302)' : '#64748B'} />
                  <span>Panel principal</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeNav === 'subir' ? 'active' : ''}`}
                  onClick={() => handleItemClick('admin-upload', onUploadClick)}
                >
                  <IconPlus size={18} color={activeNav === 'subir' ? 'var(--buap-blue-302)' : '#64748B'} />
                  <span>Subir artículo</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeNav === 'autores' ? 'active' : ''}`}
                  onClick={() => handleItemClick('admin-authors')}
                >
                  <IconUser size={18} color={activeNav === 'autores' ? 'var(--buap-blue-302)' : '#64748B'} />
                  <span>Autores e Investigadores</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeNav === 'categorias' ? 'active' : ''}`}
                  onClick={() => handleItemClick('admin-categories')}
                >
                  <IconTag size={18} color={activeNav === 'categorias' ? 'var(--buap-blue-302)' : '#64748B'} />
                  <span>Categorías y Áreas</span>
                </button>
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
