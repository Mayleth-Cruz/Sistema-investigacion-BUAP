<?php
namespace App\Modules\Eje3;

/**
 * ============================================================================
 * SERVICIO DE VISUALIZACIÓN DEL EJE 3 (VisualizationService)
 * ============================================================================
 * Arma los datos del panel público "Producción académica": publicaciones
 * resultado de eventos y de la revista PYAD, evolución por año y ranking de
 * docentes investigadores (solo activos con producción, máximo 20).
 */
class VisualizationService {
    private const MAX_DOCENTES = 20;

    private VisualizationRepository $repository;

    public function __construct() {
        $this->repository = new VisualizationRepository();
    }

    public function overview(): array {
        $byOrigin = $this->repository->publicationsByOrigin();

        $teachers = [];
        foreach ($this->repository->productionByTeacher() as $row) {
            $row['total'] = $row['publicaciones'] + $row['proyectos'] + $row['produccion_tecnica'];
            if ($row['total'] > 0) {
                $teachers[] = $row;
            }
        }
        usort($teachers, function (array $a, array $b): int {
            return [$b['total'], $a['nombre_completo']] <=> [$a['total'], $b['nombre_completo']];
        });

        return [
            'publicaciones_evento_pyad' => $byOrigin['evento'] + $byOrigin['revista_pyad'],
            'por_origen'                => $byOrigin,
            'por_anio'                  => $this->repository->publicationsByYear(),
            'produccion_docentes'       => array_slice($teachers, 0, self::MAX_DOCENTES),
            'totales'                   => $this->repository->totals(),
        ];
    }
}
