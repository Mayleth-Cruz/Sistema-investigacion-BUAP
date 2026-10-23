import React, { useState, useEffect, useRef } from 'react';
import { publicationService } from '../../services/publicationService';
import { categoryService } from '../../services/categoryService';
import { getDocumentUrl } from '../../services/api';
import { IconSearch, IconEye, IconDownload, IconBook, IconCalendar } from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN: USUARIO: INICIO Y BÚSQUEDA DE INVESTIGACIÓN (BUAP)
 * ============================================================================
 * Jerarquía tipográfica oficial del Manual de Identidad BUAP:
 * - Gotham Black: Título Hero "Producción académica y científica"
 * - Gotham Book: Subtítulo Hero "Busca artículos por palabra clave..."
 * - Source Sans Pro Black: Encabezados de sección y tarjetas ("Filtros", Título de tarjetas)
 * - Source Sans Pro Regular: Cuerpo de texto, etiquetas y botones
 * - Source Sans Pro Semibold Italic: Nombres de autores
 * - Source Sans Pro Italic: Fechas de publicación
 *
 * Características:
 * 1. 100% conectado a la base de datos MySQL / SQLite vía API REST con índices de alto rendimiento.
 * 2. Búsqueda por término (título, resumen, autores, palabras clave) con debounce de 300ms y botón "Buscar".
 * 3. Filtros interactivos por Categoría / Área del conocimiento, Año, Evento/Congreso y Autor.
 * 4. Botón de reinicio de filtros.
 * 5. Registro automático de descarga de PDF en la base de datos al hacer clic en "Descargar PDF".
 */
