<?php
namespace App\Database;

use PDO;

/**
 * ============================================================================
 * DATOS SEMILLA DEMO DEL EJE 3 "INVESTIGACIÓN APLICADA CON IMPACTO SOCIAL"
 * ============================================================================
 * Fuente única de los datos de demostración del Eje 3 (eventos, proyectos de
 * semilleros y titulación, participantes, retribución social, egresados y
 * marcas SNII). Los registros que dependen de investigadores o publicaciones
 * existentes se referencian por POSICIÓN (0 = primero por id), de modo que la
 * semilla funciona aunque los ids reales no sean consecutivos.
 *
 * - SQLite: se inserta con seed() desde SqliteInitializer (una sola vez).
 * - MySQL:  los mismos datos se volcaron como INSERT en seed.sql y
 *           deploy_mysql.sql (ids de investigador 1..5, publicaciones 1..9).
 */
class Eje3Seed {
    /** Marca SNII de los primeros investigadores (posición => nivel / elegible). */
    public static function snii(): array {
        return [
            0 => ['nivel' => 'III',       'elegible' => 0],
            1 => ['nivel' => 'II',        'elegible' => 0],
            2 => ['nivel' => 'I',         'elegible' => 0],
            3 => ['nivel' => 'Candidato', 'elegible' => 0],
            4 => ['nivel' => null,        'elegible' => 1],
        ];
    }

    /** Eventos de investigación (la clave es un alias interno; el id real se asigna al insertar). */
    public static function eventos(): array {
        return [
            'semilleros_2026' => [
                'nombre' => 'Encuentro de Semilleros de Investigación 2026', 'tipo' => 'semilleros', 'edicion' => '2026',
                'fecha_inicio' => '2026-11-26', 'fecha_fin' => '2026-11-28', 'sede' => 'Auditorio de la Facultad',
                'descripcion' => 'Espacio anual para que los semilleros de investigación presenten el avance de sus proyectos ante la comunidad académica.',
                'estado' => 'programado', 'publico' => 1,
            ],
            'congreso_2026' => [
                'nombre' => 'Congreso Internacional de Investigación en Ciencias Económico Administrativas 2026', 'tipo' => 'congreso', 'edicion' => '2026',
                'fecha_inicio' => '2026-12-02', 'fecha_fin' => '2026-12-04', 'sede' => 'Centro de Convenciones BUAP',
                'descripcion' => 'Congreso internacional con ponencias dictaminadas, mesas moderadas y memoria arbitrada.',
                'estado' => 'programado', 'publico' => 1,
            ],
            'pyad_2026' => [
                'nombre' => 'Revista PYAD 2026', 'tipo' => 'revista_pyad', 'edicion' => 'Vol. 2026',
                'fecha_inicio' => '2026-01-15', 'fecha_fin' => '2026-12-15', 'sede' => 'Publicación en línea',
                'descripcion' => 'Convocatoria y dictaminación de artículos para el número 2026 de la revista PYAD.',
                'estado' => 'en_curso', 'publico' => 1,
            ],
            'semilleros_2025' => [
                'nombre' => 'Encuentro de Semilleros de Investigación 2025', 'tipo' => 'semilleros', 'edicion' => '2025',
                'fecha_inicio' => '2025-05-14', 'fecha_fin' => '2025-05-16', 'sede' => 'Auditorio de la Facultad',
                'descripcion' => 'Edición 2025 del encuentro de semilleros, concluida con la presentación de proyectos de estudiantes y profesores.',
                'estado' => 'concluido', 'publico' => 1,
            ],
            'congreso_2025' => [
                'nombre' => 'Congreso Internacional de Investigación en Ciencias Económico Administrativas 2025', 'tipo' => 'congreso', 'edicion' => '2025',
                'fecha_inicio' => '2025-10-08', 'fecha_fin' => '2025-10-10', 'sede' => 'Centro de Convenciones BUAP',
                'descripcion' => 'Edición 2025 del congreso internacional, concluida.',
                'estado' => 'concluido', 'publico' => 1,
            ],
            'comite_interno' => [
                'nombre' => 'Reunión interna del comité de posgrado e investigación', 'tipo' => 'otro', 'edicion' => null,
                'fecha_inicio' => '2026-09-10', 'fecha_fin' => '2026-09-10', 'sede' => 'Sala de juntas',
                'descripcion' => 'Evento de uso interno; no se muestra en el portal público.',
                'estado' => 'concluido', 'publico' => 0,
            ],
        ];
    }

