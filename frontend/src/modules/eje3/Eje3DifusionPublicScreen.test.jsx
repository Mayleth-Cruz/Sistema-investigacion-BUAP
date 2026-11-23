import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Eje3DifusionPublicScreen from './Eje3DifusionPublicScreen'
import { formatRangoFechas } from './registroConfig'
import { mockFetch } from '../../test/mockFetch'

const EV_SEM = { id: 1, nombre: 'Encuentro de Semilleros de Investigación 2026', tipo: 'semilleros', edicion: '2026', fecha_inicio: '2026-12-10', fecha_fin: '2026-12-12', sede: 'Auditorio FCA', descripcion: 'Presentación de proyectos.', estado: 'programado', publico: 1 }
const EV_CON = { id: 2, nombre: 'Congreso 2026', tipo: 'congreso', edicion: '2026', fecha_inicio: '2026-11-20', fecha_fin: '2026-11-20', sede: null, descripcion: null, estado: 'programado', publico: 1, total_proyectos: 3, total_publicaciones: 8 }

const DIFUSION = {
  semilleros: [{
    ...EV_SEM,
    proyectos: [
      { id: 10, codigo: 'SEM-2026-001', titulo: 'Semillero de Finanzas', investigador_principal_nombre: 'Ana Soto', apartados: [{ apartado: 'Objetivo', contenido: 'Medir impacto' }, { apartado: 'Método', contenido: 'Encuesta' }] },
      { id: 11, codigo: 'SEM-2026-002', titulo: 'Semillero sin apartados', investigador_principal_nombre: 'Luis Mora', apartados: [] }
    ]
  }],
  congreso: [EV_CON],
  otros_eventos: [{ id: 3, nombre: 'Taller de escritura', tipo: 'otro', fecha_inicio: '2026-09-01', fecha_fin: null, estado: 'concluido', total_proyectos: 0, total_publicaciones: 0 }],
  proximos: [EV_CON, EV_SEM]
}

describe('formatRangoFechas', () => {
  it('formatea rangos y fechas sueltas', () => {
    expect(formatRangoFechas('2026-05-01', '2026-05-03')).toBe('01/05/2026 al 03/05/2026')
    expect(formatRangoFechas('2026-05-01', '2026-05-01')).toBe('01/05/2026')
    expect(formatRangoFechas(null, null)).toBe('Fecha por definir')
  })
})

describe('Eje3DifusionPublicScreen', () => {
  it('muestra semilleros con proyectos y apartados, congreso, próximos y otros', async () => {
    mockFetch([{ match: '/eje3/difusion', body: { success: true, data: DIFUSION } }])
    render(<Eje3DifusionPublicScreen />)
    expect(await screen.findByRole('heading', { name: 'Congreso Internacional de Investigación en Ciencias Económico Administrativas' })).toBeInTheDocument()
    const sem = screen.getByRole('region', { name: 'Semilleros de investigación' })
    expect(within(sem).getByText('Encuentro de Semilleros de Investigación 2026')).toBeInTheDocument()
    expect(within(sem).getByText('Semillero de Finanzas')).toBeInTheDocument()
    expect(within(sem).getByText('Objetivo')).toBeInTheDocument()
    expect(within(sem).getByText('Medir impacto')).toBeInTheDocument()
    expect(within(sem).getByText(/no tiene apartados anexos/)).toBeInTheDocument()
    const con = screen.getByRole('region', { name: /Congreso Internacional/ })
    expect(within(con).getByText('3 proyectos')).toBeInTheDocument()
    expect(within(con).getByText('8 publicaciones')).toBeInTheDocument()
    const prox = screen.getByRole('region', { name: 'Próximos eventos' })
    expect(within(prox).getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('Taller de escritura')).toBeInTheDocument()
  })

  it('no muestra datos del sistema ni enlaces de administración', async () => {
    mockFetch([{ match: '/eje3/difusion', body: { success: true, data: DIFUSION } }])
    render(<Eje3DifusionPublicScreen />)
    await screen.findByText('Taller de escritura')
    expect(screen.queryByText(/Eliminar|Nuevo evento|Editar/)).not.toBeInTheDocument()
  })

  it('muestra textos vacíos cuando no hay eventos', async () => {
    mockFetch([{ match: '/eje3/difusion', body: { success: true, data: { semilleros: [], congreso: [], otros_eventos: [], proximos: [] } } }])
    render(<Eje3DifusionPublicScreen />)
    expect(await screen.findByText('No hay eventos próximos programados.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay eventos de semilleros publicados.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay ediciones del congreso publicadas.')).toBeInTheDocument()
  })

  it('muestra aviso si el backend no responde', async () => {
    mockFetch([{ match: '/eje3/difusion', error: true }])
    render(<Eje3DifusionPublicScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
  })

  it('abre el detalle de un evento y vuelve', async () => {
    const user = userEvent.setup()
    const f = mockFetch([
      { match: /\/eje3\/difusion\/eventos\/2$/, body: { success: true, data: { ...EV_CON, proyectos: [{ id: 20, codigo: 'INV-1', titulo: 'Proyecto del congreso', investigador_principal_nombre: 'Eva Cruz', apartados: [] }], publicaciones: [{ id: 30, titulo: 'Artículo derivado', autores: 'Cruz, E.', anio: 2026 }] } } },
      { match: /\/eje3\/difusion$/, body: { success: true, data: DIFUSION } }
    ])
    render(<Eje3DifusionPublicScreen />)
    const con = await screen.findByRole('region', { name: /Congreso Internacional/ })
    await user.click(within(con).getByRole('button', { name: 'Ver detalle de Congreso 2026' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Congreso 2026' })).toBeInTheDocument()
    expect(await screen.findByText('Proyecto del congreso')).toBeInTheDocument()
    expect(screen.getByText('Artículo derivado')).toBeInTheDocument()
    expect(f.calls.some((c) => /\/eje3\/difusion\/eventos\/2$/.test(c.url))).toBe(true)
    await user.click(screen.getByRole('button', { name: /Volver a eventos/ }))
    expect(await screen.findByRole('region', { name: 'Próximos eventos' })).toBeInTheDocument()
  })

  it('muestra aviso si el detalle no está disponible', async () => {
    const user = userEvent.setup()
    mockFetch([
      { match: /\/eje3\/difusion\/eventos\/2$/, status: 404, body: { success: false } },
      { match: /\/eje3\/difusion$/, body: { success: true, data: DIFUSION } }
    ])
    render(<Eje3DifusionPublicScreen />)
    const con = await screen.findByRole('region', { name: /Congreso Internacional/ })
    await user.click(within(con).getByRole('button', { name: 'Ver detalle de Congreso 2026' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
