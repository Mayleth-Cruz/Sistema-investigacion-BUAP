import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminSidebar from './AdminSidebar'
import { mockFetch } from '../test/mockFetch'

const desktop = () => document.querySelector('aside.admin-desktop-sidebar')

describe('AdminSidebar · escritorio', () => {
  it('conserva los 4 items antiguos, el grupo Eje 3 con 4 items y el grupo Docentes con 2', () => {
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} />)
    const side = within(desktop())
    ;['Panel', 'Subir artículo', 'Autores', 'Categorías'].forEach((t) => expect(side.getByText(t)).toBeInTheDocument())
    expect(side.getByText('Eje 3 · Investigación')).toBeInTheDocument()
    ;['Registro', 'Monitoreo', 'Visualizar', 'Difundir'].forEach((t) => expect(side.getByText(t)).toBeInTheDocument())
    expect(desktop().querySelectorAll('a')).toHaveLength(10)
  })

  it('los items antiguos navegan a las mismas vistas', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="panel" onNavigate={onNavigate} />)
    const side = within(desktop())
    await user.click(side.getByText('Panel'))
    await user.click(side.getByText('Autores'))
    await user.click(side.getByText('Categorías'))
    await user.click(side.getByText('Subir artículo'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['admin-panel', 'admin-authors', 'admin-categories', 'admin-upload'])
  })

  it('"Subir artículo" usa onUploadClick cuando se proporciona', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onUploadClick = vi.fn()
    render(<AdminSidebar activeNav="panel" onNavigate={onNavigate} onUploadClick={onUploadClick} />)
    await user.click(within(desktop()).getByText('Subir artículo'))
    expect(onUploadClick).toHaveBeenCalled()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('los items del Eje 3 navegan a las vistas admin-eje3-*', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="panel" onNavigate={onNavigate} />)
    const side = within(desktop())
    await user.click(side.getByText('Registro'))
    await user.click(side.getByText('Monitoreo'))
    await user.click(side.getByText('Visualizar'))
    await user.click(side.getByText('Difundir'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual([
      'admin-eje3-registro', 'admin-eje3-monitoreo', 'admin-eje3-visualizar', 'admin-eje3-difundir'
    ])
  })

  it.each([
    ['panel', 'Panel'], ['subir', 'Subir artículo'], ['autores', 'Autores'], ['categorias', 'Categorías'],
    ['eje3-registro', 'Registro'], ['eje3-monitoreo', 'Monitoreo'], ['eje3-visualizar', 'Visualizar'], ['eje3-difundir', 'Difundir']
  ])('marca como activo "%s"', (nav, label) => {
    render(<AdminSidebar activeNav={nav} onNavigate={() => {}} />)
    const active = desktop().querySelectorAll('a.on')
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent(label)
  })
})

