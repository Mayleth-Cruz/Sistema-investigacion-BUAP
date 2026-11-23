<?php
namespace App\Modules\Eje3;

/**
 * Retribución social [A] de los programas MPYMES, MGT y MDGE.
 * Endpoints: GET|POST /api/eje3/retribucion-social, GET|PUT|DELETE /api/eje3/retribucion-social/:id
 * Filtros de lista: programa, tipo_participante, search.
 */
class SocialReturnController extends RegistryController {
    protected function resource(): string { return 'retribucion-social'; }
}
