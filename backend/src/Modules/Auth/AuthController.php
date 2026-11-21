<?php
namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use PDO;

/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN INSTITUCIONAL (AuthController)
 * ============================================================================
 * Implementa las mejores prácticas de ciberseguridad para el acceso administrativo:
 * 1. Validación estricta de formato de correo y longitud de contraseña (>= 8 caracteres).
 * 2. Hash con algoritmo BCRYPT nativo y verificación constante en tiempo.
 * 3. Protección contra ataques de fuerza bruta (bloqueo tras 5 intentos fallidos por 15 min).
 * 4. Control estricto de roles: acceden el 'administrador' y el docente ('investigador' ligado a una
 *    ficha de investigador). Cualquier otro rol (p. ej. 'lector') es rechazado.
 * 5. Prevención de enumeración de cuentas mediante mensajes de error genéricos y seguros.
 * 6. Generación de tokens de sesión con entropía criptográfica (random_bytes).
 * 7. Sesiones reales: en la tabla `sesiones` solo se guarda el hash SHA-256 del token,
 *    con expiración de 8 horas. checkAdmin() valida el token contra esa tabla y el logout
 *    la elimina. No existen contraseñas de respaldo.
 * 8. Rol DOCENTE: checkDocente() exige sesión vigente de un docente activo y, mientras la cuenta
 *    tenga una contraseña temporal (debe_cambiar_password = 1), bloquea /api/docente/* con
 *    403 `cambio_password_obligatorio`. El cambio de contraseña invalida las demás sesiones.
 */
class AuthController {
    /** Duración de una sesión en segundos (8 horas). */
    private const SESSION_TTL = 28800;

    /** Mensaje único para correo desconocido y contraseña incorrecta (no revela si la cuenta existe). */
    private const MSG_BAD_CREDENTIALS = 'Credenciales de acceso incorrectas.';

