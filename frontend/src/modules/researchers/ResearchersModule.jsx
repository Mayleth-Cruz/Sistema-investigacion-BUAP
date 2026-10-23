import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, ExternalLink, Edit2, Trash2, BookOpen, FolderGit2, Award } from 'lucide-react';
import { researcherService } from '../../services/researcherService';
import ResearcherFormModal from './ResearcherFormModal';

/**
 * ============================================================================
 * MÓDULO DE INVESTIGADORES (Directorio, Registro y Gestión)
 * ============================================================================
 * Permite buscar investigadores por nombre o línea, registrar nuevos perfiles,
 * editarlos y visualizar sus métricas acumuladas de artículos y proyectos.
 */
export default function ResearchersModule({ showToast }) {
  const [researchers, setResearchers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentResearcher, setCurrentResearcher] = useState(null);

  useEffect(() => {
    loadResearchers();
  }, [search]);

  const loadResearchers = async () => {
    setLoading(true);
    const data = await researcherService.getAll(search);
    setResearchers(data || []);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setCurrentResearcher(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (researcher) => {
    setCurrentResearcher(researcher);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    if (currentResearcher) {
      const res = await researcherService.update(currentResearcher.id, formData);
      if (res.success) {
        showToast('Investigador actualizado exitosamente');
        setModalOpen(false);
        loadResearchers();
      } else {
        alert(res.errors?.join('\n') || 'Error al actualizar');
      }
    } else {
      const res = await researcherService.create(formData);
      if (res.success) {
        showToast('Investigador registrado exitosamente');
        setModalOpen(false);
        loadResearchers();
      } else {
        alert(res.errors?.join('\n') || 'Error al registrar');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este investigador?')) {
      await researcherService.delete(id);
      showToast('Investigador eliminado');
      loadResearchers();
    }
  };

  return (
    <div>
      {/* Barra Superior con Buscador y Botón de Nuevo Registro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Buscar por nombre, línea o facultad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nuevo Investigador
        </button>
      </div>

      {/* Grid de Tarjetas de Investigadores */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando investigadores...
        </div>
      ) : researchers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No se encontraron investigadores con el criterio de búsqueda.</p>
        </div>
      ) : (
        <div className="researcher-grid">
          {researchers.map((inv) => (
            <div key={inv.id} className="glass-card glass-card-interactive researcher-card">
              <div className="researcher-card-header">
                <img
                  src={inv.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                  alt={inv.nombre_completo}
                  className="researcher-avatar"
                />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <h3 className="researcher-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.nombre_completo}
                  </h3>
                  <div className="researcher-category">{inv.categoria}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    <Mail size={12} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.correo}</span>
                  </div>
                </div>
              </div>

              {inv.orcid && (
                <a
                  href={`https://orcid.org/${inv.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="researcher-orcid-badge"
                  title="Ver perfil oficial en ORCID"
                >
                  <ExternalLink size={12} />
                  ORCID: {inv.orcid}
                </a>
              )}

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong>Línea:</strong> {inv.linea_investigacion}
              </div>

              {/* Fila de Estadísticas Miniatura */}
              <div className="researcher-stats-row">
                <div>
                  <div className="stat-mini-val">{inv.total_publicaciones || 0}</div>
                  <div className="stat-mini-lbl">Artículos</div>
                </div>
                <div>
                  <div className="stat-mini-val">{inv.total_proyectos || 0}</div>
                  <div className="stat-mini-lbl">Proyectos</div>
                </div>
                <div>
                  <div className="stat-mini-val" style={{ color: 'var(--accent-rose)' }}>{inv.total_citas || 0}</div>
                  <div className="stat-mini-lbl">Citas</div>
                </div>
              </div>

              {/* Acciones de Edición y Eliminación */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(inv)}
                  title="Editar datos"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(inv.id)}
                  title="Eliminar registro"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <ResearcherFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        researcher={currentResearcher}
      />
    </div>
  );
}