    /** Proyectos de semilleros y de titulación (los de investigación ya existen en la semilla base). */
    public static function proyectos(): array {
        return [
            [
                'codigo' => 'SEM-2026-001', 'tipo' => 'semillero', 'investigador' => 2, 'evento' => 'semilleros_2026', 'articulado_civ' => 0,
                'titulo' => 'Semillero de análisis de datos para la toma de decisiones en pequeñas empresas',
                'resumen' => 'Estudiantes y profesores exploran el uso de datos abiertos para apoyar decisiones de MIPYMES de la región.',
                'co_investigadores' => 'Est. Daniela Rojas, Est. Iván Pérez', 'estado' => 'en_ejecucion',
                'fecha_inicio' => '2026-02-01', 'fecha_fin' => '2026-12-15', 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Gestión de la innovación',
                'apartados' => [
                    ['Planteamiento del problema', 'Las pequeñas empresas de la región toman decisiones sin información sistematizada.'],
                    ['Objetivos', 'Construir tableros sencillos con datos abiertos y evaluar su utilidad con cinco empresas piloto.'],
                    ['Metodología', 'Estudio de casos con entrevistas, recolección de datos abiertos y validación con los propietarios.'],
                ],
            ],
            [
                'codigo' => 'SEM-2026-002', 'tipo' => 'semillero', 'investigador' => 3, 'evento' => 'semilleros_2026', 'articulado_civ' => 0,
                'titulo' => 'Semillero de finanzas personales y educación financiera universitaria',
                'resumen' => 'Diagnóstico de hábitos financieros de estudiantes y diseño de talleres de educación financiera.',
                'co_investigadores' => 'Est. Mariana Soto', 'estado' => 'en_ejecucion',
                'fecha_inicio' => '2026-02-15', 'fecha_fin' => '2026-11-30', 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Finanzas y desarrollo',
                'apartados' => [
                    ['Justificación', 'La educación financiera mejora la permanencia escolar y la toma de decisiones de los jóvenes.'],
                    ['Objetivos', 'Diagnosticar hábitos de ahorro y crédito y probar un taller de cuatro sesiones.'],
                ],
            ],
            [
                'codigo' => 'SEM-2025-001', 'tipo' => 'semillero', 'investigador' => 4, 'evento' => 'semilleros_2025', 'articulado_civ' => 0,
                'titulo' => 'Semillero de sostenibilidad y economía circular en comercios locales',
                'resumen' => 'Identificación de prácticas de economía circular en comercios del centro histórico.',
                'co_investigadores' => 'Est. Luis Barrios, Est. Ana Carmona', 'estado' => 'completado',
                'fecha_inicio' => '2025-01-20', 'fecha_fin' => '2025-05-10', 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Sostenibilidad y desarrollo regional',
                'apartados' => [
                    ['Resumen', 'Se documentaron doce prácticas de reutilización y reciclaje en comercios locales.'],
                    ['Resultados', 'Se elaboró una guía de buenas prácticas presentada durante el encuentro 2025.'],
                    ['Conclusiones', 'Existe disposición de los comercios para adoptar prácticas circulares con acompañamiento.'],
                ],
            ],
            [
                'codigo' => 'TIT-2026-001', 'tipo' => 'titulacion', 'investigador' => 0, 'evento' => null, 'articulado_civ' => 1,
                'titulo' => 'Proyecto de titulación articulado al CIV: modelo de vinculación con el sector productivo',
                'resumen' => 'Trabajo de titulación que se articula con las líneas del CIV para vincular a egresados con empresas.',
                'co_investigadores' => 'Est. Karen Vázquez', 'estado' => 'en_ejecucion',
                'fecha_inicio' => '2026-03-01', 'fecha_fin' => '2026-12-20', 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Vinculación y transferencia',
                'apartados' => [],
            ],
            [
                'codigo' => 'TIT-2026-002', 'tipo' => 'titulacion', 'investigador' => 1, 'evento' => null, 'articulado_civ' => 1,
                'titulo' => 'Proyecto de titulación articulado al CIV: indicadores de impacto social de la investigación aplicada',
                'resumen' => 'Diseño de indicadores para medir el impacto social de proyectos de investigación aplicada.',
                'co_investigadores' => 'Est. Diego Montes', 'estado' => 'en_ejecucion',
                'fecha_inicio' => '2026-03-10', 'fecha_fin' => '2026-12-20', 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Impacto social de la investigación',
                'apartados' => [],
            ],
            [
                'codigo' => 'TIT-2026-003', 'tipo' => 'titulacion', 'investigador' => 2, 'evento' => null, 'articulado_civ' => 0,
                'titulo' => 'Proyecto de titulación sin articulación al CIV: análisis de costos en servicios educativos',
                'resumen' => 'Trabajo de titulación independiente sobre estructura de costos de servicios educativos.',
                'co_investigadores' => null, 'estado' => 'propuesta',
                'fecha_inicio' => '2026-08-01', 'fecha_fin' => null, 'presupuesto' => 0, 'entidad' => 'Fondos Internos Institucionales',
                'linea' => 'Finanzas y desarrollo',
                'apartados' => [],
            ],
        ];
    }

