import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch } from './test/mockFetch'

// Cabecera simulada: permite navegar a cualquier vista para probar el guard de App.
vi.mock('./components/BUAPHeader', () => ({
  default: ({ currentView, onNavigate }) => (
    <div data-testid="header" data-view={currentView}>
      {['admin-eje3-registro', 'admin-eje3-monitoreo', 'admin-eje3-visualizar', 'admin-eje3-difundir', 'admin-panel', 'eje3-visualizar', 'eje3-difusion', 'home'].map((v) => (
        <button key={v} onClick={() => onNavigate(v)}>{`ir:${v}`}</button>
      ))}
    </div>
  )
}))

import App from './App'

const ADMIN = { id: 1, nombre: 'Admin', rol: 'administrador' }
const login = () => {
  localStorage.setItem('buap_auth_token', 'tok')
  localStorage.setItem('buap_auth_user', JSON.stringify(ADMIN))
}

const apiRoutes = () => [
  { match: '/eje3/catalogos', body: { success: true, data: { relatores: 6, eventos: 1, docentes: 1 } } },
  { match: '/eje3/monitoreo', body: { success: true, data: { docentes_con_proyectos: 1, docentes_titulacion_civ: 1, profesores_snii: 1, profesores_elegibles_snii: 1, total_docentes: 3, docentes_con_semilleros: 0, snii_por_nivel: {}, detalle: {} } } },
  { match: '/eje3/visualizar', body: { success: true, data: { publicaciones_evento_pyad: 9, por_origen: {}, por_anio: [], produccion_docentes: [], totales: {} } } },
  { match: '/eje3/difusion', body: { success: true, data: { semilleros: [], congreso: [], otros_eventos: [], proximos: [] } } },
  { match: /\/eje3\/(eventos|docentes)/, body: { success: true, data: [] } }
]

const go = async (user, view) => user.click(screen.getByRole('button', { name: `ir:${view}` }))
const currentView = () => screen.getByTestId('header').dataset.view

beforeEach(() => {
  mockFetch(apiRoutes())
})

describe('App · guard de vistas admin del Eje 3', () => {
  it.each(['admin-eje3-registro', 'admin-eje3-monitoreo', 'admin-eje3-visualizar', 'admin-eje3-difundir'])(
    'sin sesión, %s redirige a login',
    async (view) => {
      const user = userEvent.setup()
      render(<App />)
      await go(user, view)
      expect(currentView()).toBe('login')
      expect(screen.queryByText('Eje 3 · Investigación')).not.toBeInTheDocument()
    }
  )

  it('con sesión, renderiza Registro', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-registro')
    expect(currentView()).toBe('admin-eje3-registro')
    expect(await screen.findByRole('heading', { name: 'Registro de investigación' })).toBeInTheDocument()
  })

  it('con sesión, renderiza Monitoreo', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-monitoreo')
    expect(await screen.findByRole('heading', { name: 'Monitoreo de investigación' })).toBeInTheDocument()
  })

  it('con sesión, renderiza Visualizar (admin)', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-visualizar')
    expect(currentView()).toBe('admin-eje3-visualizar')
    expect(await screen.findByRole('heading', { name: 'Visualizar producción' })).toBeInTheDocument()
    expect(await screen.findByTestId('kpi-publicaciones-evento-pyad')).toHaveTextContent('9')
  })

  it('con sesión, renderiza Difundir', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-difundir')
    expect(await screen.findByRole('heading', { name: 'Difusión de eventos' })).toBeInTheDocument()
  })

  it('las vistas admin ocultan el pie de página institucional', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    const footerSelector = 'footer'
    await go(user, 'admin-eje3-registro')
    await screen.findByRole('heading', { name: 'Registro de investigación' })
    expect(document.querySelector(footerSelector)).toBeNull()
  })
})

describe('App · vistas públicas del Eje 3 (solo Eventos)', () => {
  it('Producción académica ya no es una vista pública: eje3-visualizar cae en home', async () => {
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'eje3-visualizar')
    expect(currentView()).toBe('home')
    expect(screen.queryByTestId('kpi-publicaciones-evento-pyad')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Visualizar producción' })).not.toBeInTheDocument()
  })

  it('Eventos es accesible sin sesión y mantiene el pie de página', async () => {
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'eje3-difusion')
    expect(currentView()).toBe('eje3-difusion')
    expect(await screen.findByRole('heading', { level: 1, name: 'Eventos de investigación' })).toBeInTheDocument()
    expect(document.querySelector('footer')).not.toBeNull()
  })

  it('Eventos no redirige a login con la sesión cerrada', async () => {
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'eje3-difusion')
    expect(currentView()).toBe('eje3-difusion')
  })

  it('desde el menú admin se puede navegar entre vistas del Eje 3 con sesión', async () => {
    login()
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-registro')
    await screen.findByRole('heading', { name: 'Registro de investigación' })
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    await user.click(within(aside).getByText('Monitoreo'))
    expect(await screen.findByRole('heading', { name: 'Monitoreo de investigación' })).toBeInTheDocument()
    await waitFor(() => expect(currentView()).toBe('admin-eje3-monitoreo'))
  })
})
