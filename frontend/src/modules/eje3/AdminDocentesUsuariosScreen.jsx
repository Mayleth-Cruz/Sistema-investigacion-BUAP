import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { IconPlus, IconSearch, IconCopy, IconKey } from '../../components/Icons';
import { eje3Service, formatApiErrors, EJE3_LOAD_ERROR } from '../../services/eje3Service';
import {
  Eje3Notice,
  Eje3ErrorList,
  Eje3ModalShell,
  Eje3PageHeader,
  Eje3TableMessage,
  Eje3ConfirmModal
} from './Eje3Common';
import { useEje3Data, useDebounced, formatNumber } from './eje3Hooks';
import { formatFecha } from './registroConfig';

/**
 * ============================================================================
 * SCREEN: DOCENTES · USUARIOS DOCENTES (AdminDocentesUsuariosScreen)
 * ============================================================================
 * El administrador crea las cuentas de los docentes (ligadas a una ficha de
 * investigador), restablece su contraseña y activa/desactiva el acceso. La
 * contraseña temporal se muestra UNA sola vez en un cuadro copiable.
 */
export default function AdminDocentesUsuariosScreen({ onNavigate, showToast }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const [creating, setCreating] = useState(false);
  const [toReset, setToReset] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);
  const [confirmState, setConfirmState] = useState({ busy: false, errors: [] });
  const [temporal, setTemporal] = useState(null); // { nombre, correo, password }
  const [actionError, setActionError] = useState('');

  const { data: rows, loading, failed, reload } = useEje3Data(
    () => eje3Service.usuariosDocentes.list({ search: debouncedSearch }),
    [debouncedSearch]
  );
  const list = Array.isArray(rows) ? rows : [];

  const showTemporal = (data, fallback = {}) => {
    setTemporal({
      nombre: data.nombre || data.investigador_nombre || fallback.nombre || '',
      correo: data.correo || fallback.correo || '',
      password: data.password_temporal
    });
  };

  const confirmReset = async () => {
    setConfirmState({ busy: true, errors: [] });
    const res = await eje3Service.usuariosDocentes.restablecer(toReset.id);
    if (!res || !res.success || !res.data) {
      setConfirmState({ busy: false, errors: formatApiErrors(res) });
      return;
    }
    const user = toReset;
    setToReset(null);
    setConfirmState({ busy: false, errors: [] });
    showTemporal(res.data, { nombre: user.nombre, correo: user.correo });
    reload();
  };

  const setActivo = async (row, activo) => {
    setActionError('');
    const res = await eje3Service.usuariosDocentes.setActivo(row.id, activo);
    if (!res || !res.success) {
      return formatApiErrors(res);
    }
    if (showToast) showToast(activo ? `Cuenta de ${row.nombre} activada.` : `Cuenta de ${row.nombre} desactivada.`);
    reload();
    return null;
  };

  const handleToggle = async (row) => {
    if (Number(row.activo) === 1) {
      setConfirmState({ busy: false, errors: [] });
      setToDeactivate(row);
      return;
    }
    const errs = await setActivo(row, true);
    if (errs) setActionError(errs.join(' '));
  };

  const confirmDeactivate = async () => {
    setConfirmState({ busy: true, errors: [] });
    const errs = await setActivo(toDeactivate, false);
    if (errs) {
      setConfirmState({ busy: false, errors: errs });
      return;
    }
    setToDeactivate(null);
    setConfirmState({ busy: false, errors: [] });
  };

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar activeNav="docentes-usuarios" onNavigate={onNavigate} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Usuarios docentes"
          subtitle="Cuentas de acceso de los docentes para registrar sus proyectos."
        >
          <button type="button" className="btn" onClick={() => setCreating(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <IconPlus size={14} />
            <span>Crear cuenta</span>
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
                aria-label="Buscar cuentas de docentes"
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="muted" style={{ fontSize: '13px', margin: '0 0 12px' }} aria-live="polite">
            {failed ? '' : loading && rows === null ? 'Cargando...' : `${list.length} ${list.length === 1 ? 'cuenta' : 'cuentas'}`}
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Contraseña</th>
                  <th>Último acceso</th>
                  <th>Proyectos</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows === null ? (
                  <Eje3TableMessage colSpan={7}>Cargando cuentas...</Eje3TableMessage>
                ) : failed ? (
                  <Eje3TableMessage colSpan={7}>No hay información disponible.</Eje3TableMessage>
                ) : list.length === 0 ? (
                  <Eje3TableMessage colSpan={7}>No se encontraron cuentas de docentes.</Eje3TableMessage>
                ) : (
                  list.map((u) => {
                    const activo = Number(u.activo) === 1;
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{u.investigador_nombre || u.nombre}</td>
                        <td>{u.correo}</td>
                        <td>
                          <span className={`tag docente-estado ${activo ? 'docente-estado-aprobado' : 'docente-estado-devuelto'}`}>
                            {activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td>
                          {Number(u.debe_cambiar_password) === 1 ? (
                            <span className="tag docente-estado docente-estado-enviado">Temporal</span>
                          ) : (
                            <span className="muted">Propia</span>
                          )}
                        </td>
                        <td>{u.ultimo_acceso ? formatFecha(u.ultimo_acceso) : 'Nunca'}</td>
                        <td>{formatNumber(u.total_proyectos)}</td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="eje3-link-btn"
                            onClick={() => {
                              setConfirmState({ busy: false, errors: [] });
                              setToReset(u);
                            }}
                            aria-label={`Restablecer contraseña de ${u.nombre}`}
                          >
                            Restablecer contraseña
                          </button>
                          <span style={{ color: '#8A9794', margin: '0 8px' }}>·</span>
                          <button
                            type="button"
                            className={`eje3-link-btn${activo ? ' eje3-link-danger' : ''}`}
                            onClick={() => handleToggle(u)}
                            aria-label={`${activo ? 'Desactivar' : 'Activar'} cuenta de ${u.nombre}`}
                          >
                            {activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creating && (
        <CrearCuentaModal
          cuentas={list}
          onClose={() => setCreating(false)}
          onCreated={(data, fallback) => {
            setCreating(false);
            showTemporal(data, fallback);
            reload();
          }}
        />
      )}

      {toReset && (
        <Eje3ConfirmModal
          title="Restablecer contraseña"
          tone="primary"
          confirmLabel="Generar contraseña temporal"
          busyLabel="Generando..."
          message={`Se generará una nueva contraseña temporal para ${toReset.nombre}. Se cerrarán todas sus sesiones y deberá cambiarla en su próximo ingreso.`}
          busy={confirmState.busy}
          errors={confirmState.errors}
          onConfirm={confirmReset}
          onCancel={() => setToReset(null)}
        />
      )}

      {toDeactivate && (
        <Eje3ConfirmModal
          title="Desactivar cuenta"
          label="Desactivar cuenta"
          confirmLabel="Desactivar"
          busyLabel="Desactivando..."
          message={`${toDeactivate.nombre} perderá el acceso y se cerrarán sus sesiones. Sus proyectos se conservan.`}
          busy={confirmState.busy}
          errors={confirmState.errors}
          onConfirm={confirmDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}

      {temporal && <PasswordTemporalModal data={temporal} onClose={() => setTemporal(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * MODAL: crear cuenta (docente sin cuenta + correo opcional)
 * ------------------------------------------------------------------------- */
function CrearCuentaModal({ cuentas, onClose, onCreated }) {
  const { data: investigadores, loading, failed } = useEje3Data(() => eje3Service.getInvestigadores(), []);
  const [investigadorId, setInvestigadorId] = useState('');
  const [correo, setCorreo] = useState('');
  const [correoEditado, setCorreoEditado] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const conCuenta = new Set(cuentas.map((c) => String(c.investigador_id)));
  const disponibles = (Array.isArray(investigadores) ? investigadores : []).filter(
    (i) => !conCuenta.has(String(i.id))
  );
  const seleccionado = disponibles.find((i) => String(i.id) === String(investigadorId)) || null;

  const handleSelect = (value) => {
    setInvestigadorId(value);
    if (!correoEditado) {
      const inv = disponibles.find((i) => String(i.id) === String(value));
      setCorreo(inv && inv.correo ? inv.correo : '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    if (!investigadorId) {
      setErrors(['Selecciona al docente para crear su cuenta.']);
      return;
    }
    const cleanCorreo = correo.trim();
    if (cleanCorreo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCorreo)) {
      setErrors(['Ingresa un correo con formato válido.']);
      return;
    }
    setSaving(true);
    try {
      const body = { investigador_id: Number(investigadorId) };
      if (cleanCorreo) body.correo = cleanCorreo;
      const res = await eje3Service.usuariosDocentes.create(body);
      if (!res || !res.success || !res.data) {
        setErrors(formatApiErrors(res));
        return;
      }
      onCreated(res.data, {
        nombre: seleccionado ? seleccionado.nombre_completo : '',
        correo: cleanCorreo
      });
    } catch {
      setErrors(['Ocurrió un error al crear la cuenta. Intenta de nuevo.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Eje3ModalShell
      title="Crear cuenta de docente"
      subtitle="Se generará una contraseña temporal que el docente deberá cambiar al ingresar."
      onClose={onClose}
      maxWidth="560px"
    >
      <Eje3ErrorList messages={errors} />
      {failed && <Eje3Notice style={{ marginBottom: '16px' }}>No se pudo cargar la lista de docentes.</Eje3Notice>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="docente-form-stack">
          <div>
            <label htmlFor="docente-nueva-ficha">Docente <span style={{ color: '#EF4444' }}>*</span></label>
            <select
              id="docente-nueva-ficha"
              value={investigadorId}
              onChange={(e) => handleSelect(e.target.value)}
              disabled={loading}
            >
              <option value="">{loading ? 'Cargando docentes...' : 'Selecciona un docente sin cuenta'}</option>
              {disponibles.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre_completo}</option>
              ))}
            </select>
            {!loading && !failed && disponibles.length === 0 && (
              <span className="muted" style={{ display: 'block', marginTop: '4px', fontSize: '12.5px' }}>
                Todos los docentes registrados ya tienen cuenta.
              </span>
            )}
          </div>
          <div>
            <label htmlFor="docente-nueva-correo">Correo de acceso <span className="muted">(si se deja vacío se usa el de la ficha)</span></label>
            <input
              id="docente-nueva-correo"
              type="email"
              value={correo}
              placeholder="docente@correo.buap.mx"
              onChange={(e) => {
                setCorreo(e.target.value);
                setCorreoEditado(true);
              }}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="eje3-modal-actions">
          <button type="button" className="btn btn2" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Creando...' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </Eje3ModalShell>
  );
}

/* ---------------------------------------------------------------------------
 * MODAL: contraseña temporal (se muestra una sola vez)
 * ------------------------------------------------------------------------- */
function PasswordTemporalModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.password);
      setCopied(true);
    } catch {
      // Sin acceso al portapapeles: la persona puede seleccionar y copiar el texto
      setCopied(false);
    }
  };

  return (
    <Eje3ModalShell
      title="Contraseña temporal"
      subtitle={[data.nombre, data.correo].filter(Boolean).join(' · ')}
      onClose={onClose}
      maxWidth="520px"
      label="Contraseña temporal generada"
    >
      <Eje3Notice style={{ marginBottom: '16px' }}>
        Esta contraseña no se volverá a mostrar. Compártela de forma segura con el docente: deberá cambiarla en su primer ingreso.
      </Eje3Notice>
      <div className="docente-password-box">
        <IconKey size={18} color="#003B5C" />
        <code data-testid="password-temporal" aria-label="Contraseña temporal">{data.password}</code>
        <button type="button" className="btn btn2" onClick={copy} aria-label="Copiar contraseña">
          <IconCopy size={14} />
          <span>{copied ? 'Copiada' : 'Copiar'}</span>
        </button>
      </div>
      <div className="eje3-modal-actions">
        <button type="button" className="btn" onClick={onClose}>Entendido</button>
      </div>
    </Eje3ModalShell>
  );
}
