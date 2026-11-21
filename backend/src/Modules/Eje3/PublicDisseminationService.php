<?php
namespace App\Modules\Eje3;

/**
 * ============================================================================
 * SERVICIO DE DIFUSIÓN PÚBLICA DEL EJE 3 (PublicDisseminationService)
 * ============================================================================
 * Datos del portal público: eventos de semilleros (con sus proyectos y
 * apartados), congreso, otros eventos y próximos eventos. Solo se exponen los
 * eventos con publico = 1.
 */
class PublicDisseminationService {
    private const MAX_PROXIMOS = 5;

    private EventRepository $events;

    public function __construct() {
        $this->events = new EventRepository();
    }

    /**
     * Panorama de difusión: semilleros, congreso, otros_eventos y proximos.
     */
    public function overview(): array {
        $public = $this->events->findAll([], true);

        $semilleros = [];
        $congreso = [];
        $otros = [];
        foreach ($public as $event) {
            if ($event['tipo'] === 'semilleros') {
                $event['proyectos'] = $this->projectsOf((int)$event['id']);
                $semilleros[] = $event;
            } elseif ($event['tipo'] === 'congreso') {
                $congreso[] = $event;
            } else {
                $otros[] = $event;
            }
        }

        $proximos = $this->events->findAll(['desde' => date('Y-m-d'), 'orden_asc' => true], true, self::MAX_PROXIMOS);

        return [
            'semilleros'     => $semilleros,
            'congreso'       => $congreso,
            'otros_eventos'  => $otros,
            'proximos'       => $proximos,
        ];
    }

    /**
     * Detalle de un evento público con sus proyectos (y apartados) y publicaciones ligadas.
     */
    public function eventDetail(int $id): array {
        $event = $this->events->findById($id);
        if (!$event || (int)$event['publico'] !== 1) {
            return ['success' => false, 'notFound' => true, 'message' => "El evento con ID {$id} no fue encontrado."];
        }

        $event['proyectos'] = $this->projectsOf($id);
        $event['publicaciones'] = $this->events->findPublications($id);
        return ['success' => true, 'data' => $event];
    }

    /**
     * Proyectos del evento con el formato público {id,codigo,titulo,investigador_principal_nombre,apartados}.
     */
    private function projectsOf(int $eventId): array {
        return array_map(function (array $project): array {
            return [
                'id'                            => $project['id'],
                'codigo'                        => $project['codigo'],
                'titulo'                        => $project['titulo'],
                'investigador_principal_nombre' => $project['investigador_principal_nombre'],
                'apartados'                     => $project['apartados'],
            ];
        }, $this->events->findProjectsWithSections($eventId));
    }
}
