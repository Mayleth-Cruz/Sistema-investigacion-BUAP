import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Eje3MonitoreoScreen from './Eje3MonitoreoScreen'
import { mockFetch } from '../../test/mockFetch'

const MONITOREO = {
  docentes_con_proyectos: 3,
  docentes_titulacion_civ: 2,
  profesores_snii: 4,
  profesores_elegibles_snii: 1,
  total_docentes: 12,
  docentes_con_semilleros: 5,
  snii_por_nivel: { Candidato: 1, I: 2, II: 1, III: 0 },
  detalle: {
    con_proyectos: [{ id: 1, nombre_completo: 'Ana Soto', total: 2 }, { id: 2, nombre_completo: 'Luis Mora', total: 1 }],
    titulacion_civ: [{ id: 3, nombre_completo: 'Eva Cruz', total: 1 }],
    en_snii: [{ id: 1, nombre_completo: 'Ana Soto', snii_nivel: 'II' }],
    elegibles: [{ id: 4, nombre_completo: 'Pedro Gil' }]
  }
}

const DOCENTES = [
  { id: 1, nombre_completo: 'Ana Soto', correo: 'ana@buap.mx', afiliacion: 'FCA', categoria: 'TC', linea_investigacion: 'Finanzas', snii_nivel: 'II', snii_elegible: 0, activo: 1, total_proyectos: 2 },
  { id: 4, nombre_completo: 'Pedro Gil', correo: null, afiliacion: 'FCA', categoria: 'MT', linea_investigacion: 'Mercadotecnia', snii_nivel: null, snii_elegible: 1, activo: 1, total_proyectos: 0 }
]

const routes = (extra = []) => [
  ...extra,
  { match: '/eje3/monitoreo', body: { success: true, data: MONITOREO } },
  { match: /\/eje3\/docentes(\?|$)/, body: { success: true, data: DOCENTES } }
]

