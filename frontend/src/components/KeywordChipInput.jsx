import React, { useState, useEffect, useRef } from 'react';
import { IconTag, IconPlus } from './Icons';

// Taxonomía sugerida de palabras clave para investigación BUAP
const DEFAULT_KEYWORD_SUGGESTIONS = [
  'Inteligencia Artificial',
  'Aprendizaje Profundo (Deep Learning)',
  'Visión por Computadora',
  'Procesamiento de Lenguaje Natural',
  'Biotecnología Molecular',
  'Genómica Ambiental',
  'Microbioma Rizosférico',
  'Biorremediación',
  'Energías Renovables',
  'Microrredes Eléctricas',
  'Fotovoltaica y Baterías',
  'Epidemiología Espacial',
  'Salud Pública y Arbovirus',
  'Sensores IoT y Telemetría',
  'Cienciometría',
  'Acceso Abierto (Open Access)',
  'Nanomateriales y Catálisis',
  'Ciencia de Datos',
  'Modelación Matemática',
  'Bioinformática y Salud Global',
  'Desarrollo Sustentable',
  'Química de Polímeros',
  'Óptica y Fotónica',
  'Educación Superior e Innovación'
];

/**
 * ============================================================================
 * COMPONENTE: SELECTOR DE PALABRAS CLAVE CON AUTOCOMPLETADO Y CHIPS (KeywordChipInput)
 * ============================================================================
 * Funciona idéntico al selector de autores:
 * - Filtra palabras clave sugeridas con debounce.
 * - Permite escribir cualquier palabra clave y pulsar Enter o coma para convertirla en chip.
 * - Muestra chips interactivos con botón '×' para eliminar.
 * - Notifica cambios hacia el formulario principal.
 */
export default function KeywordChipInput({ value = '', onChange, disabled = false }) {
  const parseInitialKeywords = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const [selectedKeywords, setSelectedKeywords] = useState(() => parseInitialKeywords(value));
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar palabras clave cuando la propiedad value cambia externamente (ej: al editar un artículo)
  useEffect(() => {
    setSelectedKeywords(parseInitialKeywords(value));
  }, [value]);

  const notifyChange = (keywords) => {
    const formatted = keywords.join(', ');
    if (onChange) {
      onChange(formatted, keywords);
    }
  };

  // Debounce para sugerencias
  useEffect(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const handler = setTimeout(() => {
      const selectedSet = new Set(selectedKeywords.map(k => k.toLowerCase()));
      const matches = DEFAULT_KEYWORD_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(query) && !selectedSet.has(item.toLowerCase())
      );
      setSuggestions(matches);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(handler);
  }, [inputValue, selectedKeywords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddKeyword = (keyword) => {
    const clean = keyword.trim();
    if (!clean) return;

    const exists = selectedKeywords.some(k => k.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      const updated = [...selectedKeywords, clean];
      setSelectedKeywords(updated);
      notifyChange(updated);
    }
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemoveKeyword = (indexToRemove) => {
    const updated = selectedKeywords.filter((_, idx) => idx !== indexToRemove);
    setSelectedKeywords(updated);
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
        handleAddKeyword(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        handleAddKeyword(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedKeywords.length > 0) {
      handleRemoveKeyword(selectedKeywords.length - 1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Caja contenedora con chips */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          minHeight: '46px',
          padding: '6px 10px',
          border: isOpen ? '1.5px solid var(--buap-cyan-306, #00A3E0)' : '1px solid #CBD5E1',
          borderRadius: '8px',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          boxShadow: isOpen ? '0 0 0 3px rgba(0, 163, 224, 0.12)' : 'none',
          transition: 'all 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
        onClick={() => inputRef.current && inputRef.current.focus()}
      >
        {/* Renderizado de Chips de Palabras Clave */}
        {selectedKeywords.map((kw, index) => (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
              borderRadius: '20px',
              padding: '4px 10px 4px 10px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-source, sans-serif)',
              userSelect: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <IconTag size={12} color="#2563EB" />
            <span>{kw}</span>

            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveKeyword(index);
                }}
                title={`Eliminar palabra clave "${kw}"`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1E40AF',
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 64, 175, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Input para escribir palabras clave */}
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
          placeholder={selectedKeywords.length === 0 ? "Escribe una palabra clave y presiona Enter..." : "Agregar otra palabra clave..."}
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
      </div>

      {/* Menú de sugerencias flotante */}
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
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '4px 0'
          }}
        >
          {suggestions.length > 0 && (
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
                Sugerencias temáticas BUAP:
              </div>

              {suggestions.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => handleAddKeyword(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      backgroundColor: isSelected ? 'rgba(0, 163, 224, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--buap-cyan-306, #00A3E0)' : '3px solid transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <IconTag size={13} color="#64748B" style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    <span>{item}</span>
                  </div>
                );
              })}
            </>
          )}

          {/* Opción de agregar personalizada */}
          {inputValue.trim() && (
            <div
              onClick={() => handleAddKeyword(inputValue.trim())}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #E2E8F0',
                cursor: 'pointer',
                backgroundColor: highlightedIndex === suggestions.length ? '#F8FAFC' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
                color: 'var(--buap-blue-302, #003B5C)',
                fontWeight: 600
              }}
            >
              <IconPlus size={14} color="var(--buap-blue-302, #003B5C)" />
              <span>Presiona Enter para agregar: <strong>"{inputValue.trim()}"</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
