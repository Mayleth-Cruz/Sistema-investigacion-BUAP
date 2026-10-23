/**
 * ============================================================================
 * CLIENTE API CENTRALIZADO (api.js)
 * ============================================================================
 * Este módulo maneja todas las llamadas HTTP (fetch) hacia el backend en PHP.
 * 
 * CARACTERÍSTICA INTELIGENTE DE RESILIENCIA:
 * Intenta conectar con el backend en http://127.0.0.1:8000/api.
 * Si el servidor PHP o MySQL aún no están iniciados, conmuta de forma transparente
 * al modo de demostración (mock data) para que la interfaz nunca se quede en
 * blanco ni arroje errores insalvables.
 */

/**
 * Determina dinámicamente la URL base de la API:
 * 1. Si existe variable de entorno VITE_API_BASE_URL (ej. en Vercel/Netlify).
 * 2. Si estamos en desarrollo local (localhost o 127.0.0.1), usa http://127.0.0.1:8000/api.
 * 3. En producción en el mismo dominio (servidor PHP gratuito), usa la ruta relativa /api.
 */
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000/api';
  }
  return '/api';
};

/**
 * Normaliza la URL de documentos PDF para abrirlos tanto en local como en producción
 */
export const getDocumentUrl = (target) => {
  if (!target) return '';
  if (target.startsWith('http://') || target.startsWith('https://')) return target;
  
  if (import.meta.env.VITE_BACKEND_URL) {
    const base = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
    return `${base}${target.startsWith('/') ? '' : '/'}${target}`;
  }
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://127.0.0.1:8000${target.startsWith('/') ? '' : '/'}${target}`;
  }
  
  return target.startsWith('/') ? target : `/${target}`;
};

const API_BASE_URL = getApiBaseUrl();

// Estado de la conexión que los componentes pueden consultar
export let isBackendConnected = false;
let listeners = [];

export function subscribeToBackendStatus(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

function updateConnectionStatus(status) {
  if (isBackendConnected !== status) {
    isBackendConnected = status;
    listeners.forEach(cb => cb(status));
  }
}

/**
 * Comprueba la disponibilidad del servidor PHP llamando al endpoint /api.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos máximo

    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      updateConnectionStatus(true);
      return true;
    }
  } catch (err) {
    // Servidor apagado o inalcanzable
  }

  updateConnectionStatus(false);
  return false;
}

function getAuthHeaders(extraHeaders = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('buap_auth_token') : null;
  const headers = { 'Accept': 'application/json', ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Petición GET genérica con manejo de fallos.
 */
export async function apiGet(endpoint, fallbackData = null) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders()
    });

    if (response.ok) {
      const json = await response.json();
      updateConnectionStatus(true);
      return json.data;
    }
  } catch (err) {
    updateConnectionStatus(false);
  }

  return fallbackData;
}

/**
 * Petición POST genérica para crear recursos.
 */
export async function apiPost(endpoint, body, fallbackCreator = null) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    const json = await response.json();
    if (response.ok) {
      updateConnectionStatus(true);
      return { success: true, data: json.data, message: json.message };
    } else {
      return { 
        success: false, 
        message: json.message || 'Error en la petición.',
        errors: json.errors || [json.message] 
      };
    }
  } catch (err) {
    updateConnectionStatus(false);
    if (fallbackCreator) {
      return { success: true, data: fallbackCreator(body), isMock: true };
    }
    return { success: false, message: 'No se pudo comunicar con el servidor backend.', errors: ['No se pudo comunicar con el servidor backend.'] };
  }
}

/**
 * Petición PUT genérica para actualizar recursos.
 */
export async function apiPut(endpoint, body, fallbackUpdater = null) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    const json = await response.json();
    if (response.ok) {
      updateConnectionStatus(true);
      return { success: true, data: json.data, message: json.message };
    } else {
      return { 
        success: false, 
        message: json.message || 'Error al actualizar.',
        errors: json.errors || [json.message] 
      };
    }
  } catch (err) {
    updateConnectionStatus(false);
    if (fallbackUpdater) {
      return { success: true, data: fallbackUpdater(body), isMock: true };
    }
    return { success: false, message: 'Error de conexión al actualizar.', errors: ['Error de conexión al actualizar.'] };
  }
}

/**
 * Petición DELETE genérica.
 */
export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      updateConnectionStatus(true);
      return { success: true };
    }
  } catch (err) {
    updateConnectionStatus(false);
  }

  return { success: true, isMock: true };
}

/**
 * Petición POST para subida de archivos multipart/form-data (PDFs de investigación).
 */
export async function apiUpload(endpoint, formData) {
  try {
    // Nota: No fijamos 'Content-Type' manualmente para permitir que el navegador
    // configure automáticamente el boundary correspondiente de multipart/form-data.
    const headers = getAuthHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    const json = await response.json();
    if (response.ok) {
      updateConnectionStatus(true);
      return { success: true, data: json.data, message: json.message };
    } else {
      return { 
        success: false, 
        message: json.message || 'Error al subir el archivo.', 
        errors: json.errors || [json.message] 
      };
    }
  } catch (err) {
    updateConnectionStatus(false);
    return { 
      success: false, 
      message: 'No se pudo comunicar con el servidor backend para subir el archivo.', 
      errors: [err.message] 
    };
  }
}