describe('Eje3MonitoreoScreen', () => {
  it('muestra los 4 indicadores con sus valores', async () => {
    mockFetch(routes())
    render(<Eje3MonitoreoScreen onNavigate={() => {}} showToast={() => {}} />)
    const ind = await screen.findByTestId('indicador-docentes_con_proyectos')
    expect(ind).toHaveTextContent('3')
    expect(ind).toHaveTextContent(/Docentes con proyectos de investigación registrados/)
    expect(screen.getByTestId('indicador-docentes_titulacion_civ')).toHaveTextContent('2')
    expect(screen.getByTestId('indicador-docentes_titulacion_civ')).toHaveTextContent(/CIV/)
    expect(screen.getByTestId('indicador-profesores_snii')).toHaveTextContent('4')
    expect(screen.getByTestId('indicador-profesores_elegibles_snii')).toHaveTextContent('1')
    expect(screen.getByTestId('indicador-profesores_snii')).toHaveTextContent('de 12 docentes activos')
  })

  it('muestra el desglose del SNII por nivel', async () => {
    mockFetch(routes())
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    await screen.findByTestId('indicador-profesores_snii')
    expect(screen.getByRole('listitem', { name: 'Nivel I: 2' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Nivel Candidato: 1' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Nivel III: 0' })).toBeInTheDocument()
  })

  it('expande y oculta el detalle de cada indicador', async () => {
    const user = userEvent.setup()
    mockFetch(routes())
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    const ind = await screen.findByTestId('indicador-docentes_con_proyectos')
    expect(within(ind).queryByText('Luis Mora')).not.toBeInTheDocument()
    await user.click(within(ind).getByRole('button', { name: /Ver detalle/ }))
    expect(within(ind).getByText('Luis Mora')).toBeInTheDocument()
    expect(within(ind).getByText('2 proyectos')).toBeInTheDocument()
    expect(within(ind).getByText('1 proyecto')).toBeInTheDocument()
    await user.click(within(ind).getByRole('button', { name: /Ocultar detalle/ }))
    expect(within(ind).queryByText('Luis Mora')).not.toBeInTheDocument()

    const snii = screen.getByTestId('indicador-profesores_snii')
    await user.click(within(snii).getByRole('button', { name: /Ver detalle/ }))
    expect(within(snii).getByText('Nivel II')).toBeInTheDocument()
  })

  it('lista docentes y muestra su situación SNII', async () => {
    mockFetch(routes())
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    const btn = await screen.findByRole('button', { name: 'Editar SNII de Pedro Gil' })
    const row = btn.closest('tr')
    expect(within(row).getByText('Sin nivel')).toBeInTheDocument()
    expect(within(row).getByText('Sí')).toBeInTheDocument()
  })

  it('filtra docentes por situación SNII y búsqueda', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes())
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    await screen.findByRole('button', { name: 'Editar SNII de Pedro Gil' })
    await user.selectOptions(screen.getByLabelText('Filtrar por situación en el SNII'), 'elegibles')
    await waitFor(() => expect(f.calls.some((c) => /\/eje3\/docentes\?snii=elegibles/.test(c.url))).toBe(true))
    await user.type(screen.getByLabelText('Buscar docente'), 'pedro')
    await waitFor(() => expect(f.calls.some((c) => /search=pedro/.test(c.url))).toBe(true))
  })

  it('edita snii_nivel y snii_elegible con PUT', async () => {
    const user = userEvent.setup()
    const showToast = vi.fn()
    const f = mockFetch(routes([{ method: 'PUT', match: '/eje3/docentes/4/snii', body: { success: true, data: {} } }]))
    render(<Eje3MonitoreoScreen onNavigate={() => {}} showToast={showToast} />)
    await user.click(await screen.findByRole('button', { name: 'Editar SNII de Pedro Gil' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Elegible para el SNII')).toBeChecked()
    await user.selectOptions(within(dialog).getByLabelText('Nivel SNII'), 'Candidato')
    await user.click(within(dialog).getByLabelText('Elegible para el SNII'))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const put = f.calls.find((c) => c.method === 'PUT')
    expect(put.url).toMatch(/\/eje3\/docentes\/4\/snii$/)
    expect(put.body).toEqual({ snii_nivel: 'Candidato', snii_elegible: 0 })
    expect(showToast).toHaveBeenCalled()
    // recarga indicadores y docentes
    await waitFor(() => expect(f.calls.filter((c) => /\/eje3\/monitoreo$/.test(c.url)).length).toBeGreaterThan(1))
  })

  it('envía snii_nivel null cuando se elige "Sin nivel"', async () => {
    const user = userEvent.setup()
    const f = mockFetch(routes([{ method: 'PUT', match: '/eje3/docentes/1/snii', body: { success: true, data: {} } }]))
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Editar SNII de Ana Soto' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Nivel SNII')).toHaveValue('II')
    await user.selectOptions(within(dialog).getByLabelText('Nivel SNII'), '')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'PUT')).toBe(true))
    expect(f.calls.find((c) => c.method === 'PUT').body.snii_nivel).toBeNull()
  })

  it('muestra los errores del backend al guardar SNII', async () => {
    const user = userEvent.setup()
    mockFetch(routes([{ method: 'PUT', match: '/eje3/docentes/4/snii', status: 422, body: { success: false, message: 'Inválido', errors: { snii_nivel: ['Nivel SNII no válido.'] } } }]))
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Editar SNII de Pedro Gil' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByText('Nivel SNII no válido.')).toBeInTheDocument()
  })

  it('muestra aviso si el backend no responde (sin datos falsos)', async () => {
    mockFetch([{ match: '/eje3/monitoreo', status: 401, body: { success: false } }, { match: /\/eje3\/docentes/, error: true }])
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    const alerts = await screen.findAllByRole('alert')
    expect(alerts[0]).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.queryByTestId('indicador-profesores_snii')).not.toBeInTheDocument()
    expect(await screen.findByText('No hay información disponible.')).toBeInTheDocument()
  })

  it('muestra estado vacío de docentes', async () => {
    mockFetch([{ match: '/eje3/monitoreo', body: { success: true, data: MONITOREO } }, { match: /\/eje3\/docentes/, body: { success: true, data: [] } }])
    render(<Eje3MonitoreoScreen onNavigate={() => {}} />)
    expect(await screen.findByText('No se encontraron docentes.')).toBeInTheDocument()
  })
})
