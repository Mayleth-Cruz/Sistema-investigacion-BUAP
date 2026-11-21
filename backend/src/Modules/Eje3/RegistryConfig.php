<?php
namespace App\Modules\Eje3;

/**
 * ============================================================================
 * CONFIGURACIÓN DE LOS CATÁLOGOS DE REGISTRO (RegistryConfig)
 * ============================================================================
 * Describe de forma declarativa los tres catálogos CRUD genéricos del Eje 3:
 *  - participantes      -> participantes_evento (dictaminadores, moderadores, relatores, dictaminadores PYAD)
 *  - retribucion-social -> retribucion_social (MPYMES, MGT, MDGE)
 *  - egresados          -> actividades_egresados
 *
 * Cada entrada define: tabla, campos (ver Eje3Fields), filtros permitidos
 * (nombre de parámetro => columna), columnas de búsqueda libre, SELECT/JOIN
 * y orden por defecto. La tabla siempre se aliasa como `r`.
 */
class RegistryConfig {
    public const ROLES = ['dictaminador', 'moderador', 'relator', 'dictaminador_pyad'];
    public const PROGRAMAS_RETRIBUCION = ['MPYMES', 'MGT', 'MDGE'];
    public const TIPOS_PARTICIPANTE = ['estudiante', 'profesor'];
    public const TIPOS_EGRESADO = ['empleo', 'emprendimiento', 'publicacion', 'posgrado', 'otro'];

    /**
     * Devuelve la configuración de un recurso o null si no existe.
     */
    public static function get(string $resource): ?array {
        $all = self::all();
        return $all[$resource] ?? null;
    }

    private static function all(): array {
        return [
            'participantes' => [
                'table'   => 'participantes_evento',
                'singular' => 'participante',
                'select'  => 'r.*, e.nombre AS evento_nombre',
                'join'    => 'LEFT JOIN eventos_investigacion e ON e.id = r.evento_id',
                'filters' => ['rol' => 'r.rol', 'evento_id' => 'r.evento_id'],
                'search'  => ['r.nombre_completo', 'r.correo', 'r.institucion', 'r.especialidad'],
                'order'   => 'r.nombre_completo ASC, r.id ASC',
                'int_columns' => ['id', 'evento_id', 'activo'],
                'fields'  => [
                    'rol'             => ['type' => 'enum', 'values' => self::ROLES, 'required' => true,
                                          'required_message' => 'El rol del participante es obligatorio.'],
                    'nombre_completo' => ['type' => 'string', 'required' => true, 'max' => 150,
                                          'required_message' => 'El nombre completo es obligatorio.'],
                    'correo'          => ['type' => 'email', 'max' => 120],
                    'institucion'     => ['type' => 'string', 'max' => 200],
                    'especialidad'    => ['type' => 'string', 'max' => 200],
                    'evento_id'       => ['type' => 'fk', 'table' => 'eventos_investigacion', 'missing_message' => 'El evento indicado no existe.'],
                    'activo'          => ['type' => 'bool', 'default' => 1],
                ],
            ],
            'retribucion-social' => [
                'table'   => 'retribucion_social',
                'singular' => 'registro de retribución social',
                'select'  => 'r.*',
                'join'    => '',
                'filters' => ['programa' => 'r.programa', 'tipo_participante' => 'r.tipo_participante'],
                'search'  => ['r.nombre_participante', 'r.actividad', 'r.institucion_beneficiada', 'r.descripcion'],
                'order'   => 'r.fecha DESC, r.id DESC',
                'int_columns' => ['id', 'horas'],
                'fields'  => [
                    'programa'                => ['type' => 'enum', 'values' => self::PROGRAMAS_RETRIBUCION, 'required' => true,
                                                  'required_message' => 'El programa es obligatorio.'],
                    'tipo_participante'       => ['type' => 'enum', 'values' => self::TIPOS_PARTICIPANTE, 'required' => true,
                                                  'required_message' => 'El tipo de participante es obligatorio.'],
                    'nombre_participante'     => ['type' => 'string', 'required' => true, 'max' => 150,
                                                  'required_message' => 'El nombre del participante es obligatorio.'],
                    'actividad'               => ['type' => 'string', 'required' => true, 'max' => 250,
                                                  'required_message' => 'La actividad es obligatoria.'],
                    'institucion_beneficiada' => ['type' => 'string', 'max' => 200],
                    'horas'                   => ['type' => 'int', 'min' => 0, 'default' => 0],
                    'fecha'                   => ['type' => 'date'],
                    'periodo'                 => ['type' => 'string', 'max' => 50],
                    'descripcion'             => ['type' => 'text'],
                ],
            ],
            'egresados' => [
                'table'   => 'actividades_egresados',
                'singular' => 'actividad de egresado',
                'select'  => 'r.*',
                'join'    => '',
                'filters' => ['programa' => 'r.programa', 'tipo' => 'r.tipo'],
                'search'  => ['r.nombre_egresado', 'r.actividad', 'r.institucion', 'r.descripcion', 'r.generacion'],
                'order'   => 'r.fecha DESC, r.id DESC',
                'int_columns' => ['id'],
                'fields'  => [
                    'programa'        => ['type' => 'string', 'max' => 100],
                    'nombre_egresado' => ['type' => 'string', 'required' => true, 'max' => 150,
                                          'required_message' => 'El nombre del egresado es obligatorio.'],
                    'generacion'      => ['type' => 'string', 'max' => 50],
                    'actividad'       => ['type' => 'string', 'required' => true, 'max' => 250,
                                          'required_message' => 'La actividad es obligatoria.'],
                    'tipo'            => ['type' => 'enum', 'values' => self::TIPOS_EGRESADO, 'required' => true,
                                          'required_message' => 'El tipo de actividad es obligatorio.'],
                    'institucion'     => ['type' => 'string', 'max' => 200],
                    'fecha'           => ['type' => 'date'],
                    'descripcion'     => ['type' => 'text'],
                ],
            ],
        ];
    }
}
