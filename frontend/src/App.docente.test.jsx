import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch } from './test/mockFetch'

// Cabecera simulada: permite navegar a cualquier vista y cerrar sesión.
vi.mock('./components/BUAPHeader', () => ({
  default: ({ currentView, onNavigate, onLogout, isAuthenticated, isDocente }) => (
    <div data-testid="header" data-view={currentView} data-admin={String(isAuthenticated)} data-docente={String(isDocente)}>
      {['home', 'login', 'admin-panel', 'admin-eje3-registro', 'admin-docentes-usuarios', 'admin-docentes-revision', 'docente-mi-espacio', 'docente-proyectos', 'docente-cuenta'].map((v) => (
        <button key={v} onClick={() => onNavigate(v)}>{`ir:${v}`}</button>
      ))}
      <button onClick={onLogout}>salir</button>
    </div>
  )
}))

import App from './App'
import { SESSION_EXPIRED_EVENT } from './services/api'

const ADMIN = { id: 1, nombre: 'Admin', rol: 'administrador', investigador_id: null, debe_cambiar_password: 0 }
const DOCENTE = { id: 7, nombre: 'Ana Soto', correo: 'ana@buap.mx', rol: 'investigador', investigador_id: 3, debe_cambiar_password: 0 }
const DOCENTE_TEMPORAL = { ...DOCENTE, debe_cambiar_password: 1 }

const session = (user) => {
  localStorage.setItem('buap_auth_token', 'tok')
  localStorage.setItem('buap_auth_user', JSON.stringify(user))
}

const RESUMEN = {
  docente: { id: 3, nombre_completo: 'Ana Soto', snii_nivel: null, snii_elegible: 0 },
  proyectos_por_estado: { borrador: 0, enviado: 0, aprobado: 0, devuelto: 0 },
  total_proyectos: 0, publicaciones: [], total_publicaciones: 0, produccion_tecnica: [], total_produccion_tecnica: 0
}

const routes = (extra = []) => [
  ...extra,
  { match: '/docente/resumen', body: { success: true, data: RESUMEN } },
  { match: /\/docente\/proyectos(\?|$)/, body: { success: true, data: [] } },
  { match: /\/eje3\/eventos(\?|$)/, body: { success: true, data: [] } },
  { match: '/eje3/revision', body: { success: true, data: { pendientes: 0, proyectos: [] } } },
  { match: /\/eje3\/usuarios-docentes(\?|$)/, body: { success: true, data: [] } },
  { match: '/eje3/catalogos', body: { success: true, data: { relatores: 1 } } },
  { match: /\/(proyectos|publicaciones|categorias|investigadores|difusion|metricas)/, body: { success: true, data: [] } }
]

const go = async (user, view) => user.click(screen.getByRole('button', { name: `ir:${view}` }))
const currentView = () => screen.getByTestId('header').dataset.view

beforeEach(() => {
  mockFetch(routes())
})

