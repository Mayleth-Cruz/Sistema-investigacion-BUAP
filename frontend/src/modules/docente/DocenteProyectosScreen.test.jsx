import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocenteProyectosScreen from './DocenteProyectosScreen'
import { mockFetch } from '../../test/mockFetch'

const base = { resumen: 'R', linea_investigacion: 'L', evento_id: null, evento_nombre: null, co_investigadores: null, articulado_civ: 0, presupuesto: 0, entidad_financiadora: null, fecha_inicio: '2026-01-10', fecha_fin: null, estado: 'en_ejecucion', total_apartados: 0, comentario_revision: null }
const PROYECTOS = [
  { ...base, id: 1, codigo: 'INV-2026-001', titulo: 'Proyecto borrador', tipo: 'investigacion', registro_estado: 'borrador' },
  { ...base, id: 2, codigo: 'SEM-2026-001', titulo: 'Proyecto enviado', tipo: 'semillero', registro_estado: 'enviado', total_apartados: 2 },
  { ...base, id: 3, codigo: 'TIT-2026-001', titulo: 'Proyecto aprobado', tipo: 'titulacion', registro_estado: 'aprobado', articulado_civ: 1 },
  { ...base, id: 4, codigo: 'INV-2026-002', titulo: 'Proyecto devuelto', tipo: 'investigacion', registro_estado: 'devuelto', comentario_revision: 'Agrega la metodología' }
]
const EVENTOS = [{ id: 1, nombre: 'Encuentro de Semilleros 2026' }]
const DETALLE = { ...PROYECTOS[0], apartados: [{ id: 1, apartado: 'Metodología', contenido: 'Texto A', orden: 1 }] }

function setup(extra = [], { showToast = vi.fn(), proyectos = PROYECTOS } = {}) {
  const f = mockFetch([
    ...extra,
    { match: /\/docente\/proyectos\/1$/, body: { success: true, data: DETALLE } },
    { match: /\/docente\/proyectos\/2$/, body: { success: true, data: { ...PROYECTOS[1], apartados: [{ id: 9, apartado: 'Alcance', contenido: 'Contenido enviado' }] } } },
    { match: /\/docente\/proyectos(\?|$)/, respond: ({ url }) => {
      const m = url.match(/registro_estado=(\w+)/)
      const data = m ? proyectos.filter((p) => p.registro_estado === m[1]) : proyectos
      return { ok: true, status: 200, json: async () => ({ success: true, data }) }
    } },
    { match: /\/eje3\/eventos(\?|$)/, body: { success: true, data: EVENTOS } }
  ])
  render(<DocenteProyectosScreen onNavigate={() => {}} showToast={showToast} user={{ nombre: 'Ana' }} />)
  return { f, showToast }
}

const card = (titulo) => screen.getByText(titulo, { selector: 'strong' }).closest('li')