describe('AdminSidebar · título (getTitle) y drawer móvil', () => {
  it.each([
    ['panel', 'Panel de administración'],
    ['subir', 'Subir artículo'],
    ['autores', 'Directorio de autores'],
    ['categorias', 'Categorías y áreas'],
    ['eje3-registro', 'Eje 3 · Registro'],
    ['eje3-monitoreo', 'Eje 3 · Monitoreo'],
    ['eje3-visualizar', 'Eje 3 · Visualizar'],
    ['eje3-difundir', 'Eje 3 · Difundir'],
    ['otra-cosa', 'Administración']
  ])('muestra el título de %s', (nav, title) => {
    render(<AdminSidebar activeNav={nav} onNavigate={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Abrir menú de administración' })
    expect(within(trigger).getByText(title, { selector: 'strong' })).toBeInTheDocument()
  })

  it('el drawer lista items antiguos y nuevos, y navega al elegir uno', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="eje3-monitoreo" onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú de administración' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Menú de administración' }))
    ;['Panel principal', 'Subir artículo', 'Autores e Investigadores', 'Categorías y Áreas'].forEach((t) =>
      expect(drawer.getByText(t)).toBeInTheDocument()
    )
    expect(drawer.getByText('Eje 3 · Investigación')).toBeInTheDocument()
    const items = ['Registro', 'Monitoreo', 'Visualizar', 'Difundir']
    items.forEach((t) => expect(drawer.getByRole('button', { name: t })).toBeInTheDocument())
    expect(drawer.getByRole('button', { name: 'Monitoreo' })).toHaveClass('active')
    expect(drawer.getByRole('button', { name: 'Registro' })).not.toHaveClass('active')

    await user.click(drawer.getByRole('button', { name: 'Difundir' }))
    expect(onNavigate).toHaveBeenCalledWith('admin-eje3-difundir')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el drawer mantiene la navegación antigua', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="panel" onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú de administración' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Categorías y Áreas' }))
    expect(onNavigate).toHaveBeenCalledWith('admin-categories')
  })

  it('el drawer se cierra con Escape', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Abrir menú de administración' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AdminSidebar · grupo Docentes', () => {
  const mobileDrawer = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Abrir menú de administración' }))
    return within(screen.getByRole('dialog', { name: 'Menú de administración' }))
  }

  it('añade el grupo Docentes en escritorio sin quitar nada anterior', () => {
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} pendientes={null} />)
    const side = within(desktop())
    expect(side.getByText('Docentes', { selector: 'h3' })).toBeInTheDocument()
    expect(side.getByText('Usuarios docentes')).toBeInTheDocument()
    expect(side.getByText('Revisión de proyectos')).toBeInTheDocument()
    ;['Panel', 'Subir artículo', 'Autores', 'Categorías', 'Registro', 'Monitoreo', 'Visualizar', 'Difundir'].forEach((t) =>
      expect(side.getByText(t)).toBeInTheDocument()
    )
  })

  it('los items nuevos navegan a admin-docentes-*', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="panel" onNavigate={onNavigate} pendientes={null} />)
    await user.click(within(desktop()).getByText('Usuarios docentes'))
    await user.click(within(desktop()).getByText('Revisión de proyectos'))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['admin-docentes-usuarios', 'admin-docentes-revision'])
  })

  it.each([['docentes-usuarios', 'Usuarios docentes'], ['docentes-revision', 'Revisión de proyectos']])('marca como activo "%s"', (nav, label) => {
    render(<AdminSidebar activeNav={nav} onNavigate={() => {}} pendientes={null} />)
    const active = desktop().querySelectorAll('a.on')
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent(label)
  })

  it('el disparador móvil muestra el título del grupo Docentes y el drawer lista los items', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AdminSidebar activeNav="docentes-revision" onNavigate={onNavigate} pendientes={null} />)
    expect(screen.getByRole('button', { name: 'Abrir menú de administración' })).toHaveTextContent('Docentes · Revisión')
    const drawer = await mobileDrawer(user)
    expect(drawer.getByRole('button', { name: 'Usuarios docentes' })).toBeInTheDocument()
    expect(drawer.getByRole('button', { name: /Revisión de proyectos/ })).toHaveClass('active')
    await user.click(drawer.getByRole('button', { name: 'Usuarios docentes' }))
    expect(onNavigate).toHaveBeenCalledWith('admin-docentes-usuarios')
  })

  it('muestra el contador de pendientes recibido por prop (escritorio y móvil)', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} pendientes={3} />)
    expect(within(desktop()).getByLabelText('3 pendientes')).toHaveTextContent('3')
    const drawer = await mobileDrawer(user)
    expect(drawer.getByLabelText('3 pendientes')).toBeInTheDocument()
  })

  it('sin pendientes (0 o desconocido) no muestra distintivo', () => {
    const { rerender } = render(<AdminSidebar activeNav="panel" onNavigate={() => {}} pendientes={0} />)
    expect(document.querySelector('.docente-badge')).toBeNull()
    rerender(<AdminSidebar activeNav="panel" onNavigate={() => {}} pendientes={null} />)
    expect(document.querySelector('.docente-badge')).toBeNull()
  })

  it('consulta GET /eje3/revision con sesión admin y muestra el contador', async () => {
    localStorage.setItem('buap_auth_token', 'tok')
    localStorage.setItem('buap_auth_user', JSON.stringify({ id: 1, rol: 'administrador' }))
    const f = mockFetch([{ match: '/eje3/revision', body: { success: true, data: { pendientes: 5, proyectos: [] } } }])
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} />)
    expect(await within(desktop()).findByLabelText('5 pendientes')).toBeInTheDocument()
    expect(f.calls.filter((c) => /\/eje3\/revision$/.test(c.url))).toHaveLength(1)
  })

  it('si la consulta falla no muestra distintivo', async () => {
    localStorage.setItem('buap_auth_token', 'tok')
    localStorage.setItem('buap_auth_user', JSON.stringify({ id: 1, rol: 'administrador' }))
    const f = mockFetch([{ match: '/eje3/revision', error: true }])
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} />)
    await waitFor(() => expect(f.calls.length).toBeGreaterThan(0))
    expect(document.querySelector('.docente-badge')).toBeNull()
  })

  it('sin sesión no consulta nada', async () => {
    const f = mockFetch([])
    render(<AdminSidebar activeNav="panel" onNavigate={() => {}} />)
    await new Promise((r) => setTimeout(r, 20))
    expect(f.calls).toHaveLength(0)
  })
})
