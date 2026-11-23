<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO GENÉRICO DE CATÁLOGOS (RegistryRepository)
 * ============================================================================
 * CRUD dirigido por configuración (ver RegistryConfig) para participantes de
 * evento, retribución social y actividades de egresados. Todas las consultas
 * usan parámetros nombrados; los nombres de tabla y columna provienen solo de
 * la configuración interna, nunca de la petición.
 */
class RegistryRepository {
    private PDO $db;
    private array $config;

    public function __construct(array $config) {
        $this->db = Database::getConnection();
        $this->config = $config;
    }

    /**
     * Normaliza los enteros de una fila según la configuración.
     */
    private function cast(array $row): array {
        foreach ($this->config['int_columns'] as $column) {
            if (array_key_exists($column, $row) && $row[$column] !== null) {
                $row[$column] = (int)$row[$column];
            }
        }
        return $row;
    }

    private function baseSelect(): string {
        return "SELECT {$this->config['select']} FROM {$this->config['table']} r {$this->config['join']}";
    }

    /**
     * Lista registros aplicando los filtros declarados y la búsqueda libre.
     */
    public function findAll(array $query): array {
        $conditions = [];
        $params = [];

        foreach ($this->config['filters'] as $param => $column) {
            if (isset($query[$param]) && $query[$param] !== '') {
                $conditions[] = "{$column} = :f_{$param}";
                $params[":f_{$param}"] = $query[$param];
            }
        }

        if (!empty($query['search'])) {
            $likes = [];
            foreach ($this->config['search'] as $i => $column) {
                $likes[] = "{$column} LIKE :search{$i}";
                $params[":search{$i}"] = "%{$query['search']}%";
            }
            $conditions[] = '(' . implode(' OR ', $likes) . ')';
        }

        $sql = $this->baseSelect();
        if ($conditions) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        $sql .= " ORDER BY {$this->config['order']}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare($this->baseSelect() . " WHERE r.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->cast($row) : null;
    }

    /**
     * Inserta un registro con los campos configurados y devuelve su id.
     */
    public function create(array $clean): int {
        $columns = array_keys($this->config['fields']);
        $placeholders = array_map(fn($c) => ':' . $c, $columns);
        $stmt = $this->db->prepare("INSERT INTO {$this->config['table']} (" . implode(', ', $columns) . ")
                                    VALUES (" . implode(', ', $placeholders) . ")");
        $stmt->execute($this->bind($clean));
        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza un registro (updated_at explícito por compatibilidad con SQLite).
     */
    public function update(int $id, array $clean): bool {
        $sets = [];
        foreach (array_keys($this->config['fields']) as $column) {
            $sets[] = "{$column} = :{$column}";
        }
        $stmt = $this->db->prepare("UPDATE {$this->config['table']} SET " . implode(', ', $sets) . ",
                                    updated_at = CURRENT_TIMESTAMP WHERE id = :id");
        return $stmt->execute($this->bind($clean) + [':id' => $id]);
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM {$this->config['table']} WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    private function bind(array $clean): array {
        $params = [];
        foreach (array_keys($this->config['fields']) as $column) {
            $params[':' . $column] = $clean[$column] ?? null;
        }
        return $params;
    }
}
