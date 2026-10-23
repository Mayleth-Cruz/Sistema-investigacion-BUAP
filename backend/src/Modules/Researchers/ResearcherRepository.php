<?php
namespace App\Modules\Researchers;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE INVESTIGADORES (ResearcherRepository)
 * ============================================================================
 * Esta clase se encarga exclusivamente de ejecutar las consultas SQL hacia la
 * tabla 'investigadores'.
 * Aplica el principio de Responsabilidad Única (SRP) aislando la lógica de BD.
 */
class ResearcherRepository {
    private PDO $db;

    public function __construct() {
        // Obtenemos la conexión única compartida a MySQL
        $this->db = Database::getConnection();
    }

    /**
     * Obtiene todos los investigadores con opción de filtrar por texto o línea de investigación.
     * También calcula en una sola consulta el total de publicaciones y proyectos asociados.
     *
     * @param string|null $search Término de búsqueda (nombre, correo o línea)
     * @return array Lista de investigadores con sus estadísticas
     */
    public function findAll(?string $search = null): array {
        $sql = "SELECT 
                    i.*,
                    COUNT(DISTINCT pub.id) AS total_publicaciones,
                    COUNT(DISTINCT pro.id) AS total_proyectos,
                    COALESCE(SUM(pub.citas_estimadas), 0) AS total_citas
                FROM investigadores i
                LEFT JOIN publicaciones pub ON pub.investigador_id = i.id
                LEFT JOIN proyectos pro ON pro.investigador_principal_id = i.id";

        $params = [];

        // Si el usuario especificó un término de búsqueda, agregamos la cláusula WHERE
        if (!empty($search)) {
            $sql .= " WHERE (i.nombre_completo LIKE :search 
                         OR i.correo LIKE :search 
                         OR i.linea_investigacion LIKE :search 
                         OR i.afiliacion LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        $sql .= " GROUP BY i.id ORDER BY i.nombre_completo ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Busca un investigador específico por su ID único.
     *
     * @param int $id Identificador del investigador
     * @return array|null Datos del investigador o null si no existe
     */
    public function findById(int $id): ?array {
        $sql = "SELECT 
                    i.*,
                    COUNT(DISTINCT pub.id) AS total_publicaciones,
                    COUNT(DISTINCT pro.id) AS total_proyectos,
                    COALESCE(SUM(pub.citas_estimadas), 0) AS total_citas
                FROM investigadores i
                LEFT JOIN publicaciones pub ON pub.investigador_id = i.id
                LEFT JOIN proyectos pro ON pro.investigador_principal_id = i.id
                WHERE i.id = :id
                GROUP BY i.id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Inserta un nuevo investigador en la base de datos.
     *
     * @param array $data Datos validados del investigador
     * @return int ID generado por MySQL
     */
    public function create(array $data): int {
        $sql = "INSERT INTO investigadores (
                    nombre_completo, correo, identificacion, orcid, 
                    afiliacion, categoria, linea_investigacion, biografia, avatar_url, activo
                ) VALUES (
                    :nombre_completo, :correo, :identificacion, :orcid, 
                    :afiliacion, :categoria, :linea_investigacion, :biografia, :avatar_url, :activo
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nombre_completo'    => $data['nombre_completo'],
            ':correo'             => $data['correo'],
            ':identificacion'     => $data['identificacion'] ?? null,
            ':orcid'              => $data['orcid'] ?? null,
            ':afiliacion'         => $data['afiliacion'],
            ':categoria'          => $data['categoria'] ?? 'Investigador Asociado',
            ':linea_investigacion'=> $data['linea_investigacion'],
            ':biografia'          => $data['biografia'] ?? null,
            ':avatar_url'         => $data['avatar_url'] ?? null,
            ':activo'             => isset($data['activo']) ? (int)$data['activo'] : 1
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza la información de un investigador existente.
     *
     * @param int $id Identificador del investigador
     * @param array $data Nuevos datos a actualizar
     * @return bool True si la actualización afectó al registro
     */
    public function update(int $id, array $data): bool {
        $sql = "UPDATE investigadores SET 
                    nombre_completo     = :nombre_completo,
                    correo              = :correo,
                    identificacion      = :identificacion,
                    orcid               = :orcid,
                    afiliacion          = :afiliacion,
                    categoria           = :categoria,
                    linea_investigacion = :linea_investigacion,
                    biografia           = :biografia,
                    avatar_url          = :avatar_url,
                    activo              = :activo
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'                 => $id,
            ':nombre_completo'    => $data['nombre_completo'],
            ':correo'             => $data['correo'],
            ':identificacion'     => $data['identificacion'] ?? null,
            ':orcid'              => $data['orcid'] ?? null,
            ':afiliacion'         => $data['afiliacion'],
            ':categoria'          => $data['categoria'] ?? 'Investigador Asociado',
            ':linea_investigacion'=> $data['linea_investigacion'],
            ':biografia'          => $data['biografia'] ?? null,
            ':avatar_url'         => $data['avatar_url'] ?? null,
            ':activo'             => isset($data['activo']) ? (int)$data['activo'] : 1
        ]);
    }

    /**
     * Elimina un investigador por su ID.
     *
     * @param int $id Identificador a eliminar
     * @return bool True si se eliminó correctamente
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM investigadores WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }
}
