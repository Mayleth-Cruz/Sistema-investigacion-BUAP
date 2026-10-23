<?php
namespace App\Modules\Categories;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE CATEGORÍAS (CategoryRepository)
 * ============================================================================
 * Acceso y persistencia para la tabla 'categorias'.
 * Permite catalogar áreas del conocimiento y formatos/géneros de publicación.
 */
class CategoryRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Lista todas las categorías activas o filtradas por tipo o búsqueda.
     */
    public function findAll(array $filters = []): array {
        $sql = "SELECT c.*, 
                       (SELECT COUNT(*) FROM publicaciones p 
                        WHERE p.area_conocimiento = c.nombre 
                           OR p.tipo = c.codigo 
                           OR p.tipo = c.nombre) AS total_publicaciones
                FROM categorias c";

        $conditions = [];
        $params = [];

        if (!empty($filters['tipo'])) {
            $conditions[] = "c.tipo = :tipo";
            $params[':tipo'] = $filters['tipo'];
        }

        if (isset($filters['activo'])) {
            $conditions[] = "c.activo = :activo";
            $params[':activo'] = (int)$filters['activo'];
        }

        if (!empty($filters['search'])) {
            $conditions[] = "(c.nombre LIKE :search OR c.descripcion LIKE :search OR c.codigo LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $sql .= " ORDER BY c.tipo ASC, c.nombre ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene una categoría por su ID.
     */
    public function findById(int $id): ?array {
        $sql = "SELECT c.*, 
                       (SELECT COUNT(*) FROM publicaciones p 
                        WHERE p.area_conocimiento = c.nombre 
                           OR p.tipo = c.codigo 
                           OR p.tipo = c.nombre) AS total_publicaciones
                FROM categorias c
                WHERE c.id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Busca una categoría por su nombre exacto.
     */
    public function findByName(string $name, ?int $excludeId = null): ?array {
        $sql = "SELECT * FROM categorias WHERE LOWER(nombre) = LOWER(:nombre)";
        $params = [':nombre' => trim($name)];

        if ($excludeId !== null) {
            $sql .= " AND id != :excludeId";
            $params[':excludeId'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Inserta una nueva categoría.
     */
    public function create(array $data): int {
        $sql = "INSERT INTO categorias (nombre, codigo, tipo, descripcion, color, icono, activo)
                VALUES (:nombre, :codigo, :tipo, :descripcion, :color, :icono, :activo)";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nombre'      => trim($data['nombre']),
            ':codigo'      => !empty($data['codigo']) ? trim($data['codigo']) : null,
            ':tipo'        => $data['tipo'] ?? 'area_conocimiento',
            ':descripcion' => $data['descripcion'] ?? null,
            ':color'       => $data['color'] ?? '#003B5C',
            ':icono'       => $data['icono'] ?? '📚',
            ':activo'      => isset($data['activo']) ? (int)$data['activo'] : 1
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza una categoría existente.
     */
    public function update(int $id, array $data): bool {
        $sql = "UPDATE categorias SET
                    nombre      = :nombre,
                    codigo      = :codigo,
                    tipo        = :tipo,
                    descripcion = :descripcion,
                    color       = :color,
                    icono       = :icono,
                    activo      = :activo,
                    updated_at  = CURRENT_TIMESTAMP
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'          => $id,
            ':nombre'      => trim($data['nombre']),
            ':codigo'      => !empty($data['codigo']) ? trim($data['codigo']) : null,
            ':tipo'        => $data['tipo'] ?? 'area_conocimiento',
            ':descripcion' => $data['descripcion'] ?? null,
            ':color'       => $data['color'] ?? '#003B5C',
            ':icono'       => $data['icono'] ?? '📚',
            ':activo'      => isset($data['activo']) ? (int)$data['activo'] : 1
        ]);
    }

    /**
     * Elimina físicamente o desactiva una categoría.
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM categorias WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }
}
