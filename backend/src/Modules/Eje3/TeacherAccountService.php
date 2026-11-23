<?php
namespace App\Modules\Eje3;

use App\Core\Validator;
use App\Modules\Auth\AuthController;

/**
 * ============================================================================
 * SERVICIO DE CUENTAS DE DOCENTES (TeacherAccountService) [A]
 * ============================================================================
 * El administrador crea las cuentas (sin auto-registro): elige un docente (ficha de investigador),
 * el sistema genera una contraseña temporal de 12 caracteres con random_bytes y el docente debe
 * cambiarla en su primer ingreso. La temporal SOLO se devuelve en la respuesta de creación o
 * restablecimiento; en la BD se guarda únicamente el hash bcrypt y nunca se registra en logs.
 */
class TeacherAccountService {
    /** Alfabeto sin caracteres ambiguos (0, O, 1, l, I). */
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    private const PASSWORD_LENGTH = 12;

    private TeacherAccountRepository $repository;

    public function __construct() {
        $this->repository = new TeacherAccountRepository();
    }

    public function list(?string $search): array {
        return $this->repository->findAll($search);
    }

    /**
     * Crea la cuenta. Body: {investigador_id, correo?} (correo por defecto = correo de la ficha).
     */
    public function create(array $data): array {
        $errors = [];
        $rawId = $data['investigador_id'] ?? null;
        $teacher = null;
        if (!is_scalar($rawId) || !is_numeric($rawId) || (int)$rawId <= 0 || (float)$rawId != floor((float)$rawId) || (float)$rawId > Eje3Fields::MAX_INT) {
            $errors['investigador_id'][] = 'Debes seleccionar un docente (identificador numérico válido).';
        } else {
            $teacher = $this->repository->findTeacher((int)$rawId);
            if (!$teacher) {
                $errors['investigador_id'][] = 'El docente indicado no existe.';
            }
        }

        $email = null;
        if (array_key_exists('correo', $data) && $data['correo'] !== null && $data['correo'] !== '') {
            if (!is_string($data['correo'])) {
                $errors['correo'][] = "El campo 'correo' tiene un formato inválido.";
            } else {
                $email = trim($data['correo']);
            }
        } elseif ($teacher) {
            $email = trim((string)$teacher['correo']);
        }
        if ($email !== null) {
            $validator = new Validator();
            $validator->required($email, 'correo', 'El correo de la cuenta es obligatorio.')
                ->email($email, 'correo', 'El correo debe tener un formato válido.');
            foreach ($validator->getErrors() as $field => $messages) {
                foreach ($messages as $m) { $errors[$field][] = $m; }
            }
            if (mb_strlen($email) > 120) {
                $errors['correo'][] = 'El correo no debe exceder 120 caracteres.';
            }
        } elseif (empty($errors['correo'])) {
            $errors['correo'][] = 'El correo de la cuenta es obligatorio.';
        }
        if ($errors) {
            return ['success' => false, 'errors' => $errors, 'message' => 'Datos de la cuenta inválidos.'];
        }

        if ($this->repository->teacherHasAccount((int)$teacher['id'])) {
            return $this->conflict('docente_con_cuenta', 'investigador_id', 'Este docente ya tiene una cuenta. Usa "Restablecer" para generar otra contraseña temporal.');
        }
        if ($this->repository->emailExists($email)) {
            return $this->conflict('correo_duplicado', 'correo', 'Ya existe una cuenta con ese correo.');
        }

        $password = $this->generatePassword();
        try {
            $id = $this->repository->create($teacher, $email, password_hash($password, PASSWORD_BCRYPT, AuthController::PASSWORD_OPTIONS));
        } catch (\PDOException $e) {
            // Carrera con otra alta (índice único de investigador_id o de correo)
            if ((string)$e->getCode() === '23000') {
                return $this->conflict('cuenta_existente', 'investigador_id', 'No se pudo crear la cuenta: el docente o el correo ya tienen una cuenta.');
            }
            throw $e;
        }

        return ['success' => true, 'data' => $this->repository->findById($id) + ['password_temporal' => $password]];
    }

    /**
     * Nueva contraseña temporal: cambio obligatorio, sin intentos/bloqueo y todas sus sesiones cerradas.
     */
    public function reset(int $id): array {
        if (!$this->repository->findById($id)) {
            return $this->notFound($id);
        }
        $password = $this->generatePassword();
        $this->repository->resetPassword($id, password_hash($password, PASSWORD_BCRYPT, AuthController::PASSWORD_OPTIONS));
        return ['success' => true, 'data' => $this->repository->findById($id) + ['password_temporal' => $password]];
    }

    /**
     * Activa/desactiva la cuenta. Body: {activo: 0|1|bool}.
     */
    public function setActive(int $id, array $data): array {
        if (!$this->repository->findById($id)) {
            return $this->notFound($id);
        }
        $active = array_key_exists('activo', $data) && is_scalar($data['activo']) ? Eje3Fields::toBool($data['activo']) : null;
        if ($active === null) {
            return ['success' => false, 'errors' => ['activo' => ["El campo 'activo' es obligatorio y debe ser 1 o 0."]], 'message' => 'Datos inválidos.'];
        }
        $this->repository->setActive($id, $active);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }

    /**
     * 12 caracteres con random_bytes (muestreo por rechazo: sin sesgo de módulo).
     */
    private function generatePassword(): string {
        $length = strlen(self::ALPHABET);
        $limit = intdiv(256, $length) * $length;
        $out = '';
        while (strlen($out) < self::PASSWORD_LENGTH) {
            foreach (str_split(random_bytes(32)) as $char) {
                $byte = ord($char);
                if ($byte < $limit) {
                    $out .= self::ALPHABET[$byte % $length];
                    if (strlen($out) === self::PASSWORD_LENGTH) {
                        break;
                    }
                }
            }
        }
        return $out;
    }

    private function conflict(string $code, string $field, string $message): array {
        return ['success' => false, 'conflict' => true, 'message' => $message,
            'errors' => ['codigo' => [$code], $field => [$message]]];
    }

    private function notFound(int $id): array {
        return ['success' => false, 'notFound' => true, 'message' => "La cuenta de docente con ID {$id} no fue encontrada."];
    }
}
