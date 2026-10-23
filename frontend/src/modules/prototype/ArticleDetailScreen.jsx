import React, { useState, useEffect, useRef } from 'react';
import { disseminationService } from '../../services/disseminationService';
import { publicationService } from '../../services/publicationService';
import { getDocumentUrl } from '../../services/api';
import { IconArrowLeft, IconEye, IconDownload, IconCalendar } from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN 2: USUARIO: DETALLE DEL ARTÍCULO (CON TIPOGRAFÍAS MANUAL BUAP)
 * ============================================================================
 * Jerarquía tipográfica aplicada:
 * - Gotham Black: Título del artículo (32px)
 * - Source Sans Pro Black: Encabezados de sección ("Resumen", "Palabras clave")
 * - Source Sans Pro Semibold Italic: Nombres de autores
 * - Source Sans Pro Italic: Cargos, fechas de publicación y DOIs
 * - Source Sans Pro Regular: Cuerpo del resumen y texto general
 */
export default function ArticleDetailScreen({ article, onBack }) {
  const [currentArticle, setCurrentArticle] = useState(article);
  const [bibtex, setBibtex] = useState(null);
  const [copied, setCopied] = useState(false);
  const recordedViewArticleId = useRef(null);

  useEffect(() => {
    setCurrentArticle(article);
    if (!article?.id) return;

    // 1. Cargar metadatos completos y actualizados (lectura idempotente sin incrementar)
    publicationService.getById(article.id).then((fresh) => {
      if (fresh && fresh.id) {
        setCurrentArticle(prev => ({
          ...fresh,
          vistas: Math.max(Number(fresh.vistas || 0), Number(prev?.vistas || 0))
        }));
      }
    }).catch(err => console.error('Error cargando publicación:', err));

    // 2. Registrar incremento en BD exactamente una vez por visita (protegido contra StrictMode)
    if (recordedViewArticleId.current !== article.id) {
      recordedViewArticleId.current = article.id;
      publicationService.recordView(article.id).then((res) => {
        const newVistas = res?.data?.vistas;
        if (newVistas !== undefined) {
          setCurrentArticle(prev => ({
            ...prev,
            vistas: newVistas
          }));
        }
      }).catch(err => console.error('Error registrando vista:', err));
    }
  }, [article?.id]);

  if (!currentArticle) {
    return (
      <div style={{ maxWidth: '860px', margin: '40px auto', padding: '20px' }}>
        <button 
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--buap-blue-302)', fontFamily: 'var(--font-source)', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconArrowLeft size={16} />
          <span>Volver a resultados</span>
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          No se ha seleccionado ningún artículo.
        </div>
      </div>
    );
  }

  const handleFetchBibtex = async () => {
    if (bibtex) {
      setBibtex(null);
      return;
    }
    const data = await disseminationService.getBibTeX(currentArticle.id);
    setBibtex(data);
  };

  const handleCopyBibtex = () => {
    if (bibtex) {
      navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPdf = () => {
    if (currentArticle?.id) {
      publicationService.recordDownload(currentArticle.id).then(() => {
        setCurrentArticle(prev => ({
          ...prev,
          descargas: (prev?.descargas || 0) + 1
        }));
      }).catch(err => console.error('Error registrando descarga:', err));
    }

    if (currentArticle?.url_documento) {
      const target = getDocumentUrl(currentArticle.url_documento);
      window.open(target, '_blank');
    } else {
      alert(`Abriendo visor de documento: "${currentArticle?.titulo || 'Documento'}"`);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Enlace de regreso */}
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--buap-blue-302)',
            fontFamily: "var(--font-source)",
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <IconArrowLeft size={16} />
          <span>Volver a resultados</span>
        </button>

        {/* Tarjeta de Detalle del Artículo */}
        <div 
          className="card" 
          style={{ 
            marginTop: '16px', 
            padding: '36px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px' 
          }}
        >
          {/* Etiquetas de Categoría y Tipo */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="tag">
              {currentArticle.cuartil ? `Indexado ${currentArticle.indexacion || 'Scopus'} (${currentArticle.cuartil})` : 'Ciencias Exactas'}
            </span>
            <span className="tag" style={{ background: '#F1F5F9', color: '#334155' }}>
              {currentArticle.tipo ? currentArticle.tipo.replace('_', ' ') : 'Artículo Científico'}
            </span>
            {currentArticle.acceso_abierto === 1 && (
              <span className="tag" style={{ background: '#DCFCE7', color: '#166534' }}>
                Acceso Abierto (Open Access)
              </span>
            )}
            {currentArticle.evento && (
              <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconCalendar size={13} color="#92400E" />
                {currentArticle.evento}
              </span>
            )}
          </div>

          {/* Título Principal en Gotham Black */}
          <h1 className="titulo-gotham-black" style={{ fontSize: '32px', lineHeight: 1.25, color: 'var(--text-dark)' }}>
            {currentArticle.titulo}
          </h1>

          {/* Fila de Metadatos con Source Sans Pro Semibold Italic e Italic */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Autor(es)</div>
              <div className="nombre-autor" style={{ fontSize: '15.5px', marginTop: '2px' }}>
                {currentArticle.autores}
              </div>
            </div>

            <div>
              <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Fecha de publicación</div>
              <div className="fecha-cargo" style={{ fontSize: '15px', marginTop: '2px' }}>
                {currentArticle.fecha_publicacion || `${currentArticle.anio || new Date().getFullYear()}`}
              </div>
            </div>

            <div>
              <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>DOI</div>
              <div style={{ fontWeight: 600, color: 'var(--buap-cyan-306)', marginTop: '2px', fontFamily: 'monospace' }}>
                {currentArticle.doi ? (
                  <a href={`https://doi.org/${currentArticle.doi}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                    {currentArticle.doi}
                  </a>
                ) : '10.1016/j.buap.2026.0142'}
              </div>
            </div>

            {currentArticle.revista_editorial && (
              <div>
                <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Revista / Editorial</div>
                <div className="cargo-autor" style={{ fontSize: '15px', marginTop: '2px' }}>
                  {currentArticle.revista_editorial}
                </div>
              </div>
            )}

            {currentArticle.evento && (
              <div>
                <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Evento / Congreso</div>
                <div className="cargo-autor" style={{ fontSize: '15px', marginTop: '2px', color: '#92400E', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <IconCalendar size={14} color="#92400E" />
                  {currentArticle.evento}
                </div>
              </div>
            )}

            {/* Contadores en vivo: Vistas y Descargas en BD */}
            <div>
              <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Visualizaciones</div>
              <div style={{ fontSize: '15px', marginTop: '2px', fontWeight: 700, color: 'var(--buap-blue-302)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <IconEye size={15} color="var(--buap-blue-302)" />
                {(currentArticle.vistas || 0).toLocaleString()} vistas
              </div>
            </div>

            <div>
              <div className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Descargas PDF</div>
              <div style={{ fontSize: '15px', marginTop: '2px', fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <IconDownload size={15} color="#059669" />
                {(currentArticle.descargas || 0).toLocaleString()} descargas
              </div>
            </div>
          </div>

          {/* Sección de Resumen: Encabezado en Source Sans Pro Black y Cuerpo en Source Sans Pro Regular */}
          <div>
            <h3 className="encabezado-source-black" style={{ fontSize: '20px', marginBottom: '8px' }}>
              Resumen
            </h3>
            <p className="cuerpo-texto" style={{ margin: 0, lineHeight: 1.65, fontSize: '15px' }}>
              {currentArticle.resumen || 'Texto del resumen del artículo de investigación: En este trabajo se presenta el marco teórico, el diseño metodológico experimental y los resultados más relevantes generados por investigadores de la Benemérita Universidad Autónoma de Puebla.'}
            </p>
          </div>

          {/* Sección de Palabras Clave */}
          <div>
            <h3 className="encabezado-source-black" style={{ fontSize: '20px', marginBottom: '8px' }}>
              Palabras clave
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {currentArticle.palabras_clave ? (
                currentArticle.palabras_clave.split(',').map((p, idx) => (
                  <span key={idx} className="tag" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    {p.trim()}
                  </span>
                ))
              ) : (
                <>
                  <span className="tag" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>metodología científica</span>
                  <span className="tag" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>producción académica</span>
                  <span className="tag" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>BUAP Puebla</span>
                  <span className="tag" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>acceso abierto</span>
                </>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn"
              onClick={handleOpenPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <IconEye size={16} />
              <span>Ver PDF</span>
            </button>
            <button 
              type="button" 
              className="btn btn2"
              onClick={handleOpenPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <IconDownload size={16} />
              <span>Descargar PDF</span>
            </button>
            <button 
              type="button" 
              className="btn btn2"
              onClick={handleFetchBibtex}
            >
              {bibtex ? 'Ocultar Cita' : 'Cita BibTeX'}
            </button>
          </div>

          {/* Bloque de Cita BibTeX */}
          {bibtex && (
            <div style={{ marginTop: '16px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="encabezado-source-black" style={{ fontSize: '13px', color: 'var(--buap-blue-302)' }}>
                  Entrada BibTeX (LaTeX / Zotero):
                </span>
                <button 
                  type="button" 
                  className="btn btn2" 
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '13px' }}
                  onClick={handleCopyBibtex}
                >
                  {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
                </button>
              </div>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {bibtex}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
