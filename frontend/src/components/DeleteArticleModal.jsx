import React, { useState, useEffect } from 'react';
import { IconTrash } from './Icons';

/**
 * ============================================================================
 * MODAL DE CONFIRMACIÓN SEGURA DE ELIMINACIÓN DE ARTÍCULOS
 * ============================================================================
 * Para evitar eliminaciones accidentales de material científico y PDFs,
 * este componente exige que el usuario escriba la palabra "eliminar"
 * antes de habilitar el botón de borrado definitivo en la base de datos.
 */
export default function DeleteArticleModal({
  isOpen,
  article,
  onClose,
  onConfirm,
  isDeleting = false
}) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen, article]);

  if (!isOpen || !article) return null;

  const isMatched = confirmInput.trim().toLowerCase() === 'eliminar';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMatched && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 27, 58, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '540px',
          width: '100%',
          overflow: 'hidden',
          border: '1px solid #FECACA',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
      >
        {/* Cabecera con alerta visual */}
        <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '50%', 
              backgroundColor: '#FEE2E2', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}
          >
            <IconTrash size={22} color="#991B1B" />
          </div>
          <div>
            <h2 className="titulo-gotham-black" style={{ fontSize: '20px', color: '#991B1B', margin: 0 }}>
              ¿Eliminar artículo de investigación?
            </h2>
            <p className="cuerpo-texto" style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
              Confirmación de seguridad requerida para eliminar registros del repositorio.
            </p>
          </div>
        </div>

        {/* Ficha informativa del artículo */}
        <div style={{ padding: '0 28px' }}>
          <div 
            style={{ 
              backgroundColor: '#F8FAFC', 
              border: '1px solid #E2E8F0', 
              borderRadius: '8px', 
              padding: '14px 16px',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700, marginBottom: '4px' }}>
              Artículo a eliminar
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', lineHeight: 1.35 }}>
              {article.titulo}
            </div>
            <div className="nombre-autor" style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
              {article.autores}
            </div>
          </div>

          {/* Advertencia institucional */}
          <div 
            style={{ 
              backgroundColor: '#FEF2F2', 
              border: '1px solid #FCA5A5', 
              borderRadius: '8px', 
              padding: '12px 14px',
              fontSize: '13.5px',
              color: '#991B1B',
              lineHeight: 1.45,
              marginBottom: '18px'
            }}
          >
            <strong>Advertencia:</strong> Esta acción es definitiva e irreversible. Se eliminará el registro bibliográfico, las estadísticas de visitas y el archivo PDF alojado en el servidor.
          </div>

          {/* Instrucción y campo de confirmación */}
          <form onSubmit={handleSubmit}>
            <label 
              htmlFor="confirm-delete-input" 
              style={{ display: 'block', fontSize: '13.5px', color: '#1E293B', fontWeight: 600, marginBottom: '8px' }}
            >
              Para confirmar, escribe la palabra <span style={{ color: '#DC2626', fontWeight: 800, textDecoration: 'underline' }}>eliminar</span> a continuación:
            </label>
            <input 
              id="confirm-delete-input"
              type="text"
              autoFocus
              placeholder="Escribe 'eliminar'..."
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isDeleting}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: isMatched ? '2px solid #DC2626' : '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                backgroundColor: isMatched ? '#FEF2F2' : '#FFFFFF',
                color: isMatched ? '#991B1B' : '#0F172A',
                fontWeight: isMatched ? 700 : 400
              }}
            />
          </form>
        </div>

        {/* Botones de acción */}
        <div 
          style={{ 
            padding: '20px 28px', 
            backgroundColor: '#F8FAFC', 
            borderTop: '1px solid #E2E8F0', 
            marginTop: '20px',
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px' 
          }}
        >
          <button 
            type="button" 
            className="btn btn2"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '9px 18px', fontSize: '14px' }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={onConfirm}
            disabled={!isMatched || isDeleting}
            style={{
              padding: '9px 20px',
              backgroundColor: isMatched && !isDeleting ? '#DC2626' : '#E2E8F0',
              color: isMatched && !isDeleting ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-source)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: isMatched && !isDeleting ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease-in-out',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isDeleting ? 'Eliminando artículo...' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
