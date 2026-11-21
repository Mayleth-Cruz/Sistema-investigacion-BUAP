import { describe, it, expect } from 'vitest'
import { docenteService } from './docenteService'
import { mockFetch } from '../test/mockFetch'

describe('docenteService', () => {
  it('resumen: GET /docente/resumen con token y devuelve data', async () => {
    localStorage.setItem('buap_auth_token', 'tok-d')
    const f = mockFetch([{ match: '/docente/resumen', body: { success: true, data: { total_proyectos: 2 } } }])
    expect(await docenteService.resumen()).toEqual({ total_proyectos: 2 })
    expect(f.calls[0].url).toMatch(/\/docente\/resumen$/)
    expect(f.calls[0].headers.Authorization).toBe('Bearer tok-d')
  })

  it('resumen y proyectos devuelven null (sin datos falsos) si el backend falla', async () => {
    mockFetch([{ match: '/docente', error: true }])
    expect(await docenteService.resumen()).toBeNull()
    expect(await docenteService.proyectos.list()).toBeNull()
    expect(await docenteService.proyectos.get(1)).toBeNull()
  })

  it('proyectos.list arma la consulta omitiendo filtros vacíos', async () => {
    const f = mockFetch([{ match: '/docente/proyectos', body: { success: true, data: [] } }])
    await docenteService.proyectos.list({ registro_estado: 'devuelto', tipo: '', search: 'agua' })
    expect(f.calls[0].url).toMatch(/\/docente\/proyectos\?registro_estado=devuelto&search=agua$/)
    await docenteService.proyectos.list()
    expect(f.calls[1].url).toMatch(/\/docente\/proyectos$/)
  })

  it('get, create y update usan los verbos y rutas del contrato', async () => {
    const f = mockFetch([
      { match: /\/docente\/proyectos\/5$/, body: { success: true, data: { id: 5, apartados: [] } } },
      { method: 'POST', match: /\/docente\/proyectos$/, status: 201, body: { success: true, data: { id: 9 } } },
      { method: 'PUT', match: /\/docente\/proyectos\/5$/, body: { success: true, data: { id: 5 } } }
    ])
    expect(await docenteService.proyectos.get(5)).toMatchObject({ id: 5 })
    expect((await docenteService.proyectos.create({ titulo: 'T', tipo: 'investigacion' })).success).toBe(true)
    expect((await docenteService.proyectos.update(5, { titulo: 'N' })).success).toBe(true)
    expect(f.calls.map((c) => c.method)).toEqual(['GET', 'POST', 'PUT'])
    expect(f.calls[1].body).toEqual({ titulo: 'T', tipo: 'investigacion' })
  })

  it('enviar hace POST a /enviar y propaga errores de validación', async () => {
    const f = mockFetch([
      { method: 'POST', match: '/docente/proyectos/5/enviar', status: 400, body: { success: false, message: 'Faltan datos', errors: { resumen: ['El resumen es obligatorio.'] } } }
    ])
    const res = await docenteService.proyectos.enviar(5)
    expect(f.calls[0].method).toBe('POST')
    expect(res.success).toBe(false)
    expect(res.errors).toEqual({ resumen: ['El resumen es obligatorio.'] })
  })

  it('remove usa DELETE estricto: no simula éxito si el proyecto está bloqueado', async () => {
    mockFetch([{ method: 'DELETE', match: '/docente/proyectos/5', status: 409, body: { success: false, message: 'El proyecto está bloqueado.', errors: { codigo: ['proyecto_bloqueado'] } } }])
    const res = await docenteService.proyectos.remove(5)
    expect(res.success).toBe(false)
    expect(res.message).toBe('El proyecto está bloqueado.')
    mockFetch([{ method: 'DELETE', match: '/docente/proyectos/5', error: true }])
    expect((await docenteService.proyectos.remove(5)).success).toBe(false)
  })
})
