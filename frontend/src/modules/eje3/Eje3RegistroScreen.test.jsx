import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Eje3RegistroScreen from './Eje3RegistroScreen'
import { mockFetch } from '../../test/mockFetch'

const CATALOGOS = {
  proyectos_investigacion: 3, proyectos_semilleros: 4, proyectos_titulacion: 2, dictaminadores: 5,
  moderadores: 3, relatores: 6, dictaminadores_pyad: 3, retribucion_mpymes: 2, retribucion_mgt: 2,
  retribucion_mdge: 2, egresados: 4, eventos: 4, docentes: 10
}

const RELATORES = [
  { id: 1, rol: 'relator', nombre_completo: 'Laura Pérez', correo: 'laura@buap.mx', institucion: 'BUAP', especialidad: 'Finanzas', evento_id: null, evento_nombre: null, activo: 1 },
  { id: 2, rol: 'relator', nombre_completo: 'Mario Ruiz', correo: null, institucion: 'UNAM', especialidad: 'Marketing', evento_id: 1, evento_nombre: 'Encuentro 2026', activo: 0 }
]

function setup(extraRoutes = [], { showToast = vi.fn() } = {}) {
  const f = mockFetch([
    ...extraRoutes,
    { match: '/eje3/catalogos', body: { success: true, data: CATALOGOS } },
    { match: '/investigadores', body: { success: true, data: [{ id: 1, nombre_completo: 'Dra. Ana Soto' }, { id: 2, nombre_completo: 'Dr. Luis Mora' }] } },
    { match: /\/eje3\/eventos(\?|$)/, body: { success: true, data: [{ id: 1, nombre: 'Encuentro 2026' }] } }
  ])
  const onNavigate = vi.fn()
  render(<Eje3RegistroScreen onNavigate={onNavigate} showToast={showToast} />)
  return { f, onNavigate, showToast }
}

const openCatalog = async (user, name) => {
  await user.click(await screen.findByRole('button', { name: `Abrir ${name}` }))
}

