import React from 'react';
import { 
  BarChart3, 
  Users, 
  FolderGit2, 
  BookOpenCheck, 
  Lightbulb, 
  Globe2, 
  Sparkles 
} from 'lucide-react';

/**
 * ============================================================================
 * COMPONENTE SIDEBAR (Menú Lateral de Navegación)
 * ============================================================================
 * Organiza los 4 pilares solicitados por el usuario:
 * - Registrar (Investigadores, Publicaciones, Proyectos, Patentes)
 * - Monitorear (Seguimiento de Fases y Presupuestos)
 * - Visualizar (Métricas, Gráficos de Cuartiles y KPIs)
 * - Difundir (Portal Público, Buscador y Citas BibTeX)
 */
export default function Sidebar({ activeTab, onSelectTab }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Visualizar & Monitorear',
      icon: BarChart3,
      section: 'Analítica'
    },
    {
      id: 'researchers',
      label: 'Investigadores',
      icon: Users,
      section: 'Gestión y Registro'
    },
    {
      id: 'projects',
      label: 'Proyectos I+D',
      icon: FolderGit2,
      section: 'Gestión y Registro'
    },
    {
      id: 'publications',
      label: 'Publicaciones Científicas',
      icon: BookOpenCheck,
      section: 'Gestión y Registro'
    },
    {
      id: 'production',
      label: 'Producción Técnica & Tesis',
      icon: Lightbulb,
      section: 'Gestión y Registro'
    },
    {
      id: 'dissemination',
      label: 'Portal de Difusión',
      icon: Globe2,
      section: 'Apropiación Social'
    }
  ];

  return (
    <aside className="sidebar">
      {/* Cabecera del Sidebar con Logotipo */}
      <div className="sidebar-header">
        <div className="logo-badge">
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div className="logo-text">
          <div className="logo-title">SI3 Research</div>
          <div className="logo-subtitle">Sistema de Información</div>
        </div>
      </div>

      {/* Navegación por módulos */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Panel de Control</div>

        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showSection = index === 0 || menuItems[index - 1].section !== item.section;

          return (
            <React.Fragment key={item.id}>
              {showSection && index !== 0 && (
                <div className="nav-section-title" style={{ marginTop: '0.75rem' }}>
                  {item.section}
                </div>
              )}
              <button
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <span className="nav-item-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-item-label">{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Pie del Sidebar con Información Institucional */}
      <div className="sidebar-footer">
        <div className="institution-pill">
          <div className="institution-avatar">
            U
          </div>
          <div className="institution-info">
            <span className="institution-name">Universidad / Centro I+D</span>
            <span className="institution-role">Vicerrectoría de Inv.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
