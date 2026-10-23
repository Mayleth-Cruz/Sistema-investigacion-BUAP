import React, { useState, useEffect } from 'react';
import { publicationService } from '../../services/publicationService';
import DeleteArticleModal from '../../components/DeleteArticleModal';
import { getDocumentUrl } from '../../services/api';
import { IconEye, IconDownload, IconArrowLeft } from '../../components/Icons';
import AdminSidebar from '../../components/AdminSidebar';

/**
 * ============================================================================
 * SCREEN: ADMIN: PANEL Y GESTIÓN DE ARTÍCULOS (BUAP)
 * ============================================================================
 * Características:
 * 1. Métricas reales calculadas en la base de datos (publicados, visitas, descargas, borradores).
 * 2. Carga y filtrado de artículos directamente desde el backend MySQL / SQLite.
 * 3. Acciones seguras: edición completa, apertura de PDF con tracking de descargas.
 * 4. Eliminación protegida mediante modal interactivo que requiere escribir "eliminar".
 * 5. Tipografías institucionales del Manual de Identidad BUAP (Gotham Black & Source Sans Pro).
 */
export default function AdminPanelScreen({ 
  onNavigate, 
  onEditArticle, 
  onUploadClick, 
  activeNav = 'panel',
  showToast 
}) {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Métricas reales sincronizadas con la base de datos
  const [stats, setStats] = useState({
    publicados: 0,
    visitas: 0,
    descargas: 0,
    borradores: 0
  });

  // Estado del modal de confirmación segura de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listData, realStats] = await Promise.all([
        publicationService.getAll({ search, estado: statusFilter }),
        publicationService.getAdminStats()
      ]);

      setArticles(listData || []);

      if (realStats) {
        setStats({
          publicados: realStats.articulos_publicados ?? 0,
          visitas: realStats.total_visitas ?? 0,
          descargas: realStats.total_descargas ?? 0,
          borradores: realStats.articulos_borradores ?? 0
        });
      }
    } catch (err) {
      console.error('Error cargando datos del panel admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteModal = (art) => {
    setArticleToDelete(art);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;

    setIsDeleting(true);
    try {
      const res = await publicationService.delete(articleToDelete.id);
      if (res && res.success === false && res.message) {
        throw new Error(res.message);
      }
      if (showToast) showToast('Artículo eliminado de la base de datos institucional.');
      setDeleteModalOpen(false);
      setArticleToDelete(null);
      await loadData();
    } catch (err) {
      alert('Error al eliminar artículo: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePdfClick = (e, art) => {
    // Registrar el incremento de descarga en la base de datos de forma asíncrona
    publicationService.recordDownload(art.id).then((res) => {
      const updatedCount = res?.data?.descargas ?? ((art.descargas || 0) + 1);
      setStats(prev => ({ ...prev, descargas: prev.descargas + 1 }));
      setArticles(prev => prev.map(a => 
        a.id === art.id ? { ...a, descargas: updatedCount } : a
      ));
    }).catch(err => console.error('Error registrando descarga:', err));
  };

  return (
    <div className="admin-layout-wrapper">
      
      {/* 1. Menú Lateral de Administración (Desktop y Drawer Móvil) */}
      <AdminSidebar 
        activeNav="panel" 
        onNavigate={onNavigate} 
        onUploadClick={onUploadClick} 
      />

      {/* 2. Área Central de Contenido */}
      <div className="admin-content-area">
        
        {/* Cabecera del Panel con Gotham Black */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="titulo-gotham-black" style={{ fontSize: '30px', color: 'var(--text-dark)', margin: 0 }}>
              Panel de administración
            </h1>
            <p className="cuerpo-texto muted" style={{ margin: '4px 0 0', fontSize: '14.5px' }}>
              Gestión centralizada del repositorio institucional con métricas en tiempo real.
            </p>
          </div>
          <button 
            type="button" 
            className="btn"
            onClick={onUploadClick}
          >
            + Subir artículo
          </button>
        </div>

        {/* Fila de Tarjetas de Estadísticas Reales */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: '180px', borderLeft: '4px solid var(--buap-blue-302)' }}>
            <div className="muted" style={{ fontSize: '13.5px', fontWeight: 600 }}>Artículos publicados</div>
            <div className="titulo-gotham-black" style={{ fontSize: '34px', color: 'var(--buap-blue-302)', marginTop: '4px' }}>
              {stats.publicados.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Disponibles al público</div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '180px', borderLeft: '4px solid var(--buap-cyan-306)' }}>
            <div className="muted" style={{ fontSize: '13.5px', fontWeight: 600 }}>Visitas totales</div>
            <div className="titulo-gotham-black" style={{ fontSize: '34px', color: 'var(--buap-cyan-306)', marginTop: '4px' }}>
              {stats.visitas.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Fichas consultadas en BD</div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '180px', borderLeft: '4px solid #10B981' }}>
            <div className="muted" style={{ fontSize: '13.5px', fontWeight: 600 }}>Descargas de PDF</div>
            <div className="titulo-gotham-black" style={{ fontSize: '34px', color: '#10B981', marginTop: '4px' }}>
              {stats.descargas.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Documentos obtenidos</div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '180px', borderLeft: '4px solid #F59E0B' }}>
            <div className="muted" style={{ fontSize: '13.5px', fontWeight: 600 }}>Borradores</div>
            <div className="titulo-gotham-black" style={{ fontSize: '34px', color: '#F59E0B', marginTop: '4px' }}>
              {stats.borradores.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>En proceso de edición</div>
          </div>
        </div>

        {/* Tarjeta con Buscador y Tabla de Artículos */}
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              aria-label="Buscar en el panel" 
              placeholder="Buscar artículo por título, autor o palabra clave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px' }}
            />
            <select 
              aria-label="Estado" 
              style={{ width: '200px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="publicado">Publicado</option>
              <option value="borrador">Borrador</option>
            </select>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Título del artículo</th>
                  <th style={{ width: '18%' }}>Autores</th>
                  <th style={{ width: '14%' }}>Área / Categoría</th>
                  <th style={{ width: '12%' }}>Métricas BD</th>
                  <th style={{ width: '10%' }}>Estado</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Cargando publicaciones desde la base de datos...
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron artículos registrados en el repositorio institucional.
                    </td>
                  </tr>
                ) : (
                  articles.map((art) => {
                    const isBorrador = (art.estado || '').toLowerCase() === 'borrador';
                    const fechaStr = art.fecha_publicacion || (art.anio ? `${art.anio}` : '—');
                    const vistasCount = art.vistas ?? 0;
                    const descargasCount = art.descargas ?? 0;

                    return (
                      <tr key={art.id}>
                        <td>
                          <strong style={{ color: 'var(--text-dark)', display: 'block', fontSize: '14.5px', fontFamily: 'var(--font-source)', fontWeight: 700, lineHeight: 1.35 }}>
                            {art.titulo}
                          </strong>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                            {art.doi && (
                              <span style={{ fontSize: '12px', color: 'var(--buap-cyan-306)', fontFamily: 'monospace' }}>
                                doi:{art.doi}
                              </span>
                            )}
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              Año: {fechaStr}
                            </span>
                            {art.evento && (
                              <span style={{ fontSize: '11.5px', color: '#92400E', background: '#FEF3C7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {art.evento}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="nombre-autor" style={{ fontSize: '14px', lineHeight: 1.35, display: 'block' }}>
                            {art.autores}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                            {art.area_conocimiento || art.categoria || 'Área General'}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12.5px' }}>
                            <span title="Visualizaciones registradas" style={{ color: 'var(--buap-blue-302)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconEye size={13} color="var(--buap-blue-302)" /> {vistasCount.toLocaleString()} vistas
                            </span>
                            <span title="Descargas del PDF" style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconDownload size={13} color="#059669" /> {descargasCount.toLocaleString()} descargas
                            </span>
                          </div>
                        </td>

                        <td>
                          <span 
                            className="tag" 
                            style={{ 
                              background: isBorrador ? '#FEF3C7' : '#EBF5FA',
                              color: isBorrador ? '#92400E' : '#003B5C',
                              fontWeight: 700
                            }}
                          >
                            {isBorrador ? 'Borrador' : 'Publicado'}
                          </span>
                        </td>

                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => onEditArticle(art)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#003B5C', 
                              fontFamily: 'var(--font-source)', 
                              fontWeight: 700, 
                              cursor: 'pointer', 
                              padding: '4px 6px',
                              borderRadius: '4px'
                            }}
                            title="Editar metadatos y documento"
                          >
                            Editar
                          </button>

                          {art.url_documento && (
                            <>
                              <span style={{ color: '#CBD5E1', margin: '0 4px' }}>|</span>
                              <a
                                href={getDocumentUrl(art.url_documento)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => handlePdfClick(e, art)}
                                style={{ 
                                  color: '#00A3E0', 
                                  fontFamily: 'var(--font-source)', 
                                  fontWeight: 700, 
                                  textDecoration: 'none',
                                  padding: '4px 6px',
                                  borderRadius: '4px'
                                }}
                                title="Abrir y descargar documento PDF"
                              >
                                PDF
                              </a>
                            </>
                          )}

                          <span style={{ color: '#CBD5E1', margin: '0 4px' }}>|</span>
                          
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(art)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#DC2626', 
                              fontFamily: 'var(--font-source)', 
                              fontWeight: 700, 
                              cursor: 'pointer', 
                              padding: '4px 6px',
                              borderRadius: '4px'
                            }}
                            title="Eliminar permanentemente este artículo"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 3. Modal de confirmación segura para eliminar */}
      <DeleteArticleModal 
        isOpen={deleteModalOpen}
        article={articleToDelete}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

    </div>
  );
}
