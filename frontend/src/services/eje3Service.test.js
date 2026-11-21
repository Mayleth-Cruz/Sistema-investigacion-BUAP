import { describe, it, expect } from 'vitest'
import { eje3Service, buildQuery, formatApiErrors, EJE3_LOAD_ERROR } from './eje3Service'
import { mockFetch } from '../test/mockFetch'

const ok = (data) => ({ success: true, data })

describe('buildQuery', () => {
  it('omite valores vacíos y codifica el resto', () => {
    expect(buildQuery({ tipo: 'semillero', search: '', estado: undefined, q: null })).toBe('?tipo=semillero')
    expect(buildQuery({ search: 'a b' })).toBe('?search=a+b')
    expect(buildQuery({})).toBe('')
    expect(buildQuery()).toBe('')
  })
})

describe('formatApiErrors', () => {
  it('aplana errores en formato objeto {campo:[mensajes]}', () => {
    const msgs = formatApiErrors({ message: 'Validación', errors: { titulo: ['Obligatorio'], correo: ['Inválido', 'Muy largo'] } })
    expect(msgs).toEqual(['Obligatorio', 'Inválido', 'Muy largo'])
  })
  it('acepta errores como arreglo y elimina duplicados', () => {
    expect(formatApiErrors({ errors: ['A', 'A', 'B'] })).toEqual(['A', 'B'])
  })
  it('usa el mensaje general cuando no hay detalle', () => {
    expect(formatApiErrors({ message: 'Fallo' })).toEqual(['Fallo'])
    expect(formatApiErrors({ errors: {} })).toEqual(['No se pudo completar la operación.'])
    expect(formatApiErrors(null)).toEqual(['Ocurrió un error inesperado.'])
  })
})

describe('eje3Service: lecturas', () => {
  it('getCatalogos usa /eje3/catalogos y devuelve data', async () => {
    const f = mockFetch([{ match: '/eje3/catalogos', body: ok({ eventos: 4 }) }])
    expect(await eje3Service.getCatalogos()).toEqual({ eventos: 4 })
    expect(f.calls[0].url).toMatch(/\/eje3\/catalogos$/)
  })

  it('resources.list envía filtros fijos y de búsqueda como parámetros', async () => {
    const f = mockFetch([{ match: '/eje3/proyectos', body: ok([{ id: 1 }]) }])
    const crud = eje3Service.crud('/eje3/proyectos')
    const rows = await crud.list({ tipo: 'semillero', search: 'ia', evento_id: '' })
    expect(rows).toEqual([{ id: 1 }])
    expect(f.calls[0].url).toMatch(/\/eje3\/proyectos\?tipo=semillero&search=ia$/)
  })

  it('getEventos/getEvento/getDocentes/getMonitoreo/getVisualizar/getDifusion/getDifusionEvento construyen rutas correctas', async () => {
    const f = mockFetch([{ match: /.*/, body: ok({}) }])
    await eje3Service.getEventos({ tipo: 'congreso', estado: 'programado' })
    await eje3Service.getEvento(3)
    await eje3Service.getDocentes({ snii: 'en_snii', search: 'ana' })
    await eje3Service.getMonitoreo()
    await eje3Service.getVisualizar()
    await eje3Service.getDifusion()
    await eje3Service.getDifusionEvento(9)
    await eje3Service.getInvestigadores()
    const urls = f.calls.map((c) => c.url.replace(/^.*\/api/, ''))
    expect(urls).toEqual([
      '/eje3/eventos?tipo=congreso&estado=programado',
      '/eje3/eventos/3',
      '/eje3/docentes?snii=en_snii&search=ana',
      '/eje3/monitoreo',
      '/eje3/visualizar',
      '/eje3/difusion',
      '/eje3/difusion/eventos/9',
      '/investigadores'
    ])
  })

  it('devuelve null (sin datos falsos) si el backend falla o responde 401', async () => {
    mockFetch([{ match: '/eje3/monitoreo', status: 401, body: { success: false } }, { match: '/eje3/visualizar', error: true }])
    expect(await eje3Service.getMonitoreo()).toBeNull()
    expect(await eje3Service.getVisualizar()).toBeNull()
    expect(EJE3_LOAD_ERROR).toMatch(/sesión siga activa/)
  })

  it('envía el token Bearer en las lecturas autenticadas', async () => {
    localStorage.setItem('buap_auth_token', 'abc')
    const f = mockFetch([{ match: '/eje3/catalogos', body: ok({}) }])
    await eje3Service.getCatalogos()
    expect(f.calls[0].headers.Authorization).toBe('Bearer abc')
  })
})

