import React, { useState, useEffect } from 'react';
import { publicationService } from '../../services/publicationService';
import { categoryService } from '../../services/categoryService';
import { apiUpload } from '../../services/api';
import AuthorChipInput from '../../components/AuthorChipInput';
import KeywordChipInput from '../../components/KeywordChipInput';
import { IconLock, IconDocument, IconAlertTriangle, IconArrowLeft, CategoryIcon } from '../../components/Icons';
import AdminSidebar from '../../components/AdminSidebar';

/**
 * ============================================================================
 * SCREEN: SUBIR Y PUBLICAR ARTÍCULO CIENTÍFICO (ADMIN)
 * ============================================================================
 * Incluye:
 * 1. Búsqueda y selección interactiva de Autores desde BD con chips eliminables.
 * 2. Selector de Palabras Clave idéntico con chips y taxonomía institucional.
 * 3. Desglose explícito de Género (Tipo de Producto) y Categoría (Área del Conocimiento).
 * 4. Indexación, cuartil (Q1-Q4), revista/editorial y DOI.
 * 5. Dropzone de subida modular de archivo PDF al servidor con validación MIME y magic bytes.
 * 6. Guardado íntegro en la base de datos a través de la API REST protegida para Administradores.
 */
export default function AdminUploadScreen({ onNavigate, articleToEdit, showToast }) {
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'articulo_revista',
    autores: '',
    investigador_id: 1,
    fecha_publicacion: new Date().toISOString().split('T')[0],
    categoria: 'Ciencias Exactas e Ingenierías',
    area_conocimiento: 'Ciencias Exactas e Ingenierías',
    palabras_clave: '',
    resumen: '',
    revista_editorial: 'Revista de Investigación BUAP',
    evento: '',
    indexacion: 'Scopus',
    cuartil: 'Q1',
    doi: '',
    estado: 'publicado',
    acceso_abierto: 1
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Listas dinámicas de categorías y géneros desde la BD
  const [categoriesList, setCategoriesList] = useState([]);
  const [genresList, setGenresList] = useState([]);

  useEffect(() => {
    categoryService.getAll().then(cats => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats.filter(c => c.tipo === 'area_conocimiento'));
        setGenresList(cats.filter(c => c.tipo === 'genero_publicacion'));
      }
    }).catch(err => console.error('Error cargando categorías en upload:', err));
  }, []);

  useEffect(() => {
    if (articleToEdit) {
      setFormData({
        titulo: articleToEdit.titulo || '',
        tipo: articleToEdit.tipo || 'articulo_revista',
        autores: articleToEdit.autores || '',
        investigador_id: articleToEdit.investigador_id || 1,
        fecha_publicacion: articleToEdit.fecha_publicacion || `${articleToEdit.anio || 2026}-01-01`,
        categoria: articleToEdit.categoria || articleToEdit.area_conocimiento || articleToEdit.linea_investigacion || 'Ciencias Exactas e Ingenierías',
        area_conocimiento: articleToEdit.area_conocimiento || articleToEdit.categoria || 'Ciencias Exactas e Ingenierías',
        palabras_clave: articleToEdit.palabras_clave || '',
        resumen: articleToEdit.resumen || '',
        revista_editorial: articleToEdit.revista_editorial || 'Revista de Investigación BUAP',
        evento: articleToEdit.evento || '',
        indexacion: articleToEdit.indexacion || 'Scopus',
        cuartil: articleToEdit.cuartil || 'Q1',
        doi: articleToEdit.doi || '',
        estado: articleToEdit.estado || 'publicado',
        acceso_abierto: articleToEdit.acceso_abierto !== undefined ? articleToEdit.acceso_abierto : 1
      });

      if (articleToEdit.url_documento) {
        setSelectedFileName(articleToEdit.url_documento.split('/').pop() || 'documento_adjunto.pdf');
      }
    }
  }, [articleToEdit]);

  const handleChange = (e) => {
    const { id, name, value } = e.target;
    const fieldKey = name || id;
    setFormData(prev => ({ 
      ...prev, 
      [fieldKey]: value,
      // Sincronizar categoria y area_conocimiento si se modifica
      ...(fieldKey === 'categoria' ? { area_conocimiento: value } : {})
    }));
  };

  const handleAuthorsChange = (formattedString, authorsList) => {
    // Si el primer autor es un investigador de la BD con id numérico, vincular su ID
    let principalId = 1;
    if (authorsList && authorsList.length > 0) {
      const first = authorsList[0];
      if (first.id && !String(first.id).startsWith('ext_') && !String(first.id).startsWith('init_')) {
        principalId = Number(first.id);
      }
    }

    setFormData(prev => ({
      ...prev,
      autores: formattedString,
      investigador_id: principalId
    }));
  };

  const handleKeywordsChange = (formattedString) => {
    setFormData(prev => ({
      ...prev,
      palabras_clave: formattedString
    }));
  };

  const handleFileChange = (e) => {
    setUploadError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validación de extensión y tipo MIME
      const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
      const isPdfMime = file.type === 'application/pdf' || file.type === '';

      if (!isPdfExt && !isPdfMime) {
        setUploadError('Formato no permitido. Solo se admiten archivos en formato PDF (.pdf).');
        return;
      }

      // Validación de tamaño máximo (25 MB)
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('El archivo excede el tamaño máximo permitido de 25 MB.');
        return;
      }

      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleSave = async (estadoPublicacion = 'publicado') => {
    setUploadError('');
    if (!formData.titulo.trim()) {
      alert('Por favor ingresa el título del artículo de investigación.');
      return;
    }
    if (!formData.autores.trim()) {
      alert('Por favor especifica al menos un autor en el campo de autores.');
      return;
    }

    setSaving(true);
    let finalDocumentUrl = articleToEdit?.url_documento || null;

    // 1. Si el usuario seleccionó un nuevo archivo PDF, subirlo al backend
    if (selectedFile) {
      setUploadStatus('Subiendo y verificando archivo PDF en el servidor...');
      const uploadFormData = new FormData();
      uploadFormData.append('pdf', selectedFile);

      const uploadRes = await apiUpload('/upload/pdf', uploadFormData);

      if (!uploadRes.success) {
        setSaving(false);
        setUploadStatus('');
        setUploadError(uploadRes.message || 'Error al subir el archivo PDF.');
        alert(`Error al subir el archivo PDF: ${uploadRes.message}`);
        return;
      }

      finalDocumentUrl = uploadRes.data?.url || uploadRes.url;
    }

    setUploadStatus('Guardando publicación en la base de datos institucional...');

    const payload = {
      ...formData,
      estado: estadoPublicacion,
      anio: formData.fecha_publicacion ? parseInt(formData.fecha_publicacion.split('-')[0], 10) : new Date().getFullYear(),
      url_documento: finalDocumentUrl
    };

    try {
      if (articleToEdit && articleToEdit.id) {
        const updateRes = await publicationService.update(articleToEdit.id, payload);
        if (updateRes && !updateRes.success && updateRes.message) {
          throw new Error(updateRes.message);
        }
        if (showToast) showToast('Artículo actualizado correctamente.');
      } else {
        const createRes = await publicationService.create(payload);
        if (createRes && !createRes.success && createRes.message) {
          throw new Error(createRes.message);
        }
        if (showToast) {
          showToast(estadoPublicacion === 'borrador' ? 'Borrador guardado exitosamente.' : 'Artículo y PDF publicados en el repositorio institucional.');
        }
      }
      onNavigate('admin-panel');
    } catch (err) {
      alert('Ocurrió un error al guardar la publicación: ' + err.message);
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  // Obtener el icono correspondiente al formato/género seleccionado
  const selectedGenreObj = genresList.find(g => (g.codigo || g.nombre) === formData.tipo);
  const genreIconKey = selectedGenreObj?.icono || (
    formData.tipo === 'articulo_revista' || formData.tipo === 'GEN_ARTICULO' ? 'document' :
    formData.tipo === 'capitulo_libro' || formData.tipo === 'GEN_CAPITULO' || formData.tipo === 'libro' || formData.tipo === 'GEN_LIBRO' ? 'book' :
    formData.tipo === 'conferencia' || formData.tipo === 'GEN_CONFERENCIA' ? 'microphone' :
    formData.tipo === 'tesis_posgrado' || formData.tipo === 'GEN_TESIS' ? 'graduation' :
    formData.tipo === 'patente' || formData.tipo === 'GEN_PATENTE' ? 'lightbulb' : 'document'
  );

  // Obtener el icono y color correspondiente a la categoría seleccionada
  const selectedCatObj = categoriesList.find(c => c.nombre === formData.categoria || c.codigo === formData.categoria);
  const categoryIconKey = selectedCatObj?.icono || (
    formData.categoria?.toLowerCase().includes('exactas') ? 'settings' :
    formData.categoria?.toLowerCase().includes('salud') ? 'dna' :
    formData.categoria?.toLowerCase().includes('sociales') ? 'landmark' :
    formData.categoria?.toLowerCase().includes('económ') || formData.categoria?.toLowerCase().includes('econom') ? 'chart' :
    formData.categoria?.toLowerCase().includes('agro') || formData.categoria?.toLowerCase().includes('ambient') ? 'leaf' :
    formData.categoria?.toLowerCase().includes('medio') || formData.categoria?.toLowerCase().includes('prepa') ? 'graduation' : 'book'
  );
  const categoryColor = selectedCatObj?.color || '#003B5C';

  return (
    <div className="admin-layout-wrapper">
      
      {/* 1. Menú Lateral de Administración (Desktop y Drawer Móvil) */}
      <AdminSidebar 
        activeNav="subir" 
        onNavigate={onNavigate} 
      />

      {/* 2. Área Central: Formulario */}
      <div className="admin-content-area" style={{ maxWidth: '1050px' }}>
        
        {/* Cabecera del formulario */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="titulo-gotham-black" style={{ fontSize: '30px', margin: 0, color: 'var(--text-dark)' }}>
              {articleToEdit ? 'Editar artículo de investigación' : 'Publicar nuevo artículo en el repositorio'}
            </h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '14.5px' }}>
              Registra los metadatos científicos completos y adjunta el documento PDF con almacenamiento modular.
            </p>
          </div>
          <span 
            style={{ 
              background: '#E0F2FE', 
              color: 'var(--buap-blue-302)', 
              fontWeight: 700, 
              padding: '6px 14px', 
              borderRadius: '20px', 
              fontSize: '13px',
              border: '1px solid #BAE6FD',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconLock size={13} color="var(--buap-blue-302)" /> Sesión de Administrador Autorizado
          </span>
        </div>

        <div className="card" style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '22px', padding: '32px' }}>
          
          {/* 1. Título de la Investigación */}
          <div>
            <label htmlFor="t" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
              Título del artículo o investigación <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input 
              id="t" 
              name="titulo"
              placeholder="Ej: Análisis metagenómico del microbioma rizosférico en suelos volcánicos de Puebla"
              value={formData.titulo}
              onChange={handleChange}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* 2. Autores con Autocompletado desde BD + Debounce + Chips */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                Autor o autores de la investigación <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span className="muted" style={{ fontSize: '12.5px' }}>
                Escribe para buscar en el directorio o presiona Enter para agregar autores externos
              </span>
            </div>

            <AuthorChipInput 
              value={formData.autores}
              onChange={handleAuthorsChange}
              disabled={saving}
            />
          </div>

          {/* 3. Género (Tipo de Publicación) y Categoría (Área del Conocimiento) explícitos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            
            {/* Género / Tipo de Publicación */}
            <div>
              <label htmlFor="tipo" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Género / Formato de publicación <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  title={`Formato: ${formData.tipo}`}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    backgroundColor: '#E0F2FE',
                    border: '1.5px solid #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--buap-blue-302)'
                  }}
                >
                  <CategoryIcon nameOrEmoji={genreIconKey} size={22} color="var(--buap-blue-302)" />
                </div>
                <select 
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  style={{ flex: 1, height: '44px' }}
                >
                  {genresList.length > 0 ? (
                    genresList.map(g => (
                      <option key={g.id} value={g.codigo || g.nombre}>
                        {g.nombre}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="articulo_revista">Artículo Científico en Revista Indexada (Journal)</option>
                      <option value="capitulo_libro">Capítulo de Libro Científico / Arbitrado</option>
                      <option value="libro">Libro Científico Completo / Monografía</option>
                      <option value="conferencia">Artículo en Congreso o Conferencia (Proceedings)</option>
                      <option value="reporte_tecnico">Reporte Técnico / Informe de Investigación</option>
                      <option value="tesis_posgrado">Tesis de Grado o Posgrado (Maestría / Doctorado)</option>
                      <option value="patente">Patente o Propiedad Industrial Concedida</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Categoría / Gran Área del Conocimiento VIEP-BUAP */}
            <div>
              <label htmlFor="categoria" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Categoría / Área del conocimiento (VIEP) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  title={`Área del conocimiento: ${formData.categoria}`}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    backgroundColor: categoryColor ? `${categoryColor}18` : '#F1F5F9',
                    border: `1.5px solid ${categoryColor ? `${categoryColor}40` : '#CBD5E1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: categoryColor || '#003B5C'
                  }}
                >
                  <CategoryIcon nameOrEmoji={categoryIconKey} size={22} color={categoryColor || '#003B5C'} />
                </div>
                <select 
                  id="categoria"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  style={{ flex: 1, height: '44px' }}
                >
                  {categoriesList.length > 0 ? (
                    categoriesList.map(c => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Ciencias Exactas e Ingenierías">Área I: Ciencias Exactas e Ingenierías (Computación, IA, Física)</option>
                      <option value="Ciencias Naturales y de la Salud">Área II: Ciencias Naturales y de la Salud (Biología, Medicina)</option>
                      <option value="Ciencias Sociales y Humanidades">Área III: Ciencias Sociales y Humanidades (Educación, Derecho)</option>
                      <option value="Económico - Administrativas">Área IV: Ciencias Económico-Administrativas (Economía, Gestión)</option>
                      <option value="Agropecuarias y Ambientales">Área V: Ciencias Agropecuarias, Ambientales y Veterinarias</option>
                      <option value="Nivel Medio Superior">Área VI: Proyectos Formativos Nivel Medio Superior</option>
                    </>
                  )}
                </select>
              </div>
            </div>

          </div>

          {/* 4. Metadatos Editoriales: Revista/Editorial, DOI, Fecha, Indexación y Cuartil */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            <div>
              <label htmlFor="revista_editorial" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Revista o Editorial
              </label>
              <input 
                id="revista_editorial" 
                name="revista_editorial"
                placeholder="Ej: IEEE Transactions / Elsevier"
                value={formData.revista_editorial}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="evento" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Evento / Congreso
              </label>
              <input 
                id="evento" 
                name="evento"
                placeholder="Nombre del evento o congreso académico"
                value={formData.evento}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="doi" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                DOI (Digital Object Identifier)
              </label>
              <input 
                id="doi" 
                name="doi"
                placeholder="10.1109/TMI.2026.1092837"
                value={formData.doi}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="f" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Fecha de publicación
              </label>
              <input 
                id="f" 
                name="fecha_publicacion"
                type="date"
                value={formData.fecha_publicacion}
                onChange={handleChange}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label htmlFor="indexacion" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Indexación
              </label>
              <select 
                id="indexacion"
                name="indexacion"
                value={formData.indexacion}
                onChange={handleChange}
                style={{ width: '100%', height: '44px' }}
              >
                <option value="Scopus">Scopus</option>
                <option value="Web of Science">Web of Science (WoS)</option>
                <option value="IEEE Xplore">IEEE Xplore</option>
                <option value="Scielo">SciELO</option>
                <option value="Latindex">Latindex</option>
                <option value="PubMed">PubMed</option>
                <option value="Otra">Otra Indexación</option>
              </select>
            </div>

            <div>
              <label htmlFor="cuartil" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
                Cuartil de impacto
              </label>
              <select 
                id="cuartil"
                name="cuartil"
                value={formData.cuartil}
                onChange={handleChange}
                style={{ width: '100%', height: '44px' }}
              >
                <option value="Q1">Q1 (Primer cuartil - Top 25%)</option>
                <option value="Q2">Q2 (Segundo cuartil)</option>
                <option value="Q3">Q3 (Tercer cuartil)</option>
                <option value="Q4">Q4 (Cuarto cuartil)</option>
                <option value="Sin cuartil">Sin cuartil / En proceso</option>
              </select>
            </div>

          </div>

          {/* 5. Palabras Clave con Chips interactivos y Taxonomía */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                Palabras clave temáticas
              </label>
              <span className="muted" style={{ fontSize: '12.5px' }}>
                Escribe una palabra y presiona Enter o selecciona una sugerencia
              </span>
            </div>

            <KeywordChipInput 
              value={formData.palabras_clave}
              onChange={handleKeywordsChange}
              disabled={saving}
            />
          </div>

          {/* 6. Resumen (Abstract) */}
          <div>
            <label htmlFor="r" style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
              Resumen (Abstract científico)
            </label>
            <textarea 
              id="r" 
              name="resumen"
              rows={4}
              placeholder="Descripción detallada del planteamiento del problema, hipótesis, diseño metodológico, resultados principales y conclusiones..."
              value={formData.resumen}
              onChange={handleChange}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* 7. Dropzone PDF con Validación, Magic Bytes y Almacenamiento Modular */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#1E293B' }}>
              Documento adjunto en PDF (Almacenamiento Modular del Servidor)
            </label>

            <div className="pdf-dropzone">
              <input 
                type="file" 
                id="pdf-input" 
                accept=".pdf,application/pdf" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
                disabled={saving}
              />
              <div style={{ fontFamily: 'var(--font-source)', fontWeight: 600, fontSize: '16px', color: 'var(--text-dark)' }}>
                {selectedFile ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconDocument size={18} color="var(--buap-blue-302)" /> Archivo seleccionado: <strong>{selectedFile.name}</strong> ({((selectedFile.size) / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                ) : selectedFileName ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconDocument size={18} color="var(--buap-blue-302)" /> Documento vinculado: <strong>{selectedFileName}</strong>
                  </span>
                ) : (
                  'Arrastra el archivo PDF aquí'
                )}
              </div>
              <div className="muted" style={{ fontSize: '14px', margin: '4px 0 12px' }}>
                Documentos académicos en formato PDF, tamaño máximo 25 MB. Verificación binaria de cabecera %PDF-.
              </div>

              {uploadStatus && (
                <div style={{ color: 'var(--buap-blue-302)', fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>
                  {uploadStatus}
                </div>
              )}

              {uploadError && (
                <div style={{ color: '#d32f2f', fontWeight: 600, fontSize: '14px', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconAlertTriangle size={16} color="#d32f2f" /> {uploadError}
                </div>
              )}

              <label 
                htmlFor="pdf-input" 
                className="btn btn2"
                style={{ display: 'inline-flex', cursor: saving ? 'not-allowed' : 'pointer', margin: '0 auto', width: 'fit-content' }}
              >
                {selectedFileName || selectedFile ? 'Cambiar archivo PDF' : 'Seleccionar archivo PDF'}
              </label>
            </div>
          </div>

          {/* 8. Botonera de Acciones */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <button 
              type="button" 
              className="btn btn2"
              onClick={() => onNavigate('admin-panel')}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn2"
              disabled={saving}
              onClick={() => handleSave('borrador')}
            >
              Guardar borrador
            </button>
            <button 
              type="button" 
              className="btn"
              disabled={saving}
              onClick={() => handleSave('publicado')}
            >
              {saving ? 'Guardando en BD...' : (articleToEdit ? 'Actualizar artículo' : 'Publicar artículo')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
