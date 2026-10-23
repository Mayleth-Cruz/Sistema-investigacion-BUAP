/**
 * ============================================================================
 * DATOS DE RESPALDO / MOCK DATA (Para Demostración Inmediata)
 * ============================================================================
 * Estos datos se utilizan si el servidor PHP o MySQL no se encuentran activos
 * o en caso de pruebas locales sin base de datos configurada.
 * Tienen la misma estructura que los datos semilla de backend/src/Database/seed.sql.
 */

export const mockResearchers = [
  {
    id: 1,
    nombre_completo: 'Dra. Elena Ramos Sandoval',
    correo: 'elena.ramos@universidad.edu',
    identificacion: 'ID-882319',
    orcid: '0000-0002-8341-9921',
    afiliacion: 'Facultad de Ingeniería - Depto. de Computación',
    categoria: 'Investigador Senior (Nivel III)',
    linea_investigacion: 'Inteligencia Artificial y Procesamiento de Lenguaje Natural',
    biografia: 'Doctora en Ciencias de la Computación por la UPV. Investigadora enfocada en modelos multimodales para biomedicina.',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    total_publicaciones: 2,
    total_proyectos: 1,
    total_citas: 36,
    activo: 1
  },
  {
    id: 2,
    nombre_completo: 'Dr. Carlos Mendoza Villalobos',
    correo: 'carlos.mendoza@universidad.edu',
    identificacion: 'ID-741209',
    orcid: '0000-0001-9234-5510',
    afiliacion: 'Facultad de Ciencias Básicas - Instituto de Biotecnología',
    categoria: 'Investigador Senior (Nivel II)',
    linea_investigacion: 'Biotecnología Molecular y Genómica Ambiental',
    biografia: 'Doctor en Biotecnología Ambiental. Líder de proyectos sobre biocontrol y metagenómica en suelos contaminados.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    total_publicaciones: 2,
    total_proyectos: 1,
    total_citas: 65,
    activo: 1
  },
  {
    id: 3,
    nombre_completo: 'Dra. Sofía Valenzuela Duarte',
    correo: 'sofia.valenzuela@universidad.edu',
    identificacion: 'ID-630291',
    orcid: '0000-0003-4412-8876',
    afiliacion: 'Facultad de Ciencias de la Salud - Escuela de Medicina',
    categoria: 'Investigador Asociado',
    linea_investigacion: 'Epidemiología Espacial y Salud Pública',
    biografia: 'Especialista en modelado matemático de brotes infecciosos y análisis geoespacial de vectores de transmisión.',
    avatar_url: 'https://images.unsplash.com/photo-1594824813583-ce5f2a1b15be?w=400&auto=format&fit=crop&q=80',
    total_publicaciones: 1,
    total_proyectos: 1,
    total_citas: 19,
    activo: 1
  },
  {
    id: 4,
    nombre_completo: 'Dr. Martín Silva Guarnizo',
    correo: 'martin.silva@universidad.edu',
    identificacion: 'ID-551923',
    orcid: '0000-0002-1102-3948',
    afiliacion: 'Facultad de Ingeniería Mecánica y Eléctrica',
    categoria: 'Investigador Asociado',
    linea_investigacion: 'Energías Renovables y Microrredes Inteligentes',
    biografia: 'Doctor en Transición Energética. Desarrolla algoritmos de optimización para microrredes solares híbridas.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    total_publicaciones: 2,
    total_proyectos: 1,
    total_citas: 42,
    activo: 1
  },
  {
    id: 5,
    nombre_completo: 'MSc. Valentina Pineda Cruz',
    correo: 'valentina.pineda@universidad.edu',
    identificacion: 'ID-442817',
    orcid: '0000-0002-7718-4490',
    afiliacion: 'Facultad de Ciencias Sociales y Humanidades',
    categoria: 'Investigador Junior',
    linea_investigacion: 'Cienciometría, Acceso Abierto y Divulgación Científica',
    biografia: 'Maestra en Gestión de la Información. Estudia dinámicas de citación y métricas alternativas en América Latina.',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    total_publicaciones: 1,
    total_proyectos: 1,
    total_citas: 14,
    activo: 1
  }
];

