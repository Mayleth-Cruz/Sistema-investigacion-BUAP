import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

/**
 * ============================================================================
 * MODAL DE FORMULARIO DE INVESTIGADOR (Crear y Editar)
 * ============================================================================
 * Permite registrar un nuevo perfil científico o modificar sus datos.
 */
export default function ResearcherFormModal({ isOpen, onClose, onSave, researcher }) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    identificacion: '',
    orcid: '',
    afiliacion: '',
    categoria: 'Investigador Asociado',
    linea_investigacion: '',
    biografia: '',
    avatar_url: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (researcher) {
      setFormData({
        nombre_completo: researcher.nombre_completo || '',
        correo: researcher.correo || '',
        identificacion: researcher.identificacion || '',
        orcid: researcher.orcid || '',
        afiliacion: researcher.afiliacion || '',
        categoria: researcher.categoria || 'Investigador Asociado',
        linea_investigacion: researcher.linea_investigacion || '',
        biografia: researcher.biografia || '',
        avatar_url: researcher.avatar_url || ''
      });
    } else {
      setFormData({
        nombre_completo: '',
        correo: '',
        identificacion: '',
        orcid: '',
        afiliacion: '',
        categoria: 'Investigador Asociado',
        linea_investigacion: '',
        biografia: '',
        avatar_url: ''
      });
    }
    setErrors({});
  }, [researcher, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validación básica en frontend
    const newErrors = {};
    if (!formData.nombre_completo.trim()) newErrors.nombre_completo = 'El nombre es obligatorio.';
    if (!formData.correo.trim()) newErrors.correo = 'El correo es obligatorio.';
    if (!formData.afiliacion.trim()) newErrors.afiliacion = 'La afiliación es obligatoria.';
    if (!formData.linea_investigacion.trim()) newErrors.linea_investigacion = 'La línea de investigación es obligatoria.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={researcher ? 'Editar Investigador' : 'Registrar Nuevo Investigador'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {researcher ? 'Guardar Cambios' : 'Registrar'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre Completo *</label>
          <input
            type="text"
            name="nombre_completo"
            className="form-input"
            placeholder="Ej: Dra. Mariana Solís Peña"
            value={formData.nombre_completo}
            onChange={handleChange}
          />
          {errors.nombre_completo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.nombre_completo}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Correo Institucional *</label>
            <input
              type="email"
              name="correo"
              className="form-input"
              placeholder="investigador@universidad.edu"
              value={formData.correo}
              onChange={handleChange}
            />
            {errors.correo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.correo}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">ORCID (ej: 0000-0002-1825-0097)</label>
            <input
              type="text"
              name="orcid"
              className="form-input"
              placeholder="0000-0000-0000-0000"
              value={formData.orcid}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Afiliación / Facultad *</label>
            <input
              type="text"
              name="afiliacion"
              className="form-input"
              placeholder="Facultad de Ingeniería"
              value={formData.afiliacion}
              onChange={handleChange}
            />
            {errors.afiliacion && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.afiliacion}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Categoría / Escalafón</label>
            <select
              name="categoria"
              className="form-select"
              value={formData.categoria}
              onChange={handleChange}
            >
              <option value="Investigador Emérito">Investigador Emérito</option>
              <option value="Investigador Senior (Nivel III)">Investigador Senior (Nivel III)</option>
              <option value="Investigador Senior (Nivel II)">Investigador Senior (Nivel II)</option>
              <option value="Investigador Asociado">Investigador Asociado</option>
              <option value="Investigador Junior">Investigador Junior</option>
              <option value="Candidato a Investigador">Candidato a Investigador</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Línea Temática de Investigación *</label>
          <input
            type="text"
            name="linea_investigacion"
            className="form-input"
            placeholder="Ej: Biología Molecular, Inteligencia Artificial, Nanotecnología..."
            value={formData.linea_investigacion}
            onChange={handleChange}
          />
          {errors.linea_investigacion && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.linea_investigacion}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">URL de Fotografía / Avatar</label>
          <input
            type="text"
            name="avatar_url"
            className="form-input"
            placeholder="https://ejemplo.com/foto.jpg"
            value={formData.avatar_url}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Biografía / Perfil Científico</label>
          <textarea
            name="biografia"
            className="form-textarea"
            placeholder="Trayectoria académica, formación y áreas de interés..."
            value={formData.biografia}
            onChange={handleChange}
          />
        </div>
      </form>
    </Modal>
  );
}
