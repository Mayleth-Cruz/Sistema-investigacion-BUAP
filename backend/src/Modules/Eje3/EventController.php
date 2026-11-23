<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE EVENTOS DE INVESTIGACIÓN (EventController)
 * ============================================================================
 * Endpoints:
 * - GET    /api/eje3/eventos       [P*] Lista (filtros: tipo, estado, search); un admin ve también los no públicos
 * - GET    /api/eje3/eventos/:id   [P*] Detalle (404 si no existe o no es público para un no admin)
 * - POST   /api/eje3/eventos       [A]  Crear (requeridos: nombre, tipo)
 * - PUT    /api/eje3/eventos/:id   [A]  Actualizar
 * - DELETE /api/eje3/eventos/:id   [A]  Eliminar (proyectos y participantes quedan con evento_id NULL)
 */
class EventController extends Eje3Controller {
    private EventService $service;

    public function __construct() {
        $this->service = new EventService();
    }

    public function index(Request $request): void {
        $isAdmin = $this->optionalAdmin($request) !== null;
        $filters = [
            'tipo'   => $this->queryString($request, 'tipo'),
            'estado' => $this->queryString($request, 'estado'),
            'search' => $this->queryString($request, 'search'),
        ];
        Response::success($this->service->list($filters, $isAdmin), 'Eventos obtenidos exitosamente.');
    }

    public function show(Request $request, array $params): void {
        $isAdmin = $this->optionalAdmin($request) !== null;
        $result = $this->service->get((int)($params['id'] ?? 0), $isAdmin);
        $this->respond($result, 'Evento cargado correctamente.', 'No fue posible cargar el evento.');
    }

    public function store(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $result = $this->service->create($request->getBody());
        $this->respond($result, 'Evento registrado exitosamente.', 'Error al registrar el evento.', true);
    }

    public function update(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $result = $this->service->update((int)($params['id'] ?? 0), $request->getBody());
        $this->respond($result, 'Evento actualizado correctamente.', 'Error al actualizar el evento.');
    }

    public function destroy(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $result = $this->service->delete((int)($params['id'] ?? 0));
        $this->respond($result, 'Evento eliminado correctamente.', 'No fue posible eliminar el evento.');
    }
}