    /**
     * Costo bcrypt fijo para las contraseñas nuevas. El valor por defecto de PHP cambia con la versión
     * (10 en PHP 8.2, 12 en 8.4+): fijarlo evita que el tiempo de verificación delate qué correos existen.
     */
    public const PASSWORD_OPTIONS = ['cost' => 12];

    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Procesa la solicitud de inicio de sesión administrativo.
     */
    public function login(Request $request): void {
        $body = $request->getBody();

        $email = trim((string)($body['correo'] ?? $body['email'] ?? ''));
        $password = (string)($body['password'] ?? $body['contrasena'] ?? '');

        // 1. Validaciones de entrada (Buenas prácticas)
        $validator = new Validator();
        $validator
            ->required($email, 'correo', 'El correo institucional es obligatorio.')
            ->email($email, 'correo', 'Debes ingresar un correo electrónico con formato válido.')
            ->required($password, 'password', 'La contraseña es obligatoria.')
            ->minLength($password, 8, 'password');

        if ($validator->fails()) {
            Response::badRequest('Datos de acceso inválidos.', $validator->getErrors());
            return;
        }

        // 2. Buscar usuario por correo (evitando inyecciones SQL mediante sentencias preparadas)
        $stmt = $this->db->prepare("
            SELECT id, nombre, correo, password_hash, rol, cargo, activo, intentos_fallidos, bloqueado_hasta,
                   investigador_id, debe_cambiar_password
            FROM usuarios 
            WHERE LOWER(correo) = LOWER(:correo) 
            LIMIT 1
        ");
        $stmt->execute([':correo' => $email]);
        $user = $stmt->fetch();
        // Libera el cursor: con un SELECT abierto, el UPDATE posterior falla al instante con
        // "database is locked" (SQLite/WAL) si otra petición escribió en medio y el intento no se cuenta.
        $stmt->closeCursor();

        // 3. Mitigación de enumeración de usuarios:
        // Correo desconocido y contraseña incorrecta responden IGUAL (mismo código y mensaje). Si el
        // usuario no existe, simulamos un password_verify para neutralizar ataques de temporización.
        if (!$user) {
            password_verify($password, '$2y$12$e0VRf3k8m9m3k8m9m3k8me0VRf3k8m9m3k8m9m3k8me0VRf3k8m9m');
            Response::unauthorized(self::MSG_BAD_CREDENTIALS);
            return;
        }

        // 4. Cuenta inactiva: solo se revela con la contraseña correcta (si no, parece cualquier otro fallo)
        if ((int)$user['activo'] !== 1) {
            if (!password_verify($password, (string)$user['password_hash'])) {
                Response::unauthorized(self::MSG_BAD_CREDENTIALS);
                return;
            }
            Response::forbidden('Esta cuenta institucional se encuentra inactiva. Contacte al administrador del sistema.');
            return;
        }

        // 5. Verificar bloqueo temporal por fuerza bruta
        if (!empty($user['bloqueado_hasta'])) {
            $lockUntil = strtotime($user['bloqueado_hasta']);
            if ($lockUntil > time()) {
                $minutosRestantes = max(1, (int)ceil(($lockUntil - time()) / 60));
                Response::forbidden("Acceso temporalmente bloqueado por múltiples intentos fallidos. Intente nuevamente en {$minutosRestantes} minuto(s).");
                return;
            }
        }

        // 6. Verificación criptográfica de la contraseña
        $passwordValid = password_verify($password, $user['password_hash']);
        
        if (!$passwordValid) {
            // Incremento ATÓMICO en SQL (no leer-sumar-escribir): con peticiones en paralelo cada
            // intento fallido cuenta y el bloqueo de 5 intentos no se puede esquivar.
            $intentos = $this->registerFailedAttempt((int)$user['id']);
            if ($intentos >= 5) {
                Response::forbidden('Has superado el límite de 5 intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos por seguridad.');
                return;
            }

            // Mismo mensaje que para un correo desconocido (no revela si la cuenta existe)
            Response::unauthorized(self::MSG_BAD_CREDENTIALS);
            return;
        }

        // 7. CONTROL DE PRIVILEGIOS: ingresan el Administrador y el Docente (investigador ligado a una ficha)
        $isAdmin = self::isAdminRole($user['rol']);
        $isTeacher = self::isTeacherRole($user['rol']);
        if (!$isAdmin && !$isTeacher) {
            Response::forbidden('Acceso denegado: Esta área está restringida al personal con rol de Administrador o Docente.');
            return;
        }
        if ($isTeacher && ($user['investigador_id'] === null || (int)$user['investigador_id'] <= 0)) {
            Response::forbidden('Tu cuenta aún no está ligada a un docente. Contacta al administrador.');
            return;
        }

        // 8. Éxito: Resetear contador de fallos y actualizar último acceso
        $resetStmt = $this->db->prepare("
            UPDATE usuarios 
            SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = :ahora 
            WHERE id = :id
        ");
        $resetStmt->execute([
            ':ahora' => date('Y-m-d H:i:s'),
            ':id'    => $user['id']
        ]);

        // 9. Generar Token criptográficamente seguro y registrar la sesión (solo su hash SHA-256)
        $sessionToken = bin2hex(random_bytes(32));
        $this->db->prepare("DELETE FROM sesiones WHERE expira_en < :ahora")
            ->execute([':ahora' => date('Y-m-d H:i:s')]);
        $this->db->prepare("
            INSERT INTO sesiones (usuario_id, token_hash, expira_en)
            VALUES (:usuario, :hash, :expira)
        ")->execute([
            ':usuario' => $user['id'],
            ':hash'    => self::hashToken($sessionToken),
            ':expira'  => date('Y-m-d H:i:s', time() + self::SESSION_TTL)
        ]);

        $publicUser = self::publicUser($user, $isAdmin);
        $publicUser['cargo'] = $user['cargo'] ?? ($isAdmin ? 'Administradora de Investigación VIEP' : 'Docente');

        Response::success([
            'token' => $sessionToken,
            'user'  => $publicUser
        ], $isAdmin
            ? 'Autenticación exitosa. Bienvenido al panel de administración.'
            : 'Autenticación exitosa. Bienvenido a tu espacio de docente.');
    }

    /**
     * Valida el estado de la sesión activa y devuelve el usuario dueño del token.
     */
    public function me(Request $request): void {
        $resolved = self::resolveAny($request);

        // Solo las sesiones que pueden usar la aplicación (admin o docente ligado) son "válidas"
        if ($resolved['status'] !== 'ok' || !self::canUseApp($resolved['user'])) {
            Response::unauthorized('No has iniciado sesión o el token es inválido.');
            return;
        }

        Response::success(self::publicUser($resolved['user']), 'Sesión válida.');
    }

    /**
     * Cambio de contraseña de la sesión activa (administrador o docente).
     * Body: {actual, nueva}. La contraseña actual incorrecta cuenta como intento fallido y aplica
     * el mismo bloqueo que el login (5 intentos, 15 min). Al cambiarla se invalidan TODAS las demás
     * sesiones del usuario (se conserva la actual) y se quita la marca de contraseña temporal.
     */
    public function changePassword(Request $request): void {
        $resolved = self::resolveAny($request);
        if ($resolved['status'] === 'missing') {
            Response::unauthorized('Acceso no autorizado: Debes iniciar sesión.');
            return;
        }
        if ($resolved['status'] !== 'ok') {
            Response::unauthorized('Token de autorización inválido o expirado.');
            return;
        }
        $session = $resolved['user'];
        if (!self::canUseApp($session)) {
            Response::forbidden('Acceso denegado: tu cuenta no puede cambiar su contraseña desde esta área.');
            return;
        }

        $body = $request->getBody();
        $actual = $body['actual'] ?? null;
        $nueva = $body['nueva'] ?? null;

        $errors = [];
        if (!is_string($actual) || $actual === '') {
            $errors['actual'][] = 'La contraseña actual es obligatoria.';
        }
        if (!is_string($nueva) || $nueva === '') {
            $errors['nueva'][] = 'La nueva contraseña es obligatoria.';
        } elseif (mb_strlen($nueva) < 8) {
            $errors['nueva'][] = 'La nueva contraseña debe tener al menos 8 caracteres.';
        } elseif (strlen($nueva) > 72) {
            // bcrypt solo considera los primeros 72 bytes: se rechaza en vez de truncar en silencio
            $errors['nueva'][] = 'La nueva contraseña no debe exceder 72 caracteres.';
        } elseif (is_string($actual) && hash_equals($actual, $nueva)) {
            $errors['nueva'][] = 'La nueva contraseña debe ser distinta de la actual.';
        }
        if ($errors) {
            Response::badRequest('Datos inválidos.', $errors);
            return;
        }

        $stmt = $this->db->prepare("SELECT id, password_hash, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $session['id']]);
        $row = $stmt->fetch();
        $stmt->closeCursor();
        if (!$row) {
            Response::unauthorized('Token de autorización inválido o expirado.');
            return;
        }

        // Cuenta bloqueada por intentos fallidos: no se permite ni probar contraseñas
        if (!empty($row['bloqueado_hasta']) && strtotime((string)$row['bloqueado_hasta']) > time()) {
            $minutos = max(1, (int)ceil((strtotime((string)$row['bloqueado_hasta']) - time()) / 60));
            Response::forbidden("Acceso temporalmente bloqueado por múltiples intentos fallidos. Intente nuevamente en {$minutos} minuto(s).");
            return;
        }

        if (!password_verify($actual, (string)$row['password_hash'])) {
            $intentos = $this->registerFailedAttempt((int)$row['id']);

            if ($intentos >= 5) {
                Response::forbidden('Has superado el límite de 5 intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos por seguridad.');
                return;
            }
            Response::badRequest('La contraseña actual es incorrecta.', [
                'actual' => ['La contraseña actual es incorrecta. Te quedan ' . (5 - $intentos) . ' intento(s) antes del bloqueo temporal.']
            ]);
            return;
        }

        $token = self::extractToken($request);
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE usuarios SET password_hash = :h, debe_cambiar_password = 0, intentos_fallidos = 0,
                                bloqueado_hasta = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                ->execute([':h' => password_hash($nueva, PASSWORD_BCRYPT, self::PASSWORD_OPTIONS), ':id' => $row['id']]);
            // Se cierran todas las demás sesiones (otros dispositivos); la actual se conserva
            $this->db->prepare("DELETE FROM sesiones WHERE usuario_id = :id AND token_hash <> :hash")
                ->execute([':id' => $row['id'], ':hash' => self::hashToken((string)$token)]);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        $session['debe_cambiar_password'] = 0;
        Response::success(self::publicUser($session), 'Contraseña actualizada correctamente. Las demás sesiones abiertas se cerraron.');
    }

    /**
     * Registra un intento fallido de forma atómica y devuelve el total acumulado. Al llegar a 5
     * bloquea la cuenta 15 minutos. El incremento se hace en SQL (intentos_fallidos + 1) para que
     * las peticiones simultáneas no se pisen entre sí.
     */
    private function registerFailedAttempt(int $userId): int {
        $this->db->prepare("UPDATE usuarios SET intentos_fallidos = COALESCE(intentos_fallidos, 0) + 1 WHERE id = :id")
            ->execute([':id' => $userId]);
        $stmt = $this->db->prepare("SELECT intentos_fallidos FROM usuarios WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $attempts = (int)$stmt->fetchColumn();
        $stmt->closeCursor();

        if ($attempts >= 5) {
            // Bloqueo por 15 minutos tras 5 fallas consecutivas
            $this->db->prepare("UPDATE usuarios SET bloqueado_hasta = :b WHERE id = :id")
                ->execute([':b' => date('Y-m-d H:i:s', time() + 900), ':id' => $userId]);
        }
        return $attempts;
    }

    /**
     * Middleware de verificación: valida que el token Bearer corresponda a una sesión
     * vigente (no expirada) de un usuario activo con rol de Administrador.
     * Si no se cumple, envía la respuesta 401/403 y devuelve null.
     */
    public static function checkAdmin(Request $request): ?array {
        $resolved = self::resolveSession($request);

        switch ($resolved['status']) {
            case 'missing':
                Response::unauthorized('Acceso no autorizado: Debes iniciar sesión con una cuenta de Administrador.');
                return null;
            case 'invalid':
                Response::unauthorized('Token de autorización inválido o expirado.');
                return null;
            case 'forbidden':
                Response::forbidden('Acceso denegado: Se requieren permisos de Administrador para realizar esta acción.');
                return null;
        }

        return $resolved['user'];
    }

    /**
     * Variante silenciosa de checkAdmin(): devuelve el administrador de la sesión o null
     * SIN enviar ninguna respuesta. Sirve para endpoints públicos que muestran más
     * información cuando quien consulta es un administrador.
     */
    public static function optionalAdmin(Request $request): ?array {
        $resolved = self::resolveSession($request);
        return $resolved['status'] === 'ok' ? $resolved['user'] : null;
    }

    /**
     * Middleware del rol DOCENTE: valida sesión vigente de un usuario activo con rol 'investigador'
     * ligado a una ficha (investigador_id). Devuelve el usuario (con investigador_id) o, si no se
     * cumple, envía la respuesta y devuelve null:
     *  - sin token / token inválido o expirado / usuario inactivo: 401
     *  - administrador u otro rol, o docente sin ficha: 403
     *  - contraseña temporal pendiente de cambio: 403 con errors.codigo = cambio_password_obligatorio
     */
    public static function checkDocente(Request $request): ?array {
        $resolved = self::resolveAny($request);

        if ($resolved['status'] === 'missing') {
            Response::unauthorized('Acceso no autorizado: Debes iniciar sesión con una cuenta de docente.');
            return null;
        }
        if ($resolved['status'] !== 'ok') {
            Response::unauthorized('Token de autorización inválido o expirado.');
            return null;
        }

        $user = $resolved['user'];
        if (!self::isTeacherRole($user['rol'])) {
            Response::forbidden('Acceso denegado: esta área es exclusiva para docentes.');
            return null;
        }
        if ($user['investigador_id'] === null) {
            Response::forbidden('Tu cuenta aún no está ligada a un docente. Contacta al administrador.');
            return null;
        }
        if ((int)$user['debe_cambiar_password'] === 1) {
            Response::forbidden('Debes cambiar tu contraseña temporal antes de continuar.', ['codigo' => ['cambio_password_obligatorio']]);
            return null;
        }

        return $user;
    }

    /**
     * Cierre de sesión seguro: elimina del servidor la sesión asociada al token.
     */
    public function logout(Request $request): void {
        $token = self::extractToken($request);
        if ($token !== null) {
            $stmt = $this->db->prepare("DELETE FROM sesiones WHERE token_hash = :hash");
            $stmt->execute([':hash' => self::hashToken($token)]);
        }

        Response::success(null, 'Sesión cerrada correctamente.');
    }

    /**
     * Calcula el hash SHA-256 (hex) con que se almacena un token de sesión.
     */
    private static function hashToken(string $token): string {
        return hash('sha256', $token);
    }

    /**
     * Extrae el token del encabezado Authorization: Bearer <token>.
     */
    private static function extractToken(Request $request): ?string {
        $authHeader = $request->getHeader('Authorization');
        if (empty($authHeader) && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (empty($authHeader) || !preg_match('/^\s*Bearer\s+(\S+)\s*$/i', (string)$authHeader, $matches)) {
            return null;
        }

        return $matches[1];
    }

    /**
     * Resuelve la sesión de ADMINISTRADOR de la petición sin enviar respuestas.
     *
     * @return array{status:string,user?:array} status: 'ok' | 'missing' (sin token)
     *         | 'invalid' (token desconocido, expirado o usuario inactivo) | 'forbidden' (rol no administrador)
     */
    private static function resolveSession(Request $request): array {
        $resolved = self::resolveAny($request);
        if ($resolved['status'] === 'ok' && !self::isAdminRole($resolved['user']['rol'])) {
            return ['status' => 'forbidden'];
        }
        return $resolved;
    }

    /**
     * Resuelve la sesión de la petición para CUALQUIER rol, sin enviar respuestas. Los controles
     * de rol los aplican los llamadores. Comprueba token, vigencia y que el usuario siga activo
     * en cada petición.
     *
     * @return array{status:string,user?:array} status: 'ok' | 'missing' | 'invalid'
     */
    private static function resolveAny(Request $request): array {
        $token = self::extractToken($request);
        if ($token === null) {
            return ['status' => 'missing'];
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT s.id AS sesion_id, s.expira_en,
                   u.id, u.nombre, u.correo, u.cargo, u.rol, u.activo, u.investigador_id, u.debe_cambiar_password
            FROM sesiones s
            JOIN usuarios u ON u.id = s.usuario_id
            WHERE s.token_hash = :hash
            LIMIT 1
        ");
        $stmt->execute([':hash' => self::hashToken($token)]);
        $row = $stmt->fetch();
        $stmt->closeCursor();

        if (!$row) {
            return ['status' => 'invalid'];
        }

        // Sesión vencida: se elimina y se rechaza
        if (strtotime((string)$row['expira_en']) <= time()) {
            $db->prepare("DELETE FROM sesiones WHERE id = :id")->execute([':id' => $row['sesion_id']]);
            return ['status' => 'invalid'];
        }

        if ((int)$row['activo'] !== 1) {
            return ['status' => 'invalid'];
        }

        return ['status' => 'ok', 'user' => [
            'id'                    => (int)$row['id'],
            'nombre'                => $row['nombre'],
            'correo'                => $row['correo'],
            'cargo'                 => $row['cargo'],
            'rol'                   => $row['rol'],
            'activo'                => (int)$row['activo'],
            'investigador_id'       => $row['investigador_id'] === null ? null : (int)$row['investigador_id'],
            'debe_cambiar_password' => (int)$row['debe_cambiar_password'],
        ]];
    }

    private static function isAdminRole($rol): bool {
        $rol = strtolower(trim((string)$rol));
        return $rol === 'administrador' || $rol === 'admin';
    }

    private static function isTeacherRole($rol): bool {
        return strtolower(trim((string)$rol)) === 'investigador';
    }

    /** Administrador, o docente con ficha ligada: los únicos que pueden usar la aplicación. */
    private static function canUseApp(array $user): bool {
        return self::isAdminRole($user['rol']) || (self::isTeacherRole($user['rol']) && $user['investigador_id'] !== null);
    }

    /**
     * Forma pública del usuario: {id,nombre,correo,cargo,rol,investigador_id,debe_cambiar_password}.
     * Para el administrador investigador_id es null y debe_cambiar_password 0.
     */
    private static function publicUser(array $user, ?bool $isAdmin = null): array {
        $isAdmin = $isAdmin ?? self::isAdminRole($user['rol']);
        return [
            'id'                    => (int)$user['id'],
            'nombre'                => $user['nombre'],
            'correo'                => $user['correo'],
            'cargo'                 => $user['cargo'] ?? null,
            'rol'                   => $user['rol'],
            'investigador_id'       => $isAdmin || $user['investigador_id'] === null ? null : (int)$user['investigador_id'],
            'debe_cambiar_password' => $isAdmin ? 0 : (int)($user['debe_cambiar_password'] ?? 0),
        ];
    }
}
