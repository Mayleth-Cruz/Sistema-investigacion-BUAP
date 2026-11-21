<?php
namespace App\Modules\Eje3;

/**
 * ============================================================================
 * SERVICIO DE MONITOREO DEL EJE 3 (MonitoringService)
 * ============================================================================
 * Calcula los indicadores a partir de las consultas del repositorio. Los
 * conteos son siempre la longitud de la lista de detalle correspondiente, de
 * modo que cifra y detalle nunca se contradicen.
 */
class MonitoringService {
    private MonitoringRepository $repository;

    public function __construct() {
        $this->repository = new MonitoringRepository();
    }

    public function indicators(): array {
        $conProyectos = $this->repository->teachersWithProjects('investigacion');
        $titulacionCiv = $this->repository->teachersWithProjects('titulacion', true);
        $semilleros = $this->repository->teachersWithProjects('semillero');
        $enSnii = $this->repository->teachersInSnii();
        $elegibles = $this->repository->eligibleTeachers();

        $porNivel = ['Candidato' => 0, 'I' => 0, 'II' => 0, 'III' => 0];
        foreach ($enSnii as $teacher) {
            if (isset($porNivel[$teacher['snii_nivel']])) {
                $porNivel[$teacher['snii_nivel']]++;
            }
        }

        return [
            'docentes_con_proyectos'    => count($conProyectos),
            'docentes_titulacion_civ'   => count($titulacionCiv),
            'profesores_snii'           => count($enSnii),
            'profesores_elegibles_snii' => count($elegibles),
            'total_docentes'            => $this->repository->totalActiveTeachers(),
            'docentes_con_semilleros'   => count($semilleros),
            'snii_por_nivel'            => $porNivel,
            'detalle' => [
                'con_proyectos'  => $conProyectos,
                'titulacion_civ' => $titulacionCiv,
                'en_snii'        => $enSnii,
                'elegibles'      => $elegibles,
            ],
        ];
    }
}
