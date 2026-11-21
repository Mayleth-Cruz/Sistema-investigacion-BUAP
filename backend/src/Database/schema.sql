-- ============================================================================
-- BASE DE DATOS: SISTEMA INTEGRAL DE INFORMACIÓN PARA LA INVESTIGACIÓN (SI3)
-- ============================================================================
-- Este script define la estructura relacional para registrar, monitorear,
-- visualizar y difundir la producción académica y científica.
-- Compatible con MySQL 5.7+ y MySQL 8.0+.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `investigacion_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `investigacion_db`;

-- Desactivamos revisiones de llaves foráneas temporalmente para permitir recreación limpia
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- TABLA 1: INVESTIGADORES
-- Almacena el perfil académico, identificación, ORCID y afiliación del investigador.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `investigadores`;
CREATE TABLE `investigadores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_completo` VARCHAR(150) NOT NULL COMMENT 'Nombres y apellidos completos del investigador',
    `correo` VARCHAR(120) NOT NULL UNIQUE COMMENT 'Correo institucional o de contacto académico',
    `identificacion` VARCHAR(50) DEFAULT NULL COMMENT 'Cédula o número de documento de identidad',
    `orcid` VARCHAR(30) DEFAULT NULL COMMENT 'Código único de investigador (ej: 0000-0002-1825-0097)',
    `afiliacion` VARCHAR(150) NOT NULL COMMENT 'Facultad, Centro o Departamento de adscripción',
    `categoria` VARCHAR(50) DEFAULT 'Investigador Asociado' COMMENT 'Categoría de escalafón docente o sistema nacional (Senior, Asociado, Junior)',
    `linea_investigacion` VARCHAR(150) NOT NULL COMMENT 'Línea o área temática principal de investigación',
    `biografia` TEXT DEFAULT NULL COMMENT 'Resumen del perfil científico y trayectoria',
    `avatar_url` VARCHAR(255) DEFAULT NULL COMMENT 'URL o ruta de la foto de perfil del investigador',
    `activo` TINYINT(1) DEFAULT 1 COMMENT '1 = Activo, 0 = Inactivo o retirado',
    `snii_nivel` VARCHAR(20) DEFAULT NULL COMMENT 'Nivel SNII: NULL, Candidato, I, II o III',
    `snii_elegible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = marcado manualmente como elegible al SNII',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_investigador_orcid` (`orcid`),
    INDEX `idx_investigador_afiliacion` (`afiliacion`),
    INDEX `idx_investigador_linea` (`linea_investigacion`)
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
-- TABLA 2: PROYECTOS DE INVESTIGACIÓN
-- Permite monitorear el ciclo de vida de los proyectos, presupuestos y fuentes de financiación.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proyectos`;
CREATE TABLE `proyectos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Código único institucional del proyecto (ej: INV-2026-004)',
    `titulo` VARCHAR(255) NOT NULL COMMENT 'Título oficial del proyecto de investigación',
    `resumen` TEXT DEFAULT NULL COMMENT 'Resumen ejecutivo / abstract del proyecto',
    `investigador_principal_id` INT NOT NULL COMMENT 'Investigador líder o responsable',
    `co_investigadores` TEXT DEFAULT NULL COMMENT 'Nombres de investigadores colaboradores o estudiantes vinculados',
    `estado` ENUM('propuesta', 'en_ejecucion', 'completado', 'suspendido') NOT NULL DEFAULT 'en_ejecucion' COMMENT 'Fase de monitoreo',
    `fecha_inicio` DATE NOT NULL COMMENT 'Fecha oficial de inicio de ejecución',
    `fecha_fin` DATE DEFAULT NULL COMMENT 'Fecha prevista o real de culminación',
    `presupuesto` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto económico asignado en moneda local o USD',
    `entidad_financiadora` VARCHAR(150) DEFAULT 'Fondos Internos Institucionales' COMMENT 'Organismo financiador (ej: Conacyt, Minciencias, Fondos Propios)',
    `linea_investigacion` VARCHAR(150) NOT NULL COMMENT 'Área temática del proyecto',
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
-- TABLA 3: PUBLICACIONES CIENTÍFICAS
-- Registra artículos en revistas indexadas, libros, capítulos de libro y actas de congresos.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `publicaciones`;
CREATE TABLE `publicaciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `titulo` VARCHAR(300) NOT NULL COMMENT 'Título del artículo o producción bibliográfica',
    `tipo` ENUM('articulo_revista', 'libro', 'capitulo_libro', 'conferencia') NOT NULL DEFAULT 'articulo_revista',
    `investigador_id` INT NOT NULL COMMENT 'Investigador registrado adscrito a la institución',
    `autores` TEXT NOT NULL COMMENT 'Lista completa de coautores tal como aparecen publicados',
    `revista_editorial` VARCHAR(200) NOT NULL COMMENT 'Nombre de la revista científica o casa editorial',
    `anio` INT NOT NULL COMMENT 'Año de publicación',
    `volumen` VARCHAR(30) DEFAULT NULL,
    `numero` VARCHAR(30) DEFAULT NULL,
    `paginas` VARCHAR(30) DEFAULT NULL,
    `doi` VARCHAR(150) DEFAULT NULL COMMENT 'Identificador digital de objeto (Digital Object Identifier)',
    `indexacion` ENUM('Scopus', 'Web of Science', 'Scielo', 'Latindex', 'IEEE Xplore', 'Otra') NOT NULL DEFAULT 'Scopus',
    `cuartil` ENUM('Q1', 'Q2', 'Q3', 'Q4', 'Sin cuartil') NOT NULL DEFAULT 'Q1' COMMENT 'Factor de impacto de la revista',
    `citas_estimadas` INT NOT NULL DEFAULT 0 COMMENT 'Número estimado de citas recibidas',
    `vistas` INT NOT NULL DEFAULT 0 COMMENT 'Visualizaciones totales registradas',
    `descargas` INT NOT NULL DEFAULT 0 COMMENT 'Descargas totales del documento PDF',
    `acceso_abierto` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Open Access, 0 = Suscripción cerrada',
    `url_documento` VARCHAR(255) DEFAULT NULL COMMENT 'Enlace directo al PDF o repositorio institucional',
    `resumen` TEXT DEFAULT NULL COMMENT 'Resumen o abstract del artículo de investigación',
    `palabras_clave` VARCHAR(255) DEFAULT NULL COMMENT 'Palabras clave separadas por coma',
    `area_conocimiento` VARCHAR(150) DEFAULT NULL COMMENT 'Área o categoría del conocimiento institucional',
    `evento` VARCHAR(255) DEFAULT NULL COMMENT 'Nombre del evento científico o congreso donde se presentó/publicó',
    `estado` ENUM('publicado', 'borrador') NOT NULL DEFAULT 'publicado' COMMENT 'Estado de publicación',
    `proyecto_id` INT DEFAULT NULL COMMENT 'Proyecto de origen del cual se deriva este producto (opcional)',
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
-- TABLA 4: PRODUCCIÓN TÉCNICA Y FORMACIÓN
-- Registra patentes solicitadas o concedidas, desarrollos de software, tesis dirigidas y ponencias.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `produccion_tecnica`;
CREATE TABLE `produccion_tecnica` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tipo` ENUM('patente', 'software', 'tesis_dirigida', 'ponencia', 'modelo_utilidad') NOT NULL,
    `titulo` VARCHAR(255) NOT NULL COMMENT 'Nombre de la patente, software, tesis o ponencia',
    `investigador_id` INT NOT NULL COMMENT 'Investigador tutor o inventor',
    `autores` VARCHAR(255) NOT NULL COMMENT 'Nombres de inventores o estudiantes autores',
    `anio` INT NOT NULL COMMENT 'Año del registro o sustentación',
    `numero_registro` VARCHAR(100) DEFAULT NULL COMMENT 'Folio oficial de patente, radicado o registro de derechos de autor',
    `institucion_evento` VARCHAR(200) DEFAULT NULL COMMENT 'Oficina de patentes, universidad de sustentación o evento científico',
    `estado` ENUM('solicitada', 'concedida', 'publicada', 'sustentada') NOT NULL DEFAULT 'concedida',
    `descripcion` TEXT DEFAULT NULL COMMENT 'Resumen del impacto técnico o aplicación práctica',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`investigador_id`) REFERENCES `investigadores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_produccion_tipo` (`tipo`),
    INDEX `idx_produccion_anio` (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- TABLA 5: USUARIOS Y AUTENTICACIÓN
-- Almacena credenciales de acceso con contraseñas encriptadas (BCRYPT) y roles.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(150) NOT NULL COMMENT 'Nombre completo del usuario',
    `correo` VARCHAR(120) NOT NULL UNIQUE COMMENT 'Correo electrónico oficial institucional',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash criptográfico de contraseña generado con BCRYPT',
    `rol` ENUM('administrador', 'investigador', 'lector') NOT NULL DEFAULT 'lector' COMMENT 'Rol para autorización',
    `cargo` VARCHAR(150) DEFAULT NULL COMMENT 'Cargo académico o administrativo',
    `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Activo, 0 = Inactivo',
    `intentos_fallidos` INT NOT NULL DEFAULT 0 COMMENT 'Contador de intentos fallidos de login',
    `bloqueado_hasta` DATETIME DEFAULT NULL COMMENT 'Fecha hasta la cual la cuenta está bloqueada temporalmente',
    `ultimo_acceso` DATETIME DEFAULT NULL COMMENT 'Fecha y hora del último acceso exitoso',
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
-- TABLA 6: CATEGORÍAS Y ÁREAS DEL CONOCIMIENTO
-- Permite catalogar y personalizar las áreas temáticas y formatos de publicación.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Nombre visible de la categoría o área',
    `codigo` VARCHAR(50) DEFAULT NULL UNIQUE COMMENT 'Código único o identificador',
    `tipo` ENUM('area_conocimiento', 'genero_publicacion') NOT NULL DEFAULT 'area_conocimiento',
    `descripcion` TEXT DEFAULT NULL COMMENT 'Descripción y disciplinas comprendidas',
    `color` VARCHAR(20) DEFAULT '#003B5C' COMMENT 'Color distintivo hexadecimal para tags y gráficas',
    `icono` VARCHAR(30) DEFAULT '📚' COMMENT 'Icono o emoji representativo',
    `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Activa, 0 = Inactiva',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_categoria_tipo` (`tipo`),
    INDEX `idx_categoria_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reactivamos la verificación de llaves foráneas
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