describe('eje3Service: escrituras', () => {
  it('createEvento hace POST con el cuerpo y devuelve success', async () => {
    const f = mockFetch([{ method: 'POST', match: '/eje3/eventos', body: { success: true, data: { id: 7 }, message: 'Creado' } }])
    const res = await eje3Service.createEvento({ nombre: 'E', tipo: 'congreso' })
    expect(res.success).toBe(true)
    expect(res.data.id).toBe(7)
    expect(f.calls[0].body).toEqual({ nombre: 'E', tipo: 'congreso' })
  })

  it('updateEvento hace PUT a /eje3/eventos/:id', async () => {
    const f = mockFetch([{ method: 'PUT', match: '/eje3/eventos/7', body: { success: true, data: {} } }])
    await eje3Service.updateEvento(7, { publico: 0 })
    expect(f.calls[0].method).toBe('PUT')
    expect(f.calls[0].url).toMatch(/\/eje3\/eventos\/7$/)
  })

  it('devuelve errores de validación del backend en formato objeto', async () => {
    mockFetch([{ method: 'POST', match: '/eje3/egresados', status: 422, body: { success: false, message: 'Datos inválidos', errors: { tipo: ['Tipo inválido'] } } }])
    const res = await eje3Service.crud('/eje3/egresados').create({})
    expect(res.success).toBe(false)
    expect(formatApiErrors(res)).toEqual(['Tipo inválido'])
  })

  it('updateSnii hace PUT a /eje3/docentes/:id/snii', async () => {
    const f = mockFetch([{ method: 'PUT', match: '/eje3/docentes/5/snii', body: { success: true, data: {} } }])
    const res = await eje3Service.updateSnii(5, { snii_nivel: 'II', snii_elegible: 0 })
    expect(res.success).toBe(true)
    expect(f.calls[0].body).toEqual({ snii_nivel: 'II', snii_elegible: 0 })
  })

  it('deleteEvento usa DELETE estricto y reporta el fallo real', async () => {
    mockFetch([{ method: 'DELETE', match: '/eje3/eventos/2', status: 500, body: { success: false, message: 'Error interno' } }])
    const res = await eje3Service.deleteEvento(2)
    expect(res.success).toBe(false)
    expect(res.message).toBe('Error interno')
  })

  it('crud.remove con éxito confirma', async () => {
    mockFetch([{ method: 'DELETE', match: '/eje3/participantes/1', body: { success: true, message: 'Eliminado' } }])
    expect((await eje3Service.crud('/eje3/participantes').remove(1)).success).toBe(true)
  })

  it('error de red en escritura devuelve success false', async () => {
    mockFetch([{ method: 'POST', match: '/eje3/eventos', error: true }])
    const res = await eje3Service.createEvento({})
    expect(res.success).toBe(false)
  })
})

describe('eje3Service · revisión y cuentas de docentes', () => {
  it('revision() consulta GET /eje3/revision y devuelve null si falla', async () => {
    const f = mockFetch([{ match: '/eje3/revision', body: { success: true, data: { pendientes: 2, proyectos: [{ id: 1 }, { id: 2 }] } } }])
    expect(await eje3Service.revision()).toEqual({ pendientes: 2, proyectos: [{ id: 1 }, { id: 2 }] })
    expect(f.calls[0].url).toMatch(/\/eje3\/revision$/)
    mockFetch([{ match: '/eje3/revision', error: true }])
    expect(await eje3Service.revision()).toBeNull()
  })

  it('revisar(id, ...) hace POST /eje3/proyectos/:id/revision con accion y comentario', async () => {
    const f = mockFetch([{ method: 'POST', match: '/eje3/proyectos/4/revision', body: { success: true, data: { id: 4, registro_estado: 'devuelto' } } }])
    const res = await eje3Service.revisar(4, { accion: 'devolver', comentario: 'Falta metodología' })
    expect(res.success).toBe(true)
    expect(f.calls[0].body).toEqual({ accion: 'devolver', comentario: 'Falta metodología' })
    await eje3Service.revisar(4, { accion: 'aprobar' })
    expect(f.calls[1].body).toEqual({ accion: 'aprobar', comentario: '' })
  })

  it('usuariosDocentes: list con búsqueda, create, restablecer y setActivo', async () => {
    const f = mockFetch([
      { match: '/eje3/usuarios-docentes', body: { success: true, data: [{ id: 7 }] } },
      { method: 'POST', match: /\/eje3\/usuarios-docentes$/, status: 201, body: { success: true, data: { id: 8, password_temporal: 'Abc234xyz789' } } },
      { method: 'POST', match: '/eje3/usuarios-docentes/7/restablecer', body: { success: true, data: { id: 7, password_temporal: 'Zzz234xyz789' } } },
      { method: 'PUT', match: '/eje3/usuarios-docentes/7', body: { success: true, data: { id: 7, activo: 0 } } }
    ])
    expect(await eje3Service.usuariosDocentes.list({ search: 'ana' })).toEqual([{ id: 7 }])
    expect(f.calls[0].url).toMatch(/\/eje3\/usuarios-docentes\?search=ana$/)
    const creada = await eje3Service.usuariosDocentes.create({ investigador_id: 3, correo: 'a@buap.mx' })
    expect(creada.data.password_temporal).toBe('Abc234xyz789')
    expect(f.calls[1].body).toEqual({ investigador_id: 3, correo: 'a@buap.mx' })
    const reset = await eje3Service.usuariosDocentes.restablecer(7)
    expect(reset.data.password_temporal).toBe('Zzz234xyz789')
    await eje3Service.usuariosDocentes.setActivo(7, false)
    expect(f.calls[3].body).toEqual({ activo: 0 })
    await eje3Service.usuariosDocentes.setActivo(7, true)
    expect(f.calls[4].body).toEqual({ activo: 1 })
  })

  it('formatApiErrors ignora el identificador interno "codigo" y usa el mensaje', () => {
    expect(formatApiErrors({ message: 'El proyecto está bloqueado.', errors: { codigo: ['proyecto_bloqueado'] } }))
      .toEqual(['El proyecto está bloqueado.'])
    expect(formatApiErrors({ message: 'x', errors: { codigo: ['c'], titulo: ['El título es obligatorio.'] } }))
      .toEqual(['El título es obligatorio.'])
  })
})
