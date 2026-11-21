import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDocentesUsuariosScreen from './AdminDocentesUsuariosScreen'
import { mockFetch } from '../../test/mockFetch'

const CUENTAS = [
  { id: 7, nombre: 'Dra. Ana Soto', correo: 'ana@buap.mx', activo: 1, investigador_id: 1, investigador_nombre: 'Dra. Ana Soto', debe_cambiar_password: 0, ultimo_acceso: '2026-05-10 09:30:00', total_proyectos: 4 },
  { id: 8, nombre: 'Dr. Luis Mora', correo: 'luis@buap.mx', activo: 0, investigador_id: 2, investigador_nombre: 'Dr. Luis Mora', debe_cambiar_password: 1, ultimo_acceso: null, total_proyectos: 0 }
]
const INVESTIGADORES = [
  { id: 1, nombre_completo: 'Dra. Ana Soto', correo: 'ana@buap.mx' },
  { id: 2, nombre_completo: 'Dr. Luis Mora', correo: 'luis@buap.mx' },
  { id: 3, nombre_completo: 'Mtra. Rosa Vega', correo: 'rosa@buap.mx' }
]

function setup(extra = [], { showToast = vi.fn(), cuentas = CUENTAS } = {}) {
  const f = mockFetch([
    ...extra,
    { match: /\/eje3\/usuarios-docentes(\?|$)/, body: { success: true, data: cuentas } },
    { match: '/investigadores', body: { success: true, data: INVESTIGADORES } }
  ])
  render(<AdminDocentesUsuariosScreen onNavigate={() => {}} showToast={showToast} />)
  return { f, showToast }
}

const row = (name) => screen.getByText(name, { selector: 'td' }).closest('tr')

describe('AdminDocentesUsuariosScreen · lista', () => {
  it('lista las cuentas con estado, tipo de contraseña, último acceso y proyectos', async () => {
    setup()
    expect(await screen.findByText('Dra. Ana Soto', { selector: 'td' })).toBeInTheDocument()
    const ana = within(row('Dra. Ana Soto'))
    expect(ana.getByText('Activa')).toBeInTheDocument()
    expect(ana.getByText('Propia')).toBeInTheDocument()
    expect(ana.getByText('10/05/2026')).toBeInTheDocument()
    expect(ana.getByText('4')).toBeInTheDocument()
    const luis = within(row('Dr. Luis Mora'))
    expect(luis.getByText('Inactiva')).toBeInTheDocument()
    expect(luis.getByText('Temporal')).toBeInTheDocument()
    expect(luis.getByText('Nunca')).toBeInTheDocument()
    expect(screen.getByText('2 cuentas')).toBeInTheDocument()
  })

  it('el menú lateral marca "Usuarios docentes" como activo', async () => {
    setup()
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    expect(aside.querySelector('a.on')).toHaveTextContent('Usuarios docentes')
  })

  it('si el backend falla muestra aviso y no filas', async () => {
    mockFetch([{ match: '/eje3/usuarios-docentes', error: true }])
    render(<AdminDocentesUsuariosScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByText('No hay información disponible.')).toBeInTheDocument()
  })

  it('el buscador filtra con ?search', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.type(screen.getByLabelText('Buscar cuentas de docentes'), 'luis')
    await waitFor(() => expect(f.calls.some((c) => /search=luis/.test(c.url))).toBe(true))
  })
})

