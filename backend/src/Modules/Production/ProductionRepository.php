<?php
namespace App\Modules\Production;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE PRODUCCIÓN TÉCNICA (ProductionRepository)
 * ============================================================================
 * Maneja los datos de patentes, registros de software, tesis dirigidas y ponencias.
 */
class ProductionRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Lista toda la producción técnica con filtros opcionales de tipo o búsqueda.
     */
    public function findAll(?string $tipo = null, ?string $search = null): array {
        $sql = "SELECT 
                    pt.*,
                    i.nombre_completo AS investigador_nombre,
                    i.correo AS investigador_correo,
                    i.avatar_url AS investigador_avatar
                FROM produccion_tecnica pt
                JOIN investigadores i ON i.id = pt.investigador_id";

        $conditions = [];
        $params = [];

        if (!empty($tipo)) {
            $conditions[] = "pt.tipo = :tipo";
            $params[':tipo'] = $tipo;
        }

        if (!empty($search)) {
            $conditions[] = "(pt.titulo LIKE :search OR pt.autores LIKE :search OR pt.numero_registro LIKE :search OR pt.institucion_evento LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $sql .= " ORDER BY pt.anio DESC, pt.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene un registro de producción técnica por su ID.
     */
    public function findById(int $id): ?array {
        $sql = "SELECT 
                    pt.*,
                    i.nombre_completo AS investigador_nombre,
                    i.correo AS investigador_correo,
                    i.avatar_url AS investigador_avatar
                FROM produccion_tecnica pt
                JOIN investigadores i ON i.id = pt.investigador_id
                WHERE pt.id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Registra una nueva producción técnica (patente, tesis, software o ponencia).
     */
    public function create(array $data): int {
        $sql = "INSERT INTO produccion_tecnica (
                    tipo, titulo, investigador_id, autores, anio, 
                    numero_registro, institucion_evento, estado, descripcion
                ) VALUES (
                    :tipo, :titulo, :investigador_id, :autores, :anio, 
                    :numero_registro, :institucion_evento, :estado, :descripcion
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':tipo'               => $data['tipo'],
            ':titulo'             => $data['titulo'],
            ':investigador_id'    => $data['investigador_id'],
            ':autores'            => $data['autores'],
            ':anio'               => (int)$data['anio'],
            ':numero_registro'    => $data['numero_registro'] ?? null,
            ':institucion_evento' => $data['institucion_evento'] ?? null,
            ':estado'             => $data['estado'] ?? 'concedida',
            ':descripcion'        => $data['descripcion'] ?? null
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza un registro existente.
     */
    public function update(int $id, array $data): bool {
        $sql = "UPDATE produccion_tecnica SET 
                    tipo               = :tipo,
                    titulo             = :titulo,
                    investigador_id    = :investigador_id,
                    autores            = :autores,
                    anio               = :anio,
                    numero_registro    = :numero_registro,
                    institucion_evento = :institucion_evento,
                    estado             = :estado,
                    descripcion        = :descripcion
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'                 => $id,
            ':tipo'               => $data['tipo'],
            ':titulo'             => $data['titulo'],
            ':investigador_id'    => $data['investigador_id'],
            ':autores'            => $data['autores'],
            ':anio'               => (int)$data['anio'],
            ':numero_registro'    => $data['numero_registro'] ?? null,
            ':institucion_evento' => $data['institucion_evento'] ?? null,
            ':estado'             => $data['estado'] ?? 'concedida',
            ':descripcion'        => $data['descripcion'] ?? null
        ]);
    }

    /**
     * Elimina una producción técnica por ID.
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM produccion_tecnica WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }
}
