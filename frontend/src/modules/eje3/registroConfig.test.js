import { describe, it, expect } from 'vitest'
import {
  CATALOGOS,
  EVENTO_FORM,
  getCatalogo,
  formatCell,
  formatFecha,
  buildInitialValues,
  buildPayload,
  missingRequired,
  isVisible,
  REGISTRO_ESTADOS,
  labelRegistroEstado
} from './registroConfig'

const countKeysContrato = [
  'proyectos_investigacion', 'proyectos_semilleros', 'proyectos_titulacion', 'dictaminadores',
  'moderadores', 'relatores', 'dictaminadores_pyad', 'retribucion_mpymes', 'retribucion_mgt',
  'retribucion_mdge', 'egresados'
]

describe('CATALOGOS', () => {
  it('define los 11 catálogos con claves y conteos únicos del contrato', () => {
    expect(CATALOGOS).toHaveLength(11)
    expect(new Set(CATALOGOS.map((c) => c.key)).size).toBe(11)
    expect([...CATALOGOS.map((c) => c.countKey)].sort()).toEqual([...countKeysContrato].sort())
  })

  it('cada catálogo tiene endpoint, columnas, campos y metadatos completos', () => {
    CATALOGOS.forEach((c) => {
      expect(c.label, c.key).toBeTruthy()
      expect(c.description, c.key).toBeTruthy()
      expect(c.endpoint, c.key).toMatch(/^\/eje3\//)
      expect(c.columns.length, c.key).toBeGreaterThan(2)
      expect(c.fields.length, c.key).toBeGreaterThan(2)
      expect(c.nameField, c.key).toBeTruthy()
      c.columns.forEach((col) => expect(col.key && col.label).toBeTruthy())
      c.fields.forEach((f) => expect(f.name && f.label && f.type).toBeTruthy())
      c.fields.filter((f) => f.type === 'select').forEach((f) => expect(f.options.length).toBeGreaterThan(0))
    })
  })

  it('aplica los filtros fijos del contrato (tipo, rol, programa)', () => {
    const fixed = (k) => getCatalogo(k).fixed
    expect(fixed('proyectos-investigacion')).toEqual({ tipo: 'investigacion' })
    expect(fixed('proyectos-semilleros')).toEqual({ tipo: 'semillero' })
    expect(fixed('proyectos-titulacion')).toEqual({ tipo: 'titulacion' })
    expect(fixed('dictaminadores')).toEqual({ rol: 'dictaminador' })
    expect(fixed('moderadores')).toEqual({ rol: 'moderador' })
    expect(fixed('relatores')).toEqual({ rol: 'relator' })
    expect(fixed('dictaminadores-revista-pyad')).toEqual({ rol: 'dictaminador_pyad' })
    expect(fixed('retribucion-mpymes')).toEqual({ programa: 'MPYMES' })
    expect(fixed('retribucion-mgt')).toEqual({ programa: 'MGT' })
    expect(fixed('retribucion-mdge')).toEqual({ programa: 'MDGE' })
    expect(fixed('egresados')).toEqual({})
  })

  it('usa el endpoint correcto de cada recurso', () => {
    expect(getCatalogo('proyectos-semilleros').endpoint).toBe('/eje3/proyectos')
    expect(getCatalogo('relatores').endpoint).toBe('/eje3/participantes')
    expect(getCatalogo('retribucion-mgt').endpoint).toBe('/eje3/retribucion-social')
    expect(getCatalogo('egresados').endpoint).toBe('/eje3/egresados')
  })

  it('los proyectos usan selector de docente, de evento y apartados (investigación y semilleros)', () => {
    ;['proyectos-investigacion', 'proyectos-semilleros'].forEach((k) => {
      const types = getCatalogo(k).fields.map((f) => f.type)
      expect(types).toContain('investigador')
      expect(types).toContain('evento')
      expect(types).toContain('apartados')
    })
    const tit = getCatalogo('proyectos-titulacion').fields
    expect(tit.some((f) => f.name === 'articulado_civ')).toBe(true)
    expect(tit.some((f) => f.type === 'apartados')).toBe(false)
  })

  it('los campos obligatorios coinciden con el contrato', () => {
    const req = (k) => getCatalogo(k).fields.filter((f) => f.required).map((f) => f.name).sort()
    expect(req('proyectos-investigacion')).toEqual(['investigador_principal_id', 'titulo'])
    expect(req('relatores')).toEqual(['nombre_completo'])
    expect(req('retribucion-mdge')).toEqual(['actividad', 'nombre_participante', 'tipo_participante'])
    expect(req('egresados')).toEqual(['actividad', 'nombre_egresado', 'tipo'])
    expect(EVENTO_FORM.fields.filter((f) => f.required).map((f) => f.name).sort()).toEqual(['nombre', 'tipo'])
  })

  it('las opciones de enums coinciden con el contrato', () => {
    const opts = (k, n) => getCatalogo(k).fields.find((f) => f.name === n).options.map((o) => o.value)
    expect(opts('egresados', 'tipo')).toEqual(['empleo', 'emprendimiento', 'publicacion', 'posgrado', 'otro'])
    expect(opts('retribucion-mpymes', 'tipo_participante')).toEqual(['estudiante', 'profesor'])
    expect(EVENTO_FORM.fields.find((f) => f.name === 'tipo').options.map((o) => o.value)).toEqual(['semilleros', 'congreso', 'revista_pyad', 'otro'])
    expect(EVENTO_FORM.fields.find((f) => f.name === 'estado').options.map((o) => o.value)).toEqual(['programado', 'en_curso', 'concluido'])
  })

  it('getCatalogo devuelve null si no existe', () => {
    expect(getCatalogo('nada')).toBeNull()
  })
})

describe('formatCell / formatFecha', () => {
  it('formatea fechas sin desfase de zona', () => {
    expect(formatFecha('2026-03-05')).toBe('05/03/2026')
    expect(formatFecha('2026-03-05 10:00:00')).toBe('05/03/2026')
    expect(formatFecha(null)).toBe('')
  })
  it('formatea celdas por tipo', () => {
    expect(formatCell({ key: 'a', type: 'bool' }, { a: 1 })).toBe('Sí')
    expect(formatCell({ key: 'a', type: 'bool' }, { a: 0 })).toBe('No')
    expect(formatCell({ key: 'a', type: 'date' }, { a: null })).toBe('—')
    expect(formatCell({ key: 'a', type: 'count' }, { a: null })).toBe('0')
    expect(formatCell({ key: 'a', type: 'enum', options: [{ value: 'x', label: 'Equis' }] }, { a: 'x' })).toBe('Equis')
    expect(formatCell({ key: 'a' }, { a: '' })).toBe('—')
    expect(formatCell({ key: 'a' }, { a: 'hola' })).toBe('hola')
  })
})

describe('formularios', () => {
  const inv = getCatalogo('proyectos-investigacion')

  it('buildInitialValues para alta usa valores por defecto', () => {
    const v = buildInitialValues(inv)
    expect(v.estado).toBe('en_ejecucion')
    expect(v.titulo).toBe('')
    expect(v.apartados).toEqual([])
    const part = buildInitialValues(getCatalogo('relatores'))
    expect(part.activo).toBe(true)
  })

  it('buildInitialValues para edición mapea el registro', () => {
    const v = buildInitialValues(inv, {
      titulo: 'T', investigador_principal_id: 4, evento_id: null, fecha_inicio: '2026-01-02 00:00:00',
      apartados: [{ id: 1, apartado: 'Intro', contenido: 'C', orden: 0 }]
    })
    expect(v.titulo).toBe('T')
    expect(v.investigador_principal_id).toBe('4')
    expect(v.evento_id).toBe('')
    expect(v.fecha_inicio).toBe('2026-01-02')
    expect(v.apartados).toEqual([{ apartado: 'Intro', contenido: 'C' }])
  })

  it('missingRequired detecta vacíos', () => {
    expect(missingRequired(inv, buildInitialValues(inv))).toEqual(['Título del proyecto', 'Docente / investigador principal'])
    expect(missingRequired(inv, { ...buildInitialValues(inv), titulo: 'x', investigador_principal_id: '2' })).toEqual([])
  })

  it('buildPayload en alta incluye filtros fijos, convierte tipos y omite vacíos opcionales', () => {
    const v = { ...buildInitialValues(inv), titulo: ' Mi proyecto ', investigador_principal_id: '3', presupuesto: '1500.5', apartados: [{ apartado: ' A ', contenido: ' c ' }, { apartado: '', contenido: 'x' }] }
    const p = buildPayload(inv, v, { isNew: true })
    expect(p.tipo).toBe('investigacion')
    expect(p.titulo).toBe('Mi proyecto')
    expect(p.investigador_principal_id).toBe(3)
    expect(p.presupuesto).toBe(1500.5)
    expect(p.estado).toBe('en_ejecucion')
    expect(p.apartados).toEqual([{ apartado: 'A', contenido: 'c' }])
    expect('codigo' in p).toBe(false)
    expect('evento_id' in p).toBe(false)
    expect('fecha_fin' in p).toBe(false)
  })

  it('buildPayload en edición envía null para limpiar opcionales, pero no para NOT NULL', () => {
    const v = { ...buildInitialValues(inv), titulo: 'x', investigador_principal_id: '3', estado: '' }
    const p = buildPayload(inv, v, { isNew: false })
    expect(p.evento_id).toBeNull()
    expect(p.fecha_fin).toBeNull()
    expect(p.codigo).toBeNull()
    expect('estado' in p).toBe(false)
    expect('presupuesto' in p).toBe(false)
  })

  it('buildPayload convierte checkboxes a 1/0', () => {
    const rel = getCatalogo('relatores')
    const v = { ...buildInitialValues(rel), nombre_completo: 'Ana', activo: false }
    const p = buildPayload(rel, v)
    expect(p.activo).toBe(0)
    expect(p.rol).toBe('relator')
    const tit = getCatalogo('proyectos-titulacion')
    expect(buildPayload(tit, { ...buildInitialValues(tit), titulo: 't', investigador_principal_id: '1' }).articulado_civ).toBe(1)
  })
})

describe('estado de registro y campos condicionales', () => {
  it('define los 4 estados de registro con etiquetas legibles', () => {
    expect(REGISTRO_ESTADOS.map((e) => e.value)).toEqual(['borrador', 'enviado', 'aprobado', 'devuelto'])
    expect(labelRegistroEstado('enviado')).toBe('En revisión')
    expect(labelRegistroEstado('otro')).toBe('otro')
  })

  it.each(['proyectos-investigacion', 'proyectos-semilleros', 'proyectos-titulacion'])('%s muestra la columna y el filtro de estado de registro', (key) => {
    const c = getCatalogo(key)
    expect(c.columns.find((x) => x.key === 'registro_estado')).toMatchObject({ type: 'registro' })
    const filtro = c.filters.find((f) => f.name === 'registro_estado')
    expect(filtro.options).toBe(REGISTRO_ESTADOS)
  })

  it('el formulario admin de proyectos no incluye campos de estado de registro', () => {
    CATALOGOS.filter((c) => c.endpoint === '/eje3/proyectos').forEach((c) => {
      const names = c.fields.map((f) => f.name)
      ;['registro_estado', 'comentario_revision', 'enviado_en'].forEach((n) => expect(names).not.toContain(n))
      expect(buildPayload(c, { ...buildInitialValues(c), titulo: 't', investigador_principal_id: '1' })).not.toHaveProperty('registro_estado')
    })
  })

  it('formatCell traduce el estado de registro', () => {
    expect(formatCell({ key: 'registro_estado', type: 'registro' }, { registro_estado: 'devuelto' })).toBe('Devuelto')
    expect(formatCell({ key: 'registro_estado', type: 'registro' }, { registro_estado: null })).toBe('—')
  })

  it('visibleWhen oculta el campo, lo omite del payload y de los obligatorios', () => {
    const cfg = {
      fixed: {},
      fields: [
        { name: 'tipo', type: 'select', options: [] },
        { name: 'civ', type: 'checkbox', visibleWhen: (v) => v.tipo === 'titulacion' },
        { name: 'solo', type: 'text', required: true, visibleWhen: (v) => v.tipo === 'titulacion' }
      ]
    }
    expect(isVisible(cfg.fields[0], {})).toBe(true)
    expect(isVisible(cfg.fields[1], { tipo: 'x' })).toBe(false)
    expect(missingRequired(cfg, { tipo: 'x', civ: false, solo: '' })).toEqual([])
    expect(missingRequired(cfg, { tipo: 'titulacion', civ: false, solo: '' })).toEqual([undefined])
    expect(buildPayload(cfg, { tipo: 'x', civ: true, solo: 'a' })).toEqual({ tipo: 'x' })
    expect(buildPayload(cfg, { tipo: 'titulacion', civ: true, solo: 'a' })).toEqual({ tipo: 'titulacion', civ: 1, solo: 'a' })
  })
})
