import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Eje3DifundirScreen from './Eje3DifundirScreen'
import { mockFetch } from '../../test/mockFetch'

const EVENTOS = [
  { id: 1, nombre: 'Encuentro de Semilleros 2026', tipo: 'semilleros', edicion: '2026', fecha_inicio: '2026-05-10', fecha_fin: '2026-05-12', sede: 'Auditorio', descripcion: 'D', estado: 'programado', publico: 1, total_proyectos: 3, total_participantes: 2, total_publicaciones: 0 },
  { id: 2, nombre: 'Congreso 2025', tipo: 'congreso', edicion: '2025', fecha_inicio: '2025-10-01', fecha_fin: null, sede: null, descripcion: null, estado: 'concluido', publico: 0, total_proyectos: 0, total_participantes: 0, total_publicaciones: 4 }
]

const DIFUSION = {
  semilleros: [{ ...EVENTOS[0], proyectos: [{ id: 5, codigo: 'SEM-1', titulo: 'Proyecto visible', investigador_principal_nombre: 'Ana Soto', apartados: [] }] }],
  congreso: [],
  otros_eventos: [],
  proximos: []
}

const routes = (extra = []) => [
  ...extra,
  { match: '/eje3/difusion', body: { success: true, data: DIFUSION } },
  { match: /\/eje3\/eventos(\?|$)/, body: { success: true, data: EVENTOS } }
]

describe('Eje3DifundirScreen', () => {
  it('lista los eventos con su estado de publicación', async () => {
    mockFetch(routes())
    render(<Eje3DifundirScreen onNavigate={() => {}} showToast={() => {}} />)
    expect(await screen.findByRole('switch', { name: 'Publicar Encuentro de Semilleros 2026' })).toBeInTheDocument()
    expect(screen.getByText('Congreso 2025', { selector: 'td' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Publicar Encuentro de Semilleros 2026' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Publicar Congreso 2025' })).not.toBeChecked()
    expect(screen.getByText('10/05/2026 – 12/05/2026')).toBeInTheDocument()
  })

  it('muestra la vista previa de lo publicado', async () => {
    mockFetch(routes())
    render(<Eje3DifundirScreen onNavigate={() => {}} />)
    const preview = await screen.findByRole('region', { name: 'Vista previa de lo publicado' })
    expect(await within(preview).findByText('Proyecto visible')).toBeInTheDocument()
    // La vista previa no incluye botones de detalle
    expect(within(preview).queryByRole('button', { name: /Ver detalle/ })).not.toBeInTheDocument()
  })

  it('el interruptor publica/oculta enviando PUT con el evento completo', async () => {
    const user = userEvent.setup()
    const showToast = vi.fn()
    const f = mockFetch(routes([{ method: 'PUT', match: '/eje3/eventos/2', body: { success: true, data: {} } }]))
    render(<Eje3DifundirScreen onNavigate={() => {}} showToast={showToast} />)
    await user.click(await screen.findByRole('switch', { name: 'Publicar Congreso 2025' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'PUT')).toBe(true))
    const put = f.calls.find((c) => c.method === 'PUT')
    expect(put.url).toMatch(/\/eje3\/eventos\/2$/)
    expect(put.body).toMatchObject({ publico: 1, nombre: 'Congreso 2025', tipo: 'congreso', estado: 'concluido' })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('ahora es público')))
    // recarga la vista previa
    await waitFor(() => expect(f.calls.filter((c) => /\/eje3\/difusion$/.test(c.url)).length).toBeGreaterThan(1))
  })

  it('crea un evento con validación y POST', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes([{ method: 'POST', match: '/eje3/eventos', body: { success: true, data: { id: 3 } } }]))
    render(<Eje3DifundirScreen onNavigate={() => {}} showToast={() => {}} />)
    await user.click(await screen.findByRole('button', { name: /Nuevo evento/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findAllByText(/es obligatorio/)).toHaveLength(2)
    await user.type(within(dialog).getByLabelText(/Nombre del evento/), 'Congreso Nuevo')
    await user.selectOptions(within(dialog).getByLabelText(/Tipo de evento/), 'congreso')
    await user.type(within(dialog).getByLabelText('Fecha de inicio'), '2026-11-20')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const post = f.calls.find((c) => c.method === 'POST')
    expect(post.body).toMatchObject({ nombre: 'Congreso Nuevo', tipo: 'congreso', fecha_inicio: '2026-11-20', estado: 'programado', publico: 1 })
  })

  it('edita un evento con PUT', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes([{ method: 'PUT', match: '/eje3/eventos/1', body: { success: true, data: {} } }]))
    render(<Eje3DifundirScreen onNavigate={() => {}} showToast={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Editar Encuentro de Semilleros 2026' }))
    const dialog = await screen.findByRole('dialog')
    const sede = within(dialog).getByLabelText('Sede')
    expect(sede).toHaveValue('Auditorio')
    await user.clear(sede)
    await user.type(sede, 'Aula Magna')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(f.calls.find((c) => c.method === 'PUT').body).toMatchObject({ sede: 'Aula Magna', nombre: 'Encuentro de Semilleros 2026', publico: 1 })
  })

  it('elimina con confirmación y reporta fallos reales', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes([{ method: 'DELETE', match: '/eje3/eventos/2', body: { success: true, message: 'Evento eliminado' } }]))
    const showToast = vi.fn()
    render(<Eje3DifundirScreen onNavigate={() => {}} showToast={showToast} />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar Congreso 2025' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(f.calls.some((c) => c.method === 'DELETE' && /eventos\/2$/.test(c.url))).toBe(true)
    expect(showToast).toHaveBeenCalledWith('Evento eliminado')
  })

  it('si falla el borrado mantiene el diálogo con el mensaje', async () => {
    const user = userEvent.setup()
    mockFetch(routes([{ method: 'DELETE', match: '/eje3/eventos/2', status: 500, body: { success: false, message: 'Fallo en el servidor' } }]))
    render(<Eje3DifundirScreen onNavigate={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar Congreso 2025' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(await within(dialog).findByText('Fallo en el servidor')).toBeInTheDocument()
  })

  it('filtra por tipo y estado', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes())
    render(<Eje3DifundirScreen onNavigate={() => {}} />)
    await screen.findByText('Congreso 2025', { selector: 'td' })
    await user.selectOptions(screen.getByLabelText('Filtrar por tipo de evento'), 'congreso')
    await user.selectOptions(screen.getByLabelText('Filtrar por estado del evento'), 'concluido')
    await waitFor(() => expect(f.calls.some((c) => /\/eje3\/eventos\?tipo=congreso&estado=concluido/.test(c.url))).toBe(true))
  })

  it('muestra estado vacío y aviso de error', async () => {
    mockFetch([{ match: '/eje3/difusion', error: true }, { match: /\/eje3\/eventos/, body: { success: true, data: [] } }])
    render(<Eje3DifundirScreen onNavigate={() => {}} />)
    expect(await screen.findByText('No se encontraron eventos.')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
  })

  it('muestra aviso si falla la lista de eventos', async () => {
    mockFetch([{ match: '/eje3/difusion', body: { success: true, data: DIFUSION } }, { match: /\/eje3\/eventos/, status: 401, body: {} }])
    render(<Eje3DifundirScreen onNavigate={() => {}} />)
    expect(await screen.findByText('No hay información disponible.')).toBeInTheDocument()
  })
})
