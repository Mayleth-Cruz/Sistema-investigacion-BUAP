import React, { useState } from 'react';
import Modal from '../../components/Modal';
import { Copy, Check } from 'lucide-react';
import { IconLightbulb } from '../../components/Icons';

/**
 * ============================================================================
 * MODAL VISOR DE CITAS BIBTEX
 * ============================================================================
 * Muestra el bloque formateado de citación en estándar BibTeX y permite
 * copiarlo al portapapeles con un solo clic para usarlo en LaTeX, Overleaf,
 * Zotero o Mendeley.
 */
export default function BibtexModal({ isOpen, onClose, bibtex, title }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (bibtex) {
      navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cita Académica en Formato BibTeX"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '¡Copiado!' : 'Copiar Cita'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Artículo: <strong style={{ color: '#ffffff' }}>{title}</strong>
      </div>

      <pre className="bibtex-code-block">
        {bibtex || 'Generando cita...'}
      </pre>

      <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconLightbulb size={16} color="#00A3E0" />
        <span>Puedes pegar esta entrada directamente en tu archivo <code>references.bib</code> en Overleaf o importarla a tu gestor bibliográfico preferido.</span>
      </div>
    </Modal>
  );
}
