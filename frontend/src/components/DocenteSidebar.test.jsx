import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocenteSidebar from './DocenteSidebar'

const desktop = () => document.querySelector('aside.admin-desktop-sidebar')

describe('DocenteSidebar · escritorio', () => {
  it('muestra el menú corto: Mi espacio, Mis proyectos y Mi cuenta (sin zona de administración)', () => {
    render(<DocenteSidebar activeNav="mi-espacio" onNavigate={() => {}} />)
    const side = within(desktop())
    ;['Mi espacio', 'Mis proyectos', 'Mi cuenta'].forEach((t) => expect(side.getByText(t)).toBeInTheDocument())
    expect(desktop().querySelectorAll('a')).toHaveLength(3)
    expect(side.queryByText('Panel')).not.toBeInTheDocument()
    expect(side.queryByText('Eje 3 · Investigación')).not.toBeInTheDocument()
  })

  it('navega a las vistas docente-*', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<DocenteSidebar activeNav="mi-espacio" onNavigate={onNavigate} />)
    const side = within(desktop())
    await user.click(side.getByText('Mis proyectos'))
    await user.click(side.getByText('Mi cuenta'))
    await user.click(side.getByText('Mi espacio'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['docente-proyectos', 'docente-cuenta', 'docente-mi-espacio'])
  })

  it.each([['mi-espacio', 'Mi espacio'], ['proyectos', 'Mis proyectos'], ['cuenta', 'Mi cuenta']])('marca como activo "%s"', (nav, label) => {
    render(<DocenteSidebar activeNav={nav} onNavigate={() => {}} />)
    const active = desktop().querySelectorAll('a.on')
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent(label)
  })

  it('con soloCuenta (contraseña temporal) solo "Mi cuenta" navega; el resto queda deshabilitado', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<DocenteSidebar activeNav="cuenta" onNavigate={onNavigate} soloCuenta />)
    const side = within(desktop())
    await user.click(side.getByText('Mi espacio'))
    await user.click(side.getByText('Mis proyectos'))
    expect(onNavigate).not.toHaveBeenCalled()
    expect(side.getByText('Mis proyectos').closest('a')).toHaveAttribute('aria-disabled', 'true')
    await user.click(side.getByText('Mi cuenta'))
    expect(onNavigate).toHaveBeenCalledWith('docente-cuenta')
  })

  it('muestra el nombre del docente si se proporciona', () => {
    render(<DocenteSidebar activeNav="mi-espacio" nombre="Ana Soto" />)
    expect(within(desktop()).getByText('Ana Soto')).toBeInTheDocument()
  })
})

describe('DocenteSidebar · drawer móvil', () => {
  it('abre el drawer con los 3 items y "Ver portal público"', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<DocenteSidebar activeNav="proyectos" onNavigate={onNavigate} />)
    expect(screen.getByRole('button', { name: 'Abrir menú del docente' })).toHaveTextContent('Mis proyectos')
    await user.click(screen.getByRole('button', { name: 'Abrir menú del docente' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú del docente' }))
    ;['Mi espacio', 'Mis proyectos', 'Mi cuenta'].forEach((t) => expect(drawer.getByRole('button', { name: t })).toBeInTheDocument())
    expect(drawer.getByRole('button', { name: 'Mis proyectos' })).toHaveClass('active')
    await user.click(drawer.getByRole('button', { name: 'Mi cuenta' }))
    expect(onNavigate).toHaveBeenCalledWith('docente-cuenta')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Ver portal público" navega a home', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<DocenteSidebar onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú del docente' }))
    await user.click(screen.getByRole('button', { name: /Ver portal público/ }))
    expect(onNavigate).toHaveBeenCalledWith('home')
  })

  it('con soloCuenta los items del drawer distintos de Mi cuenta están deshabilitados', async () => {
    const user = userEvent.setup()
    render(<DocenteSidebar activeNav="cuenta" onNavigate={() => {}} soloCuenta />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú del docente' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú del docente' }))
    expect(drawer.getByRole('button', { name: 'Mis proyectos' })).toBeDisabled()
    expect(drawer.getByRole('button', { name: 'Mi cuenta' })).toBeEnabled()
  })

  it('Escape cierra el drawer', async () => {
    const user = userEvent.setup()
    render(<DocenteSidebar onNavigate={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú del docente' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