describe('App · guard por rol', () => {
  it.each(['admin-panel', 'admin-eje3-registro', 'admin-docentes-usuarios', 'admin-docentes-revision'])(
    'sin sesión, %s redirige a login', async (view) => {
      const user = userEvent.setup()
      render(<App />)
      await go(user, view)
      expect(currentView()).toBe('login')
    }
  )

  it.each(['docente-mi-espacio', 'docente-proyectos', 'docente-cuenta'])('sin sesión, %s redirige a login', async (view) => {
    const user = userEvent.setup()
    render(<App />)
    await go(user, view)
    expect(currentView()).toBe('login')
    expect(screen.queryByRole('heading', { name: 'Mi espacio' })).not.toBeInTheDocument()
  })

  it.each(['admin-panel', 'admin-eje3-registro', 'admin-docentes-usuarios', 'admin-docentes-revision'])(
    'un docente que intenta entrar a %s vuelve a su espacio', async (view) => {
      session(DOCENTE)
      const user = userEvent.setup()
      render(<App />)
      await go(user, view)
      expect(currentView()).toBe('docente-mi-espacio')
      expect(await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Usuarios docentes' })).not.toBeInTheDocument()
    }
  )

  it.each(['docente-mi-espacio', 'docente-proyectos', 'docente-cuenta'])('un administrador que intenta entrar a %s va a su panel', async (view) => {
    session(ADMIN)
    const user = userEvent.setup()
    render(<App />)
    await go(user, view)
    expect(currentView()).toBe('admin-panel')
  })

  it('el estado de sesión se refleja en la cabecera según el rol', () => {
    session(DOCENTE)
    render(<App />)
    expect(screen.getByTestId('header').dataset.docente).toBe('true')
    expect(screen.getByTestId('header').dataset.admin).toBe('false')
  })
})

describe('App · pantallas por rol', () => {
  it('docente: renderiza Mi espacio, Mis proyectos y Mi cuenta, sin pie de página', async () => {
    session(DOCENTE)
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-mi-espacio')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeNull()
    await go(user, 'docente-proyectos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis proyectos' })).toBeInTheDocument()
    await go(user, 'docente-cuenta')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeNull()
  })

  it('admin: renderiza Usuarios docentes y Revisión de proyectos', async () => {
    session(ADMIN)
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-docentes-usuarios')
    expect(await screen.findByRole('heading', { level: 1, name: 'Usuarios docentes' })).toBeInTheDocument()
    await go(user, 'admin-docentes-revision')
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisión de proyectos' })).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeNull()
  })

  it('el menú del docente navega entre sus pantallas', async () => {
    session(DOCENTE)
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-mi-espacio')
    await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })
    await user.click(within(document.querySelector('aside.admin-desktop-sidebar')).getByText('Mis proyectos'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis proyectos' })).toBeInTheDocument()
    await waitFor(() => expect(currentView()).toBe('docente-proyectos'))
  })
})

describe('App · cambio de contraseña obligatorio', () => {
  it.each(['docente-mi-espacio', 'docente-proyectos'])('con contraseña temporal, %s cae en docente-cuenta', async (view) => {
    session(DOCENTE_TEMPORAL)
    const user = userEvent.setup()
    render(<App />)
    await go(user, view)
    expect(currentView()).toBe('docente-cuenta')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Debes cambiar tu contraseña temporal/)
    expect(screen.queryByRole('heading', { name: 'Mis proyectos' })).not.toBeInTheDocument()
  })

  it('al cambiarla se libera el acceso y se va a Mi espacio', async () => {
    session(DOCENTE_TEMPORAL)
    mockFetch(routes([{ method: 'POST', match: '/auth/cambiar-password', body: { success: true, message: 'Contraseña actualizada.' } }]))
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-cuenta')
    await user.type(await screen.findByLabelText('Contraseña actual'), 'Temporal123')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave456')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NuevaClave456')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })).toBeInTheDocument()
    expect(currentView()).toBe('docente-mi-espacio')
    await go(user, 'docente-proyectos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis proyectos' })).toBeInTheDocument()
  })

  it('un 403 cambio_password_obligatorio del backend lleva a docente-cuenta', async () => {
    session(DOCENTE)
    mockFetch(routes([{
      match: '/docente/resumen',
      status: 403,
      body: { success: false, message: 'Debes cambiar tu contraseña temporal antes de continuar.', errors: { codigo: ['cambio_password_obligatorio'] } }
    }]))
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-mi-espacio')
    await waitFor(() => expect(currentView()).toBe('docente-cuenta'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('buap_auth_user')).debe_cambiar_password).toBe(true)
  })
})

