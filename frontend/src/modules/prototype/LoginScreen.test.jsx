import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch } from '../../test/mockFetch'
import LoginScreen from './LoginScreen'

// Mensajes REALES del backend tras la auditoría: el mismo texto y código (401) para correo desconocido y
// contraseña errónea (no revela si la cuenta existe); el bloqueo (403) sigue informando el límite.
const MSG_CREDENCIALES = 'Credenciales de acceso incorrectas.'
const MSG_BLOQUEO = 'Has superado el límite de 5 intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos por seguridad.'

const intentarLogin = async (status, message) => {
  mockFetch([{ method: 'POST', match: '/auth/login', status, body: { success: false, message, errors: null } }])
  const user = userEvent.setup()
  render(<LoginScreen onLoginSuccess={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Ingresar al Sistema' }))
}

describe('LoginScreen · mensajes de error del backend', () => {
  it('muestra el mensaje uniforme de credenciales incorrectas (401)', async () => {
    await intentarLogin(401, MSG_CREDENCIALES)
    expect(await screen.findByText(MSG_CREDENCIALES)).toBeInTheDocument()
  })

  it('muestra el aviso de bloqueo temporal (403) con el límite de intentos', async () => {
    await intentarLogin(403, MSG_BLOQUEO)
    expect(await screen.findByText(MSG_BLOQUEO)).toBeInTheDocument()
  })

  it('muestra el aviso de cuenta inactiva (403) cuando la contraseña es correcta', async () => {
    const msg = 'Esta cuenta institucional se encuentra inactiva. Contacte al administrador del sistema.'
    await intentarLogin(403, msg)
    expect(await screen.findByText(msg)).toBeInTheDocument()
  })

  it('el mensaje de credenciales incorrectas no revela si el correo existe', async () => {
    await intentarLogin(401, MSG_CREDENCIALES)
    await screen.findByText(MSG_CREDENCIALES)
    expect(screen.queryByText(/no registrado|te quedan/i)).not.toBeInTheDocument()
  })
})