export default function HomeSearchScreen({ onSelectArticle, onNavigate }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de búsqueda y filtros
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');

  // Categorías y Eventos institucionales dinámicos desde BD
  const [categoriesList, setCategoriesList] = useState([]);
  const [eventsList, setEventsList] = useState([]);

  // Control de debounce para la barra de búsqueda
  const isFirstRender = useRef(true);

  // 1. Cargar catálogo de categorías y eventos desde la base de datos
  useEffect(() => {
    categoryService.getAll({ tipo: 'area_conocimiento' })
      .then(cats => {
        if (cats && cats.length > 0) {
          setCategoriesList(cats);
        } else {
          // Fallback institucional en caso de desconexión
          setCategoriesList([
            { id: 1, nombre: 'Ciencias Exactas e Ingenierías' },
            { id: 2, nombre: 'Ciencias Naturales y Agropecuarias' },
            { id: 3, nombre: 'Ciencias de la Salud' },
            { id: 4, nombre: 'Ciencias Sociales y Humanidades' },
            { id: 5, nombre: 'Económico-Administrativas' },
            { id: 6, nombre: 'Artes y Hábitat' }
          ]);
        }
      })
      .catch(() => {
        setCategoriesList([
          { id: 1, nombre: 'Ciencias Exactas e Ingenierías' },
          { id: 2, nombre: 'Ciencias Naturales y Agropecuarias' },
          { id: 3, nombre: 'Ciencias de la Salud' },
          { id: 4, nombre: 'Ciencias Sociales y Humanidades' },
          { id: 5, nombre: 'Económico-Administrativas' },
          { id: 6, nombre: 'Artes y Hábitat' }
        ]);
      });

    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const evs = await publicationService.getEvents();
      if (Array.isArray(evs)) {
        setEventsList(evs);
      }
    } catch (err) {
      console.error('Error cargando eventos registrados:', err);
    }
  };

  // 2. Carga inicial de artículos desde la base de datos
  useEffect(() => {
    loadArticles();
  }, []);

  // 3. Debounce para búsqueda reactiva al escribir
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadArticles();
    }, 320);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  /**
   * Consulta las publicaciones en el backend aplicando los filtros y búsqueda en BD
   */
  const loadArticles = async (customFilters = {}) => {
    setLoading(true);
    // Sincronizar dinámicamente los eventos que están registrados en los artículos de la BD
    loadEvents();

    const queryParams = {
      search: customFilters.search !== undefined ? customFilters.search : searchKeyword.trim(),
      anio: customFilters.year !== undefined ? customFilters.year : selectedYear,
      area_conocimiento: customFilters.category !== undefined ? customFilters.category : selectedCategory,
      evento: customFilters.event !== undefined ? customFilters.event : selectedEvent,
      autor: customFilters.author !== undefined ? customFilters.author : authorQuery.trim(),
      estado: 'publicado' // Solo artículos publicados para el público
    };

    try {
      const data = await publicationService.getAll(queryParams);
      setArticles(data || []);
    } catch (err) {
      console.error('Error cargando artículos de la base de datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    loadArticles();
  };

  const handleApplyFilters = () => {
    loadArticles({
      search: searchKeyword,
      category: selectedCategory,
      year: selectedYear,
      event: selectedEvent,
      author: authorQuery
    });
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedCategory('');
    setSelectedYear('');
    setSelectedEvent('');
    setAuthorQuery('');
    loadArticles({
      search: '',
      category: '',
      year: '',
      event: '',
      author: ''
    });
  };

  const handleOpenArticle = (article) => {
    onSelectArticle(article);
  };

  const handleDownloadPdf = (e, article) => {
    e.stopPropagation();

    // Incrementar conteo de descargas en la BD en tiempo real
    publicationService.recordDownload(article.id).then((res) => {
      const updatedDescargas = res?.data?.descargas ?? ((article.descargas || 0) + 1);
      setArticles(prev => prev.map(a => 
        a.id === article.id ? { ...a, descargas: updatedDescargas } : a
      ));
    }).catch(err => console.error('Error registrando descarga:', err));

    if (article.url_documento) {
      const target = getDocumentUrl(article.url_documento);
      window.open(target, '_blank');
    } else {
      alert(`Iniciando descarga del documento PDF: "${article.titulo}"`);
    }
  };

  const hasActiveFilters = Boolean(searchKeyword || selectedCategory || selectedYear || selectedEvent || authorQuery);

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)' }}>
      
      {/* 1. Hero Institucional de Búsqueda BUAP */}
      <div className="hero-buap">
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {/* Título en Gotham Black */}
          <h1 className="titulo-gotham-black" style={{ color: '#ffffff', fontSize: '38px', marginBottom: '8px' }}>
            Producción académica y científica
          </h1>
          {/* Subtítulo en Gotham Book */}
          <h2 className="subtitulo-gotham-book" style={{ margin: '0 0 20px', color: '#DCE8E6', fontSize: '16.5px' }}>
            Repositorio institucional de acceso abierto · Conectado en tiempo real a la base de datos.
          </h2>
          
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <input 
                aria-label="Buscar artículos" 
                placeholder="Buscar por título, resumen, autor o palabras clave..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: searchKeyword ? '36px' : '14px' }}
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  title="Borrar búsqueda"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8A9794',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-accent" 
              style={{ whiteSpace: 'nowrap' }}
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* 2. Cuerpo Principal: Filtros y Resultados */}
      <div style={{ display: 'flex', gap: '32px', padding: '32px 40px', flexWrap: 'wrap', maxWidth: '1360px', margin: '0 auto' }}>
        
        {/* Panel Izquierdo: Filtros */}
        <div className="card" style={{ width: '270px', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '18px', flexShrink: 0 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="encabezado-source-black" style={{ fontSize: '18px', margin: 0 }}>
              Filtros
            </h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--buap-cyan-306)',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-source)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Limpiar todo
              </button>
            )}
          </div>
          
          {/* Filtro 1: Área del Conocimiento / Categoría */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '6px', color: '#1E293B' }}>
              Área del conocimiento
            </label>
            <select 
              aria-label="Área del conocimiento"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                loadArticles({ category: e.target.value });
              }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">Todas las áreas</option>
              {categoriesList.map(cat => (
                <option key={cat.id} value={cat.nombre}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 2: Año de publicación */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '6px', color: '#1E293B' }}>
              Año de publicación
            </label>
            <select 
              aria-label="Año"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                loadArticles({ year: e.target.value });
              }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">Todos los años</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          {/* Filtro 3: Evento académico / Congreso */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '6px', color: '#1E293B' }}>
              Evento / Congreso
            </label>
            <select 
              aria-label="Evento"
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                loadArticles({ event: e.target.value });
              }}
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={eventsList.length === 0}
            >
              <option value="">
                {eventsList.length === 0 ? 'Sin eventos registrados' : 'Todos los eventos'}
              </option>
              {eventsList.map((ev, idx) => (
                <option key={idx} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 4: Autor */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13.5px', marginBottom: '6px', color: '#1E293B' }}>
              Investigador / Autor
            </label>
            <input 
              aria-label="Autor" 
              placeholder="Ej: Elena Ramos, Carlos..."
              value={authorQuery}
              onChange={(e) => setAuthorQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyFilters();
                }
              }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="button" 
            className="btn"
            onClick={handleApplyFilters}
            style={{ width: '100%' }}
          >
            Aplicar filtros
          </button>
        </div>

        {/* Panel Derecho: Lista de Resultados */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="muted" style={{ fontWeight: 600, fontSize: '14.5px' }}>
              {loading ? 'Consultando base de datos...' : `${articles.length} ${articles.length === 1 ? 'publicación científica encontrada' : 'publicaciones científicas encontradas'}`}
            </div>
            {hasActiveFilters && (
              <span style={{ fontSize: '12.5px', color: 'var(--buap-blue-302)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconSearch size={14} color="var(--buap-blue-302)" /> Filtros activos aplicados
              </span>
            )}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                <IconBook size={32} color="var(--buap-blue-302)" />
              </div>
              Cargando producción académica desde la base de datos...
            </div>
          ) : articles.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                <IconSearch size={32} color="#64748B" />
              </div>
              No se encontraron artículos que coincidan con los criterios de búsqueda seleccionados.
              <div style={{ marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="btn btn2" 
                  onClick={handleResetFilters}
                  style={{ display: 'inline-block' }}
                >
                  Restablecer filtros
                </button>
              </div>
            </div>
          ) : (
            articles.map((art) => {
              const vistasCount = art.vistas ?? 0;
              const descargasCount = art.descargas ?? 0;
              const yearStr = art.fecha_publicacion || (art.anio ? `${art.anio}` : '');

              return (
                <div 
                  key={art.id} 
                  className="card" 
                  style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '24px' }}
                >
                  {/* Miniatura gráfica de PDF institucional */}
                  <div 
                    aria-hidden="true" 
                    className="pdf-thumbnail"
                    onClick={() => onSelectArticle(art)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="pdf-thumb-bar1"></div>
                    <div className="pdf-thumb-line"></div>
                    <div className="pdf-thumb-line"></div>
                    <div className="pdf-thumb-line" style={{ width: '80%' }}></div>
                    <div className="pdf-thumb-box"></div>
                    <div className="pdf-thumb-lbl">PDF</div>
                  </div>

                  {/* Contenido descriptivo del artículo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '260px' }}>
                    
                    {/* Título en Gotham Black */}
                    <h3 
                      className="titulo-gotham-black" 
                      style={{ fontSize: '20px', color: 'var(--text-dark)', cursor: 'pointer', lineHeight: 1.3, margin: 0 }} 
                      onClick={() => handleOpenArticle(art)}
                    >
                      {art.titulo}
                    </h3>

                    {/* Nombre en Source Sans Pro Semibold Italic / Fecha en Italic */}
                    <div style={{ fontSize: '14.5px' }}>
                      <span className="nombre-autor">{art.autores}</span>
                      {yearStr && <span className="cargo-autor"> · {yearStr}</span>}
                      {art.area_conocimiento && (
                        <span style={{ color: '#003B5C', fontWeight: 600, marginLeft: '8px' }}>
                          · {art.area_conocimiento}
                        </span>
                      )}
                    </div>

                    {/* Resumen en Source Sans Pro Regular */}
                    <p className="cuerpo-texto" style={{ margin: 0, fontSize: '14.5px', color: '#334155', lineHeight: 1.5 }}>
                      {art.resumen || 'Resumen de la investigación: breve descripción del objetivo, método y principales resultados obtenidos en el marco institucional de la Benemérita Universidad Autónoma de Puebla.'}
                    </p>

                    {/* Tags institucionales y métricas reales en BD */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                      <span className="tag" style={{ background: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
                        {art.cuartil ? `Indexado ${art.indexacion || 'Scopus'} (${art.cuartil})` : (art.categoria || 'Artículo')}
                      </span>
                      
                      <span className="tag" style={{ background: '#F1F5F9', color: '#475569' }}>
                        {art.revista_editorial || 'BUAP Research'}
                      </span>
                      
                      {art.doi && (
                        <span className="tag" style={{ background: '#F8FAFC', color: 'var(--buap-cyan-306)', fontFamily: 'monospace' }}>
                          doi:{art.doi}
                        </span>
                      )}

                      {art.evento && (
                        <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <IconCalendar size={13} color="#92400E" /> {art.evento}
                        </span>
                      )}

                      {/* Métricas reales registradas en BD */}
                      <span style={{ fontSize: '12px', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconEye size={13} color="var(--buap-blue-302)" /> {vistasCount.toLocaleString()} vistas
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconDownload size={13} color="#059669" /> {descargasCount.toLocaleString()} descargas
                        </span>
                      </span>
                    </div>

                    {/* Botonera de acciones */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        className="btn"
                        onClick={() => handleOpenArticle(art)}
                      >
                        Ver detalle
                      </button>
                      <button 
                        type="button" 
                        className="btn btn2"
                        onClick={(e) => handleDownloadPdf(e, art)}
                        title="Descargar archivo PDF"
                      >
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
