import React, { useState, useEffect, useRef } from 'react';
import { researcherService } from '../services/researcherService';
import AuthorModal from './AuthorModal';
import { IconUser, IconUserPlus, IconPlus } from './Icons';

/**
 * ============================================================================
 * COMPONENTE: SELECTOR DE AUTORES CON AUTOCOMPLETADO Y CHIPS (AuthorChipInput)
 * ============================================================================
 * Permite buscar investigadores en la base de datos institucional en tiempo real,
 * con debounce (antirrebote), selección rápida en dropdown flotante, agregado
 * de autores externos manuales, y visualización modular mediante chips con botón
 * de eliminación individual.
 */
export default function AuthorChipInput({ value = '', onChange, disabled = false }) {
  // Convertir el string inicial o array en lista de chips
  const parseInitialAuthors = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((name, index) => ({ id: `init_${index}`, nombre_completo: name }));
  };

  const [selectedAuthors, setSelectedAuthors] = useState(() => parseInitialAuthors(value));
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [modalOpen, setModalOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar autores seleccionados cuando la propiedad value cambia externamente (ej: al editar un artículo)
  useEffect(() => {
    setSelectedAuthors(parseInitialAuthors(value));
  }, [value]);

  // Sincronizar hacia afuera (notificar al padre)
  const notifyChange = (authors) => {
    const formattedString = authors.map(a => a.nombre_completo || a.nombre || a).join(', ');
    if (onChange) {
      onChange(formattedString, authors);
    }
  };

  // Debounce para consultar al backend
  useEffect(() => {
    const query = inputValue.trim();
    if (!query) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const results = await researcherService.getAll(query);
        // Filtrar los que ya hayan sido seleccionados
        const selectedNames = new Set(selectedAuthors.map(a => (a.nombre_completo || a.nombre || '').toLowerCase()));
        const filtered = (results || []).filter(r => !selectedNames.has((r.nombre_completo || '').toLowerCase()));
        setSuggestions(filtered);
        setIsOpen(true);
      } catch (err) {
        console.error('Error buscando autores:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280); // Debounce de 280ms

    return () => clearTimeout(handler);
  }, [inputValue, selectedAuthors]);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAuthor = (author) => {
    const authorObj = typeof author === 'string' 
      ? { id: `ext_${Date.now()}`, nombre_completo: author } 
      : author;

    // Prevenir duplicados
    const exists = selectedAuthors.some(
      a => (a.nombre_completo || a.nombre || '').toLowerCase() === (authorObj.nombre_completo || authorObj.nombre || '').toLowerCase()
    );
    if (!exists) {
      const updated = [...selectedAuthors, authorObj];
      setSelectedAuthors(updated);
      notifyChange(updated);
    }
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemoveAuthor = (indexToRemove) => {
    const updated = selectedAuthors.filter((_, idx) => idx !== indexToRemove);
    setSelectedAuthors(updated);
    notifyChange(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length));
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectAuthor(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        handleSelectAuthor(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedAuthors.length > 0) {
      // Eliminar el último chip si el input está vacío y presiona retroceso
      handleRemoveAuthor(selectedAuthors.length - 1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Contenedor estilo Input Box con chips */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          minHeight: '46px',
          padding: '6px 10px',
          border: isOpen ? '1.5px solid var(--buap-blue-302, #003B5C)' : '1px solid #CBD5E1',
          borderRadius: '8px',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          boxShadow: isOpen ? '0 0 0 3px rgba(0, 59, 92, 0.12)' : 'none',
          transition: 'all 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
        onClick={() => inputRef.current && inputRef.current.focus()}
      >
        {/* Renderizado de Chips de Autores Seleccionados */}
        {selectedAuthors.map((author, index) => {
          const name = author.nombre_completo || author.nombre || author;
          return (
            <span
              key={author.id || index}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(0, 59, 92, 0.08)',
                color: 'var(--buap-blue-302, #003B5C)',
                border: '1px solid rgba(0, 59, 92, 0.2)',
                borderRadius: '20px',
                padding: '4px 10px 4px 8px',
                fontSize: '13.5px',
                fontWeight: 600,
                fontFamily: 'var(--font-source, sans-serif)',
                userSelect: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              {/* Icono de usuario o avatar */}
              {author.avatar_url ? (
                <img 
                  src={author.avatar_url} 
                  alt="" 
                  style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <IconUser size={13} color="#003B5C" />
              )}

              <span>{name}</span>

              {/* Botón de eliminación del chip */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAuthor(index);
                  }}
                  title={`Quitar ${name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--buap-blue-302, #003B5C)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    padding: 0,
                    marginLeft: '2px',
                    lineHeight: 1,
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 59, 92, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        {/* Campo de texto para escribir y buscar */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            if (inputValue.trim() || suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedAuthors.length === 0 ? "Escribe un nombre para buscar en el directorio o presiona Enter para agregar..." : "Agregar coautor..."}
          style={{
            flex: 1,
            minWidth: '160px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '4px 6px',
            fontSize: '14.5px',
            fontFamily: 'var(--font-source, sans-serif)',
            color: 'var(--text-dark, #0F172A)'
          }}
        />

        {/* Indicador de carga */}
        {loading && (
          <span style={{ fontSize: '12px', color: '#64748B', marginRight: '6px' }}>
            Buscando...
          </span>
        )}
      </div>

      {/* Desplegable de Resultados / Sugerencias */}
      {isOpen && (inputValue.trim() || suggestions.length > 0) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '4px 0'
          }}
        >
          {suggestions.length > 0 ? (
            <>
              <div 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: '#64748B', 
                  borderBottom: '1px solid #F1F5F9' 
                }}
              >
                Investigadores encontrados en la base de datos:
              </div>

              {suggestions.map((researcher, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <div
                    key={researcher.id}
                    onClick={() => handleSelectAuthor(researcher)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(0, 59, 92, 0.06)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--buap-blue-302, #003B5C)' : '3px solid transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {researcher.avatar_url ? (
                      <img 
                        src={researcher.avatar_url} 
                        alt="" 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#475569'
                        }}
                      >
                        {researcher.nombre_completo ? researcher.nombre_completo.charAt(0) : 'U'}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {researcher.nombre_completo}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {researcher.afiliacion || researcher.linea_investigacion || researcher.correo}
                      </div>
                    </div>

                    {researcher.orcid && (
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          color: '#16A34A', 
                          background: '#DCFCE7', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        ORCID
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ padding: '8px 14px', fontSize: '13px', color: '#64748B' }}>
              No se encontraron investigadores institucionales con "{inputValue}".
            </div>
          )}

          {/* Opción para registrar formalmente nuevo autor en la BD institucional */}
          <div
            onClick={() => {
              setModalOpen(true);
              setIsOpen(false);
            }}
            style={{
              padding: '10px 14px',
              borderTop: '1px solid #E2E8F0',
              cursor: 'pointer',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              color: 'var(--buap-blue-302, #003B5C)',
              fontWeight: 700
            }}
          >
            <IconUserPlus size={16} color="var(--buap-blue-302, #003B5C)" />
            <span>Registrar formalmente nuevo autor en la base de datos...</span>
          </div>

          {/* Opción para agregar como autor externo o invitado */}
          {inputValue.trim() && (
            <div
              onClick={() => handleSelectAuthor(inputValue.trim())}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #E2E8F0',
                cursor: 'pointer',
                backgroundColor: highlightedIndex === suggestions.length ? '#EFF6FF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
                color: 'var(--buap-cyan-306, #00A3E0)',
                fontWeight: 600
              }}
            >
              <IconPlus size={14} color="var(--buap-cyan-306, #00A3E0)" />
              <span>Agregar como autor externo rápido: <strong>"{inputValue.trim()}"</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Modal para registrar autor nuevo al vuelo */}
      <AuthorModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(newAuthor) => handleSelectAuthor(newAuthor)}
      />
    </div>
  );
}
