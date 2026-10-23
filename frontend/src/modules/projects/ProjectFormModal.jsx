import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { researcherService } from '../../services/researcherService';

/**
 * ============================================================================
 * MODAL DE FORMULARIO DE PROYECTOS (Crear y Editar)
 * ============================================================================
 * Permite registrar proyectos de investigación, asociar el investigador líder,
 * fijar el presupuesto y monitorear la fase de avance.
 */
export default function ProjectFormModal({ isOpen, onClose, onSave, project }) {
  const [formData, setFormData] = useState({
    codigo: '',
    titulo: '',
    resumen: '',
    investigador_principal_id: '',
    co_investigadores: '',
    estado: 'en_ejecucion',
    fecha_inicio: '',
    fecha_fin: '',
    presupuesto: '',
    entidad_financiadora: '',
    linea_investigacion: ''
  });

  const [researchers, setResearchers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Cargamos la lista de investigadores para el selector
    researcherService.getAll().then(data => setResearchers(data || []));
  }, []);

  useEffect(() => {
    if (project) {
      setFormData({
        codigo: project.codigo || '',
        titulo: project.titulo || '',
        resumen: project.resumen || '',
        investigador_principal_id: project.investigador_principal_id || '',
        co_investigadores: project.co_investigadores || '',
        estado: project.estado || 'en_ejecucion',
        fecha_inicio: project.fecha_inicio || '',
        fecha_fin: project.fecha_fin || '',
        presupuesto: project.presupuesto || '',
        entidad_financiadora: project.entidad_financiadora || '',
        linea_investigacion: project.linea_investigacion || ''
      });
    } else {
      setFormData({
        codigo: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        titulo: '',
        resumen: '',
        investigador_principal_id: researchers[0]?.id || '',
        co_investigadores: '',
        estado: 'en_ejecucion',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        presupuesto: '50000',
        entidad_financiadora: 'Fondos Institucionales de Investigación',
        linea_investigacion: ''
      });
    }
    setErrors({});
  }, [project, isOpen, researchers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.codigo.trim()) newErrors.codigo = 'El código institucional es obligatorio.';
    if (!formData.titulo.trim()) newErrors.titulo = 'El título de la investigación es obligatorio.';
    if (!formData.investigador_principal_id) newErrors.investigador_principal_id = 'Debes asignar un líder.';
    if (!formData.fecha_inicio) newErrors.fecha_inicio = 'La fecha de inicio es obligatoria.';
    if (!formData.linea_investigacion.trim()) newErrors.linea_investigacion = 'La línea temática es obligatoria.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Nombre del investigador para modo demo
    const selectedInv = researchers.find(r => r.id === Number(formData.investigador_principal_id));
    onSave({
      ...formData,
      investigador_principal_nombre: selectedInv ? selectedInv.nombre_completo : ''
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Editar Proyecto de Investigación' : 'Registrar Nuevo Proyecto I+D'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {project ? 'Guardar Cambios' : 'Registrar Proyecto'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Código del Proyecto *</label>
            <input
              type="text"
              name="codigo"
              className="form-input"
              value={formData.codigo}
              onChange={handleChange}
            />
            {errors.codigo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.codigo}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Estado de Monitoreo</label>
            <select
              name="estado"
              className="form-select"
              value={formData.estado}
              onChange={handleChange}
            >
              <option value="en_ejecucion">En Ejecución</option>
              <option value="completado">Completado</option>
              <option value="propuesta">Propuesta en Evaluación</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Título del Proyecto *</label>
          <input
            type="text"
            name="titulo"
            className="form-input"
            placeholder="Título oficial de la propuesta de investigación..."
            value={formData.titulo}
            onChange={handleChange}
          />
          {errors.titulo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.titulo}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Investigador Principal (Líder) *</label>
            <select
              name="investigador_principal_id"
              className="form-select"
              value={formData.investigador_principal_id}
              onChange={handleChange}
            >
              <option value="">Selecciona un investigador...</option>
              {researchers.map(r => (
                <option key={r.id} value={r.id}>{r.nombre_completo}</option>
              ))}
            </select>
            {errors.investigador_principal_id && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.investigador_principal_id}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Línea de Investigación *</label>
            <input
              type="text"
              name="linea_investigacion"
              className="form-input"
              placeholder="Ej: Biotecnología, Robótica..."
              value={formData.linea_investigacion}
              onChange={handleChange}
            />
            {errors.linea_investigacion && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.linea_investigacion}</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Presupuesto Asignado ($ USD)</label>
            <input
              type="number"
              name="presupuesto"
              className="form-input"
              placeholder="0.00"
              value={formData.presupuesto}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Entidad Financiadora</label>
            <input
              type="text"
              name="entidad_financiadora"
              className="form-input"
              placeholder="CONACYT / Minciencias / Fondos Propios"
              value={formData.entidad_financiadora}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Fecha de Inicio *</label>
            <input
              type="date"
              name="fecha_inicio"
              className="form-input"
              value={formData.fecha_inicio}
              onChange={handleChange}
            />
            {errors.fecha_inicio && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.fecha_inicio}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Fecha Prevista de Finalización</label>
            <input
              type="date"
              name="fecha_fin"
              className="form-input"
              value={formData.fecha_fin}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Resumen Ejecutivo (Abstract)</label>
          <textarea
            name="resumen"
            className="form-textarea"
            placeholder="Objetivo principal, metodología y entregables esperados..."
            value={formData.resumen}
            onChange={handleChange}
          />
        </div>
      </form>
    </Modal>
  );
}