describe('Eje3RegistroScreen · hub', () => {
  it('muestra las 11 tarjetas con sus conteos', async () => {
    setup()
    await waitFor(() => expect(screen.getByTestId('conteo-relatores')).toHaveTextContent('6'))
    expect(screen.getAllByRole('button', { name: /^Abrir (?!menú)/ })).toHaveLength(11)
    expect(screen.getByTestId('conteo-proyectos-semilleros')).toHaveTextContent('4')
    expect(screen.getByTestId('conteo-retribucion-mdge')).toHaveTextContent('2')
    expect(screen.getByText('Retribución social MGT')).toBeInTheDocument()
  })

  it('muestra un aviso (sin datos falsos) si el backend no responde', async () => {
    const f = mockFetch([{ match: '/eje3/catalogos', error: true }])
    render(<Eje3RegistroScreen onNavigate={() => {}} showToast={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByRole('alert')).toHaveTextContent(/sesión siga activa/)
    expect(screen.getByTestId('conteo-relatores')).toHaveTextContent('—')
    expect(f).toHaveBeenCalled()
  })

  it('muestra el aviso ante 401', async () => {
    mockFetch([{ match: '/eje3/catalogos', status: 401, body: { success: false } }])
    render(<Eje3RegistroScreen onNavigate={() => {}} />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('incluye el menú lateral con Registro activo', async () => {
    setup()
    expect(screen.getAllByText('Eje 3 · Investigación').length).toBeGreaterThan(0)
  })
})

describe('Eje3RegistroScreen · catálogo', () => {
  it('lista los registros con el filtro fijo y permite volver al hub', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }])
    await openCatalog(user, 'Relatores')
    expect(await screen.findByText('Laura Pérez')).toBeInTheDocument()
    expect(screen.getByText('Mario Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Encuentro 2026', { selector: 'td' })).toBeInTheDocument()
    expect(f.calls.some((c) => /\/eje3\/participantes\?rol=relator/.test(c.url))).toBe(true)
    expect(screen.getByText('2 registros')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Volver al registro/ }))
    expect(await screen.findByRole('button', { name: 'Abrir Relatores' })).toBeInTheDocument()
  })

  it('usa los filtros fijos de retribución social (programa)', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/retribucion-social\?/, body: { success: true, data: [] } }])
    await openCatalog(user, 'Retribución social MGT')
    await screen.findByText('No se encontraron registros.')
    expect(f.calls.some((c) => /\/eje3\/retribucion-social\?programa=MGT/.test(c.url))).toBe(true)
  })

  it('muestra estado vacío', async () => {
    const user = userEvent.setup()
    setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: [] } }])
    await openCatalog(user, 'Moderadores')
    expect(await screen.findByText('No se encontraron registros.')).toBeInTheDocument()
  })

  it('muestra aviso de error si falla la carga del listado', async () => {
    const user = userEvent.setup()
    setup([{ match: /\/eje3\/egresados\?|\/eje3\/egresados$/, status: 500, body: { success: false } }])
    await openCatalog(user, 'Actividades de egresados de posgrado')
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar la información/)
    expect(screen.getByText('No hay información disponible.')).toBeInTheDocument()
  })

  it('busca con debounce enviando el parámetro search', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }])
    await openCatalog(user, 'Relatores')
    await screen.findByText('Laura Pérez')
    await user.type(screen.getByLabelText('Buscar en el catálogo'), 'laura')
    await waitFor(() => expect(f.calls.some((c) => /search=laura/.test(c.url))).toBe(true))
  })

  it('filtra por evento', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }])
    await openCatalog(user, 'Relatores')
    await screen.findByText('Laura Pérez')
    const select = screen.getByLabelText('Filtrar por evento')
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Encuentro 2026' })).toBeInTheDocument())
    await user.selectOptions(select, '1')
    await waitFor(() => expect(f.calls.some((c) => /evento_id=1/.test(c.url))).toBe(true))
  })

  it('da de alta un registro: valida obligatorios y envía POST con el rol fijo', async () => {
    const user = userEvent.setup()
    const showToast = vi.fn()
    const { f } = setup(
      [
        { method: 'POST', match: '/eje3/participantes', body: { success: true, data: { id: 9 }, message: 'Creado' } },
        { match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }
      ],
      { showToast }
    )
    await openCatalog(user, 'Relatores')
    await screen.findByText('Laura Pérez')
    await user.click(screen.getByRole('button', { name: /Nuevo registro/ }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El campo "Nombre completo" es obligatorio.')
    expect(f.calls.some((c) => c.method === 'POST')).toBe(false)

    await user.type(within(dialog).getByLabelText(/Nombre completo/), 'Nueva Persona')
    await user.type(within(dialog).getByLabelText(/Correo electrónico/), 'nueva@buap.mx')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const post = f.calls.find((c) => c.method === 'POST')
    expect(post.url).toMatch(/\/eje3\/participantes$/)
    expect(post.body).toMatchObject({ rol: 'relator', nombre_completo: 'Nueva Persona', correo: 'nueva@buap.mx', activo: 1 })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('creado'))
  })

  it('muestra los errores de validación del backend (objeto y arreglo) dentro del modal', async () => {
    const user = userEvent.setup()
    setup([
      { method: 'POST', match: '/eje3/participantes', status: 422, body: { success: false, message: 'Datos inválidos', errors: { correo: ['El correo no tiene un formato válido.'], nombre_completo: ['Nombre muy corto.'] } } },
      { match: /\/eje3\/participantes\?/, body: { success: true, data: [] } }
    ])
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: /Nuevo registro/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Nombre completo/), 'X')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByText('El correo no tiene un formato válido.')).toBeInTheDocument()
    expect(within(dialog).getByText('Nombre muy corto.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('muestra errores en formato arreglo', async () => {
    const user = userEvent.setup()
    setup([
      { method: 'POST', match: '/eje3/participantes', status: 400, body: { success: false, message: 'Error', errors: ['Rol inválido'] } },
      { match: /\/eje3\/participantes\?/, body: { success: true, data: [] } }
    ])
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: /Nuevo registro/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Nombre completo/), 'X')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByText('Rol inválido')).toBeInTheDocument()
  })

  it('edita un registro con PUT', async () => {
    const user = userEvent.setup()
    const showToast = vi.fn()
    const { f } = setup(
      [
        { method: 'PUT', match: '/eje3/participantes/1', body: { success: true, data: {} } },
        { match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }
      ],
      { showToast }
    )
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: 'Editar Laura Pérez' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/Nombre completo/)).toHaveValue('Laura Pérez')
    const name = within(dialog).getByLabelText(/Nombre completo/)
    await user.clear(name)
    await user.type(name, 'Laura P. Editada')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const put = f.calls.find((c) => c.method === 'PUT')
    expect(put.url).toMatch(/\/eje3\/participantes\/1$/)
    expect(put.body).toMatchObject({ rol: 'relator', nombre_completo: 'Laura P. Editada', correo: 'laura@buap.mx' })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('actualizado'))
  })

  it('elimina con confirmación', async () => {
    const user = userEvent.setup()
    const { f, showToast } = setup([
      { method: 'DELETE', match: '/eje3/participantes/2', body: { success: true, message: 'Eliminado' } },
      { match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }
    ])
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: 'Eliminar Mario Ruiz' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Mario Ruiz')
    expect(f.calls.some((c) => c.method === 'DELETE')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(f.calls.find((c) => c.method === 'DELETE').url).toMatch(/\/eje3\/participantes\/2$/)
    expect(showToast).toHaveBeenCalledWith('Eliminado')
  })

  it('cancelar la confirmación no elimina', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }])
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: 'Eliminar Mario Ruiz' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(f.calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('si el borrado falla muestra el mensaje real y mantiene el diálogo', async () => {
    const user = userEvent.setup()
    setup([
      { method: 'DELETE', match: '/eje3/participantes/2', status: 403, body: { success: false, message: 'No autorizado' } },
      { match: /\/eje3\/participantes\?/, body: { success: true, data: RELATORES } }
    ])
    await openCatalog(user, 'Relatores')
    await user.click(await screen.findByRole('button', { name: 'Eliminar Mario Ruiz' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(await within(dialog).findByText('No autorizado')).toBeInTheDocument()
  })
})

describe('Eje3RegistroScreen · proyectos con apartados', () => {
  const PROYECTOS = [
    { id: 11, codigo: 'SEM-2026-001', titulo: 'Semillero de Finanzas', investigador_principal_id: 2, investigador_principal_nombre: 'Dr. Luis Mora', estado: 'en_ejecucion', evento_id: 1, evento_nombre: 'Encuentro 2026', total_apartados: 2, tipo: 'semillero' }
  ]
  const DETALLE = { ...PROYECTOS[0], resumen: 'R', apartados: [{ id: 1, apartado: 'Objetivo', contenido: 'Medir', orden: 0 }, { id: 2, apartado: 'Método', contenido: 'Encuesta', orden: 1 }] }

  it('lista proyectos de semilleros filtrando por tipo', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/proyectos\?/, body: { success: true, data: PROYECTOS } }])
    await openCatalog(user, 'Proyectos de semilleros')
    expect(await screen.findByText('Semillero de Finanzas')).toBeInTheDocument()
    expect(screen.getByText('Dr. Luis Mora', { selector: 'td' })).toBeInTheDocument()
    expect(f.calls.some((c) => /\/eje3\/proyectos\?tipo=semillero/.test(c.url))).toBe(true)
  })

  it('crea un proyecto con docente, evento y apartados', async () => {
    const user = userEvent.setup()
    const { f } = setup([
      { method: 'POST', match: '/eje3/proyectos', body: { success: true, data: { id: 50 } } },
      { match: /\/eje3\/proyectos\?/, body: { success: true, data: [] } }
    ])
    await openCatalog(user, 'Proyectos de semilleros')
    await user.click(await screen.findByRole('button', { name: /Nuevo registro/ }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Dra. Ana Soto' })).toBeInTheDocument())
    await user.type(within(dialog).getByLabelText(/Título del proyecto/), 'Nuevo semillero')
    await user.selectOptions(within(dialog).getByLabelText(/Docente/), '1')
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Encuentro 2026' })).toBeInTheDocument())
    await user.selectOptions(within(dialog).getByLabelText(/Evento donde se presenta/), '1')
    await user.click(within(dialog).getByRole('button', { name: /Agregar apartado/ }))
    await user.type(within(dialog).getByLabelText('Título del apartado 1'), 'Introducción')
    await user.type(within(dialog).getByLabelText('Contenido del apartado 1'), 'Texto')
    await user.click(within(dialog).getByRole('button', { name: /Agregar apartado/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Quitar apartado 2' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const post = f.calls.find((c) => c.method === 'POST')
    expect(post.body).toMatchObject({
      tipo: 'semillero', titulo: 'Nuevo semillero', investigador_principal_id: 1, evento_id: 1, estado: 'en_ejecucion',
      apartados: [{ apartado: 'Introducción', contenido: 'Texto' }]
    })
  })

  it('al editar carga el detalle con apartados y los envía en el PUT', async () => {
    const user = userEvent.setup()
    const { f } = setup([
      { method: 'PUT', match: '/eje3/proyectos/11', body: { success: true, data: {} } },
      { match: /\/eje3\/proyectos\/11$/, body: { success: true, data: DETALLE } },
      { match: /\/eje3\/proyectos\?/, body: { success: true, data: PROYECTOS } }
    ])
    await openCatalog(user, 'Proyectos de semilleros')
    await user.click(await screen.findByRole('button', { name: 'Editar Semillero de Finanzas' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Título del apartado 1')).toHaveValue('Objetivo')
    expect(within(dialog).getByLabelText('Contenido del apartado 2')).toHaveValue('Encuesta')
    await waitFor(() => expect(within(dialog).getByLabelText(/Docente/)).toHaveValue('2'))
    await user.click(within(dialog).getByRole('button', { name: 'Quitar apartado 1' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const put = f.calls.find((c) => c.method === 'PUT')
    expect(put.body.apartados).toEqual([{ apartado: 'Método', contenido: 'Encuesta' }])
    expect(put.body.investigador_principal_id).toBe(2)
    expect(put.body.tipo).toBe('semillero')
  })

  it('avisa si no se puede cargar el detalle para editar', async () => {
    const user = userEvent.setup()
    setup([
      { match: /\/eje3\/proyectos\/11$/, status: 500, body: { success: false } },
      { match: /\/eje3\/proyectos\?/, body: { success: true, data: PROYECTOS } }
    ])
    await openCatalog(user, 'Proyectos de semilleros')
    await user.click(await screen.findByRole('button', { name: 'Editar Semillero de Finanzas' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar el detalle/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('los proyectos de titulación incluyen la casilla Articulado al CIV marcada por defecto', async () => {
    const user = userEvent.setup()
    const { f } = setup([
      { method: 'POST', match: '/eje3/proyectos', body: { success: true, data: {} } },
      { match: /\/eje3\/proyectos\?/, body: { success: true, data: [] } }
    ])
    await openCatalog(user, 'Proyectos de titulación articulados al CIV')
    await user.click(await screen.findByRole('button', { name: /Nuevo registro/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Articulado al CIV')).toBeChecked()
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Dra. Ana Soto' })).toBeInTheDocument())
    await user.type(within(dialog).getByLabelText(/Título del proyecto/), 'Tesis')
    await user.selectOptions(within(dialog).getByLabelText(/Docente/), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(f.calls.some((c) => c.method === 'POST')).toBe(true))
    expect(f.calls.find((c) => c.method === 'POST').body).toMatchObject({ tipo: 'titulacion', articulado_civ: 1 })
  })
})

describe('Eje3RegistroScreen · estado de registro (docentes)', () => {
  const PROYECTOS = [
    { id: 1, codigo: 'INV-1', titulo: 'Proyecto A', investigador_principal_nombre: 'Ana', estado: 'en_ejecucion', registro_estado: 'aprobado', evento_nombre: null, total_apartados: 0 },
    { id: 2, codigo: 'INV-2', titulo: 'Proyecto B', investigador_principal_nombre: 'Luis', estado: 'propuesta', registro_estado: 'enviado', evento_nombre: null, total_apartados: 1 }
  ]

  it('muestra un tag con el estado de registro en la tabla de proyectos', async () => {
    const user = userEvent.setup()
    setup([{ match: /\/eje3\/proyectos\?/, body: { success: true, data: PROYECTOS } }])
    await openCatalog(user, 'Proyectos de investigación')
    await screen.findByText('Proyecto A')
    const filaA = screen.getByText('Proyecto A').closest('tr')
    expect(within(filaA).getByText('Aprobado')).toHaveClass('docente-estado-aprobado')
    const filaB = screen.getByText('Proyecto B').closest('tr')
    expect(within(filaB).getByText('En revisión')).toHaveClass('docente-estado-enviado')
    expect(screen.getByRole('columnheader', { name: 'Registro' })).toBeInTheDocument()
  })

  it('filtra por estado de registro enviando registro_estado', async () => {
    const user = userEvent.setup()
    const { f } = setup([{ match: /\/eje3\/proyectos\?/, body: { success: true, data: PROYECTOS } }])
    await openCatalog(user, 'Proyectos de investigación')
    await screen.findByText('Proyecto A')
    await user.selectOptions(screen.getByLabelText('Filtrar por registro'), 'enviado')
    await waitFor(() => expect(f.calls.some((c) => /registro_estado=enviado/.test(c.url))).toBe(true))
  })

  it('el catálogo de dictaminadores no muestra columna de registro', async () => {
    const user = userEvent.setup()
    setup([{ match: /\/eje3\/participantes\?/, body: { success: true, data: [] } }])
    await openCatalog(user, 'Dictaminadores')
    await screen.findByText('No se encontraron registros.')
    expect(screen.queryByRole('columnheader', { name: 'Registro' })).not.toBeInTheDocument()
  })

  it('el hub avisa de proyectos pendientes de revisión y lleva a la revisión', async () => {
    const user = userEvent.setup()
    const { onNavigate } = setup([{ match: '/eje3/catalogos', body: { success: true, data: { ...CATALOGOS, proyectos_pendientes: 3 } } }])
    expect(await screen.findByTestId('aviso-pendientes')).toHaveTextContent('Hay 3 proyectos de docentes pendientes de revisión.')
    await user.click(screen.getByRole('button', { name: 'Ir a la revisión' }))
    expect(onNavigate).toHaveBeenCalledWith('admin-docentes-revision')
  })

  it('el hub no muestra aviso si no hay pendientes', async () => {
    setup([{ match: '/eje3/catalogos', body: { success: true, data: { ...CATALOGOS, proyectos_pendientes: 0 } } }])
    await waitFor(() => expect(screen.getByTestId('conteo-relatores')).toHaveTextContent('6'))
    expect(screen.queryByTestId('aviso-pendientes')).not.toBeInTheDocument()
  })
})
