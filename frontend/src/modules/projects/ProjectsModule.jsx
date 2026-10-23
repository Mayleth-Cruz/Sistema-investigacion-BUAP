import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, User, FileText, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { projectService } from '../../services/projectService';
import ProjectFormModal from './ProjectFormModal';
import Badge from '../../components/Badge';

/**
 * ============================================================================
 * MÓDULO DE PROYECTOS (Monitoreo de Ciclo de Vida y Presupuesto)
 * ============================================================================
 * Permite filtrar por fase (en ejecución, completado, propuesta),
 * visualizar presupuestos gestionados y registrar nuevas iniciativas de I+D.
 */
export default function ProjectsModule({ showToast }) {
  const [projects, setProjects] = useState([]);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [estadoFilter, search]);

  const loadProjects = async () => {
    setLoading(true);
    const data = await projectService.getAll(estadoFilter, search);
    setProjects(data || []);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setCurrentProject(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setCurrentProject(project);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    if (currentProject) {
      const res = await projectService.update(currentProject.id, formData);
      if (res.success) {
        showToast('Proyecto actualizado correctamente');
        setModalOpen(false);
        loadProjects();
      } else {
        alert(res.errors?.join('\n') || 'Error al actualizar');
      }
    } else {
      const res = await projectService.create(formData);
      if (res.success) {
        showToast('Proyecto registrado exitosamente');
        setModalOpen(false);
        loadProjects();
      } else {
        alert(res.errors?.join('\n') || 'Error al crear');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este proyecto de investigación?')) {
      await projectService.delete(id);
      showToast('Proyecto eliminado');
      loadProjects();
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div>
      {/* Barra de Filtros y Búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flexGrow: 1, maxWidth: '650px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Buscar por código, título o tema..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '170px' }}
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="en_ejecucion">En Ejecución</option>
            <option value="completado">Completados</option>
            <option value="propuesta">Propuestas</option>
            <option value="suspendido">Suspendidos</option>
          </select>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nuevo Proyecto I+D
        </button>
      </div>

      {/* Listado de Proyectos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando proyectos...
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay proyectos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {projects.map((proj) => (
            <div key={proj.id} className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      {proj.codigo}
                    </span>
                    <Badge type="status" label={proj.estado} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {proj.linea_investigacion}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
                    {proj.titulo}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                    {formatMoney(proj.presupuesto)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {proj.entidad_financiadora || 'Fondos Propios'}
                  </div>
                </div>
              </div>

              {proj.resumen && (
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {proj.resumen}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                    <User size={15} color="var(--accent-blue)" />
                    <span>Líder: <strong>{proj.investigador_principal_nombre}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={15} />
                    <span>Inicio: {proj.fecha_inicio} {proj.fecha_fin ? `• Fin: ${proj.fecha_fin}` : ''}</span>
                  </div>

                  {proj.total_publicaciones_derivadas > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)' }}>
                      <FileText size={15} />
                      <span>{proj.total_publicaciones_derivadas} artículos derivados</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEdit(proj)}
                  >
                    <Edit2 size={13} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(proj.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear y Editar Proyectos */}
      <ProjectFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        project={currentProject}
      />
    </div>
  );
}
