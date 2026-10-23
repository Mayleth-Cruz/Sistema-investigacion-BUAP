import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * ============================================================================
 * COMPONENTE MODAL (Ventana Emergente Accesible)
 * ============================================================================
 * Proporciona un contenedor modal con fondo difuminado (backdrop-blur)
 * y cierre con tecla Escape o clic exterior.
 */
export default function Modal({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
