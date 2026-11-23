import React, { useState } from 'react';
import { Eje3ModalShell, Eje3ErrorList } from './Eje3Common';
import { buildInitialValues, buildPayload, missingRequired, isVisible } from './registroConfig';
import { formatApiErrors } from '../../services/eje3Service';
import { IconPlus, IconTrash } from '../../components/Icons';

/**
 * ============================================================================
 * MODAL GENÉRICO DE ALTA / EDICIÓN (Eje 3), dirigido por configuración
 * ============================================================================
 * Props:
 * - config: { singular, fields, fixed } (un catálogo de registroConfig.js)
 * - row: registro a editar (null para alta)
 * - lookups: { investigadores: [] | null, eventos: [] | null }
 * - onSubmit(payload, isNew) => Promise<{success, message, errors, data}>
 * - onSaved(result, isNew), onClose()
 */
export default function Eje3FormModal({ config, row = null, lookups = {}, onSubmit, onSaved, onClose, subtitle }) {
  const isNew = !row;
  const [values, setValues] = useState(() => buildInitialValues(config, row));
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const missing = missingRequired(config, values);
    if (missing.length > 0) {
      setErrors(missing.map((label) => `El campo "${label}" es obligatorio.`));
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(config, values, { isNew });
      const result = await onSubmit(payload, isNew);
      if (!result || !result.success) {
        setErrors(formatApiErrors(result));
        return;
      }
      if (onSaved) onSaved(result, isNew);
      onClose();
    } catch {
      setErrors(['Ocurrió un error al guardar. Intenta de nuevo.']);
    } finally {
      setSaving(false);
    }
  };

  const renderLookupSelect = (field, list, emptyLabel) => {
    const options = Array.isArray(list) ? list : [];
    const current = values[field.name];
    const known = options.some((o) => String(o.id) === String(current));
    return (
      <>
        <select
          id={`eje3f-${field.name}`}
          name={field.name}
          value={current}
          onChange={(e) => setValue(field.name, e.target.value)}
          required={field.required}
        >
          <option value="">{emptyLabel}</option>
          {current && !known && row && (
            <option value={current}>
              {(field.type === 'investigador' ? row.investigador_principal_nombre : row.evento_nombre) || `ID ${current}`}
            </option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre_completo || o.nombre}
            </option>
          ))}
        </select>
        {list === null && (
          <span style={{ display: 'block', marginTop: '4px', fontSize: '12.5px', color: '#991B1B' }}>
            No se pudo cargar la lista de opciones.
          </span>
        )}
      </>
    );
  };

  const renderApartados = (field) => {
    const items = values[field.name] || [];
    const update = (index, patch) =>
      setValue(field.name, items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    const remove = (index) => setValue(field.name, items.filter((_, i) => i !== index));
    const add = () => setValue(field.name, [...items, { apartado: '', contenido: '' }]);

    return (
      <div className="eje3-apartados">
        {items.length === 0 && (
          <p className="muted" style={{ margin: '0 0 8px', fontSize: '13.5px' }}>
            Sin apartados. Agrega secciones (título y contenido) para anexarlas al proyecto.
          </p>
        )}
        {items.map((item, index) => (
          <div key={index} className="eje3-apartado-item">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                aria-label={`Título del apartado ${index + 1}`}
                placeholder={`Título del apartado ${index + 1}`}
                value={item.apartado}
                onChange={(e) => update(index, { apartado: e.target.value })}
              />
              <button
                type="button"
                className="eje3-icon-btn"
                aria-label={`Quitar apartado ${index + 1}`}
                title="Quitar apartado"
                onClick={() => remove(index)}
              >
                <IconTrash size={16} color="#9B1C1C" />
              </button>
            </div>
            <textarea
              aria-label={`Contenido del apartado ${index + 1}`}
              placeholder="Contenido del apartado"
              rows={3}
              value={item.contenido}
              onChange={(e) => update(index, { contenido: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </div>
        ))}
        <button type="button" className="btn btn2" onClick={add} style={{ marginTop: '4px' }}>
          <IconPlus size={14} />
          <span>Agregar apartado</span>
        </button>
      </div>
    );
  };

  const renderControl = (field) => {
    const id = `eje3f-${field.name}`;
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            name={field.name}
            rows={3}
            value={values[field.name]}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'select':
        return (
          <select
            id={id}
            name={field.name}
            value={values[field.name]}
            onChange={(e) => setValue(field.name, e.target.value)}
            required={field.required}
          >
            <option value="">{field.required ? 'Selecciona una opción' : 'Sin especificar'}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'investigador':
        return renderLookupSelect(field, lookups.investigadores, 'Selecciona un docente');
      case 'evento':
        return renderLookupSelect(field, lookups.eventos, 'Sin evento');
      case 'checkbox':
        return (
          <label className="eje3-check" htmlFor={id}>
            <input
              id={id}
              name={field.name}
              type="checkbox"
              checked={Boolean(values[field.name])}
              onChange={(e) => setValue(field.name, e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        );
      case 'apartados':
        return renderApartados(field);
      default:
        return (
          <input
            id={id}
            name={field.name}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
            min={field.min}
            step={field.type === 'number' ? 'any' : undefined}
            value={values[field.name]}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Eje3ModalShell
      title={isNew ? `Nuevo ${config.singular}` : `Editar ${config.singular}`}
      subtitle={subtitle === undefined ? config.label : subtitle}
      onClose={onClose}
      maxWidth="680px"
    >
      <Eje3ErrorList messages={errors} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="eje3-form-grid">
          {config.fields.filter((field) => isVisible(field, values)).map((field) => (
            <div key={field.name} className={field.full ? 'eje3-field eje3-field-full' : 'eje3-field'}>
              {field.type !== 'checkbox' && field.type !== 'apartados' && (
                <label htmlFor={`eje3f-${field.name}`}>
                  {field.label}
                  {field.required && <span style={{ color: '#EF4444' }}> *</span>}
                  {!field.required && field.help && <span className="muted"> ({field.help})</span>}
                </label>
              )}
              {field.type === 'apartados' && (
                <label style={{ marginBottom: '8px' }}>{field.label}</label>
              )}
              {renderControl(field)}
            </div>
          ))}
        </div>

        <div className="eje3-modal-actions">
          <button type="button" className="btn btn2" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando...' : isNew ? 'Guardar' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Eje3ModalShell>
  );
}
