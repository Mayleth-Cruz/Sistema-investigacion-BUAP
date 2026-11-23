import { describe, it, expect, vi } from 'vitest'
import {
  apiDeleteStrict, apiDelete, apiGet, apiPost, apiPut,
  SESSION_EXPIRED_EVENT, PASSWORD_CHANGE_EVENT
} from './api'
import { mockFetch, jsonResponse } from '../test/mockFetch'

describe('apiDeleteStrict', () => {
  it('devuelve success true con el mensaje del servidor si la respuesta es correcta', async () => {
    const f = mockFetch([{ method: 'DELETE', match: '/eje3/egresados/4', body: { success: true, message: 'Eliminado' } }])
    const res = await apiDeleteStrict('/eje3/egresados/4')
    expect(res).toEqual({ success: true, message: 'Eliminado' })
    expect(f.calls[0].method).toBe('DELETE')
    expect(f.calls[0].url).toMatch(/\/eje3\/egresados\/4$/)
  })

  it('devuelve success false con el mensaje si el servidor responde con error', async () => {
    mockFetch([{ method: 'DELETE', match: '/x/1', status: 404, body: { success: false, message: 'No existe' } }])
    const res = await apiDeleteStrict('/x/1')
    expect(res.success).toBe(false)
    expect(res.message).toBe('No existe')
  })

  it('devuelve success false con mensaje genérico si la respuesta no es JSON', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => { throw new Error('no json') } })
    const res = await apiDeleteStrict('/x/1')
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/no se pudo eliminar/i)
  })

  it('devuelve success false ante un error de red', async () => {
    mockFetch([{ method: 'DELETE', match: '/x/1', error: true }])
    const res = await apiDeleteStrict('/x/1')
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/servidor/i)
  })

  it('envía el token Bearer guardado en localStorage', async () => {
    localStorage.setItem('buap_auth_token', 'tok123')
    const f = mockFetch([{ method: 'DELETE', match: '/x/1', body: { success: true } }])
    await apiDeleteStrict('/x/1')
    expect(f.calls[0].headers.Authorization).toBe('Bearer tok123')
  })

  it('apiDelete conserva su comportamiento anterior (simula éxito ante fallos)', async () => {
    mockFetch([{ method: 'DELETE', match: '/x/1', error: true }])
    const res = await apiDelete('/x/1')
    expect(res.success).toBe(true)
    expect(res.isMock).toBe(true)
  })

  it('apiGet devuelve el fallback ante un fallo', async () => {
    mockFetch([{ match: '/x', status: 401, body: { success: false } }])
    expect(await apiGet('/x', null)).toBeNull()
    expect(jsonResponse({}).ok).toBe(true)
  })
})

