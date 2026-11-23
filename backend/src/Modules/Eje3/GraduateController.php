<?php
namespace App\Modules\Eje3;

/**
 * Actividades de egresados de posgrado [A].
 * Endpoints: GET|POST /api/eje3/egresados, GET|PUT|DELETE /api/eje3/egresados/:id
 * Filtros de lista: programa, tipo, search.
 */
class GraduateController extends RegistryController {
    protected function resource(): string { return 'egresados'; }
}
