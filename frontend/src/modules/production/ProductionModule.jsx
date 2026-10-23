import React, { useState, useEffect } from 'react';
import { Plus, Search, Lightbulb, Binary, GraduationCap, Mic, Edit2, Trash2 } from 'lucide-react';
import { productionService } from '../../services/productionService';
import ProductionFormModal from './ProductionFormModal';

/**
 * ============================================================================
 * MÓDULO DE PRODUCCIÓN TÉCNICA Y FORMACIÓN
 * ============================================================================
 * Visualiza y administra patentes concedidas/solicitadas, registros de software,
 * tesis de posgrado dirigidas y ponencias en congresos.
 */
export default function ProductionModule({ showToast }) {
  const [items, setItems] = useState([]);
  const [tipoFilter, setTipoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  useEffect(() => {
    loadProduction();
  }, [tipoFilter, search]);

  const loadProduction = async () => {
    setLoading(true);
    const data = await productionService.getAll(tipoFilter, search);
    setItems(data || []);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setCurrentItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setCurrentItem(item);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    if (currentItem) {
      const res = await productionService.update(currentItem.id, formData);
      if (res.success) {
        showToast('Registro técnico actualizado');
        setModalOpen(false);
        loadProduction();
      } else {
        alert(res.errors?.join('\n') || 'Error al actualizar');
      }
    } else {
      const res = await productionService.create(formData);
      if (res.success) {
        showToast('Registro técnico creado con éxito');
        setModalOpen(false);
        loadProduction();
      } else {
        alert(res.errors?.join('\n') || 'Error al crear');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro?')) {
      await productionService.delete(id);
      showToast('Registro eliminado');
      loadProduction();
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'patente': return <Lightbulb size={18} color="var(--accent-amber)" />;
      case 'software': return <Binary size={18} color="var(--accent-cyan)" />;
      case 'tesis_dirigida': return <GraduationCap size={18} color="var(--accent-emerald)" />;
      default: return <Mic size={18} color="var(--accent-blue)" />;
    }
  };

  return (
    <div>
      {/* Filtros y Botón de Creación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexGrow: 1, maxWidth: '650px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Buscar por título, autor o registro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px' }}
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
          >
            <option value="">Todos los Tipos</option>
            <option value="patente">Patentes</option>
            <option value="software">Software Registrado</option>
            <option value="tesis_dirigida">Tesis Dirigidas</option>
            <option value="ponencia">Ponencias en Congresos</option>
          </select>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nuevo Registro Técnico
        </button>
      </div>

      {/* Grid de Producción Técnica */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando registros...
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay registros con los filtros seleccionados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {items.map((it) => (
            <div key={it.id} className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getTipoIcon(it.tipo)}
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    {it.tipo.replace('_', ' ')}
                  </span>
                </div>
                <span className="badge badge-q1" style={{ textTransform: 'capitalize' }}>
                  {it.estado}
                </span>
              </div>

              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.35 }}>
                {it.titulo}
              </h3>

              {it.numero_registro && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--accent-cyan)' }}>
                  Folio: {it.numero_registro}
                </div>
              )}

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Autores/Inventores:</strong> {it.autores}
              </div>

              {it.institucion_evento && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {it.institucion_evento} ({it.anio})
                </div>
              )}

              {it.descripcion && (
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {it.descripcion}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(it)}
                >
                  <Edit2 size={13} />
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(it.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <ProductionFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        item={currentItem}
      />
    </div>
  );
}
