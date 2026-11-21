-- ============================================================================
-- SCRIPT COMPLETO DE DESPLIEGUE MYSQL: SISTEMA REPOSITORIO BUAP (SI3)
-- ============================================================================
-- Este archivo contiene la creación de base de datos, tablas con llaves foráneas,
-- índices optimizados y datos iniciales listos para despliegue en cualquier
-- servidor MySQL 5.7+ / MySQL 8.0+ / MariaDB.
--
-- Para desplegar en MySQL:
--   mysql -u root -p < backend/src/Database/deploy_mysql.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `investigacion_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `investigacion_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- TABLA 1: INVESTIGADORES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `investigadores`;
CREATE TABLE `investigadores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_completo` VARCHAR(150) NOT NULL COMMENT 'Nombres y apellidos completos',
    `correo` VARCHAR(120) NOT NULL UNIQUE COMMENT 'Correo de contacto académico',
    `identificacion` VARCHAR(50) DEFAULT NULL COMMENT 'Cédula o número de documento',
    `orcid` VARCHAR(30) DEFAULT NULL COMMENT 'ORCID (ej: 0000-0002-1825-0097)',
    `afiliacion` VARCHAR(150) NOT NULL DEFAULT 'Benemérita Universidad Autónoma de Puebla',
    `categoria` VARCHAR(50) DEFAULT 'Investigador Asociado' COMMENT 'Nivel SNII o escalafón',
    `linea_investigacion` VARCHAR(150) NOT NULL DEFAULT 'Investigación Científica General',
    `biografia` TEXT DEFAULT NULL,
    `avatar_url` VARCHAR(255) DEFAULT NULL,
    `activo` TINYINT(1) DEFAULT 1,
    `snii_nivel` VARCHAR(20) DEFAULT NULL COMMENT 'Nivel SNII: NULL, Candidato, I, II o III',
    `snii_elegible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = marcado manualmente como elegible al SNII',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_investigador_orcid` (`orcid`),
    INDEX `idx_investigador_afiliacion` (`afiliacion`),
    INDEX `idx_investigador_linea` (`linea_investigacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 2: CATEGORÍAS Y ÁREAS DEL CONOCIMIENTO
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(150) NOT NULL UNIQUE,
    `codigo` VARCHAR(50) DEFAULT NULL UNIQUE,
    `tipo` ENUM('area_conocimiento', 'genero_publicacion') NOT NULL DEFAULT 'area_conocimiento',
    `descripcion` TEXT DEFAULT NULL,
    `color` VARCHAR(20) DEFAULT '#003B5C',
    `icono` VARCHAR(30) DEFAULT '📚',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_categoria_tipo` (`tipo`),
    INDEX `idx_categoria_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: EVENTOS DE INVESTIGACIÓN
-- Encuentros de semilleros, congresos y convocatorias de la revista PYAD.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `eventos_investigacion`;
CREATE TABLE `eventos_investigacion` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(250) NOT NULL COMMENT 'Nombre oficial del evento',
    `tipo` ENUM('semilleros', 'congreso', 'revista_pyad', 'otro') NOT NULL COMMENT 'Clasificación para el portal de difusión',
    `edicion` VARCHAR(50) DEFAULT NULL COMMENT 'Edición o año (ej: 2026)',
    `fecha_inicio` DATE DEFAULT NULL,
    `fecha_fin` DATE DEFAULT NULL,
    `sede` VARCHAR(200) DEFAULT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `estado` ENUM('programado', 'en_curso', 'concluido') NOT NULL DEFAULT 'programado',
    `publico` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = visible en el portal público, 0 = solo administración',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_evento_tipo` (`tipo`),
    INDEX `idx_evento_estado` (`estado`),
    INDEX `idx_evento_fecha` (`fecha_inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 3: PROYECTOS DE INVESTIGACIÓN
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proyectos`;
CREATE TABLE `proyectos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(50) NOT NULL UNIQUE,
    `titulo` VARCHAR(255) NOT NULL,
    `resumen` TEXT DEFAULT NULL,
    `investigador_principal_id` INT NOT NULL,
    `co_investigadores` TEXT DEFAULT NULL,
    `estado` ENUM('propuesta', 'en_ejecucion', 'completado', 'suspendido') NOT NULL DEFAULT 'en_ejecucion',
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE DEFAULT NULL,
    `presupuesto` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `entidad_financiadora` VARCHAR(150) DEFAULT 'Fondos Internos VIEP-BUAP',
    `linea_investigacion` VARCHAR(150) NOT NULL,
    `tipo` ENUM('investigacion', 'semillero', 'titulacion') NOT NULL DEFAULT 'investigacion' COMMENT 'Clasificación del Eje 3',
    `evento_id` INT DEFAULT NULL COMMENT 'Evento donde se presenta el proyecto (opcional)',
    `articulado_civ` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = proyecto de titulación articulado al CIV',
    `registro_estado` ENUM('borrador', 'enviado', 'aprobado', 'devuelto') NOT NULL DEFAULT 'aprobado' COMMENT 'Flujo de revisión del rol docente; lo capturado por el administrador queda aprobado',
    `comentario_revision` TEXT DEFAULT NULL COMMENT 'Comentario del revisor (obligatorio al devolver)',
    `enviado_en` DATETIME DEFAULT NULL COMMENT 'Fecha en que el docente envió el proyecto a revisión',
    `revisado_en` DATETIME DEFAULT NULL COMMENT 'Fecha de la última revisión del administrador',
    `revisado_por` INT DEFAULT NULL COMMENT 'Usuario administrador que revisó',
    `creado_por_usuario_id` INT DEFAULT NULL COMMENT 'Usuario (docente) que registró el proyecto',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`investigador_principal_id`) REFERENCES `investigadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_proyecto_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_investigacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_proyecto_revisado_por` FOREIGN KEY (`revisado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_proyecto_creado_por` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_proyecto_estado` (`estado`),
    INDEX `idx_proyecto_linea` (`linea_investigacion`),
    INDEX `idx_proyecto_tipo` (`tipo`),
    INDEX `idx_proyecto_evento` (`evento_id`),
    INDEX `idx_proyecto_registro` (`registro_estado`),
    INDEX `idx_proyecto_investigador` (`investigador_principal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 4: PUBLICACIONES CIENTÍFICAS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `publicaciones`;
CREATE TABLE `publicaciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `titulo` VARCHAR(300) NOT NULL,
    `tipo` ENUM('articulo_revista', 'libro', 'capitulo_libro', 'conferencia') NOT NULL DEFAULT 'articulo_revista',
    `investigador_id` INT NOT NULL,
    `autores` TEXT NOT NULL,
    `revista_editorial` VARCHAR(200) NOT NULL,
    `anio` INT NOT NULL,
    `volumen` VARCHAR(30) DEFAULT NULL,
    `numero` VARCHAR(30) DEFAULT NULL,
    `paginas` VARCHAR(30) DEFAULT NULL,
    `doi` VARCHAR(150) DEFAULT NULL,
    `indexacion` ENUM('Scopus', 'Web of Science', 'Scielo', 'Latindex', 'IEEE Xplore', 'Otra') NOT NULL DEFAULT 'Scopus',
    `cuartil` ENUM('Q1', 'Q2', 'Q3', 'Q4', 'Sin cuartil') NOT NULL DEFAULT 'Q1',
    `citas_estimadas` INT NOT NULL DEFAULT 0,
    `vistas` INT NOT NULL DEFAULT 0 COMMENT 'Visualizaciones totales',
    `descargas` INT NOT NULL DEFAULT 0 COMMENT 'Descargas del PDF',
    `acceso_abierto` TINYINT(1) NOT NULL DEFAULT 1,
    `url_documento` VARCHAR(255) DEFAULT NULL,
    `resumen` TEXT DEFAULT NULL,
    `palabras_clave` VARCHAR(255) DEFAULT NULL,
    `area_conocimiento` VARCHAR(150) DEFAULT NULL,
    `evento` VARCHAR(255) DEFAULT NULL COMMENT 'Nombre del evento académico o congreso',
    `estado` ENUM('publicado', 'borrador') NOT NULL DEFAULT 'publicado',
    `proyecto_id` INT DEFAULT NULL,
    `origen` ENUM('evento', 'revista_pyad', 'otra') NOT NULL DEFAULT 'otra' COMMENT 'Origen de la publicación para el Eje 3',
    `evento_id` INT DEFAULT NULL COMMENT 'Evento de investigación del que resulta la publicación',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`investigador_id`) REFERENCES `investigadores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_publicacion_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_investigacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_publicacion_anio` (`anio`),
    INDEX `idx_publicacion_cuartil` (`cuartil`),
    INDEX `idx_publicacion_indexacion` (`indexacion`),
    INDEX `idx_publicacion_tipo` (`tipo`),
    INDEX `idx_publicacion_doi` (`doi`),
    INDEX `idx_publicacion_estado` (`estado`),
    INDEX `idx_publicacion_area` (`area_conocimiento`),
    INDEX `idx_publicacion_evento` (`evento`(150)),
    INDEX `idx_publicacion_titulo` (`titulo`(150)),
    INDEX `idx_publicacion_autores` (`autores`(150)),
    INDEX `idx_publicacion_estado_anio` (`estado`, `anio`),
    INDEX `idx_publicacion_estado_area` (`estado`, `area_conocimiento`(100)),
    INDEX `idx_publicacion_origen` (`origen`),
    INDEX `idx_publicacion_evento_id` (`evento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 5: PRODUCCIÓN TÉCNICA
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `produccion_tecnica`;
CREATE TABLE `produccion_tecnica` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tipo` ENUM('patente', 'software', 'tesis_dirigida', 'ponencia', 'modelo_utilidad') NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `investigador_id` INT NOT NULL,
    `autores` VARCHAR(255) NOT NULL,
    `anio` INT NOT NULL,
    `numero_registro` VARCHAR(100) DEFAULT NULL,
    `institucion_evento` VARCHAR(200) DEFAULT NULL,
    `estado` ENUM('solicitada', 'concedida', 'publicada', 'sustentada') NOT NULL DEFAULT 'concedida',
    `descripcion` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`investigador_id`) REFERENCES `investigadores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_produccion_tipo` (`tipo`),
    INDEX `idx_produccion_anio` (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 6: USUARIOS Y AUTENTICACIÓN
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(150) NOT NULL,
    `correo` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('administrador', 'investigador', 'lector') NOT NULL DEFAULT 'lector',
    `cargo` VARCHAR(150) DEFAULT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `intentos_fallidos` INT NOT NULL DEFAULT 0,
    `bloqueado_hasta` DATETIME DEFAULT NULL,
    `ultimo_acceso` DATETIME DEFAULT NULL,
    `investigador_id` INT DEFAULT NULL COMMENT 'Ficha de investigador ligada (cuenta de docente); una cuenta por docente',
    `debe_cambiar_password` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = contraseña temporal: debe cambiarla en su primer ingreso',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuario_investigador` FOREIGN KEY (`investigador_id`) REFERENCES `investigadores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE INDEX `uq_usuario_investigador` (`investigador_id`),
    INDEX `idx_usuario_correo` (`correo`),
    INDEX `idx_usuario_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: APARTADOS ANEXOS DE PROYECTOS
-- Secciones (título + contenido) que acompañan a un proyecto presentado en un evento.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proyecto_apartados`;
CREATE TABLE `proyecto_apartados` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `proyecto_id` INT NOT NULL,
    `apartado` VARCHAR(200) NOT NULL COMMENT 'Título de la sección',
    `contenido` TEXT DEFAULT NULL,
    `orden` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_apartado_proyecto` (`proyecto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: PARTICIPANTES DE EVENTO
-- Bases de dictaminadores, moderadores, relatores y dictaminadores de la revista PYAD.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `participantes_evento`;
CREATE TABLE `participantes_evento` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rol` ENUM('dictaminador', 'moderador', 'relator', 'dictaminador_pyad') NOT NULL,
    `nombre_completo` VARCHAR(150) NOT NULL,
    `correo` VARCHAR(120) DEFAULT NULL,
    `institucion` VARCHAR(200) DEFAULT NULL,
    `especialidad` VARCHAR(200) DEFAULT NULL,
    `evento_id` INT DEFAULT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`evento_id`) REFERENCES `eventos_investigacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_participante_rol` (`rol`),
    INDEX `idx_participante_evento` (`evento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: RETRIBUCIÓN SOCIAL (MPYMES, MGT, MDGE)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `retribucion_social`;
CREATE TABLE `retribucion_social` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `programa` ENUM('MPYMES', 'MGT', 'MDGE') NOT NULL,
    `tipo_participante` ENUM('estudiante', 'profesor') NOT NULL,
    `nombre_participante` VARCHAR(150) NOT NULL,
    `actividad` VARCHAR(250) NOT NULL,
    `institucion_beneficiada` VARCHAR(200) DEFAULT NULL,
    `horas` INT DEFAULT 0,
    `fecha` DATE DEFAULT NULL,
    `periodo` VARCHAR(50) DEFAULT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_retribucion_programa` (`programa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: ACTIVIDADES DE EGRESADOS DE POSGRADO
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `actividades_egresados`;
CREATE TABLE `actividades_egresados` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `programa` VARCHAR(100) DEFAULT NULL,
    `nombre_egresado` VARCHAR(150) NOT NULL,
    `generacion` VARCHAR(50) DEFAULT NULL,
    `actividad` VARCHAR(250) NOT NULL,
    `tipo` ENUM('empleo', 'emprendimiento', 'publicacion', 'posgrado', 'otro') NOT NULL,
    `institucion` VARCHAR(200) DEFAULT NULL,
    `fecha` DATE DEFAULT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_egresado_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA EJE 3: SESIONES DE AUTENTICACIÓN
-- Guarda el hash SHA-256 del token Bearer (nunca el token) con expiración de 8 horas.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sesiones`;
CREATE TABLE `sesiones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `token_hash` CHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 hexadecimal del token',
    `expira_en` DATETIME NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_sesion_usuario` (`usuario_id`),
    INDEX `idx_sesion_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DATOS SEMILLA (SEEDS)
-- ============================================================================

-- 1. Categorías y Áreas
INSERT INTO `categorias` (`id`, `nombre`, `codigo`, `tipo`, `descripcion`, `color`, `icono`, `activo`) VALUES
(1, 'Ciencias Exactas e Ingenierías', 'EXACTAS', 'area_conocimiento', 'Física, Matemáticas, Computación, Electrónica e Ingenierías aplicadas', '#003B5C', 'microscope', 1),
(2, 'Ciencias Naturales y Agropecuarias', 'NATURALES', 'area_conocimiento', 'Biología, Biotecnología, Ecología, Química y Agronomía', '#10B981', 'leaf', 1),
(3, 'Ciencias de la Salud', 'SALUD', 'area_conocimiento', 'Medicina, Biomedicina, Epidemiología, Enfermería y Farmacia', '#EF4444', 'health', 1),
(4, 'Ciencias Sociales y Humanidades', 'SOCIALES', 'area_conocimiento', 'Sociología, Derecho, Educación, Historia y Filosofía', '#8B5CF6', 'landmark', 1),
(5, 'Económico-Administrativas', 'ECONOMIA', 'area_conocimiento', 'Economía, Gestión de la Innovación, Finanzas y Administración', '#F59E0B', 'chart', 1),
(6, 'Artes y Hábitat', 'ARTES', 'area_conocimiento', 'Arquitectura, Urbanismo, Diseño, Artes Visuales y Música', '#EC4899', 'palette', 1),
(7, 'Artículo de Revista Indexada', 'ART_REVISTA', 'genero_publicacion', 'Publicaciones en revistas indexadas con arbitraje estricto por pares ciegos', '#003B5C', 'document', 1),
(8, 'Capítulo de Libro', 'CAP_LIBRO', 'genero_publicacion', 'Contribución a libros científicos con comité editorial y dictamen académico', '#00A3E0', 'book', 1),
(9, 'Libro Científico Completo', 'LIBRO', 'genero_publicacion', 'Monografía o libro de investigación completo con ISBN institucional', '#6366F1', 'books', 1),
(10, 'Acta de Conferencia / Proceedings', 'PROCEEDINGS', 'genero_publicacion', 'Memorias arbitradas en congresos nacionales e internacionales con indexación', '#059669', 'microphone', 1),
(11, 'Tesis de Posgrado', 'TESIS', 'genero_publicacion', 'Tesis de maestría y doctorado sustentadas y aprobadas en la institución', '#D97706', 'graduation', 1),
(12, 'Reporte Técnico Especializado', 'REPORTE_TEC', 'genero_publicacion', 'Informes técnicos derivados de proyectos de vinculación y transferencia', '#4B5563', 'document', 1),
(13, 'Patente Concedida o Solicitud', 'PATENTE', 'genero_publicacion', 'Títulos de propiedad industrial otorgados por el IMPI o agencias globales', '#DC2626', 'lightbulb', 1);

-- 2. Investigadores
INSERT INTO `investigadores` (`id`, `nombre_completo`, `correo`, `identificacion`, `orcid`, `afiliacion`, `categoria`, `linea_investigacion`, `biografia`, `avatar_url`, `activo`) VALUES
(1, 'Dra. Elena Ramos Sandoval', 'elena.ramos@buap.mx', 'ID-882319', '0000-0002-8341-9921', 'Facultad de Ciencias de la Computación - BUAP', 'Investigador Senior (Nivel III)', 'Inteligencia Artificial y Procesamiento de Lenguaje Natural', 'Doctora en Ciencias de la Computación. Investigadora en modelos multimodales para el análisis biomédico.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80', 1),
(2, 'Dr. Carlos Mendoza Villalobos', 'carlos.mendoza@buap.mx', 'ID-741209', '0000-0001-9234-5510', 'Instituto de Ciencias (ICUAP) - BUAP', 'Investigador Senior (Nivel II)', 'Biotecnología Molecular y Genómica Ambiental', 'Doctor en Biotecnología. Líder de proyectos sobre biorremediación y consorcios microbianos.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', 1),
(3, 'Dra. Sofía Valenzuela Duarte', 'sofia.valenzuela@buap.mx', 'ID-630291', '0000-0003-4412-8876', 'Facultad de Medicina - BUAP', 'Investigador Asociado', 'Epidemiología Espacial y Salud Pública', 'Doctora en Salud Pública con enfoque en dinámicas de propagación de arbovirus y modelos predictivos.', 'https://images.unsplash.com/photo-1594824813583-ce5f2a1b15be?w=400&auto=format&fit=crop&q=80', 1),
(4, 'Dr. Martín Silva Guarnizo', 'martin.silva@buap.mx', 'ID-551923', '0000-0002-1102-3948', 'Facultad de Ingeniería - BUAP', 'Investigador Asociado', 'Energías Renovables y Microrredes Inteligentes', 'Especialista en gemelos digitales y sistemas de optimización fotovoltaica.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 1),
(5, 'MSc. Valentina Pineda Cruz', 'valentina.pineda@buap.mx', 'ID-442817', '0000-0002-7718-4490', 'Facultad de Filosofía y Letras - BUAP', 'Investigador Junior', 'Cienciometría, Acceso Abierto y Divulgación Científica', 'Investigadora en métricas de citación y políticas de ciencia abierta en América Latina.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80', 1);

-- 3. Proyectos
INSERT INTO `proyectos` (`id`, `codigo`, `titulo`, `resumen`, `investigador_principal_id`, `co_investigadores`, `estado`, `fecha_inicio`, `fecha_fin`, `presupuesto`, `entidad_financiadora`, `linea_investigacion`, `registro_estado`) VALUES
(1, 'INV-2025-010', 'Plataforma de Diagnóstico Asistido por Visión Artificial y LLMs en Radiología Torácica', 'Pipeline clínico de aprendizaje profundo que combina modelos de visión con generadores contextuales.', 1, 'MSc. Lucas Arteaga, Dr. Andrés Correa', 'en_ejecucion', '2025-02-01', '2027-01-31', 85000.00, 'CONAHCYT', 'Inteligencia Artificial y Procesamiento de Lenguaje Natural', 'aprobado'),
(2, 'INV-2024-032', 'Biorremediación de Suelos Degradados Mediante Consorcios Bacterianos Nativos y Biochar', 'Aislamiento metagenómico de consorcios capaces de metabolizar metales pesados en suelos mineros.', 2, 'Dra. Sandra Lucía Gómez, Ing. Mateo Rios', 'en_ejecucion', '2024-06-15', '2026-12-15', 120000.00, 'Global Challenges', 'Biotecnología Molecular y Genómica Ambiental', 'aprobado'),
(3, 'INV-2024-008', 'Sistema de Alerta Temprana y Predicción de Brotes de Arbovirus con Sensores IoT', 'Integración de estaciones hiperlocales comunitarias y datos epidemiológicos para predecir dengue.', 3, 'Dr. Roberto Meza, Est. Camilo Quintero', 'completado', '2024-01-10', '2025-07-30', 48500.00, 'OPS/OMS', 'Epidemiología Espacial y Salud Pública', 'aprobado'),
(4, 'INV-2025-045', 'Control Predictivo y Gemelos Digitales para Baterías de Flujo en Redes Fotovoltaicas', 'Diseño de un gemelo digital para optimizar la vida útil y el despacho de microrredes.', 4, 'Ing. Felipe Restrepo, Dr. Carlos Mendoza', 'en_ejecucion', '2025-04-01', '2027-04-01', 94000.00, 'Secretaría de Energía', 'Energías Renovables y Microrredes Inteligentes', 'aprobado'),
(5, 'INV-2026-003', 'Mapeo del Ecosistema de Producción Científica Latinoamericana y Acceso Abierto', 'Estudio cienciométrico sobre el impacto de repositorios de acceso abierto en la visibilidad regional.', 5, 'Dra. Elena Ramos Sandoval', 'propuesta', '2026-06-01', '2027-12-31', 25000.00, 'VIEP-BUAP', 'Cienciometría, Acceso Abierto y Divulgación Científica', 'aprobado');

-- 4. Publicaciones Científicas con Archivos Reales y Métricas
INSERT INTO `publicaciones` (`id`, `titulo`, `tipo`, `investigador_id`, `autores`, `revista_editorial`, `anio`, `volumen`, `numero`, `paginas`, `doi`, `indexacion`, `cuartil`, `citas_estimadas`, `vistas`, `descargas`, `acceso_abierto`, `url_documento`, `resumen`, `palabras_clave`, `area_conocimiento`, `estado`, `proyecto_id`) VALUES
(1, 'Deep multimodal transformer architectures for automated chest radiograph report generation: A benchmark study', 'articulo_revista', 1, 'Ramos-Sandoval, E., Arteaga, L., Correa, A., & Zhang, Y.', 'IEEE Transactions on Medical Imaging', 2025, '44', '3', '812-825', '10.1109/TMI.2025.1092837', 'IEEE Xplore', 'Q1', 28, 420, 115, 1, 'https://doi.org/10.1109/TMI.2025.1092837', 'Estudio comparativo riguroso de modelos fundacionales basados en transformadores multimodales para la síntesis de reportes de rayos X de tórax.', 'Deep Learning, Transformers, Medical Imaging, AI Diagnostic', 'Ciencias Exactas e Ingenierías', 'publicado', 1),
(2, 'Metagenomic profiling of rhizosphere microbiome reveals novel heavy-metal resistant fungal and bacterial consortia', 'articulo_revista', 2, 'Mendoza-Villalobos, C., Gómez, S. L., & Chen, H.', 'Frontiers in Microbiology', 2024, '15', '2', '1044-1059', '10.3389/fmicb.2024.992811', 'Scopus', 'Q1', 42, 380, 94, 1, 'https://doi.org/10.3389/fmicb.2024.992811', 'Caracterización taxonómica y funcional de comunidades rizosféricas resilientes a concentraciones extremas de plomo y cadmio.', 'Metagenomics, Rhizosphere, Heavy Metals, Bioremediation', 'Ciencias Naturales y Agropecuarias', 'publicado', 2),
(3, 'Spatiotemporal modeling of dengue transmission dynamics using hyper-local climatic sensor grids in tropical urban environments', 'articulo_revista', 3, 'Valenzuela-Duarte, S., Meza, R., & Lopez-Gomez, J.', 'The Lancet Regional Health - Americas', 2025, '29', '1', '100650', '10.1016/j.lana.2024.100650', 'Scopus', 'Q1', 19, 512, 142, 1, 'https://doi.org/10.1016/j.lana.2024.100650', 'Modelo dinámico espacio-temporal calibrado con estaciones micrometeorológicas urbanas para anticipar con 3 semanas de antelación focos de contagio de dengue.', 'Dengue, Epidemiological Modeling, Microclimate, IoT', 'Ciencias de la Salud', 'publicado', 3),
(4, 'Decentralized energy management in renewable microgrids using deep reinforcement learning and battery state forecasting', 'articulo_revista', 4, 'Silva-Guarnizo, M., Restrepo, F., & Al-Ammar, E.', 'Applied Energy', 2024, '360', 'B', '122789', '10.1016/j.apenergy.2024.122789', 'Web of Science', 'Q1', 37, 290, 88, 0, 'https://doi.org/10.1016/j.apenergy.2024.122789', 'Estrategia de despacho predictivo basada en aprendizaje por refuerzo profundo para microrredes aisladas con almacenamiento electroquímico.', 'Reinforcement Learning, Microgrids, Battery Management, Solar Energy', 'Ciencias Exactas e Ingenierías', 'publicado', 4),
(5, 'Open access adoption and altmetric impact in Latin American universities: A comprehensive 10-year bibliometric review', 'articulo_revista', 5, 'Pineda-Cruz, V., Ramos-Sandoval, E., & Morales, G.', 'Scientometrics', 2025, '129', '4', '2105-2127', '10.1007/s11192-025-05201-8', 'Scopus', 'Q2', 14, 185, 45, 1, 'https://doi.org/10.1007/s11192-025-05201-8', 'Análisis bibliométrico de más de 120,000 publicaciones evaluando la correlación entre políticas institucionales de acceso abierto y su impacto altmétrico.', 'Open Access, Altmetrics, Scientometrics, Research Policy', 'Ciencias Sociales y Humanidades', 'publicado', 5),
(6, 'Modelado de Dinámica de Propagación de Dengue mediante Redes de Sensores Hiperlocales y Deep Learning', 'articulo_revista', 3, 'Dra. Sofía Valenzuela Duarte, Dr. Roberto Meza, MSc. Lucas Arteaga', 'The Lancet Regional Health Americas', 2026, '31', '2', '100720', '10.1016/j.lana.2026.100720', 'Scopus', 'Q1', 12, 240, 62, 1, '/uploads/documents/doc_20261020_042157_61c24ba1_dengue_spatiotemporal_model_2026.pdf', 'Implementación de un sistema de alerta epidemiológica temprana que acopla mediciones microclimáticas hiperlocales con redes neuronales LSTM para predecir focos de transmisión del vector Aedes aegypti en áreas periurbanas de Puebla.', 'Dengue, Epidemiología Espacial, Redes Neuronales, Sensores IoT, Salud Pública', 'Ciencias de la Salud', 'publicado', 3),
(7, 'Biorremediación de Jales Mineros con Consorcios Nativos de Hongos y Bacterias en Suelos del Altiplano Poblano', 'articulo_revista', 2, 'Dr. Carlos Mendoza Villalobos, Dra. Sandra Lucía Gómez, Ing. Mateo Rios', 'Frontiers in Environmental Science & Microbiology', 2026, '16', '4', '1189-1205', '10.3389/fenvs.2026.118920', 'Scopus', 'Q1', 18, 195, 53, 1, '/uploads/documents/doc_20261020_042157_77f38773_biorremediacion_jales_puebla_2026.pdf', 'Evaluación a escala piloto de consorcios fúngico-bacterianos autóctonos combinados con biochar activado para la inmovilización de arsénico y cadmio en pasivos ambientales mineros.', 'Biorremediación, Jales Mineros, Consorcios Microbianos, Biochar, Metales Pesados', 'Ciencias Naturales y Agropecuarias', 'publicado', 2),
(8, 'Gemelos Digitales y Control Predictivo en Baterías de Flujo Redox para Microrredes Fotovoltaicas Universitarias', 'articulo_revista', 4, 'Dr. Martín Silva Guarnizo, Ing. Felipe Restrepo, Dr. Carlos Mendoza Villalobos', 'Applied Energy & Smart Grid Systems', 2026, '368', 'C', '124110', '10.1016/j.apenergy.2026.124110', 'Web of Science', 'Q1', 25, 310, 78, 1, '/uploads/documents/doc_20261020_042157_79b926f2_gemelos_digitales_energia_buap.pdf', 'Desarrollo de un gemelo digital electroquímico acoplado a un controlador predictivo basado en modelos (MPC) para mitigar la degradación de baterías de vanadio en la microrred del Complejo Universitario de la BUAP.', 'Gemelos Digitales, Microrredes, Energías Renovables, Baterías de Flujo, Control Predictivo', 'Ciencias Exactas e Ingenierías', 'publicado', 4),
(9, 'Arquitecturas Transformers Multimodales para Diagnóstico Radiológico Torácico Automatizado', 'articulo_revista', 1, 'Dra. Elena Ramos Sandoval, MSc. Lucas Arteaga, Dr. Andrés Correa', 'IEEE Transactions on Medical Imaging', 2026, '44', '3', '812-825', '10.1109/TMI.2026.1092837', 'IEEE Xplore', 'Q1', 53, 460, 130, 1, '/uploads/documents/doc_20261020_042157_0fd29bea_transformer_radiologia_buap_2026.pdf', 'Evaluación de un modelo vision-language capaz de generar reportes semi-estructurados de patologías pulmonares con una concordancia de 91.4% respecto al consenso de médicos radiólogos.', 'Inteligencia Artificial, Aprendizaje Profundo (Deep Learning), Visión por Computadora, Diagnóstico Asistido', 'Ciencias Exactas e Ingenierías', 'publicado', 1);

-- 5. Usuarios Institucionales
-- Hash BCRYPT para 'admin123': $2y$12$zxOfOksTqzBfQRxowZ6GK.W8OGOrwIOgAoiJ5Q4Xd4WuJ32UZaRo2
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `password_hash`, `rol`, `cargo`, `activo`, `investigador_id`, `debe_cambiar_password`) VALUES
(1, 'Dra. María Elena Ramos', 'admin@buap.mx', '$2y$12$zxOfOksTqzBfQRxowZ6GK.W8OGOrwIOgAoiJ5Q4Xd4WuJ32UZaRo2', 'administrador', 'Administradora de Investigación VIEP - BUAP', 1, NULL, 0),
(2, 'Dr. Carlos Mendoza Villalobos', 'investigador@buap.mx', '$2y$12$zxOfOksTqzBfQRxowZ6GK.W8OGOrwIOgAoiJ5Q4Xd4WuJ32UZaRo2', 'investigador', 'Investigador Titular ICUAP', 1, NULL, 0);


-- ============================================================================
-- DATOS SEMILLA DEL EJE 3: INVESTIGACIÓN APLICADA CON IMPACTO SOCIAL
-- ============================================================================
-- Datos de demostración (eventos, semilleros, titulación, participantes,
-- retribución social, egresados, marcas SNII y origen de publicaciones).
-- Equivalen a los que SqliteInitializer inserta automáticamente en modo SQLite.
-- Requiere haber ejecutado antes el esquema (schema.sql / migrations/001_eje3.sql).

-- Marcas SNII (investigadores 1..5)
UPDATE `investigadores` SET `snii_nivel` = 'III', `snii_elegible` = 0 WHERE `id` = 1;
UPDATE `investigadores` SET `snii_nivel` = 'II', `snii_elegible` = 0 WHERE `id` = 2;
UPDATE `investigadores` SET `snii_nivel` = 'I', `snii_elegible` = 0 WHERE `id` = 3;
UPDATE `investigadores` SET `snii_nivel` = 'Candidato', `snii_elegible` = 0 WHERE `id` = 4;
UPDATE `investigadores` SET `snii_nivel` = NULL, `snii_elegible` = 1 WHERE `id` = 5;

-- Eventos de investigación
INSERT INTO `eventos_investigacion` (`id`, `nombre`, `tipo`, `edicion`, `fecha_inicio`, `fecha_fin`, `sede`, `descripcion`, `estado`, `publico`) VALUES
(1, 'Encuentro de Semilleros de Investigación 2026', 'semilleros', '2026', '2026-11-26', '2026-11-28', 'Auditorio de la Facultad', 'Espacio anual para que los semilleros de investigación presenten el avance de sus proyectos ante la comunidad académica.', 'programado', 1),
(2, 'Congreso Internacional de Investigación en Ciencias Económico Administrativas 2026', 'congreso', '2026', '2026-12-02', '2026-12-04', 'Centro de Convenciones BUAP', 'Congreso internacional con ponencias dictaminadas, mesas moderadas y memoria arbitrada.', 'programado', 1),
(3, 'Revista PYAD 2026', 'revista_pyad', 'Vol. 2026', '2026-01-15', '2026-12-15', 'Publicación en línea', 'Convocatoria y dictaminación de artículos para el número 2026 de la revista PYAD.', 'en_curso', 1),
(4, 'Encuentro de Semilleros de Investigación 2025', 'semilleros', '2025', '2025-05-14', '2025-05-16', 'Auditorio de la Facultad', 'Edición 2025 del encuentro de semilleros, concluida con la presentación de proyectos de estudiantes y profesores.', 'concluido', 1),
(5, 'Congreso Internacional de Investigación en Ciencias Económico Administrativas 2025', 'congreso', '2025', '2025-10-08', '2025-10-10', 'Centro de Convenciones BUAP', 'Edición 2025 del congreso internacional, concluida.', 'concluido', 1),
(6, 'Reunión interna del comité de posgrado e investigación', 'otro', NULL, '2026-09-10', '2026-09-10', 'Sala de juntas', 'Evento de uso interno; no se muestra en el portal público.', 'concluido', 0);

-- Proyectos de semilleros y titulación (los de investigación son los ya existentes)
INSERT INTO `proyectos` (`id`, `codigo`, `titulo`, `resumen`, `investigador_principal_id`, `co_investigadores`, `estado`, `fecha_inicio`, `fecha_fin`, `presupuesto`, `entidad_financiadora`, `linea_investigacion`, `tipo`, `evento_id`, `articulado_civ`, `registro_estado`) VALUES
(6, 'SEM-2026-001', 'Semillero de análisis de datos para la toma de decisiones en pequeñas empresas', 'Estudiantes y profesores exploran el uso de datos abiertos para apoyar decisiones de MIPYMES de la región.', 3, 'Est. Daniela Rojas, Est. Iván Pérez', 'en_ejecucion', '2026-02-01', '2026-12-15', 0, 'Fondos Internos Institucionales', 'Gestión de la innovación', 'semillero', 1, 0, 'aprobado'),
(7, 'SEM-2026-002', 'Semillero de finanzas personales y educación financiera universitaria', 'Diagnóstico de hábitos financieros de estudiantes y diseño de talleres de educación financiera.', 4, 'Est. Mariana Soto', 'en_ejecucion', '2026-02-15', '2026-11-30', 0, 'Fondos Internos Institucionales', 'Finanzas y desarrollo', 'semillero', 1, 0, 'aprobado'),
(8, 'SEM-2025-001', 'Semillero de sostenibilidad y economía circular en comercios locales', 'Identificación de prácticas de economía circular en comercios del centro histórico.', 5, 'Est. Luis Barrios, Est. Ana Carmona', 'completado', '2025-01-20', '2025-05-10', 0, 'Fondos Internos Institucionales', 'Sostenibilidad y desarrollo regional', 'semillero', 4, 0, 'aprobado'),
(9, 'TIT-2026-001', 'Proyecto de titulación articulado al CIV: modelo de vinculación con el sector productivo', 'Trabajo de titulación que se articula con las líneas del CIV para vincular a egresados con empresas.', 1, 'Est. Karen Vázquez', 'en_ejecucion', '2026-03-01', '2026-12-20', 0, 'Fondos Internos Institucionales', 'Vinculación y transferencia', 'titulacion', NULL, 1, 'aprobado'),
(10, 'TIT-2026-002', 'Proyecto de titulación articulado al CIV: indicadores de impacto social de la investigación aplicada', 'Diseño de indicadores para medir el impacto social de proyectos de investigación aplicada.', 2, 'Est. Diego Montes', 'en_ejecucion', '2026-03-10', '2026-12-20', 0, 'Fondos Internos Institucionales', 'Impacto social de la investigación', 'titulacion', NULL, 1, 'aprobado'),
(11, 'TIT-2026-003', 'Proyecto de titulación sin articulación al CIV: análisis de costos en servicios educativos', 'Trabajo de titulación independiente sobre estructura de costos de servicios educativos.', 3, NULL, 'propuesta', '2026-08-01', NULL, 0, 'Fondos Internos Institucionales', 'Finanzas y desarrollo', 'titulacion', NULL, 0, 'aprobado');

-- Los primeros proyectos de investigación se presentan en el congreso
UPDATE `proyectos` SET `evento_id` = 2 WHERE `id` IN (1, 2);

-- Apartados anexos de los proyectos
INSERT INTO `proyecto_apartados` (`proyecto_id`, `apartado`, `contenido`, `orden`) VALUES
(6, 'Planteamiento del problema', 'Las pequeñas empresas de la región toman decisiones sin información sistematizada.', 0),
(6, 'Objetivos', 'Construir tableros sencillos con datos abiertos y evaluar su utilidad con cinco empresas piloto.', 1),
(6, 'Metodología', 'Estudio de casos con entrevistas, recolección de datos abiertos y validación con los propietarios.', 2),
(7, 'Justificación', 'La educación financiera mejora la permanencia escolar y la toma de decisiones de los jóvenes.', 0),
(7, 'Objetivos', 'Diagnosticar hábitos de ahorro y crédito y probar un taller de cuatro sesiones.', 1),
(8, 'Resumen', 'Se documentaron doce prácticas de reutilización y reciclaje en comercios locales.', 0),
(8, 'Resultados', 'Se elaboró una guía de buenas prácticas presentada durante el encuentro 2025.', 1),
(8, 'Conclusiones', 'Existe disposición de los comercios para adoptar prácticas circulares con acompañamiento.', 2);

-- Participantes de evento (dictaminadores, moderadores, relatores y dictaminadores PYAD)
INSERT INTO `participantes_evento` (`rol`, `nombre_completo`, `correo`, `institucion`, `especialidad`, `evento_id`, `activo`) VALUES
('dictaminador', 'Dra. Patricia Lozano Medina', 'patricia.lozano@ejemplo.mx', 'Universidad de Guadalajara', 'Administración estratégica', 2, 1),
('dictaminador', 'Dr. Ricardo Navarro Fuentes', 'ricardo.navarro@ejemplo.mx', 'Instituto Politécnico Nacional', 'Economía aplicada', 2, 1),
('dictaminador', 'Dra. Gabriela Ortega Salinas', 'gabriela.ortega@ejemplo.mx', 'Universidad Autónoma Metropolitana', 'Finanzas corporativas', 5, 1),
('moderador', 'Mtro. Héctor Domínguez Vera', 'hector.dominguez@ejemplo.mx', 'BUAP', 'Mercadotecnia', 1, 1),
('moderador', 'Dra. Alicia Fernández Rubio', 'alicia.fernandez@ejemplo.mx', 'BUAP', 'Gestión de la innovación', 1, 1),
('moderador', 'Mtro. Jorge Castillo Reyes', 'jorge.castillo@ejemplo.mx', 'Universidad Veracruzana', 'Desarrollo regional', 2, 1),
('relator', 'Lic. Mónica Aguilar Peña', 'monica.aguilar@ejemplo.mx', 'BUAP', 'Metodología de la investigación', 1, 1),
('relator', 'Mtra. Sandra Quiroz Ibarra', 'sandra.quiroz@ejemplo.mx', 'BUAP', 'Contaduría pública', 4, 1),
('relator', 'Lic. Tomás Esquivel Luna', 'tomas.esquivel@ejemplo.mx', 'BUAP', 'Administración pública', 2, 1),
('dictaminador_pyad', 'Dr. Armando Villarreal Cano', 'armando.villarreal@ejemplo.mx', 'Universidad de Monterrey', 'Economía y desarrollo', 3, 1),
('dictaminador_pyad', 'Dra. Teresa Maldonado Ríos', 'teresa.maldonado@ejemplo.mx', 'El Colegio de México', 'Políticas públicas', 3, 1),
('dictaminador_pyad', 'Dr. Esteban Cordero Paz', 'esteban.cordero@ejemplo.mx', 'Universidad de Colima', 'Análisis organizacional', NULL, 1);

-- Retribución social (MPYMES, MGT, MDGE)
INSERT INTO `retribucion_social` (`programa`, `tipo_participante`, `nombre_participante`, `actividad`, `institucion_beneficiada`, `horas`, `fecha`, `periodo`, `descripcion`) VALUES
('MPYMES', 'estudiante', 'Brenda Solís Aguirre', 'Asesoría contable a microempresas', 'Cámara de comercio local', 40, '2026-03-12', '2026-1', 'Asesoría gratuita en registros contables a 8 microempresas.'),
('MPYMES', 'profesor', 'Dr. Raúl Mendieta Ochoa', 'Taller de planeación estratégica', 'Asociación de comerciantes', 16, '2026-04-20', '2026-1', 'Taller de dos sesiones para dueños de negocios familiares.'),
('MGT', 'estudiante', 'Fernando Ibarra Lara', 'Diagnóstico de talento en organización civil', 'Fundación comunitaria', 30, '2026-05-05', '2026-1', 'Diagnóstico de puestos y perfiles para una organización sin fines de lucro.'),
('MGT', 'profesor', 'Dra. Lucía Barrera Nieto', 'Capacitación en liderazgo para mandos medios', 'Municipio', 24, '2026-06-18', '2026-1', 'Curso de liderazgo para personal de un ayuntamiento.'),
('MDGE', 'estudiante', 'Paola Jiménez Torres', 'Plan de negocios para cooperativa artesanal', 'Cooperativa de artesanas', 50, '2026-02-25', '2026-1', 'Elaboración de un plan de negocios para una cooperativa de artesanas.'),
('MDGE', 'profesor', 'Mtro. Samuel Cárdenas Ruiz', 'Conferencia sobre gestión de empresas sociales', 'Casa de cultura', 8, '2026-07-09', '2026-2', 'Conferencia abierta al público sobre gestión de empresas sociales.');

-- Actividades de egresados de posgrado
INSERT INTO `actividades_egresados` (`programa`, `nombre_egresado`, `generacion`, `actividad`, `tipo`, `institucion`, `fecha`, `descripcion`) VALUES
('MPYMES', 'Lic. Claudia Estrada Mora', '2022-2024', 'Dirección de empresa familiar de servicios', 'emprendimiento', 'Empresa propia', '2025-02-10', 'Fundó y dirige una empresa de servicios contables.'),
('MGT', 'Mtro. Andrés Palacios Gil', '2021-2023', 'Gerencia de talento humano', 'empleo', 'Corporativo industrial', '2024-08-01', 'Ocupa la gerencia de talento humano de una empresa manufacturera.'),
('MDGE', 'Mtra. Rocío Ledesma Cruz', '2020-2022', 'Artículo sobre gestión de empresas sociales', 'publicacion', 'Revista PYAD', '2025-11-03', 'Publicó un artículo derivado de su tesis de posgrado.'),
('MGT', 'Mtro. Gustavo Reyes Lara', '2019-2021', 'Estudios de doctorado en administración', 'posgrado', 'Universidad pública nacional', '2025-09-01', 'Ingresó a un programa de doctorado en administración.');

-- Origen de publicaciones existentes (evento / revista PYAD)
UPDATE `publicaciones` SET `origen` = 'evento', `evento_id` = 2 WHERE `id` = 1;
UPDATE `publicaciones` SET `origen` = 'evento', `evento_id` = 5 WHERE `id` = 2;
UPDATE `publicaciones` SET `origen` = 'revista_pyad', `evento_id` = 3 WHERE `id` = 3;
UPDATE `publicaciones` SET `origen` = 'revista_pyad', `evento_id` = 3 WHERE `id` = 4;
UPDATE `publicaciones` SET `origen` = 'evento', `evento_id` = 4 WHERE `id` = 5;
UPDATE `publicaciones` SET `origen` = 'evento', `evento_id` = 1 WHERE `id` = 6;
