import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocenteMiEspacioScreen from './DocenteMiEspacioScreen'
import { mockFetch } from '../../test/mockFetch'

const RESUMEN = {
  docente: { id: 3, nombre_completo: 'Dra. Ana Soto', correo: 'ana@buap.mx', afiliacion: 'Facultad de Administración', categoria: 'PTC', linea_investigacion: 'Finanzas', snii_nivel: 'I', snii_elegible: 1 },
  proyectos_por_estado: { borrador: 1, enviado: 2, aprobado: 3, devuelto: 1 },
  total_proyectos: 7,
  publicaciones: [{ id: 1, titulo: 'Finanzas verdes', anio: 2025, revista_editorial: 'Revista PYAD', origen: 'revista_pyad' }],
  total_publicaciones: 1,
  produccion_tecnica: [{ id: 4, tipo: 'Software', titulo: 'Modelo de costos', anio: 2024 }],
  total_produccion_tecnica: 1
}

const PROYECTOS = [
  { id: 1, codigo: 'INV-2026-001', titulo: 'Proyecto devuelto', tipo: 'investigacion', registro_estado: 'devuelto', comentario_revision: 'Falta la metodología' },
  { id: 2, codigo: 'SEM-2026-001', titulo: 'Proyecto aprobado', tipo: 'semillero', registro_estado: 'aprobado', comentario_revision: null },
  ...Array.from({ length: 5 }, (_, i) => ({ id: 10 + i, codigo: `INV-2026-0${10 + i}`, titulo: `Extra ${i}`, tipo: 'investigacion', registro_estado: 'borrador', comentario_revision: null }))
]

const routes = (over = {}) => [
  { match: '/docente/resumen', ...(over.resumen || { body: { success: true, data: RESUMEN } }) },
  { match: /\/docente\/proyectos(\?|$)/, ...(over.proyectos || { body: { success: true, data: PROYECTOS } }) }
]

describe('DocenteMiEspacioScreen', () => {
  it('muestra datos personales, SNII, conteos por estado y producción de solo lectura', async () => {
    mockFetch(routes())
    render(<DocenteMiEspacioScreen onNavigate={() => {}} user={{ nombre: 'Ana' }} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi espacio' })).toBeInTheDocument()
    expect(await screen.findByText('Dra. Ana Soto', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('Facultad de Administración')).toBeInTheDocument()
    expect(screen.getByTestId('snii')).toHaveTextContent('SNII I')
    expect(screen.getByTestId('conteo-borrador')).toHaveTextContent('1')
    expect(screen.getByTestId('conteo-enviado')).toHaveTextContent('2')
    expect(screen.getByTestId('conteo-aprobado')).toHaveTextContent('3')
    expect(screen.getByTestId('conteo-devuelto')).toHaveTextContent('1')
    expect(screen.getByText('Finanzas verdes')).toBeInTheDocument()
    expect(screen.getByText('2025 · Revista PYAD')).toBeInTheDocument()
    expect(screen.getByText('Modelo de costos')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mis publicaciones (1)' })).toBeInTheDocument()
    // solo lectura: sin botones de edición de publicaciones
    expect(screen.queryByRole('button', { name: /Editar|Eliminar/ })).not.toBeInTheDocument()
  })

  it('lista como máximo 5 proyectos recientes con su estado y el comentario de los devueltos', async () => {
    mockFetch(routes())
    render(<DocenteMiEspacioScreen onNavigate={() => {}} />)
    const region = await screen.findByRole('region', { name: 'Proyectos recientes' })
    expect(await within(region).findByText('Proyecto devuelto')).toBeInTheDocument()
    expect(within(region).getAllByRole('listitem')).toHaveLength(5)
    expect(within(region).getByText(/Falta la metodología/)).toBeInTheDocument()
    expect(within(region).getByText('Devuelto')).toBeInTheDocument()
    expect(within(region).getByText('Aprobado')).toBeInTheDocument()
  })

  it('avisa cuando hay proyectos devueltos y lleva a Mis proyectos', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    mockFetch(routes())
    render(<DocenteMiEspacioScreen onNavigate={onNavigate} />)
    expect(await screen.findByTestId('aviso-devueltos')).toHaveTextContent('Tienes 1 proyecto devuelto')
    await user.click(screen.getByRole('button', { name: 'Revisar y corregir' }))
    expect(onNavigate).toHaveBeenCalledWith('docente-proyectos')
    await user.click(screen.getByRole('button', { name: 'Registrar proyecto' }))
    await user.click(screen.getByRole('button', { name: 'Ver todos mis proyectos' }))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['docente-proyectos', 'docente-proyectos', 'docente-proyectos'])
  })

  it('sin proyectos muestra el estado vacío', async () => {
    mockFetch(routes({ proyectos: { body: { success: true, data: [] } } }))
    render(<DocenteMiEspacioScreen onNavigate={() => {}} />)
    expect(await screen.findByText(/Aún no has registrado proyectos/)).toBeInTheDocument()
  })

  it('si el backend no responde muestra un aviso visible y ningún dato inventado', async () => {
    mockFetch([{ match: '/docente', error: true }])
    render(<DocenteMiEspacioScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByTestId('conteo-aprobado')).toHaveTextContent('—')
    expect(screen.queryByText('Dra. Ana Soto')).not.toBeInTheDocument()
    expect(screen.queryByTestId('aviso-devueltos')).not.toBeInTheDocument()
  })

  it('el menú lateral es el del docente', async () => {
    mockFetch(routes())
    render(<DocenteMiEspacioScreen onNavigate={() => {}} />)
    const aside = document.querySelector('aside.admin-desktop-sidebar')
    expect(within(aside).getByText('Mis proyectos')).toBeInTheDocument()
    expect(aside.querySelector('a.on')).toHaveTextContent('Mi espacio')
    await screen.findByText('Proyecto devuelto')
  })
})
