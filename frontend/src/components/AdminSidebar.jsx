import React, { useState, useEffect } from 'react';
import { 
  IconChart, 
  IconPlus, 
  IconUser, 
  IconTag, 
  IconMenu, 
  IconX,
  IconArrowLeft,
  IconClipboard,
  IconActivity,
  IconMicrophone,
  IconUsers,
  IconCheckCircle
} from './Icons';
import BUAPLogo from './BUAPLogo';
import { authService } from '../services/authService';
import { eje3Service } from '../services/eje3Service';

// Grupo "Eje 3 · Investigación": Registrar, Monitorear, Visualizar y Difundir
const EJE3_ITEMS = [
  { nav: 'eje3-registro', view: 'admin-eje3-registro', label: 'Registro', title: 'Eje 3 · Registro', Icon: IconClipboard },
  { nav: 'eje3-monitoreo', view: 'admin-eje3-monitoreo', label: 'Monitoreo', title: 'Eje 3 · Monitoreo', Icon: IconActivity },
  { nav: 'eje3-visualizar', view: 'admin-eje3-visualizar', label: 'Visualizar', title: 'Eje 3 · Visualizar', Icon: IconChart },
  { nav: 'eje3-difundir', view: 'admin-eje3-difundir', label: 'Difundir', title: 'Eje 3 · Difundir', Icon: IconMicrophone }
];

// Grupo "Docentes": cuentas de docentes y revisión de sus proyectos
const DOCENTES_ITEMS = [
  { nav: 'docentes-usuarios', view: 'admin-docentes-usuarios', label: 'Usuarios docentes', title: 'Docentes · Usuarios', Icon: IconUsers },
  { nav: 'docentes-revision', view: 'admin-docentes-revision', label: 'Revisión de proyectos', title: 'Docentes · Revisión', Icon: IconCheckCircle }
];

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
export default function AdminSidebar({ activeNav = 'panel', onNavigate, onUploadClick, pendientes }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Contador de proyectos enviados por docentes. Si la pantalla ya lo conoce
  // lo recibe en `pendientes`; si no, se consulta GET /eje3/revision. Si la
  // consulta falla no se muestra el distintivo.
  const [fetchedPendientes, setFetchedPendientes] = useState(null);
  useEffect(() => {
    if (pendientes !== undefined || !authService.getToken()) return undefined;
    let cancelled = false;
    // Se difiere un instante para no competir con la carga de la propia pantalla
    const timer = setTimeout(() => {
      Promise.resolve(eje3Service.revision())
        .then((data) => {
          if (!cancelled && data && Number.isFinite(Number(data.pendientes))) {
            setFetchedPendientes(Number(data.pendientes));
          }
        })
        .catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pendientes]);
  const pendientesCount = pendientes !== undefined ? pendientes : fetchedPendientes;
  const showBadge = Number(pendientesCount) > 0;
  const badgeFor = (nav) =>
    nav === 'docentes-revision' && showBadge ? (
      <span className="docente-badge" aria-label={`${pendientesCount} pendientes`}>
        {pendientesCount}
      </span>
    ) : null;

  const getTitle = () => {
    switch (activeNav) {
      case 'panel': return 'Panel de administración';
      case 'subir': return 'Subir artículo';
      case 'autores': return 'Directorio de autores';
      case 'categorias': return 'Categorías y áreas';
      case 'eje3-registro': return 'Eje 3 · Registro';
      case 'eje3-monitoreo': return 'Eje 3 · Monitoreo';
      case 'eje3-visualizar': return 'Eje 3 · Visualizar';
      case 'eje3-difundir': return 'Eje 3 · Difundir';
      case 'docentes-usuarios': return 'Docentes · Usuarios';
      case 'docentes-revision': return 'Docentes · Revisión';
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

        <h3 className="encabezado-source-black eje3-side-heading">
          Eje 3 · Investigación
        </h3>
        {EJE3_ITEMS.map(({ nav, view, label, Icon }) => (
          <a
            key={nav}
            className={activeNav === nav ? 'on' : ''}
            onClick={() => handleItemClick(view)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}

        <h3 className="encabezado-source-black eje3-side-heading">
          Docentes
        </h3>
        {DOCENTES_ITEMS.map(({ nav, view, label, Icon }) => (
          <a
            key={nav}
            className={activeNav === nav ? 'on' : ''}
            onClick={() => handleItemClick(view)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {badgeFor(nav)}
          </a>
        ))}
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

              <div className="eje3-mobile-group-label">
                Eje 3 · Investigación
              </div>

              <nav className="mobile-nav-links">
                {EJE3_ITEMS.map(({ nav, view, label, Icon }) => (
                  <button
                    key={nav}
                    type="button"
                    className={`mobile-nav-item ${activeNav === nav ? 'active' : ''}`}
                    onClick={() => handleItemClick(view)}
                  >
                    <Icon size={18} color={activeNav === nav ? 'var(--buap-blue-302)' : '#64748B'} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              <div className="eje3-mobile-group-label">
                Docentes
              </div>

              <nav className="mobile-nav-links">
                {DOCENTES_ITEMS.map(({ nav, view, label, Icon }) => (
                  <button
                    key={nav}
                    type="button"
                    className={`mobile-nav-item ${activeNav === nav ? 'active' : ''}`}
                    onClick={() => handleItemClick(view)}
                  >
                    <Icon size={18} color={activeNav === nav ? 'var(--buap-blue-302)' : '#64748B'} />
                    <span>{label}</span>
                    {badgeFor(nav)}
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
