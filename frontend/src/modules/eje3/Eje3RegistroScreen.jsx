import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { IconArrowLeft, IconPlus, IconSearch, IconChevronRight } from '../../components/Icons';
import { eje3Service, EJE3_LOAD_ERROR } from '../../services/eje3Service';
import {
  CATALOGOS,
  formatCell
} from './registroConfig';
import { Eje3Notice, Eje3PageHeader, Eje3TableMessage, Eje3ConfirmModal, RegistroEstadoTag } from './Eje3Common';
import { useEje3Data, useDebounced, formatNumber } from './eje3Hooks';
import Eje3FormModal from './Eje3FormModal';

/**
 * ============================================================================
 * SCREEN: EJE 3 · REGISTRO (Eje3RegistroScreen)
 * ============================================================================
 * Hub de tarjetas con los 11 catálogos y conteos (/eje3/catalogos). Al elegir
 * un catálogo se muestra su tabla con buscador, filtros, alta/edición en
 * modal y eliminación con confirmación. Todo dirigido por registroConfig.js.
 */
export default function Eje3RegistroScreen({ onNavigate, showToast }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const catalogo = CATALOGOS.find((c) => c.key === selectedKey) || null;

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar activeNav="eje3-registro" onNavigate={onNavigate} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        {catalogo ? (
          <CatalogView
            key={catalogo.key}
            catalogo={catalogo}
            showToast={showToast}
            onBack={() => setSelectedKey(null)}
          />
        ) : (
          <RegistroHub onSelect={setSelectedKey} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * HUB DE TARJETAS
 * ------------------------------------------------------------------------- */
function RegistroHub({ onSelect, onNavigate }) {
  const { data: counts, loading, failed } = useEje3Data(() => eje3Service.getCatalogos(), []);

  const groups = [];
  CATALOGOS.forEach((c) => {
    let g = groups.find((x) => x.name === c.group);
    if (!g) {
      g = { name: c.group, items: [] };
      groups.push(g);
    }
    g.items.push(c);
  });

  return (
    <>
      <Eje3PageHeader
        title="Registro de investigación"
        subtitle="Eje 3 · Catálogos de proyectos, bases de datos, retribución social y egresados de posgrado."
      />

      {failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}

      {counts && Number(counts.proyectos_pendientes) > 0 && (
        <Eje3Notice tone="info">
          <span data-testid="aviso-pendientes">
            {Number(counts.proyectos_pendientes) === 1
              ? 'Hay 1 proyecto de docentes pendiente de revisión.'
              : `Hay ${formatNumber(counts.proyectos_pendientes)} proyectos de docentes pendientes de revisión.`}
          </span>{' '}
          {onNavigate && (
            <button type="button" className="eje3-link-btn" onClick={() => onNavigate('admin-docentes-revision')}>
              Ir a la revisión
            </button>
          )}
        </Eje3Notice>
      )}

      {groups.map((group) => (
        <section key={group.name} aria-label={group.name}>
          <h2 className="encabezado-source-black eje3-section-title">{group.name}</h2>
          <div className="eje3-hub-grid">
            {group.items.map((c) => (
              <button
                key={c.key}
                type="button"
                className="card eje3-hub-card"
                onClick={() => onSelect(c.key)}
                aria-label={`Abrir ${c.label}`}
              >
                <span className="eje3-hub-count titulo-gotham-black" data-testid={`conteo-${c.key}`}>
                  {loading ? '...' : counts && counts[c.countKey] !== undefined ? formatNumber(counts[c.countKey]) : '—'}
                </span>
                <span className="eje3-hub-label">{c.label}</span>
                <span className="muted eje3-hub-desc">{c.description}</span>
                <span className="eje3-hub-open">
                  Abrir <IconChevronRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * VISTA DE UN CATÁLOGO (tabla + modal)
 * ------------------------------------------------------------------------- */
function CatalogView({ catalogo, showToast, onBack }) {
  const crud = eje3Service.crud(catalogo.endpoint);

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const debouncedSearch = useDebounced(search, 300);

  const [modal, setModal] = useState(null); // { row } | null
  const [toDelete, setToDelete] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, errors: [] });
  const [actionError, setActionError] = useState('');

  const needsInvestigadores = catalogo.fields.some((f) => f.type === 'investigador');
  const needsEventos =
    catalogo.fields.some((f) => f.type === 'evento') || catalogo.filters.some((f) => f.type === 'evento');

  const { data: investigadores, loading: loadingInv } = useEje3Data(
    () => (needsInvestigadores ? eje3Service.getInvestigadores() : []),
    [catalogo.key]
  );
  const { data: eventos, loading: loadingEv } = useEje3Data(
    () => (needsEventos ? eje3Service.getEventos() : []),
    [catalogo.key]
  );

  const { data: rows, loading, failed, reload } = useEje3Data(
    () => crud.list({ ...catalogo.fixed, ...filterValues, search: debouncedSearch }),
    [catalogo.key, debouncedSearch, filterValues]
  );

  const list = Array.isArray(rows) ? rows : [];

  const openCreate = () => {
    setActionError('');
    setModal({ row: null });
  };

  const openEdit = async (row) => {
    setActionError('');
    const hasApartados = catalogo.fields.some((f) => f.type === 'apartados');
    if (hasApartados) {
      // Los apartados solo vienen en el detalle del proyecto
      const detail = await crud.get(row.id);
      if (!detail) {
        setActionError('No se pudo cargar el detalle del registro. Intenta de nuevo.');
        return;
      }
      setModal({ row: detail });
    } else {
      setModal({ row });
    }
  };

  const handleSubmit = (payload, isNew) =>
    isNew ? crud.create(payload) : crud.update(modal.row.id, payload);

  const handleSaved = (result, isNew) => {
    if (showToast) {
      showToast(isNew ? `Registro creado en "${catalogo.label}".` : `Registro actualizado en "${catalogo.label}".`);
    }
    reload();
  };

  const confirmDelete = async () => {
    setDeleteState({ busy: true, errors: [] });
    const res = await crud.remove(toDelete.id);
    if (!res || !res.success) {
      setDeleteState({ busy: false, errors: [(res && res.message) || 'No se pudo eliminar el registro.'] });
      return;
    }
    if (showToast) showToast(res.message || 'Registro eliminado.');
    setToDelete(null);
    setDeleteState({ busy: false, errors: [] });
    reload();
  };

  const setFilter = (name, value) =>
    setFilterValues((prev) => {
      const next = { ...prev };
      if (value === '') delete next[name];
      else next[name] = value;
      return next;
    });

  const colSpan = catalogo.columns.length + 1;

  return (
    <>
      <div>
        <button
          type="button"
          className="btn btn2"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconArrowLeft size={14} />
          <span>Volver al registro</span>
        </button>
      </div>

      <Eje3PageHeader title={catalogo.label} subtitle={catalogo.description}>
        <button type="button" className="btn" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <IconPlus size={14} />
          <span>Nuevo registro</span>
        </button>
      </Eje3PageHeader>

      {failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
      {actionError && <Eje3Notice>{actionError}</Eje3Notice>}

      <div className="card" style={{ padding: '24px' }}>
        <div className="eje3-toolbar">
          <div className="eje3-search">
            <IconSearch size={16} color="#64748B" />
            <input
              type="search"
              aria-label="Buscar en el catálogo"
              placeholder={catalogo.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {catalogo.filters.map((f) => {
            const options =
              f.type === 'evento'
                ? (Array.isArray(eventos) ? eventos : []).map((e) => ({ value: String(e.id), label: e.nombre }))
                : f.options;
            return (
              <div key={f.name} className="eje3-filter">
                <select
                  aria-label={`Filtrar por ${f.label.toLowerCase()}`}
                  value={filterValues[f.name] || ''}
                  onChange={(e) => setFilter(f.name, e.target.value)}
                >
                  <option value="">{f.label}: todos</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="muted" style={{ fontSize: '13px', margin: '0 0 12px' }} aria-live="polite">
          {failed ? '' : loading && rows === null ? 'Cargando...' : `${list.length} ${list.length === 1 ? 'registro' : 'registros'}`}
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                {catalogo.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows === null ? (
                <Eje3TableMessage colSpan={colSpan}>Cargando registros...</Eje3TableMessage>
              ) : failed ? (
                <Eje3TableMessage colSpan={colSpan}>No hay información disponible.</Eje3TableMessage>
              ) : list.length === 0 ? (
                <Eje3TableMessage colSpan={colSpan}>No se encontraron registros.</Eje3TableMessage>
              ) : (
                list.map((row) => (
                  <tr key={row.id}>
                    {catalogo.columns.map((col) => (
                      <td key={col.key} style={col.strong ? { fontWeight: 700, color: 'var(--text-dark)' } : undefined}>
                        {col.type === 'registro' ? <RegistroEstadoTag value={row[col.key]} /> : formatCell(col, row)}
                      </td>
                    ))}
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="eje3-link-btn"
                        onClick={() => openEdit(row)}
                        aria-label={`Editar ${row[catalogo.nameField] || row.id}`}
                      >
                        Editar
                      </button>
                      <span style={{ color: '#8A9794', margin: '0 8px' }}>·</span>
                      <button
                        type="button"
                        className="eje3-link-btn eje3-link-danger"
                        onClick={() => {
                          setDeleteState({ busy: false, errors: [] });
                          setToDelete(row);
                        }}
                        aria-label={`Eliminar ${row[catalogo.nameField] || row.id}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Eje3FormModal
          config={catalogo}
          row={modal.row}
          lookups={{ investigadores: loadingInv ? [] : investigadores, eventos: loadingEv ? [] : eventos }}
          onSubmit={handleSubmit}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {toDelete && (
        <Eje3ConfirmModal
          title="Eliminar registro"
          message={`¿Seguro que deseas eliminar "${toDelete[catalogo.nameField] || toDelete.id}"? Esta acción no se puede deshacer.`}
          busy={deleteState.busy}
          errors={deleteState.errors}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
