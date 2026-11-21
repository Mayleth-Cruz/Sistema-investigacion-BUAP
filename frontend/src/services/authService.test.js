import { describe, it, expect } from 'vitest'
import { authService } from './authService'
import { mockFetch } from '../test/mockFetch'

const ADMIN = { id: 1, nombre: 'Admin', correo: 'admin@buap.mx', cargo: 'Administrador', rol: 'administrador', investigador_id: null, debe_cambiar_password: 0 }
const DOCENTE = { id: 7, nombre: 'Ana Soto', correo: 'ana@buap.mx', cargo: 'PTC', rol: 'investigador', investigador_id: 3, debe_cambiar_password: 1 }

const loginRoute = (user, status = 200) => ({
  method: 'POST',
  match: '/auth/login',
  status,
  body: status === 200 ? { success: true, message: 'Bienvenido', data: { token: 'tok-1', user } } : { success: false, message: 'Credenciales incorrectas.' }
})

describe('authService.login por rol', () => {
  it('acepta al administrador y lo reconoce como admin (no docente)', async () => {
    mockFetch([loginRoute(ADMIN)])
    const res = await authService.login(' Admin@BUAP.mx ', 'admin123')
    expect(res.success).toBe(true)
    expect(authService.isAuthenticated()).toBe(true)
    expect(authService.isAdmin()).toBe(true)
    expect(authService.isDocente()).toBe(false)
    expect(authService.isLoggedIn()).toBe(true)
    expect(authService.mustChangePassword()).toBe(false)
    expect(authService.getToken()).toBe('tok-1')
  })

  it('normaliza el correo en la petición', async () => {
    const f = mockFetch([loginRoute(ADMIN)])
    await authService.login(' Admin@BUAP.mx ', 'admin123')
    expect(f.calls[0].body).toEqual({ correo: 'admin@buap.mx', password: 'admin123' })
  })

  it('acepta al docente: isAuthenticated (sesión admin) sigue siendo false', async () => {
    mockFetch([loginRoute(DOCENTE)])
    const res = await authService.login('ana@buap.mx', 'Temporal123')
    expect(res.success).toBe(true)
    expect(res.user.rol).toBe('investigador')
    expect(authService.isDocente()).toBe(true)
    expect(authService.isAdmin()).toBe(false)
    expect(authService.isAuthenticated()).toBe(false)
    expect(authService.isLoggedIn()).toBe(true)
    expect(authService.mustChangePassword()).toBe(true)
    expect(authService.getCurrentUser()).toMatchObject({ investigador_id: 3, debe_cambiar_password: 1 })
  })

  it('rechaza a un investigador sin ficha ligada y no guarda sesión', async () => {
    mockFetch([loginRoute({ ...DOCENTE, investigador_id: null })])
    const res = await authService.login('ana@buap.mx', 'Temporal123')
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/no está ligada a un docente/i)
    expect(authService.getToken()).toBeNull()
    expect(authService.isLoggedIn()).toBe(false)
  })

  it('rechaza cualquier otro rol (lector) y no guarda sesión', async () => {
    mockFetch([loginRoute({ ...ADMIN, rol: 'lector' })])
    const res = await authService.login('l@buap.mx', 'lector123')
    expect(res.success).toBe(false)
    expect(authService.getToken()).toBeNull()
    expect(authService.isLoggedIn()).toBe(false)
  })

  it('devuelve el mensaje del backend ante credenciales incorrectas', async () => {
    mockFetch([loginRoute(null, 401)])
    const res = await authService.login('a@buap.mx', 'mala-clave')
    expect(res).toEqual({ success: false, message: 'Credenciales incorrectas.' })
  })

  it('logout limpia token y usuario', async () => {
    mockFetch([loginRoute(DOCENTE), { method: 'POST', match: '/auth/logout', body: { success: true } }])
    await authService.login('ana@buap.mx', 'x1234567')
    await authService.logout()
    expect(authService.getToken()).toBeNull()
    expect(authService.getCurrentUser()).toBeNull()
    expect(authService.isLoggedIn()).toBe(false)
  })
})

describe('authService.changePassword', () => {
  const sesionDocente = () => {
    localStorage.setItem('buap_auth_token', 'tok-1')
    localStorage.setItem('buap_auth_user', JSON.stringify(DOCENTE))
  }

  it('envía actual y nueva a /auth/cambiar-password y quita la obligación guardada', async () => {
    sesionDocente()
    const f = mockFetch([{ method: 'POST', match: '/auth/cambiar-password', body: { success: true, message: 'Contraseña actualizada.' } }])
    const res = await authService.changePassword('Temporal123', 'NuevaClave456')
    expect(res).toEqual({ success: true, message: 'Contraseña actualizada.' })
    expect(f.calls[0].url).toMatch(/\/auth\/cambiar-password$/)
    expect(f.calls[0].body).toEqual({ actual: 'Temporal123', nueva: 'NuevaClave456' })
    expect(f.calls[0].headers.Authorization).toBe('Bearer tok-1')
    expect(authService.getCurrentUser().debe_cambiar_password).toBe(false)
    expect(authService.mustChangePassword()).toBe(false)
    expect(authService.isDocente()).toBe(true)
  })

  it('si el backend rechaza, devuelve los errores y conserva la obligación', async () => {
    sesionDocente()
    mockFetch([{ method: 'POST', match: '/auth/cambiar-password', status: 400, body: { success: false, message: 'Datos inválidos', errors: { actual: ['La contraseña actual es incorrecta.'] } } }])
    const res = await authService.changePassword('mala', 'NuevaClave456')
    expect(res.success).toBe(false)
    expect(res.errors).toEqual({ actual: ['La contraseña actual es incorrecta.'] })
    expect(authService.mustChangePassword()).toBe(true)
  })

  it('markPasswordChangeRequired marca la obligación en el usuario guardado', () => {
    localStorage.setItem('buap_auth_token', 'tok-1')
    localStorage.setItem('buap_auth_user', JSON.stringify({ ...DOCENTE, debe_cambiar_password: 0 }))
    expect(authService.mustChangePassword()).toBe(false)
    authService.markPasswordChangeRequired()
    expect(authService.mustChangePassword()).toBe(true)
  })
})
