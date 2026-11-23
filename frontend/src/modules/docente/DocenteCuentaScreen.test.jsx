import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocenteCuentaScreen from './DocenteCuentaScreen'
import { mockFetch } from '../../test/mockFetch'

const USER = { id: 7, nombre: 'Ana Soto', correo: 'ana@buap.mx', cargo: 'PTC', rol: 'investigador', investigador_id: 3, debe_cambiar_password: 1 }

const setup = (props = {}) => {
  localStorage.setItem('buap_auth_token', 'tok')
  localStorage.setItem('buap_auth_user', JSON.stringify(USER))
  const onNavigate = vi.fn()
  const onPasswordChanged = vi.fn()
  const showToast = vi.fn()
  render(<DocenteCuentaScreen onNavigate={onNavigate} showToast={showToast} user={USER} onPasswordChanged={onPasswordChanged} {...props} />)
  return { onNavigate, onPasswordChanged, showToast }
}

const fill = async (user, actual, nueva, confirmar = nueva) => {
  await user.type(screen.getByLabelText('Contraseña actual'), actual)
  await user.type(screen.getByLabelText('Nueva contraseña'), nueva)
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), confirmar)
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('DocenteCuentaScreen', () => {
  it('muestra los datos de la cuenta', () => {
    setup()
    const datos = screen.getByRole('region', { name: 'Datos de la cuenta' })
    expect(within(datos).getByText('ana@buap.mx')).toBeInTheDocument()
    expect(within(datos).getByText('Ana Soto')).toBeInTheDocument()
  })

  it('cambio obligatorio: muestra el aviso y deshabilita el resto del menú', () => {
    setup({ obligatorio: true })
    expect(screen.getByRole('alert')).toHaveTextContent(/Debes cambiar tu contraseña temporal antes de continuar/)
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    expect(within(aside).getByText('Mi espacio').closest('a')).toHaveAttribute('aria-disabled', 'true')
    expect(within(aside).getByText('Mis proyectos').closest('a')).toHaveAttribute('aria-disabled', 'true')
  })

  it('sin cambio obligatorio no muestra el aviso y el menú está activo', () => {
    setup({ obligatorio: false })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    expect(within(aside).getByText('Mi espacio').closest('a')).not.toHaveAttribute('aria-disabled')
  })

  it('cambia la contraseña: POST /auth/cambiar-password, quita la obligación y avisa', async () => {
    const user = userEvent.setup()
    const f = mockFetch([{ method: 'POST', match: '/auth/cambiar-password', body: { success: true, message: 'Contraseña actualizada.' } }])
    const { onPasswordChanged, showToast } = setup({ obligatorio: true })
    await fill(user, 'Temporal123', 'NuevaClave456')
    await waitFor(() => expect(onPasswordChanged).toHaveBeenCalled())
    expect(f.calls[0].body).toEqual({ actual: 'Temporal123', nueva: 'NuevaClave456' })
    expect(showToast).toHaveBeenCalledWith('Contraseña actualizada.')
    expect(JSON.parse(localStorage.getItem('buap_auth_user')).debe_cambiar_password).toBe(false)
  })

  it('valida en el cliente: longitud mínima, distinta de la actual y confirmación', async () => {
    const user = userEvent.setup()
    const f = mockFetch([])
    setup()
    await fill(user, 'Temporal123', 'corta')
    expect(await screen.findByText(/al menos 8 caracteres/)).toBeInTheDocument()
    expect(screen.getAllByText(/La confirmación no coincide|al menos 8/).length).toBeGreaterThan(0)
    expect(f.calls).toHaveLength(0)
  })

  it('rechaza una nueva contraseña igual a la actual', async () => {
    const user = userEvent.setup()
    const f = mockFetch([])
    setup()
    await fill(user, 'Temporal123', 'Temporal123')
    expect(await screen.findByText('La nueva contraseña debe ser distinta de la actual.')).toBeInTheDocument()
    expect(f.calls).toHaveLength(0)
  })

  it('rechaza una confirmación distinta', async () => {
    const user = userEvent.setup()
    mockFetch([])
    setup()
    await fill(user, 'Temporal123', 'NuevaClave456', 'OtraClave789')
    expect(await screen.findByText('La confirmación no coincide con la nueva contraseña.')).toBeInTheDocument()
  })

  it('muestra los errores del backend (contraseña actual incorrecta) y no continúa', async () => {
    const user = userEvent.setup()
    mockFetch([{ method: 'POST', match: '/auth/cambiar-password', status: 400, body: { success: false, message: 'Datos inválidos', errors: { actual: ['La contraseña actual es incorrecta.'] } } }])
    const { onPasswordChanged } = setup({ obligatorio: true })
    await fill(user, 'mala-clave', 'NuevaClave456')
    expect(await screen.findByText('La contraseña actual es incorrecta.')).toBeInTheDocument()
    expect(onPasswordChanged).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('buap_auth_user')).debe_cambiar_password).toBe(1)
  })

  it('"Mostrar contraseñas" alterna el tipo de los campos', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'password')
    await user.click(screen.getByLabelText('Mostrar contraseñas'))
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'text')
  })
})