    /** Se ligan a un evento los primeros N proyectos de investigación ya existentes. */
    public static function proyectosInvestigacionConEvento(): array {
        return ['cantidad' => 2, 'evento' => 'congreso_2026'];
    }

    /** Participantes de eventos (dictaminadores, moderadores, relatores y dictaminadores PYAD). */
    public static function participantes(): array {
        return [
            ['dictaminador', 'Dra. Patricia Lozano Medina', 'patricia.lozano@ejemplo.mx', 'Universidad de Guadalajara', 'Administración estratégica', 'congreso_2026'],
            ['dictaminador', 'Dr. Ricardo Navarro Fuentes', 'ricardo.navarro@ejemplo.mx', 'Instituto Politécnico Nacional', 'Economía aplicada', 'congreso_2026'],
            ['dictaminador', 'Dra. Gabriela Ortega Salinas', 'gabriela.ortega@ejemplo.mx', 'Universidad Autónoma Metropolitana', 'Finanzas corporativas', 'congreso_2025'],
            ['moderador', 'Mtro. Héctor Domínguez Vera', 'hector.dominguez@ejemplo.mx', 'BUAP', 'Mercadotecnia', 'semilleros_2026'],
            ['moderador', 'Dra. Alicia Fernández Rubio', 'alicia.fernandez@ejemplo.mx', 'BUAP', 'Gestión de la innovación', 'semilleros_2026'],
            ['moderador', 'Mtro. Jorge Castillo Reyes', 'jorge.castillo@ejemplo.mx', 'Universidad Veracruzana', 'Desarrollo regional', 'congreso_2026'],
            ['relator', 'Lic. Mónica Aguilar Peña', 'monica.aguilar@ejemplo.mx', 'BUAP', 'Metodología de la investigación', 'semilleros_2026'],
            ['relator', 'Mtra. Sandra Quiroz Ibarra', 'sandra.quiroz@ejemplo.mx', 'BUAP', 'Contaduría pública', 'semilleros_2025'],
            ['relator', 'Lic. Tomás Esquivel Luna', 'tomas.esquivel@ejemplo.mx', 'BUAP', 'Administración pública', 'congreso_2026'],
            ['dictaminador_pyad', 'Dr. Armando Villarreal Cano', 'armando.villarreal@ejemplo.mx', 'Universidad de Monterrey', 'Economía y desarrollo', 'pyad_2026'],
            ['dictaminador_pyad', 'Dra. Teresa Maldonado Ríos', 'teresa.maldonado@ejemplo.mx', 'El Colegio de México', 'Políticas públicas', 'pyad_2026'],
            ['dictaminador_pyad', 'Dr. Esteban Cordero Paz', 'esteban.cordero@ejemplo.mx', 'Universidad de Colima', 'Análisis organizacional', null],
        ];
    }

