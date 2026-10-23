import React, { useState, useEffect } from 'react';
import { researcherService } from '../../services/researcherService';
import AuthorModal from '../../components/AuthorModal';
import { IconArrowLeft } from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN: ADMIN: GESTIÓN DE AUTORES E INVESTIGADORES (AdminAuthorsScreen)
 * ============================================================================
 * Permite al Administrador:
 * - Consultar el directorio completo de autores e investigadores institucionales.
 * - Registrar un nuevo autor (solo nombre y apellido requeridos; resto opcionales).
 * - Modificar la información de cualquier autor existente.
 * - Eliminar autores del catálogo.
 * - Estilo visual 100% coherente con la identidad institucional BUAP.
 */
export default function AdminAuthorsScreen({ onNavigate, showToast }) {
  const [authors, setAuthors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Control de modal
  const [modalOpen, setModalOpen] = useState(false);
  const [authorToEdit, setAuthorToEdit] = useState(null);

  useEffect(() => {
    loadAuthors();
  }, [search]);

  const loadAuthors = async () => {
    setLoading(true);
    try {
      const data = await researcherService.getAll(search);
      setAuthors(data || []);
    } catch (err) {
      console.error('Error cargando autores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setAuthorToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (author) => {
    setAuthorToEdit(author);
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al autor "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await researcherService.delete(id);
      if (res && res.success === false && res.message) {
        alert(res.message);
        return;
      }
      if (showToast) showToast(`Autor "${name}" eliminado del directorio.`);
      loadAuthors();
    } catch (err) {
      alert('Error al eliminar autor: ' + err.message);
    }
  };

  const handleModalSuccess = (savedAuthor, isNew) => {
    if (showToast) {
      showToast(isNew ? `Autor "${savedAuthor.nombre_completo}" registrado exitosamente.` : `Datos de "${savedAuthor.nombre_completo}" actualizados.`);
    }
    loadAuthors();
  };

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)', display: 'flex', flexWrap: 'wrap' }}>
      
      {/* 1. Menú Lateral de Administración */}
      <div className="side">
        <h3 className="encabezado-source-black">
          Administración
        </h3>
        <a onClick={() => onNavigate('admin-panel')}>
          Panel
        </a>
        <a onClick={() => onNavigate('admin-upload')}>
          Subir artículo
        </a>
        <a className="on">
          Autores
        </a>
        <a onClick={() => onNavigate('admin-categories')}>
          Categorías
        </a>
      </div>

      {/* 2. Área Central de Contenido */}
      <div style={{ flex: 1, padding: '32px 40px', minWidth: '320px', maxWidth: '1200px' }}>
        
        {/* Cabecera Principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="titulo-gotham-black" style={{ fontSize: '30px', margin: 0, color: 'var(--text-dark, #0F172A)' }}>
              Directorio de Autores e Investigadores
            </h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '14.5px' }}>
              Gestión centralizada del padrón académico, coautores y producción institucional BUAP.
            </p>
          </div>

          <button 
            type="button" 
            className="btn"
            onClick={handleCreateNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+</span>
            <span>Registrar autor</span>
          </button>
        </div>

        {/* Tarjeta de Métricas Rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Total de autores registrados</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: 'var(--buap-blue-302, #003B5C)', marginTop: '4px' }}>
              {authors.length}
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Investigadores con ORCID</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: '#16A34A', marginTop: '4px' }}>
              {authors.filter(a => a.orcid).length}
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Unidades Académicas BUAP</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: 'var(--buap-cyan-306, #00A3E0)', marginTop: '4px' }}>
              {new Set(authors.map(a => a.afiliacion).filter(Boolean)).size || 1}
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <input 
                type="text"
                placeholder="Buscar autor por nombre, apellidos, facultad o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {search && (
              <button 
                type="button" 
                className="btn btn2" 
                onClick={() => setSearch('')}
                style={{ height: '44px' }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {/* Tabla de Autores */}
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Autor / Investigador</th>
                  <th style={{ width: '25%' }}>Facultad / Unidad Académica</th>
                  <th style={{ width: '25%' }}>Línea de investigación</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Publicaciones</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Cargando directorio de autores...
                    </td>
                  </tr>
                ) : authors.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron autores registrados {search ? `para la búsqueda "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  authors.map((author) => (
                    <tr key={author.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {author.avatar_url ? (
                            <img 
                              src={author.avatar_url} 
                              alt="" 
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <div 
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0, 59, 92, 0.1)',
                                color: 'var(--buap-blue-302, #003B5C)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '15px'
                              }}
                            >
                              {author.nombre_completo ? author.nombre_completo.charAt(0) : 'A'}
                            </div>
                          )}

                          <div>
                            <strong style={{ color: 'var(--text-dark)', display: 'block', fontSize: '14.5px', fontFamily: 'var(--font-source)', fontWeight: 700 }}>
                              {author.nombre_completo}
                            </strong>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>
                                {author.correo}
                              </span>
                              {author.orcid && (
                                <span 
                                  style={{ 
                                    fontSize: '10.5px', 
                                    color: '#16A34A', 
                                    background: '#DCFCE7', 
                                    padding: '1px 5px', 
                                    borderRadius: '3px',
                                    fontWeight: 600
                                  }}
                                  title={`ORCID: ${author.orcid}`}
                                >
                                  ORCID
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: '13.5px', color: '#334155' }}>
                        {author.afiliacion || 'Benemérita Universidad Autónoma de Puebla'}
                      </td>

                      <td style={{ fontSize: '13.5px', color: '#475569' }}>
                        {author.linea_investigacion || 'Investigación General'}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="tag" 
                          style={{ 
                            background: '#EFF6FF', 
                            color: '#1E40AF',
                            fontWeight: 700,
                            padding: '3px 10px'
                          }}
                        >
                          {author.total_publicaciones || 0}
                        </span>
                      </td>

                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(author)}
                          style={{ background: 'none', border: 'none', color: '#003B5C', fontFamily: 'var(--font-source)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          Editar
                        </button>
                        <span style={{ color: '#8A9794', margin: '0 8px' }}>·</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(author.id, author.nombre_completo)}
                          style={{ background: 'none', border: 'none', color: '#9B1C1C', fontFamily: 'var(--font-source)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal para Crear y Editar Autores */}
      <AuthorModal 
        isOpen={modalOpen}
        authorToEdit={authorToEdit}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

    </div>
  );
}
