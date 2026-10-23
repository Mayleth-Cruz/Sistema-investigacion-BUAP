import React, { useState, useEffect } from 'react';
import { researcherService } from '../services/researcherService';
import { IconAlertTriangle } from './Icons';

/**
 * ============================================================================
 * MODAL: CREAR / EDITAR AUTOR O INVESTIGADOR INSTITUCIONAL (AuthorModal)
 * ============================================================================
 * Cumple con los requerimientos específicos:
 * - Requeridos únicamente: Nombre y Apellido.
 * - Opcionales: Facultad, Universidad, Correo, ORCID, Línea de investigación, etc.
 * - Estilo visual 100% coherente con la identidad institucional BUAP.
 */
export default function AuthorModal({ isOpen, onClose, onSuccess, authorToEdit = null }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    facultad: 'Facultad de Ciencias de la Computación',
    universidad: 'Benemérita Universidad Autónoma de Puebla',
    correo: '',
    orcid: '',
    categoria: 'Investigador Titular',
    linea_investigacion: '',
    activo: 1
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authorToEdit) {
      // Si el autor viene con nombre_completo, descomponer en nombre y apellido
      const parts = (authorToEdit.nombre_completo || '').split(' ');
      const nombre = parts.slice(0, Math.max(1, parts.length - 2)).join(' ') || parts[0] || '';
      const apellido = parts.slice(Math.max(1, parts.length - 2)).join(' ') || '';

      setFormData({
        nombre: authorToEdit.nombre || nombre,
        apellido: authorToEdit.apellido || authorToEdit.apellidos || apellido,
        facultad: authorToEdit.facultad || authorToEdit.afiliacion || '',
        universidad: authorToEdit.universidad || 'Benemérita Universidad Autónoma de Puebla',
        correo: authorToEdit.correo || '',
        orcid: authorToEdit.orcid || '',
        categoria: authorToEdit.categoria || 'Investigador Titular',
        linea_investigacion: authorToEdit.linea_investigacion || '',
        activo: authorToEdit.activo !== undefined ? authorToEdit.activo : 1
      });
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        facultad: 'Facultad de Ciencias de la Computación',
        universidad: 'Benemérita Universidad Autónoma de Puebla',
        correo: '',
        orcid: '',
        categoria: 'Investigador Titular',
        linea_investigacion: '',
        activo: 1
      });
    }
    setErrorMsg('');
  }, [authorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación estricta: Solo nombre y apellido son requeridos
    if (!formData.nombre.trim()) {
      setErrorMsg('Por favor ingresa el nombre de pila del autor.');
      return;
    }
    if (!formData.apellido.trim()) {
      setErrorMsg('Por favor ingresa los apellidos del autor.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        nombre_completo: `${formData.nombre.trim()} ${formData.apellido.trim()}`
      };

      let result;
      if (authorToEdit && authorToEdit.id) {
        result = await researcherService.update(authorToEdit.id, payload);
      } else {
        result = await researcherService.create(payload);
      }

      if (result && !result.success && result.message) {
        throw new Error(result.message || 'Error al guardar el autor.');
      }

      const savedData = result.data || payload;
      if (onSuccess) onSuccess(savedData, !authorToEdit);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al procesar la solicitud.');
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
          maxWidth: '620px',
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
              {authorToEdit ? 'Editar autor o investigador' : 'Registrar nuevo autor / investigador'}
            </h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
              Solo el <strong>nombre y apellido</strong> son requeridos. El resto de datos son opcionales.
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
            <IconAlertTriangle size={16} color="#EF4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Fila: Nombre y Apellido (ÚNICOS REQUERIDOS) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13.5px', color: '#1E293B' }}>
                Nombre(s) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                name="nombre"
                placeholder="Ej: Elena"
                value={formData.nombre}
                onChange={handleChange}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13.5px', color: '#1E293B' }}>
                Apellidos <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                name="apellido"
                placeholder="Ej: Ramos Sandoval"
                value={formData.apellido}
                onChange={handleChange}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Fila: Facultad y Universidad (Opcionales) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Facultad o Unidad Académica <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="facultad"
                placeholder="Ej: Facultad de Ingeniería"
                value={formData.facultad}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Universidad o Institución <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="universidad"
                placeholder="Ej: BUAP"
                value={formData.universidad}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Fila: Correo institucional y ORCID (Opcionales) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Correo institucional <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="correo"
                type="email"
                placeholder="ejemplo@buap.mx"
                value={formData.correo}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Identificador ORCID <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="orcid"
                placeholder="0000-0002-8341-9921"
                value={formData.orcid}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Fila: Categoría académica y Línea de Investigación (Opcionales) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Nivel / Cargo académico <span className="muted">(Opcional)</span>
              </label>
              <select 
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                style={{ width: '100%', height: '42px' }}
              >
                <option value="Investigador Titular (Nivel III)">Investigador Titular (Nivel III - SNII)</option>
                <option value="Investigador Titular (Nivel II)">Investigador Titular (Nivel II - SNII)</option>
                <option value="Investigador Titular (Nivel I)">Investigador Titular (Nivel I - SNII)</option>
                <option value="Candidato a Investigador">Candidato a Investigador Nacional</option>
                <option value="Investigador Asociado">Investigador Asociado</option>
                <option value="Investigador / Autor Adscrito">Investigador / Autor Adscrito</option>
                <option value="Estudiante de Posgrado / Coautor">Estudiante de Posgrado / Coautor</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13.5px', color: '#334155' }}>
                Línea de investigación <span className="muted">(Opcional)</span>
              </label>
              <input 
                name="linea_investigacion"
                placeholder="Ej: Inteligencia Artificial y Visión"
                value={formData.linea_investigacion}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
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
              {saving ? 'Guardando...' : (authorToEdit ? 'Actualizar autor' : 'Registrar autor')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
