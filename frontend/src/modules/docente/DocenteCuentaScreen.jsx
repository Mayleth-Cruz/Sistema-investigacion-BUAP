import React, { useState } from 'react';
import DocenteSidebar from '../../components/DocenteSidebar';
import { authService } from '../../services/authService';
import { formatApiErrors } from '../../services/eje3Service';
import { Eje3Notice, Eje3ErrorList, Eje3PageHeader } from '../eje3/Eje3Common';

export const PASSWORD_MIN = 8;

/**
 * ============================================================================
 * SCREEN: DOCENTE · MI CUENTA (DocenteCuentaScreen)
 * ============================================================================
 * Cambio de contraseña dentro de la aplicación. Si el docente entró con una
 * contraseña temporal (`obligatorio`), esta es la ÚNICA vista disponible hasta
 * que la cambie.
 */
export default function DocenteCuentaScreen({ onNavigate, showToast, user, obligatorio = false, onPasswordChanged }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const problemas = [];
    if (!actual) problemas.push('Ingresa tu contraseña actual.');
    if (!nueva) {
      problemas.push('Ingresa la nueva contraseña.');
    } else {
      if (nueva.length < PASSWORD_MIN) problemas.push(`La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      if (actual && nueva === actual) problemas.push('La nueva contraseña debe ser distinta de la actual.');
      if (nueva !== confirmar) problemas.push('La confirmación no coincide con la nueva contraseña.');
    }
    if (problemas.length > 0) {
      setErrors(problemas);
      return;
    }

    setSaving(true);
    try {
      const res = await authService.changePassword(actual, nueva);
      if (!res.success) {
        setErrors(formatApiErrors(res));
        return;
      }
      setActual('');
      setNueva('');
      setConfirmar('');
      if (showToast) showToast(res.message || 'Contraseña actualizada correctamente.');
      if (onPasswordChanged) onPasswordChanged();
    } catch {
      setErrors(['Ocurrió un error al cambiar la contraseña. Intenta de nuevo.']);
    } finally {
      setSaving(false);
    }
  };

  const tipo = mostrar ? 'text' : 'password';

  return (
    <div className="admin-layout-wrapper">
      <DocenteSidebar
        activeNav="cuenta"
        onNavigate={onNavigate}
        soloCuenta={obligatorio}
        nombre={user && user.nombre ? user.nombre : ''}
      />

      <div className="admin-content-area" style={{ maxWidth: '760px' }}>
        <Eje3PageHeader
          title="Mi cuenta"
          subtitle="Consulta tus datos de acceso y cambia tu contraseña."
        />

        {obligatorio && (
          <Eje3Notice>
            Debes cambiar tu contraseña temporal antes de continuar. Mientras no la cambies no podrás usar el resto del sistema.
          </Eje3Notice>
        )}

        {user && (
          <section className="card" aria-label="Datos de la cuenta">
            <dl className="docente-datos">
              {user.nombre && <div><dt>Nombre</dt><dd>{user.nombre}</dd></div>}
              {user.correo && <div><dt>Correo de acceso</dt><dd>{user.correo}</dd></div>}
              {user.cargo && <div><dt>Cargo</dt><dd>{user.cargo}</dd></div>}
            </dl>
          </section>
        )}

        <section className="card" aria-label="Cambiar contraseña" style={{ padding: '24px' }}>
          <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>Cambiar contraseña</h2>
          <Eje3ErrorList messages={errors} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="docente-form-stack">
              <div>
                <label htmlFor="docente-pw-actual">Contraseña actual</label>
                <input
                  id="docente-pw-actual"
                  type={tipo}
                  autoComplete="current-password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="docente-pw-nueva">Nueva contraseña</label>
                <input
                  id="docente-pw-nueva"
                  type={tipo}
                  autoComplete="new-password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                />
                <span className="muted" style={{ display: 'block', marginTop: '4px', fontSize: '12.5px' }}>
                  Mínimo {PASSWORD_MIN} caracteres y distinta de la actual.
                </span>
              </div>
              <div>
                <label htmlFor="docente-pw-confirmar">Confirmar nueva contraseña</label>
                <input
                  id="docente-pw-confirmar"
                  type={tipo}
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
              <label className="eje3-check" htmlFor="docente-pw-mostrar">
                <input
                  id="docente-pw-mostrar"
                  type="checkbox"
                  checked={mostrar}
                  onChange={(e) => setMostrar(e.target.checked)}
                />
                <span>Mostrar contraseñas</span>
              </label>
            </div>
            <div className="eje3-modal-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
