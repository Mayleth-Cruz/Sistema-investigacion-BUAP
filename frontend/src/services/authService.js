import { apiPost, apiGet } from './api';

const TOKEN_KEY = 'buap_auth_token';
const USER_KEY = 'buap_auth_user';

/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN INSTITUCIONAL (authService.js)
 * ============================================================================
 * Maneja el ciclo de vida de la sesión administrativa:
 * - Inicio de sesión contra el backend en PHP (/api/auth/login).
 * - Almacenamiento seguro del token de sesión y perfil de usuario.
 * - Comprobación de rol de Administrador.
 * - Cierre de sesión y limpieza de credenciales locales.
 */
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
      
      // Verificación de rol en cliente (además de la realizada por el backend)
      if (user.rol !== 'administrador' && user.rol !== 'admin') {
        return {
          success: false,
          message: 'Acceso denegado: Esta área está restringida exclusivamente para personal con rol de Administrador.'
        };
      }

      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return {
        success: true,
        user: user,
        token: res.data.token,
        message: res.message || 'Bienvenido al panel de administración.'
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
   */
  isAuthenticated() {
    const user = this.getCurrentUser();
    const token = this.getToken();
    return Boolean(token && user && (user.rol === 'administrador' || user.rol === 'admin'));
  }
};
