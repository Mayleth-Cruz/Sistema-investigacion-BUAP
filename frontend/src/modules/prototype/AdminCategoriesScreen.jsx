import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/categoryService';
import CategoryModal from '../../components/CategoryModal';
import { CategoryIcon, IconArrowLeft } from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN: ADMIN: GESTIÓN DE CATEGORÍAS Y GÉNEROS (AdminCategoriesScreen)
 * ============================================================================
 * Permite al Administrador:
 * - Consultar, filtrar y buscar categorías institucionales y formatos de publicación.
 * - Crear nuevas áreas del conocimiento y géneros personalizados.
 * - Editar nombres, colores distintivos, iconos y descripciones.
 * - Eliminar categorías del catálogo.
 * - Estilo visual 100% coherente con la identidad institucional BUAP.
 */
export default function AdminCategoriesScreen({ onNavigate, showToast }) {
  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Control de modal
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);

  useEffect(() => {
    loadCategories();
  }, [typeFilter, search]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll({ 
        tipo: typeFilter || undefined, 
        search: search || undefined 
      });
      setCategories(data || []);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCategoryToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (cat) => {
    setCategoryToEdit(cat);
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${name}"?`)) {
      return;
    }

    try {
      const res = await categoryService.delete(id);
      if (res && res.success === false && res.message) {
        alert(res.message);
        return;
      }
      if (showToast) showToast(`Categoría "${name}" eliminada.`);
      loadCategories();
    } catch (err) {
      alert('Error al eliminar categoría: ' + err.message);
    }
  };

  const handleModalSuccess = (savedCat, isNew) => {
    if (showToast) {
      showToast(isNew ? `Categoría "${savedCat.nombre}" creada exitosamente.` : `Categoría "${savedCat.nombre}" actualizada.`);
    }
    loadCategories();
  };

  const areasCount = categories.filter(c => c.tipo === 'area_conocimiento').length;
  const genresCount = categories.filter(c => c.tipo === 'genero_publicacion').length;

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
        <a onClick={() => onNavigate('admin-authors')}>
          Autores
        </a>
        <a className="on">
          Categorías
        </a>
      </div>

      {/* 2. Área Central */}
      <div style={{ flex: 1, padding: '32px 40px', minWidth: '320px', maxWidth: '1200px' }}>
        
        {/* Cabecera Principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="titulo-gotham-black" style={{ fontSize: '30px', margin: 0, color: 'var(--text-dark, #0F172A)' }}>
              Catálogo de Categorías y Áreas
            </h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '14.5px' }}>
              Configuración y edición personalizada de las áreas temáticas del conocimiento y formatos de publicación.
            </p>
          </div>

          <button 
            type="button" 
            className="btn"
            onClick={handleCreateNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+</span>
            <span>Nueva categoría</span>
          </button>
        </div>

        {/* Métricas / Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Total de categorías</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: 'var(--buap-blue-302, #003B5C)', marginTop: '4px' }}>
              {categories.length}
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Áreas del conocimiento (VIEP)</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: 'var(--buap-cyan-306, #00A3E0)', marginTop: '4px' }}>
              {areasCount}
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Formatos de publicación</div>
            <div className="titulo-gotham-black" style={{ fontSize: '32px', color: '#7C3AED', marginTop: '4px' }}>
              {genresCount}
            </div>
          </div>
        </div>

        {/* Tarjeta de Contenido con Filtros */}
        <div className="card" style={{ padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            
            {/* Pestañas de Filtro por Tipo */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTypeFilter('')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: typeFilter === '' ? 'var(--buap-blue-302, #003B5C)' : '#F1F5F9',
                  color: typeFilter === '' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Todas ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('area_conocimiento')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: typeFilter === 'area_conocimiento' ? 'var(--buap-blue-302, #003B5C)' : '#F1F5F9',
                  color: typeFilter === 'area_conocimiento' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Áreas del conocimiento
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('genero_publicacion')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: typeFilter === 'genero_publicacion' ? 'var(--buap-blue-302, #003B5C)' : '#F1F5F9',
                  color: typeFilter === 'genero_publicacion' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Formatos de publicación
              </button>
            </div>

            {/* Búsqueda */}
            <div style={{ minWidth: '240px', flex: '0 1 320px' }}>
              <input 
                type="text"
                placeholder="Buscar categoría o área..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Tabla de Categorías */}
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Categoría / Área</th>
                  <th style={{ width: '20%' }}>Tipo</th>
                  <th style={{ width: '30%' }}>Descripción</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Artículos</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Cargando catálogo de categorías...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron categorías registradas.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            style={{ 
                              fontSize: '18px', 
                              backgroundColor: `${cat.color || '#003B5C'}15`, 
                              padding: '6px', 
                              borderRadius: '8px', 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px'
                            }}
                          >
                            <CategoryIcon nameOrEmoji={cat.icono} size={18} color={cat.color || '#003B5C'} />
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-dark)', display: 'block', fontSize: '14.5px', fontFamily: 'var(--font-source)', fontWeight: 700 }}>
                              {cat.nombre}
                            </strong>
                            {cat.codigo && (
                              <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                {cat.codigo}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span 
                          className="tag" 
                          style={{ 
                            background: cat.tipo === 'area_conocimiento' ? '#EFF6FF' : '#F5F3FF',
                            color: cat.tipo === 'area_conocimiento' ? '#1E40AF' : '#6D28D9',
                            fontWeight: 600,
                            fontSize: '12.5px'
                          }}
                        >
                          {cat.tipo === 'area_conocimiento' ? 'Área del Conocimiento' : 'Género / Formato'}
                        </span>
                      </td>

                      <td style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.4 }}>
                        {cat.descripcion || 'Sin descripción detallada.'}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="tag" 
                          style={{ 
                            background: '#F1F5F9', 
                            color: '#334155',
                            fontWeight: 700
                          }}
                        >
                          {cat.total_publicaciones || 0}
                        </span>
                      </td>

                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(cat)}
                          style={{ background: 'none', border: 'none', color: '#003B5C', fontFamily: 'var(--font-source)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          Editar
                        </button>
                        <span style={{ color: '#8A9794', margin: '0 8px' }}>·</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.nombre)}
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

      {/* Modal para Crear y Editar Categorías */}
      <CategoryModal 
        isOpen={modalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

    </div>
  );
}