    /** Retribución social por programa. [programa, tipo_participante, nombre, actividad, institucion, horas, fecha, periodo, descripcion] */
    public static function retribucionSocial(): array {
        return [
            ['MPYMES', 'estudiante', 'Brenda Solís Aguirre', 'Asesoría contable a microempresas', 'Cámara de comercio local', 40, '2026-03-12', '2026-1', 'Asesoría gratuita en registros contables a 8 microempresas.'],
            ['MPYMES', 'profesor', 'Dr. Raúl Mendieta Ochoa', 'Taller de planeación estratégica', 'Asociación de comerciantes', 16, '2026-04-20', '2026-1', 'Taller de dos sesiones para dueños de negocios familiares.'],
            ['MGT', 'estudiante', 'Fernando Ibarra Lara', 'Diagnóstico de talento en organización civil', 'Fundación comunitaria', 30, '2026-05-05', '2026-1', 'Diagnóstico de puestos y perfiles para una organización sin fines de lucro.'],
            ['MGT', 'profesor', 'Dra. Lucía Barrera Nieto', 'Capacitación en liderazgo para mandos medios', 'Municipio', 24, '2026-06-18', '2026-1', 'Curso de liderazgo para personal de un ayuntamiento.'],
            ['MDGE', 'estudiante', 'Paola Jiménez Torres', 'Plan de negocios para cooperativa artesanal', 'Cooperativa de artesanas', 50, '2026-02-25', '2026-1', 'Elaboración de un plan de negocios para una cooperativa de artesanas.'],
            ['MDGE', 'profesor', 'Mtro. Samuel Cárdenas Ruiz', 'Conferencia sobre gestión de empresas sociales', 'Casa de cultura', 8, '2026-07-09', '2026-2', 'Conferencia abierta al público sobre gestión de empresas sociales.'],
        ];
    }

    /** Actividades de egresados. [programa, nombre, generacion, actividad, tipo, institucion, fecha, descripcion] */
    public static function egresados(): array {
        return [
            ['MPYMES', 'Lic. Claudia Estrada Mora', '2022-2024', 'Dirección de empresa familiar de servicios', 'emprendimiento', 'Empresa propia', '2025-02-10', 'Fundó y dirige una empresa de servicios contables.'],
            ['MGT', 'Mtro. Andrés Palacios Gil', '2021-2023', 'Gerencia de talento humano', 'empleo', 'Corporativo industrial', '2024-08-01', 'Ocupa la gerencia de talento humano de una empresa manufacturera.'],
            ['MDGE', 'Mtra. Rocío Ledesma Cruz', '2020-2022', 'Artículo sobre gestión de empresas sociales', 'publicacion', 'Revista PYAD', '2025-11-03', 'Publicó un artículo derivado de su tesis de posgrado.'],
            ['MGT', 'Mtro. Gustavo Reyes Lara', '2019-2021', 'Estudios de doctorado en administración', 'posgrado', 'Universidad pública nacional', '2025-09-01', 'Ingresó a un programa de doctorado en administración.'],
        ];
    }

    /**
     * Marca de origen de las publicaciones existentes por posición (0 = la primera por id).
     * [posición => [origen, evento]]
     */
    public static function publicaciones(): array {
        return [
            0 => ['evento',       'congreso_2026'],
            1 => ['evento',       'congreso_2025'],
            2 => ['revista_pyad', 'pyad_2026'],
            3 => ['revista_pyad', 'pyad_2026'],
            4 => ['evento',       'semilleros_2025'],
            5 => ['evento',       'semilleros_2026'],
        ];
    }

