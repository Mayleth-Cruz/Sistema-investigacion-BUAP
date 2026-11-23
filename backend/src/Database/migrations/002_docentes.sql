-- ============================================================================
-- MIGRACIÓN 002: ROL DOCENTE (cuentas de docentes y flujo de revisión de proyectos)
-- ============================================================================
-- Para bases MySQL / MariaDB YA DESPLEGADAS (con la migración 001 aplicada).
-- Es idempotente (se puede ejecutar más de una vez) y NO elimina ni modifica datos
-- existentes: solo agrega columnas, llaves foráneas e índices que falten.
--
--   mysql -u root -p investigacion_db < backend/src/Database/migrations/002_docentes.sql
--
-- Cambios:
--  - usuarios.investigador_id: liga una cuenta (rol 'investigador') a su ficha de docente.
--    UNIQUE: como máximo UNA cuenta por docente (varias cuentas sin ficha, NULL, sí se permiten).
--  - usuarios.debe_cambiar_password: 1 = contraseña temporal, obliga al cambio en el primer ingreso.
--  - proyectos.registro_estado: borrador | enviado | aprobado | devuelto. Los proyectos que ya
--    existen quedan 'aprobado' (DEFAULT) y los que captura el administrador nacen 'aprobado'.
--  - proyectos.comentario_revision / enviado_en / revisado_en / revisado_por / creado_por_usuario_id.
--
-- Equivale a los cambios de schema.sql / deploy_mysql.sql (instalaciones nuevas) y a la
-- migración automática de SqliteInitializer.php (SCHEMA_VERSION 3, modo SQLite).
-- La cuenta y los proyectos demo del docente existen SOLO en SQLite; en MySQL las cuentas las
-- crea el administrador desde "Usuarios docentes".
-- ============================================================================

USE `investigacion_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Columnas nuevas
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `usuarios` ADD COLUMN `investigador_id` INT DEFAULT NULL COMMENT ''Ficha de investigador ligada (cuenta de docente); una cuenta por docente''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'investigador_id');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `usuarios` ADD COLUMN `debe_cambiar_password` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = contraseña temporal: debe cambiarla en su primer ingreso''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'debe_cambiar_password');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `registro_estado` ENUM(''borrador'', ''enviado'', ''aprobado'', ''devuelto'') NOT NULL DEFAULT ''aprobado'' COMMENT ''Flujo de revisión del rol docente; lo capturado por el administrador queda aprobado''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'registro_estado');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `comentario_revision` TEXT DEFAULT NULL COMMENT ''Comentario del revisor (obligatorio al devolver)''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'comentario_revision');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `enviado_en` DATETIME DEFAULT NULL COMMENT ''Fecha en que el docente envió el proyecto a revisión''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'enviado_en');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `revisado_en` DATETIME DEFAULT NULL COMMENT ''Fecha de la última revisión del administrador''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'revisado_en');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `revisado_por` INT DEFAULT NULL COMMENT ''Usuario administrador que revisó''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'revisado_por');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD COLUMN `creado_por_usuario_id` INT DEFAULT NULL COMMENT ''Usuario (docente) que registró el proyecto''', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'creado_por_usuario_id');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 2. Llaves foráneas
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuario_investigador` FOREIGN KEY (`investigador_id`) REFERENCES `investigadores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND CONSTRAINT_NAME = 'fk_usuario_investigador');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD CONSTRAINT `fk_proyecto_revisado_por` FOREIGN KEY (`revisado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND CONSTRAINT_NAME = 'fk_proyecto_revisado_por');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD CONSTRAINT `fk_proyecto_creado_por` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND CONSTRAINT_NAME = 'fk_proyecto_creado_por');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 3. Índices (una cuenta por docente + filtros de revisión y de 'mis proyectos')
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `usuarios` ADD UNIQUE INDEX `uq_usuario_investigador` (`investigador_id`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uq_usuario_investigador');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD INDEX `idx_proyecto_registro` (`registro_estado`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND INDEX_NAME = 'idx_proyecto_registro');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `proyectos` ADD INDEX `idx_proyecto_investigador` (`investigador_principal_id`)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'investigador_principal_id' AND SEQ_IN_INDEX = 1);
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET FOREIGN_KEY_CHECKS = 1;
