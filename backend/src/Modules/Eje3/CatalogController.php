<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DEL HUB DE REGISTRO (CatalogController) [A]
 * ============================================================================
 * GET /api/eje3/catalogos -> conteo de registros de cada catálogo del Eje 3
 * (proyectos por tipo, participantes por rol, retribución social por programa,
 * egresados, eventos y docentes) para las tarjetas del hub de Registro. Los conteos de proyectos
 * incluyen TODOS los estados de registro (como el listado del Registro); `proyectos_pendientes`
 * cuenta los enviados por docentes que esperan revisión.
 */
class CatalogController extends Eje3Controller {
    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }

        $db = Database::getConnection();
        $count = function (string $sql, array $params = []) use ($db): int {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return (int)$stmt->fetchColumn();
        };

        Response::success([
            'proyectos_investigacion' => $count("SELECT COUNT(*) FROM proyectos WHERE tipo = 'investigacion'"),
            'proyectos_semilleros'    => $count("SELECT COUNT(*) FROM proyectos WHERE tipo = 'semillero'"),
            'proyectos_titulacion'    => $count("SELECT COUNT(*) FROM proyectos WHERE tipo = 'titulacion'"),
            'dictaminadores'          => $count("SELECT COUNT(*) FROM participantes_evento WHERE rol = 'dictaminador'"),
            'moderadores'             => $count("SELECT COUNT(*) FROM participantes_evento WHERE rol = 'moderador'"),
            'relatores'               => $count("SELECT COUNT(*) FROM participantes_evento WHERE rol = 'relator'"),
            'dictaminadores_pyad'     => $count("SELECT COUNT(*) FROM participantes_evento WHERE rol = 'dictaminador_pyad'"),
            'retribucion_mpymes'      => $count("SELECT COUNT(*) FROM retribucion_social WHERE programa = 'MPYMES'"),
            'retribucion_mgt'         => $count("SELECT COUNT(*) FROM retribucion_social WHERE programa = 'MGT'"),
            'retribucion_mdge'        => $count("SELECT COUNT(*) FROM retribucion_social WHERE programa = 'MDGE'"),
            'egresados'               => $count("SELECT COUNT(*) FROM actividades_egresados"),
            'eventos'                 => $count("SELECT COUNT(*) FROM eventos_investigacion"),
            'docentes'                => $count("SELECT COUNT(*) FROM investigadores"),
            'proyectos_pendientes'    => $count("SELECT COUNT(*) FROM proyectos WHERE registro_estado = 'enviado'"),
        ], 'Resumen de catálogos obtenido exitosamente.');
    }
}
