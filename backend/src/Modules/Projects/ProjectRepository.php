<?php
namespace App\Modules\Projects;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE PROYECTOS DE INVESTIGACIÓN (ProjectRepository)
 * ============================================================================
 * Maneja las operaciones de persistencia en la tabla 'proyectos'.
 * Realiza cruces con la tabla 'investigadores' para traer el nombre del líder
 * del proyecto y cuenta las publicaciones generadas por el mismo.
 */
class ProjectRepository {
    private PDO $db;

    /**
     * Visibilidad para quien no es administrador: solo proyectos de investigación clásicos
     * que no estén ligados a un evento no público. Los proyectos de semilleros y de titulación
     * del Eje 3 se consultan únicamente por /api/eje3/proyectos [A] o, vía eventos públicos,
     * por /api/eje3/difusion. Además solo se muestran proyectos 'aprobado' (los borradores, enviados
     * y devueltos de docentes no son públicos).
     */
    public const PUBLIC_FILTER = "p.tipo = 'investigacion' AND p.registro_estado = 'aprobado'
                AND (p.evento_id IS NULL OR p.evento_id IN (SELECT id FROM eventos_investigacion WHERE publico = 1))";

    /**
     * Columnas de uso interno del flujo de revisión de docentes: nunca se muestran a quien no es
     * administrador (los endpoints públicos usan `p.*`; el comentario del revisor puede ser una nota interna).
     */
    public const INTERNAL_FIELDS = ['comentario_revision', 'revisado_por', 'revisado_en', 'enviado_en', 'creado_por_usuario_id'];

    /** Quita de una fila de proyecto las columnas internas del flujo de revisión. */
    public static function stripInternal(array $project): array {
        return array_diff_key($project, array_flip(self::INTERNAL_FIELDS));
    }

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Lista todos los proyectos con filtros opcionales (estado, búsqueda por título o código).
     *
     * @param string|null $estado Filtro por fase ('propuesta', 'en_ejecucion', 'completado', 'suspendido')
     * @param string|null $search Filtro por texto en título, código o línea
     * @return array
     */
    public function findAll(?string $estado = null, ?string $search = null, bool $soloPublicos = false): array {
        $sql = "SELECT 
                    p.*,
                    i.nombre_completo AS investigador_principal_nombre,
                    i.correo AS investigador_principal_correo,
                    i.avatar_url AS investigador_principal_avatar,
                    COUNT(pub.id) AS total_publicaciones_derivadas
                FROM proyectos p
                JOIN investigadores i ON i.id = p.investigador_principal_id
                LEFT JOIN publicaciones pub ON pub.proyecto_id = p.id";

        $conditions = [];
        $params = [];

        if ($soloPublicos) {
            $conditions[] = self::PUBLIC_FILTER;
        }

        if (!empty($estado)) {
            $conditions[] = "p.estado = :estado";
            $params[':estado'] = $estado;
        }

        if (!empty($search)) {
            $conditions[] = "(p.titulo LIKE :s1 OR p.codigo LIKE :s2 OR p.linea_investigacion LIKE :s3)";
            // Un parámetro distinto por columna: MySQL (prepares nativos) no admite repetir nombres
            foreach ([':s1', ':s2', ':s3'] as $name) { $params[$name] = "%{$search}%"; }
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $sql .= " GROUP BY p.id ORDER BY p.fecha_inicio DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene un proyecto por su ID único.
     */
    public function findById(int $id, bool $soloPublicos = false): ?array {
        $sql = "SELECT 
                    p.*,
                    i.nombre_completo AS investigador_principal_nombre,
                    i.correo AS investigador_principal_correo,
                    i.avatar_url AS investigador_principal_avatar,
                    COUNT(pub.id) AS total_publicaciones_derivadas
                FROM proyectos p
                JOIN investigadores i ON i.id = p.investigador_principal_id
                LEFT JOIN publicaciones pub ON pub.proyecto_id = p.id
                WHERE p.id = :id" . ($soloPublicos ? " AND " . self::PUBLIC_FILTER : "") . "
                GROUP BY p.id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Inserta un nuevo proyecto de investigación.
     */
    public function create(array $data): int {
        $sql = "INSERT INTO proyectos (
                    codigo, titulo, resumen, investigador_principal_id, 
                    co_investigadores, estado, fecha_inicio, fecha_fin, 
                    presupuesto, entidad_financiadora, linea_investigacion
                ) VALUES (
                    :codigo, :titulo, :resumen, :investigador_principal_id, 
                    :co_investigadores, :estado, :fecha_inicio, :fecha_fin, 
                    :presupuesto, :entidad_financiadora, :linea_investigacion
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':codigo'                    => $data['codigo'],
            ':titulo'                    => $data['titulo'],
            ':resumen'                   => $data['resumen'] ?? null,
            ':investigador_principal_id' => $data['investigador_principal_id'],
            ':co_investigadores'         => $data['co_investigadores'] ?? null,
            ':estado'                    => $data['estado'] ?? 'en_ejecucion',
            ':fecha_inicio'              => $data['fecha_inicio'],
            ':fecha_fin'                 => !empty($data['fecha_fin']) ? $data['fecha_fin'] : null,
            ':presupuesto'               => $data['presupuesto'] ?? 0.00,
            ':entidad_financiadora'      => $data['entidad_financiadora'] ?? 'Fondos Institucionales',
            ':linea_investigacion'       => $data['linea_investigacion']
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza los datos de un proyecto.
     */
    public function update(int $id, array $data): bool {
        $sql = "UPDATE proyectos SET 
                    codigo                    = :codigo,
                    titulo                    = :titulo,
                    resumen                   = :resumen,
                    investigador_principal_id = :investigador_principal_id,
                    co_investigadores         = :co_investigadores,
                    estado                    = :estado,
                    fecha_inicio              = :fecha_inicio,
                    fecha_fin                 = :fecha_fin,
                    presupuesto               = :presupuesto,
                    entidad_financiadora      = :entidad_financiadora,
                    linea_investigacion       = :linea_investigacion
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'                        => $id,
            ':codigo'                    => $data['codigo'],
            ':titulo'                    => $data['titulo'],
            ':resumen'                   => $data['resumen'] ?? null,
            ':investigador_principal_id' => $data['investigador_principal_id'],
            ':co_investigadores'         => $data['co_investigadores'] ?? null,
            ':estado'                    => $data['estado'] ?? 'en_ejecucion',
            ':fecha_inicio'              => $data['fecha_inicio'],
            ':fecha_fin'                 => !empty($data['fecha_fin']) ? $data['fecha_fin'] : null,
            ':presupuesto'               => $data['presupuesto'] ?? 0.00,
            ':entidad_financiadora'      => $data['entidad_financiadora'] ?? 'Fondos Institucionales',
            ':linea_investigacion'       => $data['linea_investigacion']
        ]);
    }

    /**
     * Elimina un proyecto por ID.
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM proyectos WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }
}