export const mockProjects = [
  {
    id: 1,
    codigo: 'INV-2025-010',
    titulo: 'Plataforma de Diagnóstico Asistido por Visión Artificial y LLMs en Radiología Torácica',
    resumen: 'Desarrollo de un pipeline clínico de aprendizaje profundo que combina modelos de visión computacional para la detección de patologías torácicas.',
    investigador_principal_id: 1,
    investigador_principal_nombre: 'Dra. Elena Ramos Sandoval',
    estado: 'en_ejecucion',
    fecha_inicio: '2025-02-01',
    fecha_fin: '2027-01-31',
    presupuesto: 85000.00,
    entidad_financiadora: 'CONACYT / Minciencias',
    linea_investigacion: 'Inteligencia Artificial y Procesamiento de Lenguaje Natural',
    total_publicaciones_derivadas: 2
  },
  {
    id: 2,
    codigo: 'INV-2024-032',
    titulo: 'Biorremediación de Suelos Degradados Mediante Consorcios Bacterianos Nativos y Biochar',
    resumen: 'Aislamiento e identificación metagenómica de comunidades bacterianas capaces de metabolizar metales pesados en suelos de minería.',
    investigador_principal_id: 2,
    investigador_principal_nombre: 'Dr. Carlos Mendoza Villalobos',
    estado: 'en_ejecucion',
    fecha_inicio: '2024-06-15',
    fecha_fin: '2026-12-15',
    presupuesto: 120000.00,
    entidad_financiadora: 'Global Challenges Research Fund',
    linea_investigacion: 'Biotecnología Molecular y Genómica Ambiental',
    total_publicaciones_derivadas: 2
  },
  {
    id: 3,
    codigo: 'INV-2024-008',
    titulo: 'Sistema de Alerta Temprana y Predicción de Brotes de Arbovirus con Sensores IoT y Mapas de Calor',
    resumen: 'Integración de estaciones meteorológicas comunitarias y registros epidemiológicos para predecir brotes de Dengue.',
    investigador_principal_id: 3,
    investigador_principal_nombre: 'Dra. Sofía Valenzuela Duarte',
    estado: 'completado',
    fecha_inicio: '2024-01-10',
    fecha_fin: '2025-07-30',
    presupuesto: 48500.00,
    entidad_financiadora: 'OPS / OMS',
    linea_investigacion: 'Epidemiología Espacial y Salud Pública',
    total_publicaciones_derivadas: 1
  },
  {
    id: 4,
    codigo: 'INV-2025-045',
    titulo: 'Control Predictivo y Gemelos Digitales para la Integración de Baterías de Flujo en Redes Fotovoltaicas',
    resumen: 'Diseño de un gemelo digital para optimizar el despacho y la vida útil en microrredes solares híbridas.',
    investigador_principal_id: 4,
    investigador_principal_nombre: 'Dr. Martín Silva Guarnizo',
    estado: 'en_ejecucion',
    fecha_inicio: '2025-04-01',
    fecha_fin: '2027-04-01',
    presupuesto: 94000.00,
    entidad_financiadora: 'Fondo de Transición Energética',
    linea_investigacion: 'Energías Renovables y Microrredes Inteligentes',
    total_publicaciones_derivadas: 2
  },
  {
    id: 5,
    codigo: 'INV-2026-003',
    titulo: 'Mapeo del Ecosistema de Producción Científica Latinoamericana y su Adopción de Ciencia Abierta',
    resumen: 'Estudio cienciométrico del impacto de los repositorios de acceso abierto en la visibilidad regional.',
    investigador_principal_id: 5,
    investigador_principal_nombre: 'MSc. Valentina Pineda Cruz',
    estado: 'propuesta',
    fecha_inicio: '2026-06-01',
    fecha_fin: '2027-12-31',
    presupuesto: 25000.00,
    entidad_financiadora: 'Vicerrectoría de Investigaciones',
    linea_investigacion: 'Cienciometría, Acceso Abierto y Divulgación Científica',
    total_publicaciones_derivadas: 0
  }
];

