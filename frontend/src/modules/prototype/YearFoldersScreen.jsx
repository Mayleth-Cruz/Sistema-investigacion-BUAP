import React, { useState, useEffect } from 'react';
import { publicationService } from '../../services/publicationService';
import { getDocumentUrl } from '../../services/api';
import { 
  IconFolder, 
  IconFolderOpen, 
  IconDocument, 
  IconCalendar, 
  IconDownload, 
  IconArrowLeft, 
  IconSearch, 
  IconChevronRight, 
  IconChevronDown,
  IconGrid,
  IconList
} from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN: USUARIO: EXPLORADOR DE ARTÍCULOS POR CARPETAS DE AÑO (BUAP)
 * ============================================================================
 * Jerarquía visual y control cronológico:
 * - Carpeta raíz institucional con carpetas por cada año (2026, 2025, 2024...).
 * - Las carpetas se alimentan y actualizan automáticamente desde la base de datos
 *   conforme el administrador agrega o edita artículos.
 * - Soporta navegación por drilldown (entrar/salir de carpeta) y vista de árbol.
 * - Cumple con la identidad visual BUAP (Gotham Black, Source Sans Pro y colores oficiales).
 */
export default function YearFoldersScreen({ onSelectArticle, onNavigate }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null); // null = vista raíz de carpetas, número = dentro de esa carpeta
  const [expandedYears, setExpandedYears] = useState({}); // Para vista de árbol / acordeón
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('folders'); // 'folders' (grid) o 'tree' (expandible)

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await publicationService.getFolders();
      if (Array.isArray(data)) {
        setFolders(data);
        // Inicializar todos los años como expandidos para la vista de árbol
        const initialExpanded = {};
        data.forEach(f => {
          initialExpanded[f.anio] = true;
        });
        setExpandedYears(initialExpanded);
      }
    } catch (err) {
      console.error('Error cargando carpetas de artículos por año:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTreeYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const handleOpenFolder = (year) => {
    setActiveYear(year);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRoot = () => {
    setActiveYear(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPdf = (e, art) => {
    e.stopPropagation();
    if (art?.id) {
      publicationService.recordDownload(art.id).then(() => {
        // Actualización optimista de descargas
        setFolders(prev => prev.map(f => {
          if (f.anio === art.anio) {
            return {
              ...f,
              total_descargas: f.total_descargas + 1,
              articulos: f.articulos.map(a => a.id === art.id ? { ...a, descargas: (a.descargas || 0) + 1 } : a)
            };
          }
          return f;
        }));
      }).catch(err => console.error('Error registrando descarga:', err));
    }

    if (art?.url_documento) {
      const target = getDocumentUrl(art.url_documento);
      window.open(target, '_blank');
    } else {
      alert(`Abriendo documento: "${art.titulo}"`);
    }
  };

  // Filtrado de artículos dentro de las carpetas si se usa el buscador
  const normalizedSearch = searchTerm.trim().toLowerCase();
  
  const filteredFolders = folders.map(f => {
    if (!normalizedSearch) return f;
    const matchingArticles = f.articulos.filter(art => 
      (art.titulo || '').toLowerCase().includes(normalizedSearch) ||
      (art.autores || '').toLowerCase().includes(normalizedSearch) ||
      (art.revista_editorial || '').toLowerCase().includes(normalizedSearch) ||
      (art.evento || '').toLowerCase().includes(normalizedSearch) ||
      (art.area_conocimiento || '').toLowerCase().includes(normalizedSearch) ||
      String(f.anio).includes(normalizedSearch)
    );
    return {
      ...f,
      articulos: matchingArticles,
      total_articulos: matchingArticles.length
    };
  }).filter(f => !normalizedSearch || f.articulos.length > 0 || String(f.anio).includes(normalizedSearch));

  // Carpeta activa en modo drilldown
  const currentActiveFolder = activeYear ? folders.find(f => f.anio === activeYear) : null;
  const currentActiveArticles = currentActiveFolder ? (
    normalizedSearch ? currentActiveFolder.articulos.filter(art => 
      (art.titulo || '').toLowerCase().includes(normalizedSearch) ||
      (art.autores || '').toLowerCase().includes(normalizedSearch) ||
      (art.revista_editorial || '').toLowerCase().includes(normalizedSearch) ||
      (art.evento || '').toLowerCase().includes(normalizedSearch)
    ) : currentActiveFolder.articulos
  ) : [];

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)', background: 'var(--bg-page)', paddingBottom: '60px' }}>
      
      {/* 1. Hero / Cabecera Institucional del Explorador de Carpetas */}
      <div style={{
        background: 'linear-gradient(135deg, #002B49 0%, #003B5C 60%, #004D77 100%)',
        color: '#ffffff',
        padding: '36px 20px',
        borderBottom: '3px solid var(--buap-cyan-306)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 className="titulo-gotham-black" style={{ fontSize: '30px', margin: '0 0 8px', color: '#ffffff', lineHeight: 1.2 }}>
                {activeYear ? `Carpeta: Artículos del Año ${activeYear}` : 'Carpetas de Artículos por Año'}
              </h1>
              <p className="cuerpo-texto" style={{ margin: 0, fontSize: '15px', color: '#E2E8F0', maxWidth: '720px' }}>
                {activeYear 
                  ? `Artículos científicos y ponencias arbitradas registradas institucionalmente durante el año ${activeYear}.`
                  : 'Explora la producción científica universitaria organizada cronológicamente en carpetas anuales.'}
              </p>
            </div>

            {/* Selector de modo y botón de regreso */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {activeYear ? (
                <button
                  type="button"
                  onClick={handleBackToRoot}
                  className="btn btn2"
                  style={{ background: '#ffffff', color: '#003B5C', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <IconArrowLeft size={15} />
                  <span>Ver todas las carpetas</span>
                </button>
              ) : (
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('folders')}
                    style={{
                      background: viewMode === 'folders' ? 'var(--buap-cyan-306)' : 'transparent',
                      color: viewMode === 'folders' ? '#ffffff' : '#E2E8F0',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-source)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <IconGrid size={14} />
                    <span>Carpetas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('tree')}
                    style={{
                      background: viewMode === 'tree' ? 'var(--buap-cyan-306)' : 'transparent',
                      color: viewMode === 'tree' ? '#ffffff' : '#E2E8F0',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-source)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <IconList size={14} />
                    <span>Árbol desplegado</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 2. Barra de Búsqueda y Filtro Rápido en Carpetas */}
      <div style={{ maxWidth: '1240px', margin: '24px auto 0', padding: '0 20px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>
              <IconSearch size={17} />
            </span>
            <input 
              aria-label="Buscar en carpetas"
              placeholder={activeYear ? `Buscar dentro de la carpeta ${activeYear} por título o autor...` : "Filtrar artículos dentro de las carpetas por título, autor, revista o evento..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              className="btn btn2"
              onClick={() => setSearchTerm('')}
              style={{ fontSize: '13px', padding: '8px 14px' }}
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {/* 3. Contenido Principal */}
      <div style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 20px' }}>
        
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <IconFolder size={36} color="var(--buap-cyan-306)" />
            <p style={{ marginTop: '14px', fontSize: '16px', fontFamily: 'var(--font-source)' }}>
              Cargando carpetas de artículos desde la base de datos institucional...
            </p>
          </div>
        ) : folders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <IconFolder size={36} color="#94A3B8" />
            <h3 className="titulo-gotham-black" style={{ fontSize: '20px', color: '#1E293B', marginTop: '14px' }}>
              Aún no hay carpetas de artículos registradas
            </h3>
            <p className="cuerpo-texto" style={{ marginTop: '6px', fontSize: '14.5px' }}>
              Las carpetas se crearán automáticamente conforme se agreguen artículos publicados desde el panel de administración.
            </p>
          </div>
        ) : activeYear ? (
          /* ==================================================================== */
          /* MODO DRILLDOWN: DENTRO DE UNA CARPETA ESPECÍFICA                     */
          /* ==================================================================== */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#E0F2FE',
                  border: '1.5px solid #BAE6FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--buap-blue-302)'
                }}>
                  <IconFolderOpen size={24} color="var(--buap-blue-302)" />
                </div>
                <div>
                  <h2 className="titulo-gotham-black" style={{ fontSize: '24px', margin: 0, color: 'var(--text-dark)' }}>
                    Carpeta {activeYear}
                  </h2>
                  <span className="cuerpo-texto muted" style={{ fontSize: '14px' }}>
                    {currentActiveArticles.length} {currentActiveArticles.length === 1 ? 'artículo disponible' : 'artículos disponibles'} en este archivo
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToRoot}
                className="btn btn2"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconArrowLeft size={14} />
                <span>Volver a carpetas</span>
              </button>
            </div>

            {currentActiveArticles.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                No se encontraron artículos que coincidan con la búsqueda en la carpeta {activeYear}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentActiveArticles.map(art => (
                  <div 
                    key={art.id} 
                    className="card"
                    style={{
                      padding: '22px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: '4px solid var(--buap-blue-302)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelectArticle && onSelectArticle(art)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        {/* Etiquetas de categoría, tipo y evento */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span className="tag" style={{ background: '#EBF5FA', color: '#003B5C', fontWeight: 600 }}>
                            {art.area_conocimiento || 'Ciencias Exactas e Ingenierías'}
                          </span>
                          <span className="tag" style={{ background: '#F1F5F9', color: '#475569' }}>
                            {art.tipo ? art.tipo.replace('_', ' ') : 'Artículo Científico'}
                          </span>
                          {art.evento && (
                            <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <IconCalendar size={13} color="#92400E" />
                              {art.evento}
                            </span>
                          )}
                          {art.cuartil && (
                            <span className="tag" style={{ background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                              {art.cuartil}
                            </span>
                          )}
                        </div>

                        {/* Título del artículo */}
                        <h3 
                          className="titulo-gotham-black" 
                          style={{ fontSize: '18px', margin: '0 0 6px', color: 'var(--text-dark)', lineHeight: 1.35 }}
                        >
                          {art.titulo}
                        </h3>

                        {/* Autores */}
                        <div className="nombre-autor" style={{ fontSize: '14.5px', marginBottom: '6px' }}>
                          {art.autores}
                        </div>

                        {/* Revista, Editorial y DOI */}
                        <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {art.revista_editorial && (
                            <span>{art.revista_editorial}</span>
                          )}
                          {art.doi && (
                            <span style={{ fontFamily: 'monospace', color: 'var(--buap-cyan-306)' }}>
                              doi:{art.doi}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div style={{ display: 'flex', gap: '8px', alignSelf: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn2"
                          style={{ minHeight: '34px', padding: '0 14px', fontSize: '13px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectArticle && onSelectArticle(art);
                          }}
                        >
                          Ver detalle
                        </button>
                        {art.url_documento && (
                          <button
                            type="button"
                            className="btn"
                            style={{ minHeight: '34px', padding: '0 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={(e) => handleDownloadPdf(e, art)}
                          >
                            <IconDownload size={14} />
                            <span>Descargar PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === 'folders' ? (
          /* ==================================================================== */
          /* MODO GRID: CARPETAS PRINCIPALES (UNA CARPETA POR CADA AÑO)           */
          /* ==================================================================== */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconFolderOpen size={20} color="var(--buap-blue-302)" />
                <h2 className="encabezado-source-black" style={{ fontSize: '20px', margin: 0, color: 'var(--text-dark)' }}>
                  Carpetas por año de publicación
                </h2>
              </div>
              <span className="muted" style={{ fontSize: '13.5px' }}>
                Haz clic en cualquier carpeta para abrir y explorar sus artículos
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '22px'
            }}>
              {filteredFolders.map(folder => {
                const recentArticles = folder.articulos.slice(0, 3);

                return (
                  <div
                    key={folder.anio}
                    className="card"
                    onClick={() => handleOpenFolder(folder.anio)}
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      cursor: 'pointer',
                      borderTop: '5px solid var(--buap-blue-302)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 59, 92, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    {/* Encabezado de la Carpeta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                          border: '1.5px solid #7DD3FC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#003B5C',
                          flexShrink: 0
                        }}>
                          <IconFolder size={28} color="#003B5C" />
                        </div>
                        <div>
                          <h3 className="titulo-gotham-black" style={{ fontSize: '22px', margin: 0, color: 'var(--buap-blue-302)' }}>
                            Carpeta {folder.anio}
                          </h3>
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                            Año de producción: {folder.anio}
                          </span>
                        </div>
                      </div>

                      <span 
                        className="tag" 
                        style={{ 
                          background: 'var(--buap-blue-302)', 
                          color: '#ffffff', 
                          fontWeight: 700,
                          fontSize: '12.5px',
                          padding: '4px 10px',
                          borderRadius: '14px'
                        }}
                      >
                        {folder.total_articulos} {folder.total_articulos === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </div>

                    {/* Previsualización de Artículos Contenidos */}
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                        Contenido reciente en la carpeta:
                      </div>
                      {recentArticles.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Sin artículos en este año
                        </div>
                      ) : (
                        recentArticles.map(art => (
                          <div key={art.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--buap-cyan-306)', marginTop: '2px', flexShrink: 0 }}>
                              <IconDocument size={13} color="var(--buap-cyan-306)" />
                            </span>
                            <span style={{ 
                              color: '#334155', 
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {art.titulo}
                            </span>
                          </div>
                        ))
                      )}
                      {folder.total_articulos > 3 && (
                        <div style={{ fontSize: '12px', color: 'var(--buap-cyan-306)', fontWeight: 600, marginTop: '2px' }}>
                          + {folder.total_articulos - 3} artículos más...
                        </div>
                      )}
                    </div>

                    {/* Botón Abrir */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--buap-blue-302)',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        fontFamily: 'var(--font-source)'
                      }}>
                        <span>Abrir carpeta</span>
                        <IconChevronRight size={15} color="var(--buap-blue-302)" />
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* MODO ÁRBOL: TODAS LAS CARPETAS EXPANDIBLES (TIPO GESTOR DE ARCHIVOS) */
          /* ==================================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="encabezado-source-black" style={{ fontSize: '20px', margin: 0, color: 'var(--text-dark)' }}>
                Estructura de Árbol: Repositorio BUAP por Años
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn2"
                  style={{ minHeight: '32px', fontSize: '12.5px', padding: '0 10px' }}
                  onClick={() => {
                    const allExp = {};
                    folders.forEach(f => { allExp[f.anio] = true; });
                    setExpandedYears(allExp);
                  }}
                >
                  Expandir todas
                </button>
                <button
                  type="button"
                  className="btn btn2"
                  style={{ minHeight: '32px', fontSize: '12.5px', padding: '0 10px' }}
                  onClick={() => setExpandedYears({})}
                >
                  Colapsar todas
                </button>
              </div>
            </div>

            {filteredFolders.map(folder => {
              const isExpanded = !!expandedYears[folder.anio];

              return (
                <div 
                  key={folder.anio} 
                  className="card"
                  style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid var(--buap-blue-302)' }}
                >
                  {/* Fila de Encabezado de la Carpeta */}
                  <div 
                    onClick={() => handleToggleTreeYear(folder.anio)}
                    style={{
                      padding: '16px 20px',
                      background: isExpanded ? '#F8FAFC' : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--buap-blue-302)' }}>
                        {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                      </span>
                      <span style={{ color: isExpanded ? 'var(--buap-cyan-306)' : 'var(--buap-blue-302)' }}>
                        {isExpanded ? <IconFolderOpen size={22} /> : <IconFolder size={22} />}
                      </span>
                      <strong className="titulo-gotham-black" style={{ fontSize: '18px', color: 'var(--text-dark)' }}>
                        Carpeta {folder.anio}
                      </strong>
                      <span 
                        className="tag" 
                        style={{ 
                          background: '#E2E8F0', 
                          color: '#334155', 
                          fontWeight: 700, 
                          fontSize: '12px',
                          marginLeft: '6px'
                        }}
                      >
                        {folder.total_articulos} {folder.total_articulos === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolder(folder.anio);
                        }}
                        className="btn btn2"
                        style={{ minHeight: '30px', padding: '0 10px', fontSize: '12.5px' }}
                      >
                        Ver sólo esta carpeta
                      </button>
                    </div>
                  </div>

                  {/* Lista de Artículos dentro de la Carpeta */}
                  {isExpanded && (
                    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {folder.articulos.length === 0 ? (
                        <div style={{ padding: '12px', color: '#94A3B8', fontStyle: 'italic', fontSize: '13.5px' }}>
                          No hay artículos disponibles en este año.
                        </div>
                      ) : (
                        folder.articulos.map(art => (
                          <div 
                            key={art.id}
                            onClick={() => onSelectArticle && onSelectArticle(art)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              gap: '12px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F0F9FF'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                              <IconDocument size={16} color="var(--buap-blue-302)" style={{ marginTop: '3px', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: 'var(--text-dark)', fontSize: '14.5px', display: 'block', lineHeight: 1.35 }}>
                                  {art.titulo}
                                </strong>
                                <span className="nombre-autor" style={{ fontSize: '13px', color: '#475569' }}>
                                  {art.autores}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                  {art.evento && (
                                    <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11.5px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <IconCalendar size={11} color="#92400E" />
                                      {art.evento}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                                    {art.revista_editorial}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn btn2"
                                style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectArticle && onSelectArticle(art);
                                }}
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
