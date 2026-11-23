import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Eje3VisualizarScreen, { Eje3VisualizarPanel } from './Eje3VisualizarScreen'
import { mockFetch } from '../../test/mockFetch'

const DATA = {
  publicaciones_evento_pyad: 7,
  por_origen: { evento: 4, revista_pyad: 3, otra: 5 },
  por_anio: [
    { anio: 2024, evento: 1, revista_pyad: 1, otra: 2, total: 4 },
    { anio: 2025, evento: 3, revista_pyad: 2, otra: 3, total: 8 }
  ],
  produccion_docentes: [
    { investigador_id: 1, nombre_completo: 'Ana Soto', afiliacion: 'FCA', publicaciones: 5, proyectos: 2, produccion_tecnica: 1, total: 8 },
    { investigador_id: 2, nombre_completo: 'Luis Mora', afiliacion: 'FCA', publicaciones: 2, proyectos: 1, produccion_tecnica: 0, total: 3 }
  ],
  totales: { publicaciones: 12, proyectos: 6, produccion_tecnica: 2, docentes: 9 }
}

describe('Eje3VisualizarPanel', () => {
  it('presenta KPI, origen, años y ranking', () => {
    render(<Eje3VisualizarPanel data={DATA} />)
    expect(screen.getByTestId('kpi-publicaciones-evento-pyad')).toHaveTextContent('7')
    expect(screen.getByTestId('kpi-publicaciones-evento-pyad')).toHaveTextContent(/eventos y revista PYAD/)
    expect(screen.getByRole('listitem', { name: 'Eventos: 4' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Revista PYAD: 3' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Otras publicaciones: 5' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: '2025: 8 publicaciones' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: '2024: 4 publicaciones' })).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Ana Soto')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Luis Mora')).toBeInTheDocument()
  })

  it('tolera datos vacíos', () => {
    render(<Eje3VisualizarPanel data={{ publicaciones_evento_pyad: 0, por_origen: {}, por_anio: [], produccion_docentes: [], totales: {} }} />)
    expect(screen.getByText(/Aún no hay publicaciones registradas por año/)).toBeInTheDocument()
    expect(screen.getByText(/Aún no hay producción académica registrada/)).toBeInTheDocument()
  })
})

describe('Eje3VisualizarScreen', () => {
  it('carga con el token de administrador y solicita /eje3/visualizar', async () => {
    localStorage.setItem('buap_auth_token', 'tok')
    const f = mockFetch([{ match: '/eje3/visualizar', body: { success: true, data: DATA } }])
    render(<Eje3VisualizarScreen onNavigate={() => {}} />)
    expect(await screen.findByTestId('kpi-publicaciones-evento-pyad')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Visualizar producción' })).toBeInTheDocument()
    expect(f.calls[0].url).toMatch(/\/eje3\/visualizar$/)
    expect(JSON.stringify(f.calls[0])).toMatch(/tok/)
  })

  it('incluye el menú lateral con Visualizar activo', async () => {
    mockFetch([{ match: '/eje3/visualizar', body: { success: true, data: DATA } }])
    render(<Eje3VisualizarScreen onNavigate={() => {}} />)
    await screen.findByTestId('kpi-publicaciones-evento-pyad')
    expect(screen.getAllByText('Administración').length).toBeGreaterThan(0)
    const active = document.querySelector('.side a.on')
    expect(active).toHaveTextContent('Visualizar')
  })

  it('muestra aviso de error sin datos falsos', async () => {
    mockFetch([{ match: '/eje3/visualizar', error: true }])
    render(<Eje3VisualizarScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.queryByTestId('kpi-publicaciones-evento-pyad')).not.toBeInTheDocument()
  })

  it('sin sesión (401) el aviso sugiere que la sesión siga activa', async () => {
    mockFetch([{ match: '/eje3/visualizar', status: 401, body: { success: false } }])
    render(<Eje3VisualizarScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión siga activa/)
  })

  it('muestra estado de carga inicial', () => {
    mockFetch([{ match: '/eje3/visualizar', body: { success: true, data: DATA } }])
    render(<Eje3VisualizarScreen onNavigate={() => {}} />)
    expect(screen.getByText('Cargando información...')).toBeInTheDocument()
  })
})