export const mockPublications = [
  {
    id: 1,
    titulo: 'Deep multimodal transformer architectures for automated chest radiograph report generation: A benchmark study',
    tipo: 'articulo_revista',
    investigador_id: 1,
    investigador_nombre: 'Dra. Elena Ramos Sandoval',
    autores: 'Ramos-Sandoval, E., Arteaga, L., Correa, A., & Zhang, Y.',
    revista_editorial: 'IEEE Transactions on Medical Imaging',
    anio: 2025,
    volumen: '44',
    numero: '3',
    paginas: '812-825',
    doi: '10.1109/TMI.2025.1092837',
    indexacion: 'IEEE Xplore',
    cuartil: 'Q1',
    citas_estimadas: 28,
    acceso_abierto: 1,
    url_documento: 'https://doi.org/10.1109/TMI.2025.1092837',
    proyecto_titulo: 'Plataforma de Diagnóstico Asistido por Visión Artificial y LLMs',
    evento: null
  },
  {
    id: 2,
    titulo: 'Metagenomic profiling of rhizosphere microbiome reveals novel heavy-metal resistant fungal and bacterial consortia',
    tipo: 'articulo_revista',
    investigador_id: 2,
    investigador_nombre: 'Dr. Carlos Mendoza Villalobos',
    autores: 'Mendoza-Villalobos, C., Gómez, S. L., & Chen, H.',
    revista_editorial: 'Frontiers in Microbiology',
    anio: 2024,
    volumen: '15',
    numero: '2',
    paginas: '1044-1059',
    doi: '10.3389/fmicb.2024.992811',
    indexacion: 'Scopus',
    cuartil: 'Q1',
    citas_estimadas: 42,
    acceso_abierto: 1,
    url_documento: 'https://doi.org/10.3389/fmicb.2024.992811',
    proyecto_titulo: 'Biorremediación de Suelos Degradados',
    evento: null
  },
  {
    id: 3,
    titulo: 'Spatiotemporal modeling of dengue transmission dynamics using hyper-local climatic sensor grids in tropical urban environments',
    tipo: 'articulo_revista',
    investigador_id: 3,
    investigador_nombre: 'Dra. Sofía Valenzuela Duarte',
    autores: 'Valenzuela-Duarte, S., Meza, R., & Lopez-Gomez, J.',
    revista_editorial: 'The Lancet Regional Health - Americas',
    anio: 2025,
    volumen: '29',
    numero: '1',
    paginas: '100650',
    doi: '10.1016/j.lana.2024.100650',
    indexacion: 'Scopus',
    cuartil: 'Q1',
    citas_estimadas: 19,
    acceso_abierto: 1,
    url_documento: 'https://doi.org/10.1016/j.lana.2024.100650',
    proyecto_titulo: 'Sistema de Alerta Temprana de Arbovirus',
    evento: null
  },
  {
    id: 4,
    titulo: 'Decentralized energy management in renewable microgrids using deep reinforcement learning and battery state forecasting',
    tipo: 'articulo_revista',
    investigador_id: 4,
    investigador_nombre: 'Dr. Martín Silva Guarnizo',
    autores: 'Silva-Guarnizo, M., Restrepo, F., & Al-Ammar, E.',
    revista_editorial: 'Applied Energy',
    anio: 2024,
    volumen: '360',
    numero: 'B',
    paginas: '122789',
    doi: '10.1016/j.apenergy.2024.122789',
    indexacion: 'Web of Science',
    cuartil: 'Q1',
    citas_estimadas: 37,
    acceso_abierto: 0,
    url_documento: 'https://doi.org/10.1016/j.apenergy.2024.122789',
    proyecto_titulo: 'Control Predictivo y Gemelos Digitales para Baterías',
    evento: null
  },
  {
    id: 5,
    titulo: 'Open access adoption and altmetric impact in Latin American universities: A comprehensive 10-year bibliometric review',
    tipo: 'articulo_revista',
    investigador_id: 5,
    investigador_nombre: 'MSc. Valentina Pineda Cruz',
    autores: 'Pineda-Cruz, V., Ramos-Sandoval, E., & Morales, G.',
    revista_editorial: 'Scientometrics',
    anio: 2025,
    volumen: '129',
    numero: '4',
    paginas: '2105-2127',
    doi: '10.1007/s11192-025-05201-8',
    indexacion: 'Scopus',
    cuartil: 'Q2',
    citas_estimadas: 14,
    acceso_abierto: 1,
    url_documento: 'https://doi.org/10.1007/s11192-025-05201-8',
    proyecto_titulo: 'Mapeo de Ciencia Abierta',
    evento: null
  }
];

