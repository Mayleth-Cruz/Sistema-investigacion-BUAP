import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { researcherService } from '../../services/researcherService';

/**
 * ============================================================================
 * MODAL DE FORMULARIO DE PUBLICACIONES (Crear y Editar)
 * ============================================================================
 * Registro de artículos indexados en Scopus / Web of Science, cuartiles,
 * autores, DOIs y citaciones acumuladas.
 */
export default function PublicationFormModal({ isOpen, onClose, onSave, publication }) {
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'articulo_revista',
    investigador_id: '',
    autores: '',
    revista_editorial: '',
    anio: new Date().getFullYear(),
    volumen: '',
    numero: '',
    paginas: '',
    doi: '',
    indexacion: 'Scopus',
    cuartil: 'Q1',
    citas_estimadas: 0,
    acceso_abierto: 1,
    url_documento: ''
  });

  const [researchers, setResearchers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    researcherService.getAll().then(data => setResearchers(data || []));
  }, []);

  useEffect(() => {
    if (publication) {
      setFormData({
        titulo: publication.titulo || '',
        tipo: publication.tipo || 'articulo_revista',
        investigador_id: publication.investigador_id || '',
        autores: publication.autores || '',
        revista_editorial: publication.revista_editorial || '',
        anio: publication.anio || new Date().getFullYear(),
        volumen: publication.volumen || '',
        numero: publication.numero || '',
        paginas: publication.paginas || '',
        doi: publication.doi || '',
        indexacion: publication.indexacion || 'Scopus',
        cuartil: publication.cuartil || 'Q1',
        citas_estimadas: publication.citas_estimadas || 0,
        acceso_abierto: publication.acceso_abierto !== undefined ? publication.acceso_abierto : 1,
        url_documento: publication.url_documento || ''
      });
    } else {
      setFormData({
        titulo: '',
        tipo: 'articulo_revista',
        investigador_id: researchers[0]?.id || '',
        autores: '',
        revista_editorial: '',
        anio: new Date().getFullYear(),
        volumen: '',
        numero: '',
        paginas: '',
        doi: '',
        indexacion: 'Scopus',
        cuartil: 'Q1',
        citas_estimadas: 0,
        acceso_abierto: 1,
        url_documento: ''
      });
    }
    setErrors({});
  }, [publication, isOpen, researchers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.titulo.trim()) newErrors.titulo = 'El título de la publicación es obligatorio.';
    if (!formData.investigador_id) newErrors.investigador_id = 'Debes vincular a un investigador.';
    if (!formData.autores.trim()) newErrors.autores = 'La lista de autores es obligatoria.';
    if (!formData.revista_editorial.trim()) newErrors.revista_editorial = 'La revista o editorial es obligatoria.';
    if (!formData.anio) newErrors.anio = 'El año es obligatorio.';

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
      title={publication ? 'Editar Publicación Científica' : 'Registrar Publicación Científica'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {publication ? 'Guardar Cambios' : 'Registrar Publicación'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Título del Artículo / Documento *</label>
          <input
            type="text"
            name="titulo"
            className="form-input"
            placeholder="Título completo del paper publicado..."
            value={formData.titulo}
            onChange={handleChange}
          />
          {errors.titulo && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.titulo}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Autores (formato de citación) *</label>
          <input
            type="text"
            name="autores"
            className="form-input"
            placeholder="Ej: Pérez, J., Ramos, E., & Smith, A."
            value={formData.autores}
            onChange={handleChange}
          />
          {errors.autores && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.autores}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Investigador Adscrito *</label>
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
            <label className="form-label">Tipo de Producción</label>
            <select
              name="tipo"
              className="form-select"
              value={formData.tipo}
              onChange={handleChange}
            >
              <option value="articulo_revista">Artículo en Revista</option>
              <option value="libro">Libro de Investigación</option>
              <option value="capitulo_libro">Capítulo de Libro</option>
              <option value="conferencia">Conferencia / Actas de Congreso</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Revista o Editorial *</label>
            <input
              type="text"
              name="revista_editorial"
              className="form-input"
              placeholder="Ej: IEEE Transactions, Nature Communications..."
              value={formData.revista_editorial}
              onChange={handleChange}
            />
            {errors.revista_editorial && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.revista_editorial}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Año de Publicación *</label>
            <input
              type="number"
              name="anio"
              className="form-input"
              value={formData.anio}
              onChange={handleChange}
            />
            {errors.anio && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{errors.anio}</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Indexación</label>
            <select
              name="indexacion"
              className="form-select"
              value={formData.indexacion}
              onChange={handleChange}
            >
              <option value="Scopus">Scopus</option>
              <option value="Web of Science">Web of Science</option>
              <option value="IEEE Xplore">IEEE Xplore</option>
              <option value="Scielo">Scielo</option>
              <option value="Latindex">Latindex</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cuartil de Impacto</label>
            <select
              name="cuartil"
              className="form-select"
              value={formData.cuartil}
              onChange={handleChange}
            >
              <option value="Q1">Q1 (Primer Cuartil)</option>
              <option value="Q2">Q2 (Segundo Cuartil)</option>
              <option value="Q3">Q3 (Tercer Cuartil)</option>
              <option value="Q4">Q4 (Cuarto Cuartil)</option>
              <option value="Sin cuartil">Sin Cuartil</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Citas Estimadas</label>
            <input
              type="number"
              name="citas_estimadas"
              className="form-input"
              value={formData.citas_estimadas}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">DOI (Digital Object Identifier)</label>
            <input
              type="text"
              name="doi"
              className="form-input"
              placeholder="10.1016/j.ejemplo.2025..."
              value={formData.doi}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Enlace al Documento / PDF</label>
            <input
              type="url"
              name="url_documento"
              className="form-input"
              placeholder="https://..."
              value={formData.url_documento}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <input
            type="checkbox"
            id="acceso_abierto"
            name="acceso_abierto"
            checked={Boolean(formData.acceso_abierto)}
            onChange={handleChange}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="acceso_abierto" style={{ fontSize: '0.86rem', color: 'var(--text-light)', cursor: 'pointer' }}>
            Esta publicación es de <strong>Acceso Abierto (Open Access)</strong>
          </label>
        </div>
      </form>
    </Modal>
  );
}
