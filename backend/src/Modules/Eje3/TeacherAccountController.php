<?php
namespace App\Modules\Eje3;

use App\Core\Request;
use App\Core\Response;

/**
 * ============================================================================
 * CONTROLADOR DE USUARIOS DOCENTES (TeacherAccountController) [A]
 * ============================================================================
 * - GET  /api/eje3/usuarios-docentes                    -> Lista de cuentas (?search)
 * - POST /api/eje3/usuarios-docentes                    -> Crea cuenta y devuelve password_temporal (una vez)
 * - POST /api/eje3/usuarios-docentes/:id/restablecer    -> Nueva contraseña temporal (una vez)
 * - PUT  /api/eje3/usuarios-docentes/:id                -> Activar / desactivar
 * Las respuestas con contraseña temporal se marcan como no almacenables en caché.
 */
class TeacherAccountController extends Eje3Controller {
    private TeacherAccountService $service;

    public function __construct() {
        $this->service = new TeacherAccountService();
    }

    public function index(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        Response::success($this->service->list($this->queryString($request, 'search')), 'Cuentas de docentes obtenidas exitosamente.');
    }

    public function store(Request $request): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->noStore();
        $this->respond($this->service->create($request->getBody()), 'Cuenta de docente creada. Entrega la contraseña temporal: no se volverá a mostrar.',
            'No fue posible crear la cuenta.', true);
    }

    public function reset(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->noStore();
        $this->respond($this->service->reset((int)($params['id'] ?? 0)), 'Contraseña restablecida. Entrega la contraseña temporal: no se volverá a mostrar.',
            'No fue posible restablecer la contraseña.');
    }

    public function update(Request $request, array $params): void {
        if (!$this->requireAdmin($request)) {
            return;
        }
        $this->respond($this->service->setActive((int)($params['id'] ?? 0), $request->getBody()), 'Cuenta actualizada correctamente.',
            'No fue posible actualizar la cuenta.');
    }

    private function noStore(): void {
        header('Cache-Control: no-store');
        header('Pragma: no-cache');
    }
}
