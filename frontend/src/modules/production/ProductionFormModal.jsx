import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { researcherService } from '../../services/researcherService';

/**
 * ============================================================================
 * MODAL DE FORMULARIO DE PRODUCCIÓN TÉCNICA (Crear y Editar)
 * ============================================================================
 * Permite registrar patentes, derechos de software, tesis dirigidas y ponencias.
 */
export default function ProductionFormModal({ isOpen, onClose, onSave, item }) {
  const [formData, setFormData] = useState({
    tipo: 'patente',
    titulo: '',
    investigador_id: '',
    autores: '',
    anio: new Date().getFullYear(),
    numero_registro: '',
    institucion_evento: '',
    estado: 'concedida',
    descripcion: ''
  });

  const [researchers, setResearchers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    researcherService.getAll().then(data => setResearchers(data || []));
  }, []);

  useEffect(() => {
    if (item) {
      setFormData({
        tipo: item.tipo || 'patente',
        titulo: item.titulo || '',
        investigador_id: item.investigador_id || '',
        autores: item.autores || '',
        anio: item.anio || new Date().getFullYear(),
        numero_registro: item.numero_registro || '',
        institucion_evento: item.institucion_evento || '',
        estado: item.estado || 'concedida',
        descripcion: item.descripcion || ''
      });
    } else {
      setFormData({
        tipo: 'patente',
        titulo: '',
        investigador_id: researchers[0]?.id || '',
        autores: '',
        anio: new Date().getFullYear(),
        numero_registro: '',
        institucion_evento: '',
        estado: 'concedida',
        descripcion: ''
      });
    }
    setErrors({});
  }, [item, isOpen, researchers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.titulo.trim()) newErrors.titulo = 'El título es obligatorio.';
    if (!formData.investigador_id) newErrors.investigador_id = 'Debes vincular a un investigador.';
    if (!formData.autores.trim()) newErrors.autores = 'Los autores o inventores son obligatorios.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedInv = researchers.find(r => r.id === Number(formData.investigador_id));
    onSave({
      ...formData,
      investigador_nombre: selectedInv ? selectedInv.nombre_completo : ''
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Editar Producción Técnica' : 'Registrar Patente / Software / Tesis'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {item ? 'Guardar Cambios' : 'Registrar'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Tipo de Producto *</label>
            <select
              name="tipo"
              className="form-select"
              value={formData.tipo}
              onChange={handleChange}
            >
              <option value="patente">Patente de Invención</option>
              <option value="software">Registro de Software</option>
              <option value="tesis_dirigida">Tesis Dirigida (Posgrado/Pregrado)</option>
              <option value="ponencia">Ponencia en Congreso</option>
              <option value="modelo_utilidad">Modelo de Utilidad</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              name="estado"
              className="form-select"
              value={formData.estado}
              onChange={handleChange}
            >
              <option value="concedida">Concedida / Registrada</option>
              <option value="solicitada">En Trámite / Solicitada</option>
              <option value="sustentada">Sustentada (Tesis)</option>
              <option value="publicada">Publicada</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Título o Denominación Oficial *</label>
          <input
            type="text"
            name="titulo"
            className="form-input"
            placeholder="Título de la patente, software o tesis..."
            value={formData.titulo}
            onChange={handleChange}
          />
          {errors.titulo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.titulo}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Investigador Responsable / Tutor *</label>
            <select
              name="investigador_id"
              className="form-select"
              value={formData.investigador_id}
              onChange={handleChange}
            >
              <option value="">Selecciona investigador...</option>
              {researchers.map(r => (
                <option key={r.id} value={r.id}>{r.nombre_completo}</option>
              ))}
            </select>
            {errors.investigador_id && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.investigador_id}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Inventores / Estudiantes Autores *</label>
            <input
              type="text"
              name="autores"
              className="form-input"
              placeholder="Nombres completos..."
              value={formData.autores}
              onChange={handleChange}
            />
            {errors.autores && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.autores}</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Número de Registro / Folio</label>
            <input
              type="text"
              name="numero_registro"
              className="form-input"
              placeholder="Ej: MX/a/2025/00145..."
              value={formData.numero_registro}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Año</label>
            <input
              type="number"
              name="anio"
              className="form-input"
              value={formData.anio}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Oficina de Registro, Universidad o Evento</label>
          <input
            type="text"
            name="institucion_evento"
            className="form-input"
            placeholder="IMPI, INDECOPI, Dirección de Derechos de Autor, etc."
            value={formData.institucion_evento}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción Técnica o Resumen de Impacto</label>
          <textarea
            name="descripcion"
            className="form-textarea"
            placeholder="Alcance, aplicación en el sector productivo o relevancia..."
            value={formData.descripcion}
            onChange={handleChange}
          />
        </div>
      </form>
    </Modal>
  );
}