describe('AdminDocentesUsuariosScreen · crear cuenta', () => {
  it('solo ofrece docentes sin cuenta, precarga el correo y muestra la contraseña temporal una sola vez', async () => {
    const user = userEvent.setup()
    const { f } = setup([
      { method: 'POST', match: /\/eje3\/usuarios-docentes$/, status: 201, body: { success: true, data: { id: 9, nombre: 'Mtra. Rosa Vega', correo: 'rosa@buap.mx', investigador_id: 3, password_temporal: 'Xk7mQ2pRt9Wz' } } }
    ])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Crear cuenta de docente' })
    const select = await within(dialog).findByLabelText(/Docente/)
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBe(2))
    expect(within(select).queryByRole('option', { name: 'Dra. Ana Soto' })).not.toBeInTheDocument()
    await user.selectOptions(select, '3')
    expect(within(dialog).getByLabelText(/Correo de acceso/)).toHaveValue('rosa@buap.mx')
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))

    const pwd = await screen.findByRole('dialog', { name: 'Contraseña temporal generada' })
    expect(within(pwd).getByTestId('password-temporal')).toHaveTextContent('Xk7mQ2pRt9Wz')
    expect(within(pwd).getByText(/no se volverá a mostrar/i)).toBeInTheDocument()
    const post = f.calls.find((c) => c.method === 'POST')
    expect(post.body).toEqual({ investigador_id: 3, correo: 'rosa@buap.mx' })

    // al cerrar, la contraseña desaparece y no vuelve a mostrarse
    await user.click(within(pwd).getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByText('Xk7mQ2pRt9Wz')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // la lista se recarga
    await waitFor(() => expect(f.calls.filter((c) => c.method === 'GET' && /usuarios-docentes/.test(c.url)).length).toBeGreaterThan(1))
  })

  it('el botón Copiar escribe la contraseña en el portapapeles', async () => {
    const user = userEvent.setup()
    setup([{ method: 'POST', match: /\/eje3\/usuarios-docentes$/, status: 201, body: { success: true, data: { id: 9, nombre: 'Mtra. Rosa Vega', correo: 'rosa@buap.mx', password_temporal: 'Xk7mQ2pRt9Wz' } } }])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Crear cuenta de docente' })
    const select = await within(dialog).findByLabelText(/Docente/)
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBe(2))
    await user.selectOptions(select, '3')
    // userEvent.setup instala un portapapeles simulado en navigator.clipboard
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))
    const pwd = await screen.findByRole('dialog', { name: 'Contraseña temporal generada' })
    await user.click(within(pwd).getByRole('button', { name: 'Copiar contraseña' }))
    expect(writeText).toHaveBeenCalledWith('Xk7mQ2pRt9Wz')
    expect(await within(pwd).findByText('Copiada')).toBeInTheDocument()
  })

  it('exige seleccionar un docente y valida el formato del correo', async () => {
    const user = userEvent.setup()
    const { f } = setup()
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Crear cuenta de docente' })
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))
    expect(await within(dialog).findByText('Selecciona al docente para crear su cuenta.')).toBeInTheDocument()
    const select = within(dialog).getByLabelText(/Docente/)
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBe(2))
    await user.selectOptions(select, '3')
    await user.clear(within(dialog).getByLabelText(/Correo de acceso/))
    await user.type(within(dialog).getByLabelText(/Correo de acceso/), 'no-es-correo')
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))
    expect(await within(dialog).findByText('Ingresa un correo con formato válido.')).toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('muestra el error del backend (correo duplicado) y no muestra contraseña', async () => {
    const user = userEvent.setup()
    setup([{ method: 'POST', match: /\/eje3\/usuarios-docentes$/, status: 409, body: { success: false, message: 'Datos inválidos', errors: { correo: ['Ya existe una cuenta con ese correo.'] } } }])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Crear cuenta de docente' })
    const select = await within(dialog).findByLabelText(/Docente/)
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBe(2))
    await user.selectOptions(select, '3')
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))
    expect(await within(dialog).findByText('Ya existe una cuenta con ese correo.')).toBeInTheDocument()
    expect(screen.queryByTestId('password-temporal')).not.toBeInTheDocument()
  })
})

describe('AdminDocentesUsuariosScreen · restablecer y activar', () => {
  it('restablecer pide confirmación y muestra la nueva contraseña temporal', async () => {
    const user = userEvent.setup()
    const { f } = setup([
      { method: 'POST', match: '/eje3/usuarios-docentes/7/restablecer', body: { success: true, data: { id: 7, nombre: 'Dra. Ana Soto', correo: 'ana@buap.mx', password_temporal: 'Nueva4Temp8Ab' } } }
    ])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña de Dra. Ana Soto' }))
    const confirm = await screen.findByRole('dialog', { name: 'Restablecer contraseña' })
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)
    await user.click(within(confirm).getByRole('button', { name: 'Generar contraseña temporal' }))
    const pwd = await screen.findByRole('dialog', { name: 'Contraseña temporal generada' })
    expect(within(pwd).getByTestId('password-temporal')).toHaveTextContent('Nueva4Temp8Ab')
    expect(within(pwd).getByText(/Dra\. Ana Soto/)).toBeInTheDocument()
  })

  it('si restablecer falla muestra el error y no una contraseña', async () => {
    const user = userEvent.setup()
    setup([{ method: 'POST', match: '/eje3/usuarios-docentes/7/restablecer', status: 404, body: { success: false, message: 'Cuenta no encontrada.' } }])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña de Dra. Ana Soto' }))
    const confirm = await screen.findByRole('dialog', { name: 'Restablecer contraseña' })
    await user.click(within(confirm).getByRole('button', { name: 'Generar contraseña temporal' }))
    expect(await within(confirm).findByText('Cuenta no encontrada.')).toBeInTheDocument()
    expect(screen.queryByTestId('password-temporal')).not.toBeInTheDocument()
  })

  it('desactivar una cuenta activa pide confirmación y envía activo: 0', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'PUT', match: '/eje3/usuarios-docentes/7', body: { success: true, data: { id: 7, activo: 0 } } }])
    await screen.findByText('Dra. Ana Soto', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Desactivar cuenta de Dra. Ana Soto' }))
    const confirm = await screen.findByRole('dialog', { name: 'Desactivar cuenta' })
    expect(f.calls.some((c) => c.method === 'PUT')).toBe(false)
    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'PUT')).toBe(true))
    expect(f.calls.find((c) => c.method === 'PUT').body).toEqual({ activo: 0 })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Cuenta de Dra. Ana Soto desactivada.'))
  })

  it('activar una cuenta inactiva envía activo: 1 sin confirmación', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([{ method: 'PUT', match: '/eje3/usuarios-docentes/8', body: { success: true, data: { id: 8, activo: 1 } } }])
    await screen.findByText('Dr. Luis Mora', { selector: 'td' })
    await user.click(screen.getByRole('button', { name: 'Activar cuenta de Dr. Luis Mora' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'PUT')).toBe(true))
    expect(f.calls.find((c) => c.method === 'PUT').body).toEqual({ activo: 1 })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Cuenta de Dr. Luis Mora activada.'))
  })
})
