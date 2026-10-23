import React from 'react';
import Modal from '../../components/Modal';
import { ExternalLink, Mail, Award, BookOpen, FolderGit2, Lightbulb } from 'lucide-react';
import Badge from '../../components/Badge';

/**
 * ============================================================================
 * MODAL DE PERFIL PÚBLICO DEL INVESTIGADOR (Difusión y Visibilidad)
 * ============================================================================
 * Muestra la ficha curricular consolidada del investigador: biografía,
 * afiliación, ORCID, publicaciones científicas, proyectos I+D y patentes.
 */
export default function PublicProfileModal({ isOpen, onClose, data }) {
  if (!data || !data.perfil) return null;

  const { perfil, publicaciones = [], proyectos = [], produccion = [] } = data;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil Científico Institucional"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cerrar Perfil
        </button>
      }
    >
      <div>
        {/* Cabecera del Investigador */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <img
            src={perfil.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
            alt={perfil.nombre_completo}
            style={{ width: '75px', height: '75px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-blue)' }}
          />
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              {perfil.nombre_completo}
            </h3>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: 600 }}>
              {perfil.categoria} • {perfil.afiliacion}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} color="var(--accent-cyan)" />
                {perfil.correo}
              </span>
              {perfil.orcid && (
                <a 
                  href={`https://orcid.org/${perfil.orcid}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#a6ce39', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <ExternalLink size={12} /> ORCID: {perfil.orcid}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Biografía */}
        {perfil.biografia && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ffffff' }}>Semblanza Académica:</strong> {perfil.biografia}
          </div>
        )}

        {/* Publicaciones del Investigador */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <BookOpen size={16} color="var(--accent-cyan)" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Artículos Científicos ({publicaciones.length})</h4>
          </div>

          {publicaciones.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin publicaciones registradas en el repositorio institucional.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {publicaciones.map(pub => (
                <div key={pub.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Badge type="quartile" label={pub.cuartil} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pub.anio}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>{pub.titulo}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{pub.revista_editorial}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proyectos Liderados */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FolderGit2 size={16} color="var(--accent-emerald)" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Proyectos I+D Liderados ({proyectos.length})</h4>
          </div>

          {proyectos.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin proyectos vinculados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proyectos.map(pr => (
                <div key={pr.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>{pr.codigo}</span>
                    <Badge type="status" label={pr.estado} />
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>{pr.titulo}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