export const mockProduction = [
  {
    id: 1,
    tipo: 'patente',
    titulo: 'Reactor biológico anaerobio de película fija con soportes cerámicos bioactivados para aguas residuales',
    investigador_id: 2,
    investigador_nombre: 'Dr. Carlos Mendoza Villalobos',
    autores: 'Carlos Mendoza Villalobos, Mateo Rios',
    anio: 2024,
    numero_registro: 'MX/a/2024/008912',
    institucion_evento: 'Instituto Mexicano de la Propiedad Industrial (IMPI)',
    estado: 'concedida',
    descripcion: 'Dispositivo para tratamiento de aguas con remoción de materia orgánica superior al 91%.'
  },
  {
    id: 2,
    tipo: 'software',
    titulo: 'MediVision-NLP v2.1: Suite de análisis de imágenes médicas y generación de diagnósticos clínicos',
    investigador_id: 1,
    investigador_nombre: 'Dra. Elena Ramos Sandoval',
    autores: 'Elena Ramos Sandoval, Lucas Arteaga',
    anio: 2025,
    numero_registro: 'DNDA-REG-2025-1104',
    institucion_evento: 'Dirección Nacional de Derecho de Autor',
    estado: 'concedida',
    descripcion: 'Software de asistencia clínica con microservicios dockerizados para radiología torácica.'
  },
  {
    id: 3,
    tipo: 'tesis_dirigida',
    titulo: 'Optimización estocástica multiobjetivo para el dimensionamiento de sistemas fotovoltaicos con hidrógeno',
    investigador_id: 4,
    investigador_nombre: 'Dr. Martín Silva Guarnizo',
    autores: 'Gabriel Henao (Tutor: Dr. Martín Silva)',
    anio: 2025,
    numero_registro: 'TESIS-MAESTRIA-2025-014',
    institucion_evento: 'Posgrado en Ingeniería Eléctrica',
    estado: 'sustentada',
    descripcion: 'Tesis de Maestría con distinción laureada que dio origen a una librería libre en Python.'
  }
];

export const mockMetricsSummary = {
  kpis: {
    investigadores: { total: 5, activos: 5 },
    proyectos: { total: 5, presupuesto_total: 372500, en_ejecucion: 3, completados: 1, propuestas: 1 },
    publicaciones: { total: 8, total_citas: 176, open_access: 6, total_q1: 5 },
    produccion: { total: 4, patentes: 1, software: 1, tesis: 1 }
  },
  cuartiles: [
    { cuartil: 'Q1', cantidad: 5, porcentaje: 62.5 },
    { cuartil: 'Q2', cantidad: 2, porcentaje: 25.0 },
    { cuartil: 'Q3', cantidad: 0, porcentaje: 0 },
    { cuartil: 'Q4', cantidad: 0, porcentaje: 0 },
    { cuartil: 'Sin cuartil', cantidad: 1, porcentaje: 12.5 }
  ],
  evolucion_anual: [
    { anio: 2024, total_articulos: 4, total_citas: 92 },
    { anio: 2025, total_articulos: 4, total_citas: 84 }
  ],
  top_investigadores: [
    { id: 2, nombre_completo: 'Dr. Carlos Mendoza Villalobos', categoria: 'Investigador Senior (Nivel II)', total_publicaciones: 2, total_citas: 65, avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
    { id: 4, nombre_completo: 'Dr. Martín Silva Guarnizo', categoria: 'Investigador Asociado', total_publicaciones: 2, total_citas: 42, avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
    { id: 1, nombre_completo: 'Dra. Elena Ramos Sandoval', categoria: 'Investigador Senior (Nivel III)', total_publicaciones: 2, total_citas: 36, avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' }
  ],
  proyectos_por_estado: [
    { estado: 'en_ejecucion', cantidad: 3, presupuesto_subtotal: 299000 },
    { estado: 'completado', cantidad: 1, presupuesto_subtotal: 48500 },
    { estado: 'propuesta', cantidad: 1, presupuesto_subtotal: 25000 }
  ]
};
