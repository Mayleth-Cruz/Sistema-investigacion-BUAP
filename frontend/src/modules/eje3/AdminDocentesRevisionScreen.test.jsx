import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDocentesRevisionScreen from './AdminDocentesRevisionScreen'
import { mockFetch } from '../../test/mockFetch'

const PENDIENTES = [
  { id: 11, codigo: 'INV-2026-004', titulo: 'Finanzas verdes', tipo: 'investigacion', investigador_principal_nombre: 'Dra. Ana Soto', enviado_en: '2026-05-10 09:30:00', total_apartados: 2, registro_estado: 'enviado' },
  { id: 12, codigo: 'SEM-2026-002', titulo: 'Semillero de costos', tipo: 'semillero', investigador_principal_nombre: 'Dr. Luis Mora', enviado_en: '2026-05-12 10:00:00', total_apartados: 1, registro_estado: 'enviado' }
]
const DETALLE = { ...PENDIENTES[0], resumen: 'Resumen del proyecto', linea_investigacion: 'Finanzas', estado: 'en_ejecucion', apartados: [{ id: 1, apartado: 'Metodología', contenido: 'Texto de la metodología', orden: 1 }] }

function setup(extra = [], { showToast = vi.fn(), data = { pendientes: 2, proyectos: PENDIENTES } } = {}) {
  const f = mockFetch([
    ...extra,
    { match: /\/eje3\/proyectos\/11$/, body: { success: true, data: DETALLE } },
    { match: '/eje3/revision', body: { success: true, data } }
  ])
  render(<AdminDocentesRevisionScreen onNavigate={() => {}} showToast={showToast} />)
  return { f, showToast }
}

const card = (titulo) => screen.getByText(titulo, { selector: 'strong' }).closest('li')

describe('AdminDocentesRevisionScreen', () => {
  it('lista los proyectos enviados con docente, fecha y apartados', async () => {
    setup()
    expect(await screen.findByText('Finanzas verdes', { selector: 'strong' })).toBeInTheDocument()
    const c = within(card('Finanzas verdes'))
    expect(c.getByText('Docente: Dra. Ana Soto')).toBeInTheDocument()
    expect(c.getByText('Enviado el 10/05/2026')).toBeInTheDocument()
    expect(c.getByText('2 apartados')).toBeInTheDocument()
    expect(screen.getByText('2 proyectos pendientes')).toBeInTheDocument()
  })

  it('el menú lateral marca "Revisión de proyectos" y muestra el contador sin pedirlo otra vez', async () => {
    const { f } = setup()
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    expect(aside.querySelector('a.on')).toHaveTextContent('Revisión de proyectos')
    expect(await within(aside).findByLabelText('2 pendientes')).toBeInTheDocument()
    expect(f.calls.filter((c) => /\/eje3\/revision$/.test(c.url))).toHaveLength(1)
  })

  it('muestra el detalle con apartados', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Ver detalle Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: /Detalle del proyecto/ })
    expect(within(dialog).getByText('Resumen del proyecto')).toBeInTheDocument()
    expect(within(dialog).getByText('Metodología')).toBeInTheDocument()
    expect(within(dialog).getByText('Texto de la metodología')).toBeInTheDocument()
    expect(within(dialog).getByText('Dra. Ana Soto')).toBeInTheDocument()
  })

  it('aprueba con comentario opcional (POST accion aprobar)', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'POST', match: '/eje3/proyectos/11/revision', body: { success: true, message: 'Proyecto aprobado.', data: { id: 11, registro_estado: 'aprobado' } } }])
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Aprobar Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aprobar proyecto' })
    await user.click(within(dialog).getByRole('button', { name: 'Aprobar proyecto' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'POST')).toBe(true))
    expect(f.calls.find((c) => c.method === 'POST').body).toEqual({ accion: 'aprobar', comentario: '' })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto aprobado.'))
    // recarga la bandeja
    await waitFor(() => expect(f.calls.filter((c) => /\/eje3\/revision$/.test(c.url)).length).toBeGreaterThan(1))
  })

  it('devolver exige comentario: sin él no llama al backend', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Devolver Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Devolver proyecto' })
    await user.click(within(dialog).getByRole('button', { name: 'Devolver al docente' }))
    expect(await within(dialog).findByText(/Escribe un comentario de al menos 3 caracteres/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Comentario/), '  ab  ')
    await user.click(within(dialog).getByRole('button', { name: 'Devolver al docente' }))
    expect(await within(dialog).findByText(/al menos 3 caracteres/)).toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('devuelve con comentario (POST accion devolver) y avisa', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'POST', match: '/eje3/proyectos/11/revision', body: { success: true, message: 'Proyecto devuelto al docente.', data: { id: 11, registro_estado: 'devuelto' } } }])
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Devolver Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Devolver proyecto' })
    await user.type(within(dialog).getByLabelText(/Comentario/), 'Falta la metodología')
    await user.click(within(dialog).getByRole('button', { name: 'Devolver al docente' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'POST')).toBe(true))
    expect(f.calls.find((c) => c.method === 'POST').body).toEqual({ accion: 'devolver', comentario: 'Falta la metodología' })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Proyecto devuelto al docente.'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('desde el detalle también se puede aprobar o devolver', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Ver detalle Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: /Detalle del proyecto/ })
    await user.click(within(dialog).getByRole('button', { name: 'Devolver' }))
    expect(await screen.findByRole('dialog', { name: 'Devolver proyecto' })).toBeInTheDocument()
  })

  it('muestra el error del backend si la transición no es válida (409)', async () => {
    const user = userEvent.setup()
    setup([{ method: 'POST', match: '/eje3/proyectos/11/revision', status: 409, body: { success: false, message: 'El proyecto ya no está en revisión.', errors: { codigo: ['transicion_invalida'] } } }])
    await screen.findByText('Finanzas verdes', { selector: 'strong' })
    await user.click(within(card('Finanzas verdes')).getByRole('button', { name: 'Aprobar Finanzas verdes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aprobar proyecto' })
    await user.click(within(dialog).getByRole('button', { name: 'Aprobar proyecto' }))
    expect(await within(dialog).findByText('El proyecto ya no está en revisión.')).toBeInTheDocument()
    expect(within(dialog).queryByText('transicion_invalida')).not.toBeInTheDocument()
  })

  it('bandeja vacía', async () => {
    setup([], { data: { pendientes: 0, proyectos: [] } })
    expect(await screen.findByText('No hay proyectos pendientes de revisión.')).toBeInTheDocument()
    expect(document.querySelector('.docente-badge')).toBeNull()
  })

  it('si el backend no responde muestra aviso y no datos', async () => {
    mockFetch([{ match: '/eje3/revision', error: true }])
    render(<AdminDocentesRevisionScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByText('No hay información disponible.')).toBeInTheDocument()
    expect(document.querySelector('.docente-badge')).toBeNull()
  })
})
