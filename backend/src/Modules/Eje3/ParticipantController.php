<?php
namespace App\Modules\Eje3;

/**
 * Participantes de evento [A]: dictaminadores, moderadores, relatores y dictaminadores PYAD.
 * Endpoints: GET|POST /api/eje3/participantes, GET|PUT|DELETE /api/eje3/participantes/:id
 * Filtros de lista: rol, evento_id, search.
 */
class ParticipantController extends RegistryController {
    protected function resource(): string { return 'participantes'; }
}
