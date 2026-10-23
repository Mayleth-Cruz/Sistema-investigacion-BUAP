import React, { useState, useEffect } from 'react';
import { Plus, Search, ExternalLink, Code2, Edit2, Trash2, Globe, BookOpen } from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { disseminationService } from '../../services/disseminationService';
import PublicationFormModal from './PublicationFormModal';
import BibtexModal from './BibtexModal';
import Badge from '../../components/Badge';

/**
 * ============================================================================
 * MÓDULO DE PUBLICACIONES CIENTÍFICAS
 * ============================================================================
 * Permite registrar artículos, libros y actas de congreso, filtrar por
 * cuartil (Q1-Q4) o año, y generar citas instantáneas en formato BibTeX.
 */
export default function PublicationsModule({ showToast }) {
  const [publications, setPublications] = useState([]);
  const [cuartilFilter, setCuartilFilter] = useState('');
  const [anioFilter, setAnioFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados de Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [currentPub, setCurrentPub] = useState(null);

  const [bibtexModalOpen, setBibtexModalOpen] = useState(false);
  const [activeBibtex, setActiveBibtex] = useState('');
  const [activePubTitle, setActivePubTitle] = useState('');

  useEffect(() => {
    loadPublications();
  }, [cuartilFilter, anioFilter, search]);

  const loadPublications = async () => {
    setLoading(true);
    const data = await publicationService.getAll({
      cuartil: cuartilFilter,
      anio: anioFilter,
      search: search
    });
    setPublications(data || []);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setCurrentPub(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (pub) => {
    setCurrentPub(pub);
    setFormModalOpen(true);
  };

  const handleSave = async (formData) => {
    if (currentPub) {
      const res = await publicationService.update(currentPub.id, formData);
      if (res.success) {
        showToast('Publicación actualizada correctamente');
        setFormModalOpen(false);
        loadPublications();
      } else {
        alert(res.errors?.join('\n') || 'Error al actualizar');
      }
    } else {
      const res = await publicationService.create(formData);
      if (res.success) {
        showToast('Publicación registrada exitosamente');
        setFormModalOpen(false);
        loadPublications();
      } else {
        alert(res.errors?.join('\n') || 'Error al crear');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta publicación?')) {
      await publicationService.delete(id);
      showToast('Publicación eliminada');
      loadPublications();
    }
  };

  const handleShowBibtex = async (pub) => {
    setActivePubTitle(pub.titulo);
    const bib = await disseminationService.getBibTeX(pub.id);
    setActiveBibtex(bib);
    setBibtexModalOpen(true);
  };

  return (
    <div>
      {/* Barra de Filtros y Búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexGrow: 1, maxWidth: '750px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Buscar por título, autores o revista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={cuartilFilter}
            onChange={(e) => setCuartilFilter(e.target.value)}
          >
            <option value="">Todos los Cuartiles</option>
            <option value="Q1">Solo Cuartil Q1</option>
            <option value="Q2">Solo Cuartil Q2</option>
            <option value="Q3">Solo Cuartil Q3</option>
            <option value="Q4">Solo Cuartil Q4</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px' }}
            value={anioFilter}
            onChange={(e) => setAnioFilter(e.target.value)}
          >
            <option value="">Todos los Años</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Registrar Publicación
        </button>
      </div>

      {/* Lista de Publicaciones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando catálogo bibliográfico...
        </div>
      ) : publications.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No se encontraron publicaciones con los filtros indicados.</p>
        </div>
      ) : (
        <div className="publication-list">
          {publications.map((pub) => (
            <div key={pub.id} className="glass-card glass-card-interactive publication-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Badge type="quartile" label={pub.cuartil} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  {pub.indexacion}
                </span>
                {pub.acceso_abierto === 1 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Globe size={11} /> Open Access
                  </span>
                )}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {pub.anio}
                </span>
              </div>

              <h3 className="publication-title">
                {pub.titulo}
              </h3>

              <div className="publication-authors">
                {pub.autores}
              </div>

              <div className="publication-meta">
                <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>
                  {pub.revista_editorial}
                </span>
                {pub.volumen && <span>Vol. {pub.volumen}</span>}
                {pub.paginas && <span>pp. {pub.paginas}</span>}

                {pub.doi && (
                  <a
                    href={`https://doi.org/${pub.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="doi-pill"
                    title="Visitar DOI oficial"
                  >
                    <ExternalLink size={12} />
                    doi:{pub.doi}
                  </a>
                )}

                <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent-rose)' }}>
                  {pub.citas_estimadas || 0} citas
                </span>
              </div>

              {/* Botonera de Citas BibTeX y Gestión */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleShowBibtex(pub)}
                  style={{ gap: '0.4rem', color: 'var(--accent-cyan)' }}
                >
                  <Code2 size={14} />
                  Ver Cita BibTeX
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEdit(pub)}
                  >
                    <Edit2 size={13} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(pub.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear y Editar Publicaciones */}
      <PublicationFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSave}
        publication={currentPub}
      />

      {/* Modal para Copiar y Visualizar BibTeX */}
      <BibtexModal
        isOpen={bibtexModalOpen}
        onClose={() => setBibtexModalOpen(false)}
        bibtex={activeBibtex}
        title={activePubTitle}
      />
    </div>
  );
}