describe('App · sesión', () => {
  it('cerrar sesión limpia el estado y vuelve a home', async () => {
    session(DOCENTE)
    mockFetch(routes([{ method: 'POST', match: '/auth/logout', body: { success: true } }]))
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-mi-espacio')
    await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })
    await user.click(screen.getByRole('button', { name: 'salir' }))
    expect(currentView()).toBe('home')
    expect(screen.getByTestId('header').dataset.docente).toBe('false')
    expect(await screen.findByText('Sesión cerrada correctamente.')).toBeInTheDocument()
  })

  it('una petición con token que recibe 401 cierra la sesión local, va a login y avisa', async () => {
    session(DOCENTE)
    mockFetch(routes([{ match: '/docente/resumen', status: 401, body: { success: false, message: 'Sesión inválida' } }]))
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'docente-mi-espacio')
    await waitFor(() => expect(currentView()).toBe('login'))
    expect(await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(localStorage.getItem('buap_auth_token')).toBeNull()
    expect(screen.getByTestId('header').dataset.docente).toBe('false')
    // ya no hay acceso sin volver a iniciar sesión
    await go(user, 'docente-proyectos')
    expect(currentView()).toBe('login')
  })

  it('el evento de sesión expirada también cierra una sesión de administrador', async () => {
    session(ADMIN)
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'admin-eje3-registro')
    await screen.findByRole('heading', { name: 'Registro de investigación' })
    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    })
    await waitFor(() => expect(currentView()).toBe('login'))
    expect(screen.getByTestId('header').dataset.admin).toBe('false')
  })

  it('un login fallido (sin token) no dispara el aviso de sesión expirada', async () => {
    mockFetch([{ method: 'POST', match: '/auth/login', status: 401, body: { success: false, message: 'Credenciales incorrectas.' } }])
    const user = userEvent.setup()
    render(<App />)
    await go(user, 'login')
    await user.click(await screen.findByRole('button', { name: 'Ingresar al Sistema' }))
    expect(await screen.findByText('Credenciales incorrectas.')).toBeInTheDocument()
    expect(screen.queryByText('Tu sesión expiró. Inicia sesión de nuevo.')).not.toBeInTheDocument()
    expect(currentView()).toBe('login')
  })
})

describe('App · login enruta por rol', () => {
  const loginRoute = (user) => ({ method: 'POST', match: '/auth/login', body: { success: true, message: 'ok', data: { token: 'tok-login', user } } })
  const doLogin = async (user, email, pass) => {
    await go(user, 'login')
    const emailInput = await screen.findByPlaceholderText('ejemplo@correo.buap.mx')
    await user.clear(emailInput)
    await user.type(emailInput, email)
    const passInput = screen.getByPlaceholderText('Ingresa tu contraseña')
    await user.clear(passInput)
    await user.type(passInput, pass)
    await user.click(screen.getByRole('button', { name: 'Ingresar al Sistema' }))
  }

  it('administrador: va al panel con el toast de siempre', async () => {
    mockFetch(routes([loginRoute(ADMIN)]))
    const user = userEvent.setup()
    render(<App />)
    await doLogin(user, 'admin@buap.mx', 'admin123')
    await waitFor(() => expect(currentView()).toBe('admin-panel'))
    expect(await screen.findByText('Bienvenida(o), Admin')).toBeInTheDocument()
    expect(screen.getByTestId('header').dataset.admin).toBe('true')
  })

  it('docente: va a Mi espacio', async () => {
    mockFetch(routes([loginRoute(DOCENTE)]))
    const user = userEvent.setup()
    render(<App />)
    await doLogin(user, 'ana@buap.mx', 'lector123')
    await waitFor(() => expect(currentView()).toBe('docente-mi-espacio'))
    expect(await screen.findByText('Bienvenida(o) a tu espacio, Ana Soto')).toBeInTheDocument()
    expect(screen.getByTestId('header').dataset.docente).toBe('true')
    expect(screen.getByTestId('header').dataset.admin).toBe('false')
  })

  it('docente con contraseña temporal: va a Mi cuenta', async () => {
    mockFetch(routes([loginRoute(DOCENTE_TEMPORAL)]))
    const user = userEvent.setup()
    render(<App />)
    await doLogin(user, 'ana@buap.mx', 'Temporal123')
    await waitFor(() => expect(currentView()).toBe('docente-cuenta'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Debes cambiar tu contraseña temporal/)
  })

  it('un rol no permitido (lector) es rechazado y se queda en login', async () => {
    mockFetch(routes([loginRoute({ ...ADMIN, rol: 'lector' })]))
    const user = userEvent.setup()
    render(<App />)
    await doLogin(user, 'lector@buap.mx', 'lector123')
    expect(await screen.findByText(/disponible solo para administradores y docentes/)).toBeInTheDocument()
    expect(currentView()).toBe('login')
    expect(localStorage.getItem('buap_auth_token')).toBeNull()
  })
})