    /**
     * Inserta la semilla en SQLite. Cada tabla se rellena solo si está vacía
     * (idempotente). Debe invocarse dentro de una transacción.
     */
    public static function seed(PDO $pdo): void {
        $invIds = $pdo->query("SELECT id FROM investigadores WHERE activo = 1 ORDER BY id")->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $invIds = array_map('intval', $invIds);
        $pubIds = array_map('intval', $pdo->query("SELECT id FROM publicaciones ORDER BY id")->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $inv = function (int $pos) use ($invIds): ?int {
            return $invIds ? $invIds[$pos % count($invIds)] : null;
        };

        // 1. Marcas SNII (solo investigadores sin marca previa)
        if ($invIds) {
            $upd = $pdo->prepare("UPDATE investigadores SET snii_nivel = :nivel, snii_elegible = :el
                                  WHERE id = :id AND snii_nivel IS NULL AND snii_elegible = 0");
            foreach (self::snii() as $pos => $m) {
                if (isset($invIds[$pos])) {
                    $upd->execute([':nivel' => $m['nivel'], ':el' => $m['elegible'], ':id' => $invIds[$pos]]);
                }
            }
        }

        // 2. Eventos
        $eventIds = [];
        if ((int)$pdo->query("SELECT COUNT(*) FROM eventos_investigacion")->fetchColumn() === 0) {
            $ins = $pdo->prepare("INSERT INTO eventos_investigacion
                (nombre, tipo, edicion, fecha_inicio, fecha_fin, sede, descripcion, estado, publico)
                VALUES (:nombre, :tipo, :edicion, :fi, :ff, :sede, :desc, :estado, :publico)");
            foreach (self::eventos() as $key => $e) {
                $ins->execute([
                    ':nombre' => $e['nombre'], ':tipo' => $e['tipo'], ':edicion' => $e['edicion'],
                    ':fi' => $e['fecha_inicio'], ':ff' => $e['fecha_fin'], ':sede' => $e['sede'],
                    ':desc' => $e['descripcion'], ':estado' => $e['estado'], ':publico' => $e['publico'],
                ]);
                $eventIds[$key] = (int)$pdo->lastInsertId();
            }
        } else {
            // Si ya había eventos, se resuelven por nombre para ligar el resto de la semilla.
            $find = $pdo->prepare("SELECT id FROM eventos_investigacion WHERE nombre = :n LIMIT 1");
            foreach (self::eventos() as $key => $e) {
                $find->execute([':n' => $e['nombre']]);
                $id = $find->fetchColumn();
                if ($id) { $eventIds[$key] = (int)$id; }
            }
        }
        $ev = function (?string $key) use ($eventIds): ?int {
            return ($key !== null && isset($eventIds[$key])) ? $eventIds[$key] : null;
        };

        // 3. Proyectos de semilleros y titulación (y vínculo de proyectos de investigación a un evento)
        $hasEje3Projects = (int)$pdo->query("SELECT COUNT(*) FROM proyectos WHERE tipo <> 'investigacion'")->fetchColumn();
        if ($hasEje3Projects === 0 && $invIds) {
            $insP = $pdo->prepare("INSERT INTO proyectos
                (codigo, titulo, resumen, investigador_principal_id, co_investigadores, estado, fecha_inicio, fecha_fin,
                 presupuesto, entidad_financiadora, linea_investigacion, tipo, evento_id, articulado_civ)
                VALUES (:codigo, :titulo, :resumen, :inv, :co, :estado, :fi, :ff, :presupuesto, :entidad, :linea, :tipo, :evento, :civ)");
            $insA = $pdo->prepare("INSERT INTO proyecto_apartados (proyecto_id, apartado, contenido, orden)
                                   VALUES (:pid, :apartado, :contenido, :orden)");
            $exists = $pdo->prepare("SELECT COUNT(*) FROM proyectos WHERE codigo = :c");
            foreach (self::proyectos() as $p) {
                $exists->execute([':c' => $p['codigo']]);
                if ((int)$exists->fetchColumn() > 0) { continue; }
                $insP->execute([
                    ':codigo' => $p['codigo'], ':titulo' => $p['titulo'], ':resumen' => $p['resumen'],
                    ':inv' => $inv($p['investigador']), ':co' => $p['co_investigadores'], ':estado' => $p['estado'],
                    ':fi' => $p['fecha_inicio'], ':ff' => $p['fecha_fin'], ':presupuesto' => $p['presupuesto'],
                    ':entidad' => $p['entidad'], ':linea' => $p['linea'], ':tipo' => $p['tipo'],
                    ':evento' => $ev($p['evento']), ':civ' => $p['articulado_civ'],
                ]);
                $pid = (int)$pdo->lastInsertId();
                foreach ($p['apartados'] as $orden => $a) {
                    $insA->execute([':pid' => $pid, ':apartado' => $a[0], ':contenido' => $a[1], ':orden' => $orden]);
                }
            }

            $link = self::proyectosInvestigacionConEvento();
            if ($ev($link['evento'])) {
                $pdo->exec("UPDATE proyectos SET evento_id = " . (int)$ev($link['evento']) . "
                            WHERE id IN (SELECT id FROM proyectos WHERE tipo = 'investigacion' AND evento_id IS NULL
                                         ORDER BY id LIMIT " . (int)$link['cantidad'] . ")");
            }
        }

        // 4. Participantes
        if ((int)$pdo->query("SELECT COUNT(*) FROM participantes_evento")->fetchColumn() === 0) {
            $ins = $pdo->prepare("INSERT INTO participantes_evento
                (rol, nombre_completo, correo, institucion, especialidad, evento_id, activo)
                VALUES (:rol, :nombre, :correo, :inst, :esp, :evento, 1)");
            foreach (self::participantes() as $r) {
                $ins->execute([':rol' => $r[0], ':nombre' => $r[1], ':correo' => $r[2], ':inst' => $r[3], ':esp' => $r[4], ':evento' => $ev($r[5])]);
            }
        }

        // 5. Retribución social
        if ((int)$pdo->query("SELECT COUNT(*) FROM retribucion_social")->fetchColumn() === 0) {
            $ins = $pdo->prepare("INSERT INTO retribucion_social
                (programa, tipo_participante, nombre_participante, actividad, institucion_beneficiada, horas, fecha, periodo, descripcion)
                VALUES (:programa, :tipo, :nombre, :actividad, :inst, :horas, :fecha, :periodo, :desc)");
            foreach (self::retribucionSocial() as $r) {
                $ins->execute([':programa' => $r[0], ':tipo' => $r[1], ':nombre' => $r[2], ':actividad' => $r[3],
                               ':inst' => $r[4], ':horas' => $r[5], ':fecha' => $r[6], ':periodo' => $r[7], ':desc' => $r[8]]);
            }
        }

        // 6. Actividades de egresados
        if ((int)$pdo->query("SELECT COUNT(*) FROM actividades_egresados")->fetchColumn() === 0) {
            $ins = $pdo->prepare("INSERT INTO actividades_egresados
                (programa, nombre_egresado, generacion, actividad, tipo, institucion, fecha, descripcion)
                VALUES (:programa, :nombre, :gen, :actividad, :tipo, :inst, :fecha, :desc)");
            foreach (self::egresados() as $r) {
                $ins->execute([':programa' => $r[0], ':nombre' => $r[1], ':gen' => $r[2], ':actividad' => $r[3],
                               ':tipo' => $r[4], ':inst' => $r[5], ':fecha' => $r[6], ':desc' => $r[7]]);
            }
        }

        // 7. Origen de publicaciones existentes (solo las que siguen como 'otra')
        $updPub = $pdo->prepare("UPDATE publicaciones SET origen = :origen, evento_id = :evento WHERE id = :id AND origen = 'otra'");
        foreach (self::publicaciones() as $pos => $m) {
            if (isset($pubIds[$pos])) {
                $updPub->execute([':origen' => $m[0], ':evento' => $ev($m[1]), ':id' => $pubIds[$pos]]);
            }
        }
    }
}
