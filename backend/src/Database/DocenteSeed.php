<?php
namespace App\Database;

use PDO;

/**
 * ============================================================================
 * DATOS SEMILLA DEMO DEL ROL DOCENTE (solo SQLite)
 * ============================================================================
 * Reutiliza la cuenta demo `investigador@buap.mx` (rol 'investigador', contraseña
 * demo de la semilla base): la liga al primer docente (primer investigador por id),
 * sin cambio obligatorio de contraseña, y le siembra cuatro proyectos de ejemplo,
 * uno en cada estado de registro (borrador, enviado, aprobado y devuelto con comentario).
 *
 * Es idempotente: si la cuenta ya está ligada o los códigos ya existen, no duplica nada.
 * NO forma parte de schema.sql, seed.sql ni deploy_mysql.sql (en MySQL las cuentas de
 * docentes las crea el administrador desde la aplicación).
 */
class DocenteSeed {
    public const CORREO_DEMO = 'investigador@buap.mx';

    /** Proyectos demo del docente (uno por estado de registro). */
    public static function proyectos(): array {
        return [
            [
                'codigo' => 'INV-2026-901', 'tipo' => 'investigacion', 'registro_estado' => 'borrador', 'evento' => null,
                'titulo' => 'Borrador: modelo de seguimiento de egresados de posgrado',
                'resumen' => null, 'linea' => '', 'estado' => 'propuesta',
                'co_investigadores' => null, 'dias_enviado' => null, 'dias_revisado' => null, 'comentario' => null,
                'apartados' => [['Idea general', 'Apunte inicial: sistematizar la trayectoria laboral de los egresados.']],
            ],
            [
                'codigo' => 'SEM-2026-901', 'tipo' => 'semillero', 'registro_estado' => 'enviado', 'evento' => 'semilleros',
                'titulo' => 'Semillero de analítica de datos para emprendedores universitarios',
                'resumen' => 'Estudiantes y profesores construyen tableros sencillos para apoyar a emprendedores de la comunidad universitaria.',
                'linea' => 'Gestión de la innovación', 'estado' => 'en_ejecucion',
                'co_investigadores' => 'Est. Paola Herrera, Est. Jorge Salinas', 'dias_enviado' => 2, 'dias_revisado' => null, 'comentario' => null,
                'apartados' => [
                    ['Planteamiento del problema', 'Los emprendedores universitarios carecen de información sistematizada para decidir.'],
                    ['Objetivos', 'Diseñar y validar tres tableros con cinco emprendimientos piloto.'],
                ],
            ],
            [
                'codigo' => 'INV-2026-902', 'tipo' => 'investigacion', 'registro_estado' => 'aprobado', 'evento' => null,
                'titulo' => 'Uso de datos abiertos en la evaluación de políticas de fomento a la investigación',
                'resumen' => 'Análisis de indicadores públicos para medir el efecto de los apoyos a la investigación en instituciones de educación superior.',
                'linea' => 'Impacto social de la investigación', 'estado' => 'en_ejecucion',
                'co_investigadores' => 'Dra. Lucía Fernández', 'dias_enviado' => 20, 'dias_revisado' => 15, 'comentario' => null,
                'apartados' => [
                    ['Justificación', 'Los datos abiertos permiten evaluar el efecto de los apoyos con evidencia comparable.'],
                    ['Metodología', 'Revisión documental, construcción de indicadores y validación con expertos.'],
                ],
            ],
            [
                'codigo' => 'TIT-2026-901', 'tipo' => 'titulacion', 'registro_estado' => 'devuelto', 'evento' => null,
                'titulo' => 'Proyecto de titulación: estrategias de vinculación con el sector productivo',
                'resumen' => 'Propuesta de trabajo de titulación para vincular a egresados con empresas de la región.',
                'linea' => 'Vinculación y transferencia', 'estado' => 'propuesta',
                'co_investigadores' => 'Est. Karen Vázquez', 'dias_enviado' => 9, 'dias_revisado' => 7,
                'comentario' => 'Falta precisar los objetivos específicos y el cronograma de actividades antes de aprobarlo.',
                'apartados' => [['Objetivo general', 'Diseñar un modelo de vinculación entre egresados y empresas.']],
            ],
        ];
    }

