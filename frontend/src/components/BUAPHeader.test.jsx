import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BUAPHeader from './BUAPHeader'

const renderHeader = (props = {}) => {
  const onNavigate = vi.fn()
  render(<BUAPHeader currentView="home" onNavigate={onNavigate} isAuthenticated={false} onLogout={() => {}} {...props} />)
  return { onNavigate }
}

const desktopNav = () => within(document.querySelector('nav.nav-links'))

describe('BUAPHeader · enlaces del Eje 3', () => {
  it('mantiene los enlaces anteriores y añade solo Eventos en escritorio (sin Producción académica)', () => {
    renderHeader()
    ;['Inicio', 'Carpetas por Año', 'Eventos', 'Acerca de'].forEach((t) =>
      expect(desktopNav().getByText(t)).toBeInTheDocument()
    )
    expect(desktopNav().queryByText('Producción académica')).not.toBeInTheDocument()
    expect(desktopNav().getByText('Iniciar sesión')).toBeInTheDocument()
    expect(desktopNav().queryByText('Acceso administrador')).not.toBeInTheDocument()
  })

  it('el enlace Eventos navega a eje3-difusion', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHeader()
    await user.click(desktopNav().getByText('Eventos'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['eje3-difusion'])
  })

  it('marca como activo el enlace de la vista actual', () => {
    renderHeader({ currentView: 'eje3-difusion' })
    expect(desktopNav().getByText('Eventos')).toHaveClass('active')
  })

  it('el drawer móvil incluye Eventos (sin Producción académica) y navega', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHeader({ currentView: 'eje3-difusion' })
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú principal móvil' }))
    ;['Inicio', 'Carpetas por Año', 'Eventos', 'Acerca de'].forEach((t) =>
      expect(drawer.getByRole('button', { name: t })).toBeInTheDocument()
    )
    expect(drawer.queryByRole('button', { name: 'Producción académica' })).not.toBeInTheDocument()
    expect(drawer.getByRole('button', { name: 'Eventos' })).toHaveClass('active')
    await user.click(drawer.getByRole('button', { name: 'Eventos' }))
    expect(onNavigate).toHaveBeenCalledWith('eje3-difusion')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('la navegación existente (Acerca de / iniciar sesión) no cambia', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHeader()
    await user.click(desktopNav().getByText('Acerca de'))
    await user.click(desktopNav().getByText('Iniciar sesión'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['acerca', 'login'])
  })
})

describe('BUAPHeader · sesión por rol', () => {
  it('sin sesión muestra "Iniciar sesión" en escritorio y en el drawer (nunca "Acceso administrador")', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHeader()
    expect(desktopNav().getByText('Iniciar sesión')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú principal móvil' }))
    expect(drawer.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Acceso administrador')).not.toBeInTheDocument()
    await user.click(drawer.getByRole('button', { name: 'Iniciar sesión' }))
    expect(onNavigate).toHaveBeenCalledWith('login')
  })

  it('con sesión de administrador en una vista pública el botón lleva al panel', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderHeader({ isAuthenticated: true })
    expect(desktopNav().queryByText('Iniciar sesión')).not.toBeInTheDocument()
    await user.click(desktopNav().getByText('Ir al panel'))
    expect(onNavigate).toHaveBeenCalledWith('admin-panel')
  })

  it('con sesión de docente en una vista pública muestra "Mi espacio" y "Cerrar sesión"', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    const { onNavigate } = renderHeader({ isDocente: true, onLogout })
    expect(desktopNav().queryByText('Iniciar sesión')).not.toBeInTheDocument()
    await user.click(desktopNav().getByText('Mi espacio'))
    expect(onNavigate).toHaveBeenCalledWith('docente-mi-espacio')
    await user.click(desktopNav().getByText('Cerrar sesión'))
    expect(onLogout).toHaveBeenCalled()
  })

  it('el drawer con sesión de docente ofrece Mi espacio y Cerrar sesión', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    const { onNavigate } = renderHeader({ isDocente: true, onLogout })
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú principal móvil' }))
    await user.click(drawer.getByRole('button', { name: 'Mi espacio' }))
    expect(onNavigate).toHaveBeenCalledWith('docente-mi-espacio')
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Menú principal móvil' })).getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalled()
  })

  it.each(['docente-mi-espacio', 'docente-proyectos', 'docente-cuenta'])('en la vista %s se comporta como en administración: Ver portal público y Cerrar sesión', async (view) => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    const { onNavigate } = renderHeader({ currentView: view, isDocente: true, onLogout })
    expect(desktopNav().queryByText('Mi espacio')).not.toBeInTheDocument()
    await user.click(desktopNav().getByText('Ver portal público'))
    expect(onNavigate).toHaveBeenCalledWith('home')
    await user.click(desktopNav().getByText('Cerrar sesión'))
    expect(onLogout).toHaveBeenCalled()
  })
})