describe('api · sesión expirada (401 con token)', () => {
  const escuchar = (evento) => {
    const handler = vi.fn()
    window.addEventListener(evento, handler)
    return { handler, off: () => window.removeEventListener(evento, handler) }
  }
  const sesion = () => {
    localStorage.setItem('buap_auth_token', 'tok-vencido')
    localStorage.setItem('buap_auth_user', JSON.stringify({ id: 1, rol: 'investigador' }))
  }

  it('apiGet con token y 401 limpia la sesión, emite el evento y conserva el fallback', async () => {
    sesion()
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([{ match: '/docente/resumen', status: 401, body: { success: false, message: 'Sesión inválida' } }])
    expect(await apiGet('/docente/resumen', null)).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('buap_auth_token')).toBeNull()
    expect(localStorage.getItem('buap_auth_user')).toBeNull()
    off()
  })

  it('apiPost, apiPut y apiDeleteStrict con token y 401 también lo emiten sin cambiar su resultado', async () => {
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([
      { method: 'POST', match: '/x', status: 401, body: { success: false, message: 'No autorizado' } },
      { method: 'PUT', match: '/x', status: 401, body: { success: false, message: 'No autorizado' } },
      { method: 'DELETE', match: '/x', status: 401, body: { success: false, message: 'No autorizado' } }
    ])
    sesion()
    const post = await apiPost('/x', {})
    expect(post).toMatchObject({ success: false, message: 'No autorizado' })
    sesion()
    const put = await apiPut('/x', {})
    expect(put).toMatchObject({ success: false, message: 'No autorizado' })
    sesion()
    const del = await apiDeleteStrict('/x')
    expect(del).toMatchObject({ success: false, message: 'No autorizado' })
    expect(handler).toHaveBeenCalledTimes(3)
    off()
  })

  it('peticiones en paralelo con el mismo token emiten el evento una sola vez', async () => {
    sesion()
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([{ match: '/docente', status: 401, body: { success: false } }])
    await Promise.all([apiGet('/docente/a', null), apiGet('/docente/b', null), apiGet('/docente/c', null)])
    expect(handler).toHaveBeenCalledTimes(1)
    off()
  })

  it('sin token un 401 no emite el evento (login fallido)', async () => {
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([{ method: 'POST', match: '/auth/login', status: 401, body: { success: false, message: 'Credenciales incorrectas' } }])
    const res = await apiPost('/auth/login', { correo: 'a@b.mx', password: 'x' })
    expect(res).toMatchObject({ success: false, message: 'Credenciales incorrectas' })
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('un login fallido con un token viejo guardado no cierra esa sesión ni emite el evento', async () => {
    sesion()
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([{ method: 'POST', match: '/auth/login', status: 401, body: { success: false, message: 'Credenciales incorrectas' } }])
    await apiPost('/auth/login', { correo: 'a@b.mx', password: 'x' })
    expect(handler).not.toHaveBeenCalled()
    expect(localStorage.getItem('buap_auth_token')).toBe('tok-vencido')
    off()
  })

  it('un 401 al cerrar sesión no se trata como expiración', async () => {
    sesion()
    const { handler, off } = escuchar(SESSION_EXPIRED_EVENT)
    mockFetch([{ method: 'POST', match: '/auth/logout', status: 401, body: { success: false } }])
    await apiPost('/auth/logout')
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('otros errores (403 sin código, 404, 500) no emiten ningún evento ni borran la sesión', async () => {
    sesion()
    const exp = escuchar(SESSION_EXPIRED_EVENT)
    const pwd = escuchar(PASSWORD_CHANGE_EVENT)
    mockFetch([
      { match: '/a', status: 403, body: { success: false, message: 'Prohibido' } },
      { match: '/b', status: 404, body: { success: false } },
      { match: '/c', status: 500, body: { success: false } }
    ])
    await apiGet('/a', null)
    await apiGet('/b', null)
    await apiGet('/c', null)
    expect(exp.handler).not.toHaveBeenCalled()
    expect(pwd.handler).not.toHaveBeenCalled()
    expect(localStorage.getItem('buap_auth_token')).toBe('tok-vencido')
    exp.off()
    pwd.off()
  })
})

describe('api · cambio de contraseña obligatorio (403 con código)', () => {
  const cuerpo = { success: false, message: 'Debes cambiar tu contraseña temporal antes de continuar.', errors: { codigo: ['cambio_password_obligatorio'] } }

  it('apiGet y apiPost emiten el evento y conservan su resultado', async () => {
    localStorage.setItem('buap_auth_token', 'tok')
    const handler = vi.fn()
    window.addEventListener(PASSWORD_CHANGE_EVENT, handler)
    mockFetch([
      { match: '/docente/resumen', status: 403, body: cuerpo },
      { method: 'POST', match: '/docente/proyectos', status: 403, body: cuerpo }
    ])
    expect(await apiGet('/docente/resumen', null)).toBeNull()
    const post = await apiPost('/docente/proyectos', {})
    expect(post.success).toBe(false)
    expect(post.errors).toEqual({ codigo: ['cambio_password_obligatorio'] })
    expect(handler).toHaveBeenCalledTimes(2)
    // el 403 no cierra la sesión
    expect(localStorage.getItem('buap_auth_token')).toBe('tok')
    window.removeEventListener(PASSWORD_CHANGE_EVENT, handler)
  })
})