    /**
     * Liga la cuenta demo al primer docente y siembra sus proyectos. Debe llamarse dentro
     * de una transacción (lo hace SqliteInitializer).
     */
    public static function seed(PDO $pdo): void {
        $teacherId = (int)$pdo->query("SELECT id FROM investigadores ORDER BY id LIMIT 1")->fetchColumn();
        if ($teacherId === 0) {
            return;
        }

        $st = $pdo->prepare("SELECT id, investigador_id FROM usuarios WHERE LOWER(correo) = :c AND rol = 'investigador' LIMIT 1");
        $st->execute([':c' => self::CORREO_DEMO]);
        $user = $st->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return; // la cuenta demo no existe en esta BD: no se inventa
        }
        $userId = (int)$user['id'];

        if ($user['investigador_id'] === null) {
            // Una cuenta por docente: si otra cuenta ya usa esa ficha, no se fuerza el vínculo
            $taken = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE investigador_id = :i");
            $taken->execute([':i' => $teacherId]);
            if ((int)$taken->fetchColumn() > 0) {
                return;
            }
            $teacher = $pdo->prepare("SELECT nombre_completo, categoria FROM investigadores WHERE id = :i");
            $teacher->execute([':i' => $teacherId]);
            $t = $teacher->fetch(PDO::FETCH_ASSOC);
            $pdo->prepare("UPDATE usuarios SET investigador_id = :i, debe_cambiar_password = 0, nombre = :n, cargo = :c,
                           updated_at = CURRENT_TIMESTAMP WHERE id = :u")
                ->execute([':i' => $teacherId, ':n' => $t['nombre_completo'], ':c' => $t['categoria'] ?: 'Docente', ':u' => $userId]);
            $ownerId = $teacherId;
        } else {
            $ownerId = (int)$user['investigador_id'];
        }

        $adminId = $pdo->query("SELECT id FROM usuarios WHERE rol IN ('administrador', 'admin') ORDER BY id LIMIT 1")->fetchColumn();
        $adminId = $adminId === false ? null : (int)$adminId;
        $eventId = $pdo->query("SELECT id FROM eventos_investigacion WHERE tipo = 'semilleros' AND publico = 1 ORDER BY id LIMIT 1")->fetchColumn();
        $eventId = $eventId === false ? null : (int)$eventId;

        $exists = $pdo->prepare("SELECT COUNT(*) FROM proyectos WHERE codigo = :c");
        $insert = $pdo->prepare("INSERT INTO proyectos
            (codigo, titulo, resumen, investigador_principal_id, co_investigadores, estado, fecha_inicio, fecha_fin,
             presupuesto, entidad_financiadora, linea_investigacion, tipo, evento_id, articulado_civ,
             registro_estado, comentario_revision, enviado_en, revisado_en, revisado_por, creado_por_usuario_id)
            VALUES (:codigo, :titulo, :resumen, :inv, :co, :estado, :inicio, NULL,
                    0, 'Fondos Internos Institucionales', :linea, :tipo, :evento, 0,
                    :reg, :comentario, :enviado, :revisado, :revisor, :creador)");
        $insertSection = $pdo->prepare("INSERT INTO proyecto_apartados (proyecto_id, apartado, contenido, orden)
                                        VALUES (:p, :a, :c, :o)");

        $when = fn(?int $daysAgo): ?string => $daysAgo === null ? null : date('Y-m-d H:i:s', time() - $daysAgo * 86400);

        foreach (self::proyectos() as $p) {
            $exists->execute([':c' => $p['codigo']]);
            if ((int)$exists->fetchColumn() > 0) {
                continue;
            }
            $reviewed = in_array($p['registro_estado'], ['aprobado', 'devuelto'], true);
            $insert->execute([
                ':codigo' => $p['codigo'], ':titulo' => $p['titulo'], ':resumen' => $p['resumen'], ':inv' => $ownerId,
                ':co' => $p['co_investigadores'], ':estado' => $p['estado'], ':inicio' => date('Y-m-d'),
                ':linea' => $p['linea'], ':tipo' => $p['tipo'], ':evento' => $p['evento'] === 'semilleros' ? $eventId : null,
                ':reg' => $p['registro_estado'], ':comentario' => $p['comentario'],
                ':enviado' => $when($p['dias_enviado']), ':revisado' => $when($p['dias_revisado']),
                ':revisor' => $reviewed ? $adminId : null, ':creador' => $userId,
            ]);
            $projectId = (int)$pdo->lastInsertId();
            foreach ($p['apartados'] as $order => [$title, $content]) {
                $insertSection->execute([':p' => $projectId, ':a' => $title, ':c' => $content, ':o' => $order]);
            }
        }
    }
}
