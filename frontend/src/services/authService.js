import { apiPost } from './api';

const TOKEN_KEY = 'buap_auth_token';
const USER_KEY = 'buap_auth_user';

/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN INSTITUCIONAL (authService.js)
 * ============================================================================
 * Maneja el ciclo de vida de la sesión institucional:
 * - Inicio de sesión contra el backend en PHP (/api/auth/login) para el
 *   Administrador y para el Docente (rol 'investigador' ligado a una ficha).
 * - Almacenamiento seguro del token de sesión y perfil de usuario.
 * - Comprobación de rol (isAdmin / isDocente).
 * - Cambio de contraseña (obligatorio en el primer ingreso del docente).
 * - Cierre de sesión y limpieza de credenciales locales.
 */

const esRolAdmin = (rol) => rol === 'administrador' || rol === 'admin';
const esRolDocente = (rol) => rol === 'investigador';

export const authService = {
  /**
   * Inicia sesión con correo institucional y contraseña.
   */
  async login(email, password) {
    const payload = {
      correo: email.trim().toLowerCase(),
      password: password
    };

    const res = await apiPost('/auth/login', payload);

    if (res.success && res.data && res.data.token) {
      const user = res.data.user;
      
      // Verificación de rol en cliente (además de la realizada por el backend):
      // solo Administrador y Docente (investigador ligado a una ficha).
      if (esRolDocente(user.rol) && !user.investigador_id) {
        return {
          success: false,
          message: 'Tu cuenta aún no está ligada a un docente. Contacta al administrador.'
        };
      }
      if (!esRolAdmin(user.rol) && !esRolDocente(user.rol)) {
        return {
          success: false,
          message: 'Acceso denegado: esta área está disponible solo para administradores y docentes.'
        };
      }

      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return {
        success: true,
        user: user,
        token: res.data.token,
        message: res.message || (esRolAdmin(user.rol) ? 'Bienvenido al panel de administración.' : 'Bienvenido a tu espacio docente.')
      };
    }

    return {
      success: false,
      message: res.message || (res.errors && res.errors[0]) || 'Credenciales de acceso incorrectas.'
    };
  },

  /**
   * Cierra la sesión activa y limpia los datos del navegador.
   */
  async logout() {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Ignorar si el backend no responde al cerrar sesión
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Devuelve el usuario actualmente autenticado o null.
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Devuelve el token Bearer activo.
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Verifica si existe una sesión administrativa activa.
   * (Se conserva con su significado original: sesión de ADMINISTRADOR.)
   */
  isAuthenticated() {
    const user = this.getCurrentUser();
    const token = this.getToken();
    return Boolean(token && user && esRolAdmin(user.rol));
  },

  /** Sesión activa de administrador. */
  isAdmin() {
    return this.isAuthenticated();
  },

  /** Sesión activa de docente (rol 'investigador' ligado a una ficha). */
  isDocente() {
    const user = this.getCurrentUser();
    const token = this.getToken();
    return Boolean(token && user && esRolDocente(user.rol) && user.investigador_id);
  },

  /** Cualquier sesión válida (administrador o docente). */
  isLoggedIn() {
    return this.isAdmin() || this.isDocente();
  },

  /** El docente debe cambiar su contraseña temporal antes de continuar. */
  mustChangePassword() {
    const user = this.getCurrentUser();
    return Boolean(this.isDocente() && user && user.debe_cambiar_password);
  },

  /**
   * Marca en el usuario guardado que el backend exige cambiar la contraseña
   * (403 'cambio_password_obligatorio'). Devuelve el usuario actualizado.
   */
  markPasswordChangeRequired() {
    return updateStoredUser({ debe_cambiar_password: true });
  },

  /**
   * Cambia la contraseña de la sesión actual (POST /auth/cambiar-password).
   * Si el backend lo confirma, el usuario guardado deja de estar obligado a
   * cambiarla. Devuelve { success, message, errors }.
   */
  async changePassword(actual, nueva) {
    const res = await apiPost('/auth/cambiar-password', { actual, nueva });
    if (res.success) {
      updateStoredUser({ debe_cambiar_password: false });
      return { success: true, message: res.message || 'Contraseña actualizada correctamente.' };
    }
    return { success: false, message: res.message, errors: res.errors };
  }
};

function updateStoredUser(patch) {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? { ...JSON.parse(raw), ...patch } : null;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}
