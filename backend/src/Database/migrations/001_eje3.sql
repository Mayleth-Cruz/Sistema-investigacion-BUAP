-- ============================================================================
-- MIGRACIÓN 001: EJE 3 "INVESTIGACIÓN APLICADA CON IMPACTO SOCIAL"
-- ============================================================================
-- Para bases MySQL / MariaDB YA DESPLEGADAS. Es idempotente (se puede ejecutar
-- más de una vez) y NO elimina ni modifica datos existentes: solo crea tablas
-- nuevas y agrega columnas, índices y llaves foráneas que falten.
--
--   mysql -u root -p investigacion_db < backend/src/Database/migrations/001_eje3.sql
--
-- Equivale a los cambios incluidos en schema.sql / deploy_mysql.sql (instalaciones
-- nuevas) y a la migración automática de SqliteInitializer.php (modo SQLite).
-- Los datos demo opcionales están en seed.sql (sección Eje 3).
-- ============================================================================

USE `investigacion_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tablas nuevas (eventos primero porque proyectos y publicaciones la referencian)
-- ----------------------------------------------------------------------------
-- TABLA EJE 3: EVENTOS DE INVESTIGACIÓN
-- Encuentros de semilleros, congresos y convocatorias de la revista PYAD.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eventos_investigacion` (
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
-- TABLA EJE 3: APARTADOS ANEXOS DE PROYECTOS
-- Secciones (título + contenido) que acompañan a un proyecto presentado en un evento.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `proyecto_apartados` (
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
CREATE TABLE IF NOT EXISTS `participantes_evento` (
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
CREATE TABLE IF NOT EXISTS `retribucion_social` (
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
CREATE TABLE IF NOT EXISTS `actividades_egresados` (
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
CREATE TABLE IF NOT EXISTS `sesiones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `token_hash` CHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 hexadecimal del token',
    `expira_en` DATETIME NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_sesion_usuario` (`usuario_id`),
    INDEX `idx_sesion_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. Columnas nuevas en tablas existentes
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `investigadores` ADD COLUMN `snii_nivel` VARCHAR(20) DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'investigadores' AND COLUMN_NAME = 'snii_nivel');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `investigadores` ADD COLUMN `snii_elegible` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'investigadores' AND COLUMN_NAME = 'snii_elegible');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `tipo` ENUM(''investigacion'', ''semillero'', ''titulacion'') NOT NULL DEFAULT ''investigacion''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'tipo');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `evento_id` INT DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'evento_id');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `articulado_civ` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'articulado_civ');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `publicaciones` ADD COLUMN `origen` ENUM(''evento'', ''revista_pyad'', ''otra'') NOT NULL DEFAULT ''otra''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publicaciones' AND COLUMN_NAME = 'origen');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `publicaciones` ADD COLUMN `evento_id` INT DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publicaciones' AND COLUMN_NAME = 'evento_id');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 3. Llaves foráneas
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD CONSTRAINT `fk_proyecto_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_investigacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND CONSTRAINT_NAME = 'fk_proyecto_evento');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `publicaciones` ADD CONSTRAINT `fk_publicacion_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_investigacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publicaciones' AND CONSTRAINT_NAME = 'fk_publicacion_evento');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 4. Índices
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD INDEX `idx_proyecto_tipo` (`tipo`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND INDEX_NAME = 'idx_proyecto_tipo');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD INDEX `idx_proyecto_evento` (`evento_id`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND INDEX_NAME = 'idx_proyecto_evento');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `publicaciones` ADD INDEX `idx_publicacion_origen` (`origen`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publicaciones' AND INDEX_NAME = 'idx_publicacion_origen');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `publicaciones` ADD INDEX `idx_publicacion_evento_id` (`evento_id`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publicaciones' AND INDEX_NAME = 'idx_publicacion_evento_id');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET FOREIGN_KEY_CHECKS = 1;
