import React, { useState } from 'react';
import { Search, Globe, BookOpen, FolderGit2, Users, ExternalLink, Code2 } from 'lucide-react';
import { disseminationService } from '../../services/disseminationService';
import PublicProfileModal from './PublicProfileModal';
import BibtexModal from '../publications/BibtexModal';
import Badge from '../../components/Badge';

/**
 * ============================================================================
 * MÓDULO DE DIFUSIÓN CIENTÍFICA (Portal Abierto y Buscador Institucional)
 * ============================================================================
 * Motor de búsqueda unificada para la apropiación social del conocimiento.
 * Permite a la comunidad académica, estudiantes y evaluadores explorar
 * artículos científicos, proyectos de investigación y perfiles de investigadores.
 */
export default function DisseminationModule() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados de modales
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [bibtexModalOpen, setBibtexModalOpen] = useState(false);
  const [activeBibtex, setActiveBibtex] = useState('');
  const [activeTitle, setActiveTitle] = useState('');

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    const data = await disseminationService.searchCatalog(query);
    setResults(data);
    setLoading(false);
  };

  const handleOpenProfile = async (researcherId) => {
    const profile = await disseminationService.getPublicProfile(researcherId);
    setProfileData(profile);
    setProfileModalOpen(true);
  };

  const handleOpenBibtex = async (pub) => {
    setActiveTitle(pub.titulo);
    const bib = await disseminationService.getBibTeX(pub.id);
    setActiveBibtex(bib);
    setBibtexModalOpen(true);
  };

  return (
    <div>
      {/* Hero Banner de Búsqueda Pública */}
      <div className="dissemination-hero">
        <div className="hero-tagline">
          Acceso Abierto & Divulgación
        </div>
        <h2 className="hero-headline">
          Catálogo Institucional de Producción Científica
        </h2>
        <p className="hero-description">
          Explora la producción académica, artículos en revistas indexadas, proyectos de investigación activos e inventores adscritos a nuestra institución.
        </p>

        <form className="hero-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="hero-search-input"
            placeholder="Buscar por palabra clave: Inteligencia Artificial, Metagenómica, Dengue..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="hero-search-btn" title="Buscar">
            <Search size={20} />
          </button>
        </form>
      </div>

      {/* Resultados de la Búsqueda */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Buscando en el repositorio institucional...
        </div>
      ) : hasSearched && results ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              Resultados para: <span style={{ color: 'var(--accent-cyan)' }}>"{query}"</span>
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {results.total_coincidencias} coincidencias encontradas
            </span>
          </div>

          {/* 1. Publicaciones Encontradas */}
          {results.publicaciones?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
                <BookOpen size={18} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  Publicaciones Científicas ({results.publicaciones.length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.publicaciones.map(pub => (
                  <div key={pub.id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <Badge type="quartile" label={pub.cuartil} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pub.anio}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>• {pub.medio_o_entidad}</span>
                    </div>

                    <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {pub.titulo}
                    </h5>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                      {pub.autor_o_responsable}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {pub.doi && (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="doi-pill"
                        >
                          <ExternalLink size={12} />
                          doi:{pub.doi}
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenBibtex(pub)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Code2 size={13} />
                        Cita BibTeX
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Proyectos Encontrados */}
          {results.proyectos?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-emerald)' }}>
                <FolderGit2 size={18} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  Proyectos de Investigación ({results.proyectos.length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.proyectos.map(pr => (
                  <div key={pr.id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>
                        {pr.doi}
                      </span>
                      <Badge type="status" label={pr.cuartil} />
                    </div>

                    <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {pr.titulo}
                    </h5>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Investigador Principal: <strong>{pr.autor_o_responsable}</strong> • {pr.medio_o_entidad}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Investigadores Encontrados */}
          {results.investigadores?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                <Users size={18} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  Investigadores Coincidentes ({results.investigadores.length})
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {results.investigadores.map(inv => (
                  <div key={inv.id} className="glass-card glass-card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
                    <img
                      src={inv.url_documento || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                      alt={inv.titulo}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inv.titulo}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>
                        {inv.cuartil}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.4rem', fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleOpenProfile(inv.id)}
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.total_coincidencias === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No encontramos publicaciones, proyectos ni investigadores con ese término.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <Globe size={40} color="var(--accent-cyan)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
            Divulgación Abierta y Visibilidad Académica
          </h4>
          <p style={{ maxWidth: '540px', margin: '0 auto', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Ingresa un área del conocimiento, nombre de autor, término biomédico o tecnológico en la barra superior para buscar en tiempo real a través de todo el acervo de investigación.
          </p>
        </div>
      )}

      {/* Modal de Perfil Científico Público */}
      <PublicProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        data={profileData}
      />

      {/* Modal de Cita BibTeX */}
      <BibtexModal
        isOpen={bibtexModalOpen}
        onClose={() => setBibtexModalOpen(false)}
        bibtex={activeBibtex}
        title={activeTitle}
      />
    </div>
  );
}
