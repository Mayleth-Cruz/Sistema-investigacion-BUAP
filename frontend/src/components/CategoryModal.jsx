import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/categoryService';
import { 
  CategoryIcon, 
  IconSettings, 
  IconMicroscope, 
  IconDna, 
  IconLeaf, 
  IconStethoscope, 
  IconLandmark, 
  IconChart, 
  IconPalette, 
  IconBook, 
  IconDocument, 
  IconGraduationCap, 
  IconMicrophone, 
  IconLaptop, 
  IconLightbulb, 
  IconAlertTriangle 
} from './Icons';

/**
 * ============================================================================
 * MODAL: CREAR / EDITAR CATEGORÍA O ÁREA INSTITUCIONAL (CategoryModal)
 * ============================================================================
 * Permite registrar y modificar categorías y formatos de publicación con
 * personalización completa de nombre, descripción, color e icono vectorial SVG.
 */
export default function CategoryModal({ isOpen, onClose, onSuccess, categoryToEdit = null }) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'area_conocimiento',
    codigo: '',
    descripcion: '',
    color: '#003B5C',
    icono: 'settings',
    activo: 1
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const PALETTE_COLORS = ['#003B5C', '#00A3E0', '#7C3AED', '#059669', '#16A34A', '#D97706', '#DC2626', '#475569'];
  const POPULAR_ICON_KEYS = [
    { key: 'settings', label: 'Ajustes' },
    { key: 'microscope', label: 'Ciencias Exactas' },
    { key: 'leaf', label: 'Naturaleza' },
    { key: 'health', label: 'Salud' },
    { key: 'landmark', label: 'Humanidades' },
    { key: 'chart', label: 'Economía' },
    { key: 'palette', label: 'Artes' },
    { key: 'book', label: 'Libro' },
    { key: 'document', label: 'Artículo' },
    { key: 'graduation', label: 'Tesis' },
    { key: 'microphone', label: 'Conferencia' },
    { key: 'dna', label: 'Biotecnología' },
    { key: 'laptop', label: 'Computación' },
    { key: 'lightbulb', label: 'Innovación' }
  ];

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        nombre: categoryToEdit.nombre || '',
        tipo: categoryToEdit.tipo || 'area_conocimiento',
        codigo: categoryToEdit.codigo || '',
        descripcion: categoryToEdit.descripcion || '',
        color: categoryToEdit.color || '#003B5C',
        icono: categoryToEdit.icono || (categoryToEdit.tipo === 'genero_publicacion' ? 'document' : 'settings'),
        activo: categoryToEdit.activo !== undefined ? categoryToEdit.activo : 1
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'area_conocimiento',
        codigo: '',
        descripcion: '',
        color: '#003B5C',
        icono: 'settings',
        activo: 1
      });
    }
    setErrorMsg('');
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Si cambia el tipo y el icono es por defecto, actualizar icono adecuado
      ...(name === 'tipo' && prev.icono === 'settings' && value === 'genero_publicacion' ? { icono: 'document' } : {}),
      ...(name === 'tipo' && prev.icono === 'document' && value === 'area_conocimiento' ? { icono: 'settings' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre de la categoría es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      let result;
      if (categoryToEdit && categoryToEdit.id) {
        result = await categoryService.update(categoryToEdit.id, formData);
      } else {
        result = await categoryService.create(formData);
      }

      if (result && !result.success && result.message) {
        throw new Error(result.message || 'Error al guardar la categoría.');
      }

      const savedData = result.data || formData;
      if (onSuccess) onSuccess(savedData, !categoryToEdit);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 27, 58, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '28px 32px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
          <div>
            <h2 className="titulo-gotham-black" style={{ fontSize: '22px', margin: 0, color: 'var(--text-dark, #0F172A)' }}>
              {categoryToEdit ? 'Editar categoría' : 'Nueva categoría / área'}
            </h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
              Personaliza el catálogo temático y formatos de publicación del repositorio.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              fontWeight: 700,
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', color: '#991B1B', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlertTriangle size={18} color="#DC2626" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Nombre de la Categoría */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13.5px', color: '#1E293B' }}>
              Nombre de la categoría <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input 
              name="nombre"
              placeholder="Ej: Biotecnología y Genómica Ambiental"
              value={formData.nombre}
              onChange={handleChange}
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Tipo de Categoría y Código */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13.5px', color: '#1E293B' }}>
                Tipo de catálogo <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select 
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                style={{ width: '100%', height: '42px' }}
              >
                <option value="area_conocimiento">Área del Conocimiento (VIEP-BUAP)</option>
                <option value="genero_publicacion">Género / Formato de Publicación</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Código <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="codigo"
                placeholder="Ej: AREA_BIOTEC"
                value={formData.codigo}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
              Descripción / Disciplinas que abarca <span className="muted">(Opcional)</span>
            </label>
            <textarea 
              name="descripcion"
              rows={3}
              placeholder="Detalla las disciplinas académicas, temas prioritarios o características que incluye esta categoría..."
              value={formData.descripcion}
              onChange={handleChange}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Icono y Color Distintivo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Icono representativo
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: formData.color ? `${formData.color}18` : '#F1F5F9',
                  border: `1.5px solid ${formData.color || '#CBD5E1'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: formData.color || '#003B5C',
                  flexShrink: 0
                }}>
                  <CategoryIcon nameOrEmoji={formData.icono} size={22} color={formData.color || '#003B5C'} />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {POPULAR_ICON_KEYS.slice(0, 7).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setFormData(p => ({ ...p, icono: key }))}
                      style={{
                        background: formData.icono === key ? '#E0F2FE' : '#F1F5F9',
                        border: formData.icono === key ? '1.5px solid #00A3E0' : '1px solid #E2E8F0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: formData.icono === key ? '#00A3E0' : '#475569'
                      }}
                    >
                      <CategoryIcon nameOrEmoji={key} size={16} color={formData.icono === key ? '#00A3E0' : '#475569'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Color distintivo
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  name="color"
                  type="color"
                  value={formData.color}
                  onChange={handleChange}
                  style={{ width: '38px', height: '38px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {PALETTE_COLORS.slice(0, 5).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, color: col }))}
                      style={{
                        backgroundColor: col,
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: formData.color === col ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <button 
              type="button" 
              className="btn btn2"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn"
              disabled={saving}
            >
              {saving ? 'Guardando...' : (categoryToEdit ? 'Actualizar categoría' : 'Crear categoría')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