describe('DocenteProyectosScreen · lista y estados', () => {
  it('lista los proyectos con su estado de registro', async () => {
    setup()
    expect(await screen.findByText('Proyecto borrador', { selector: 'strong' })).toBeInTheDocument()
    expect(within(card('Proyecto borrador')).getByText('Borrador')).toBeInTheDocument()
    expect(within(card('Proyecto enviado')).getByText('En revisión')).toBeInTheDocument()
    expect(within(card('Proyecto aprobado')).getByText('Aprobado')).toBeInTheDocument()
    expect(within(card('Proyecto devuelto')).getByText('Devuelto')).toBeInTheDocument()
    expect(screen.getByText('4 proyectos')).toBeInTheDocument()
  })

  it('el devuelto muestra el comentario del administrador', async () => {
    setup()
    await screen.findByText('Proyecto devuelto', { selector: 'strong' })
    const c = within(card('Proyecto devuelto'))
    expect(c.getByText('Comentario del administrador')).toBeInTheDocument()
    expect(c.getByText('Agrega la metodología')).toBeInTheDocument()
    expect(within(card('Proyecto borrador')).queryByText('Comentario del administrador')).not.toBeInTheDocument()
  })

  it('borrador y devuelto ofrecen Enviar, Editar y Eliminar; enviado y aprobado quedan bloqueados', async () => {
    setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    ;['Proyecto borrador', 'Proyecto devuelto'].forEach((t) => {
      const c = within(card(t))
      expect(c.getByRole('button', { name: `Enviar a revisión ${t}` })).toBeInTheDocument()
      expect(c.getByRole('button', { name: `Editar ${t}` })).toBeInTheDocument()
      expect(c.getByRole('button', { name: `Eliminar ${t}` })).toBeInTheDocument()
    })
    ;['Proyecto enviado', 'Proyecto aprobado'].forEach((t) => {
      const c = within(card(t))
      expect(c.queryByRole('button', { name: `Editar ${t}` })).not.toBeInTheDocument()
      expect(c.queryByRole('button', { name: `Eliminar ${t}` })).not.toBeInTheDocument()
      expect(c.queryByRole('button', { name: `Enviar a revisión ${t}` })).not.toBeInTheDocument()
      expect(c.getByRole('button', { name: `Ver detalle ${t}` })).toBeInTheDocument()
    })
    expect(within(card('Proyecto enviado')).getByText(/En revisión: no se puede editar/)).toBeInTheDocument()
    expect(within(card('Proyecto aprobado')).getByText(/solicita al administrador que lo devuelva/)).toBeInTheDocument()
  })

  it('un proyecto enviado se puede consultar en solo lectura con sus apartados', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByText('Proyecto enviado', { selector: 'strong' })
    await user.click(within(card('Proyecto enviado')).getByRole('button', { name: 'Ver detalle Proyecto enviado' }))
    const dialog = await screen.findByRole('dialog', { name: /Detalle del proyecto/ })
    expect(within(dialog).getByText('Alcance')).toBeInTheDocument()
    expect(within(dialog).getByText('Contenido enviado')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('filtra por estado de registro y por tipo con la consulta al backend', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.selectOptions(screen.getByLabelText('Filtrar por estado de registro'), 'devuelto')
    await waitFor(() => expect(f.calls.some((c) => /registro_estado=devuelto/.test(c.url))).toBe(true))
    expect(await screen.findByText('1 proyecto')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Filtrar por tipo de proyecto'), 'semillero')
    await waitFor(() => expect(f.calls.some((c) => /tipo=semillero/.test(c.url))).toBe(true))
  })

  it('el buscador envía search tras un breve retardo', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.type(screen.getByLabelText('Buscar en mis proyectos'), 'agua')
    await waitFor(() => expect(f.calls.some((c) => /search=agua/.test(c.url))).toBe(true))
  })

  it('si el backend falla muestra aviso y no datos inventados', async () => {
    mockFetch([{ match: '/docente/proyectos', error: true }, { match: '/eje3/eventos', error: true }])
    render(<DocenteProyectosScreen onNavigate={() => {}} showToast={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByText('No hay información disponible.')).toBeInTheDocument()
  })

  it('estado vacío con y sin filtros', async () => {
    setup([], { proyectos: [] })
    expect(await screen.findByText(/Aún no has registrado proyectos/)).toBeInTheDocument()
  })
})

describe('DocenteProyectosScreen · crear y editar', () => {
  it('crea un proyecto: envía solo campos del docente (sin investigador, código ni estado de registro)', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'POST', match: /\/docente\/proyectos$/, status: 201, body: { success: true, data: { id: 20 } } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(screen.getByRole('button', { name: 'Nuevo proyecto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo proyecto' })
    expect(within(dialog).getByText('Se guardará como borrador')).toBeInTheDocument()
    // campos del contrato
    expect(within(dialog).queryByLabelText(/Docente \/ investigador principal/)).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/^Código/)).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Título del proyecto/), 'Mi proyecto nuevo')
    await user.selectOptions(within(dialog).getByLabelText(/Tipo de proyecto/), 'semillero')
    await user.selectOptions(within(dialog).getByLabelText(/Evento donde se presenta/), '1')
    await user.type(within(dialog).getByLabelText(/Resumen/), 'Un resumen')
    await user.click(within(dialog).getByRole('button', { name: 'Agregar apartado' }))
    await user.type(within(dialog).getByLabelText('Título del apartado 1'), 'Objetivo')
    await user.type(within(dialog).getByLabelText('Contenido del apartado 1'), 'Describir')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'POST')).toBe(true))
    const post = f.calls.find((c) => c.method === 'POST')
    expect(post.url).toMatch(/\/docente\/proyectos$/)
    expect(post.body).toMatchObject({
      titulo: 'Mi proyecto nuevo', tipo: 'semillero', evento_id: 1, resumen: 'Un resumen', estado: 'propuesta',
      apartados: [{ apartado: 'Objetivo', contenido: 'Describir' }]
    })
    ;['investigador_principal_id', 'codigo', 'registro_estado', 'comentario_revision', 'articulado_civ'].forEach((k) =>
      expect(post.body).not.toHaveProperty(k)
    )
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto guardado como borrador.'))
    // recarga la lista
    await waitFor(() => expect(f.calls.filter((c) => c.method === 'GET' && /\/docente\/proyectos(\?|$)/.test(c.url)).length).toBeGreaterThan(1))
  })

  it('"Articulado al CIV" solo aparece para el tipo titulación', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(screen.getByRole('button', { name: 'Nuevo proyecto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo proyecto' })
    expect(within(dialog).queryByLabelText('Articulado al CIV')).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/Tipo de proyecto/), 'titulacion')
    expect(within(dialog).getByLabelText('Articulado al CIV')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/Tipo de proyecto/), 'investigacion')
    expect(within(dialog).queryByLabelText('Articulado al CIV')).not.toBeInTheDocument()
  })

  it('exige título y tipo antes de guardar', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(screen.getByRole('button', { name: 'Nuevo proyecto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo proyecto' })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByText(/El campo "Título del proyecto" es obligatorio/)).toBeInTheDocument()
    expect(within(dialog).getByText(/El campo "Tipo de proyecto" es obligatorio/)).toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('edita un proyecto cargando su detalle (apartados) y envía PUT', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'PUT', match: /\/docente\/proyectos\/1$/, body: { success: true, data: { id: 1 } } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Editar Proyecto borrador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar proyecto' })
    expect(within(dialog).getByLabelText(/Título del proyecto/)).toHaveValue('Proyecto borrador')
    expect(within(dialog).getByLabelText('Título del apartado 1')).toHaveValue('Metodología')
    await user.clear(within(dialog).getByLabelText(/Título del proyecto/))
    await user.type(within(dialog).getByLabelText(/Título del proyecto/), 'Título corregido')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'PUT')).toBe(true))
    const put = f.calls.find((c) => c.method === 'PUT')
    expect(put.url).toMatch(/\/docente\/proyectos\/1$/)
    expect(put.body.titulo).toBe('Título corregido')
    expect(put.body.apartados).toEqual([{ apartado: 'Metodología', contenido: 'Texto A' }])
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto actualizado.'))
  })

  it('si el backend responde 409 proyecto_bloqueado muestra el mensaje y no el código interno', async () => {
    const user = userEvent.setup()
    setup([{ method: 'PUT', match: /\/docente\/proyectos\/1$/, status: 409, body: { success: false, message: 'El proyecto está en revisión y no se puede modificar.', errors: { codigo: ['proyecto_bloqueado'] } } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Editar Proyecto borrador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar proyecto' })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByText('El proyecto está en revisión y no se puede modificar.')).toBeInTheDocument()
    expect(within(dialog).queryByText('proyecto_bloqueado')).not.toBeInTheDocument()
  })
})

describe('DocenteProyectosScreen · eliminar y enviar', () => {
  it('elimina con confirmación', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'DELETE', match: /\/docente\/proyectos\/1$/, body: { success: true, message: 'Proyecto eliminado.' } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Eliminar Proyecto borrador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar eliminación' })
    expect(within(dialog).getByText(/¿Seguro que deseas eliminar "Proyecto borrador"\?/)).toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'DELETE')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'DELETE')).toBe(true))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto eliminado.'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar la eliminación no borra nada', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Eliminar Proyecto borrador' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(f.calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('muestra el error real si no se puede eliminar (sin simular éxito)', async () => {
    const user = userEvent.setup()
    setup([{ method: 'DELETE', match: /\/docente\/proyectos\/1$/, status: 409, body: { success: false, message: 'El proyecto está bloqueado.', errors: { codigo: ['proyecto_bloqueado'] } } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Eliminar Proyecto borrador' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(await within(dialog).findByText('El proyecto está bloqueado.')).toBeInTheDocument()
  })

  it('envía a revisión tras confirmar (POST /enviar)', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'POST', match: /\/docente\/proyectos\/4\/enviar$/, body: { success: true, message: 'Proyecto enviado a revisión.', data: { id: 4 } } }])
    await screen.findByText('Proyecto devuelto', { selector: 'strong' })
    await user.click(within(card('Proyecto devuelto')).getByRole('button', { name: 'Enviar a revisión Proyecto devuelto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enviar a revisión' })
    expect(within(dialog).getByText(/no podrás editarlo/)).toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a revisión' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'POST' && /\/enviar$/.test(c.url))).toBe(true))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto enviado a revisión.'))
  })

  it('si faltan campos obligatorios muestra los errores por campo y no cierra el diálogo', async () => {
    const user = userEvent.setup()
    setup([{ method: 'POST', match: /\/docente\/proyectos\/1\/enviar$/, status: 400, body: { success: false, message: 'Datos incompletos', errors: { resumen: ['El resumen es obligatorio para enviar.'], linea_investigacion: ['La línea de investigación es obligatoria para enviar.'] } } }])
    await screen.findByText('Proyecto borrador', { selector: 'strong' })
    await user.click(within(card('Proyecto borrador')).getByRole('button', { name: 'Enviar a revisión Proyecto borrador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enviar a revisión' })
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a revisión' }))
    expect(await within(dialog).findByText('El resumen es obligatorio para enviar.')).toBeInTheDocument()
    expect(within(dialog).getByText('La línea de investigación es obligatoria para enviar.')).toBeInTheDocument()
  })
})
