<?php
namespace App\Modules\Eje3;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE CUENTAS DE DOCENTES (TeacherAccountRepository)
 * ============================================================================
 * Cuentas de `usuarios` con rol 'investigador', ligadas a una ficha de `investigadores`.
 * Nunca selecciona ni devuelve password_hash.
 */
class TeacherAccountRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function baseSelect(): string {
        return "SELECT u.id, u.nombre, u.correo, u.activo, u.investigador_id, i.nombre_completo AS investigador_nombre,
                    u.debe_cambiar_password, u.ultimo_acceso,
                    (SELECT COUNT(*) FROM proyectos p WHERE p.investigador_principal_id = u.investigador_id) AS total_proyectos
                FROM usuarios u
                LEFT JOIN investigadores i ON i.id = u.investigador_id
                WHERE u.rol = 'investigador'";
    }

    private function cast(array $row): array {
        foreach (['id', 'activo', 'debe_cambiar_password', 'total_proyectos'] as $key) {
            $row[$key] = (int)($row[$key] ?? 0);
        }
        $row['investigador_id'] = $row['investigador_id'] === null ? null : (int)$row['investigador_id'];
        return $row;
    }

    public function findAll(?string $search): array {
        $sql = $this->baseSelect();
        $params = [];
        if ($search !== null && $search !== '') {
            // Un parámetro distinto por columna: MySQL (prepares nativos) no admite repetir nombres
            $sql .= " AND (u.nombre LIKE :s1 OR u.correo LIKE :s2 OR i.nombre_completo LIKE :s3)";
            foreach ([':s1', ':s2', ':s3'] as $name) {
                $params[$name] = "%{$search}%";
            }
        }
        $sql .= " ORDER BY u.nombre ASC, u.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'cast'], $stmt->fetchAll());
    }

    /** Cuenta de docente (rol investigador) por id, o null. */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare($this->baseSelect() . " AND u.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->cast($row) : null;
    }

    /** Ficha de investigador (para crear la cuenta) o null. */
    public function findTeacher(int $teacherId): ?array {
        $stmt = $this->db->prepare("SELECT id, nombre_completo, correo, categoria FROM investigadores WHERE id = :id");
        $stmt->execute([':id' => $teacherId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function teacherHasAccount(int $teacherId): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM usuarios WHERE investigador_id = :i");
        $stmt->execute([':i' => $teacherId]);
        return (int)$stmt->fetchColumn() > 0;
    }

    public function emailExists(string $email): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM usuarios WHERE LOWER(correo) = LOWER(:c)");
        $stmt->execute([':c' => $email]);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Crea la cuenta con contraseña temporal (solo se guarda el hash) y devuelve su id.
     */
    public function create(array $teacher, string $email, string $passwordHash): int {
        $stmt = $this->db->prepare("INSERT INTO usuarios
            (nombre, correo, password_hash, rol, cargo, activo, investigador_id, debe_cambiar_password)
            VALUES (:nombre, :correo, :hash, 'investigador', :cargo, 1, :inv, 1)");
        $stmt->execute([
            ':nombre' => mb_substr((string)$teacher['nombre_completo'], 0, 150),
            ':correo' => $email,
            ':hash'   => $passwordHash,
            ':cargo'  => mb_substr((string)($teacher['categoria'] ?: 'Docente'), 0, 150),
            ':inv'    => (int)$teacher['id'],
        ]);
        return (int)$this->db->lastInsertId();
    }

    /**
     * Restablece: nueva contraseña temporal, cambio obligatorio, sin intentos ni bloqueo y SIN sesiones.
     */
    public function resetPassword(int $id, string $passwordHash): void {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE usuarios SET password_hash = :h, debe_cambiar_password = 1, intentos_fallidos = 0,
                                bloqueado_hasta = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND rol = 'investigador'")
                ->execute([':h' => $passwordHash, ':id' => $id]);
            $this->db->prepare("DELETE FROM sesiones WHERE usuario_id = :id")->execute([':id' => $id]);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Activa o desactiva la cuenta; al desactivar se eliminan todas sus sesiones.
     */
    public function setActive(int $id, int $active): void {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE usuarios SET activo = :a, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND rol = 'investigador'")
                ->execute([':a' => $active, ':id' => $id]);
            if ($active === 0) {
                $this->db->prepare("DELETE FROM sesiones WHERE usuario_id = :id")->execute([':id' => $id]);
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
