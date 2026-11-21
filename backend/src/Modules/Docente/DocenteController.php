<?php
namespace App\Modules\Docente;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\AuthController;
use App\Modules\Eje3\Eje3Controller;

/**
 * ============================================================================
 * CONTROLADOR DEL ROL DOCENTE (DocenteController) — prefijo /api/docente
 * ============================================================================
 * Todas las rutas exigen AuthController::checkDocente(): sesión vigente de un docente activo
 * ligado a una ficha, y sin contraseña temporal pendiente (403 cambio_password_obligatorio).
 * El docente solo ve y modifica SUS proyectos (los ajenos responden 404).
 *
 * - GET    /api/docente/resumen              -> resumen personal (solo lectura)
 * - GET    /api/docente/proyectos            -> mis proyectos (filtros: registro_estado, tipo, search)
 * - GET    /api/docente/proyectos/:id        -> detalle con apartados
 * - POST   /api/docente/proyectos            -> crear (siempre en borrador)
 * - PUT    /api/docente/proyectos/:id        -> editar (borrador o devuelto)
 * - DELETE /api/docente/proyectos/:id        -> borrar (borrador o devuelto)
 * - POST   /api/docente/proyectos/:id/enviar -> enviar a revisión
 */
class DocenteController extends Eje3Controller {
    private DocenteProjectService $projects;
    private DocenteSummaryRepository $summary;

    public function __construct() {
        $this->projects = new DocenteProjectService();
        $this->summary = new DocenteSummaryRepository();
    }

    /** Docente autenticado o null (checkDocente ya envió la respuesta). */
    private function requireDocente(Request $request): ?array {
        return AuthController::checkDocente($request);
    }

    public function summary(Request $request): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $data = $this->summary->build((int)$user['investigador_id']);
        if ($data === null) {
            Response::notFound('No se encontró la ficha de docente ligada a tu cuenta.');
            return;
        }
        Response::success($data, 'Resumen del docente obtenido exitosamente.');
    }

    public function index(Request $request): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $filters = [
            'registro_estado' => $this->queryString($request, 'registro_estado'),
            'tipo'            => $this->queryString($request, 'tipo'),
            'search'          => $this->queryString($request, 'search'),
        ];
        Response::success($this->projects->listFor((int)$user['investigador_id'], $filters), 'Proyectos obtenidos exitosamente.');
    }

    public function show(Request $request, array $params): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $this->respond($this->projects->getFor((int)$user['investigador_id'], (int)($params['id'] ?? 0)),
            'Proyecto cargado correctamente.', 'No fue posible cargar el proyecto.');
    }

    public function store(Request $request): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $this->respond($this->projects->createFor($user, $request->getBody()),
            'Proyecto guardado como borrador.', 'Error al registrar el proyecto.', true);
    }

    public function update(Request $request, array $params): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $this->respond($this->projects->updateFor((int)$user['investigador_id'], (int)($params['id'] ?? 0), $request->getBody()),
            'Proyecto actualizado correctamente.', 'Error al actualizar el proyecto.');
    }

    public function destroy(Request $request, array $params): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $this->respond($this->projects->deleteFor((int)$user['investigador_id'], (int)($params['id'] ?? 0)),
            'Proyecto eliminado correctamente.', 'No fue posible eliminar el proyecto.');
    }

    public function submit(Request $request, array $params): void {
        $user = $this->requireDocente($request);
        if (!$user) {
            return;
        }
        $this->respond($this->projects->submitFor((int)$user['investigador_id'], (int)($params['id'] ?? 0)),
            'Proyecto enviado a revisión.', 'No fue posible enviar el proyecto a revisión.');
    }
}
