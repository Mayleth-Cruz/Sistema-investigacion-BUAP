<?php
/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN DEL BACKEND (PHP puro, sin dependencias)
 * ============================================================================
 * Uso:   php backend/tests/run.php
 *
 * Qué hace:
 *  1. Crea un directorio temporal (sys_get_temp_dir) y arranca el servidor
 *     embebido `php -S` con SI3_SQLITE_PATH apuntando a una BD de pruebas y con
 *     DB_HOST/DB_PORT inválidos para forzar el modo SQLite.
 *  2. Ejecuta toda la suite en DOS escenarios:
 *       a) COPIA de backend/src/Database/database.sqlite (migración sobre una BD existente)
 *       b) BD INEXISTENTE (creación desde cero + semilla)
 *  3. Imprime ✔/✘ por caso y totales; sale con código 1 si algo falla.
 *  4. Siempre detiene el servidor y borra los temporales. Nunca toca la BD del
 *     repositorio (se verifica con un hash antes y después).
 *
 * Cubre: matriz de autenticación (401/403/expirado/logout/bloqueo/puerta trasera),
 * el rol DOCENTE (login por rol, contraseña temporal y cambio obligatorio, aislamiento por
 * propiedad, máquina de estados borrador/enviado/aprobado/devuelto, revisión del admin, usuarios
 * docentes, regla "solo aprobados" y migración SQLite v2->v3),
 * cada recurso del Eje 3, reglas público/admin, cifras de monitoreo contra datos
 * conocidos y contra SQL independiente, visualizar, difusión, CORS, no fuga de
 * errores y regresión de los endpoints existentes.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
date_default_timezone_set(date_default_timezone_get());

$ROOT = dirname(__DIR__);                       // .../backend
$REPO_DB = $ROOT . '/src/Database/database.sqlite';

// ---------------------------------------------------------------------------
// Utilidades de reporte
// ---------------------------------------------------------------------------
$STATS = ['pass' => 0, 'fail' => 0, 'failures' => []];
$SCENARIO = '';

function ok(string $name, bool $cond, string $detail = ''): bool {
    global $STATS, $SCENARIO;
    if ($cond) {
        $STATS['pass']++;
        echo "  \033[32m✔\033[0m {$name}\n";
    } else {
        $STATS['fail']++;
        $STATS['failures'][] = "[{$SCENARIO}] {$name}" . ($detail !== '' ? " -> {$detail}" : '');
        echo "  \033[31m✘\033[0m {$name}" . ($detail !== '' ? "\n      {$detail}" : '') . "\n";
    }
    return $cond;
}

function eq(string $name, $expected, $actual): bool {
    return ok($name, $expected === $actual,
        'esperado ' . json_encode($expected, JSON_UNESCAPED_UNICODE) . ' pero fue ' . json_encode($actual, JSON_UNESCAPED_UNICODE));
}

function section(string $title): void {
    echo "\n\033[1m{$title}\033[0m\n";
}

function snippet($r): string {
    return 'HTTP ' . $r['status'] . ' ' . substr(preg_replace('/\s+/', ' ', $r['body']), 0, 240);
}

// ---------------------------------------------------------------------------
// Cliente HTTP (curl, con respaldo en streams)
// ---------------------------------------------------------------------------
function http(string $method, string $url, $body = null, ?string $token = null, array $headers = []): array {
    $h = ['Accept: application/json'];
    if ($token !== null) { $h[] = "Authorization: Bearer {$token}"; }
    $content = null;
    if ($body !== null) {
        $content = is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_UNICODE);
        $h[] = 'Content-Type: application/json';
    }
    foreach ($headers as $x) { $h[] = $x; }

    $status = 0; $rawHeaders = []; $raw = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true, CURLOPT_TIMEOUT => 30, CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        if ($content !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, $content); }
        $res = curl_exec($ch);
        if ($res !== false) {
            $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $size = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $rawHeaders = explode("\r\n", substr($res, 0, $size));
            $raw = substr($res, $size);
        }
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => $method, 'header' => implode("\r\n", $h), 'content' => $content ?? '',
            'ignore_errors' => true, 'timeout' => 30,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        $rawHeaders = function_exists('http_get_last_response_headers') ? (http_get_last_response_headers() ?? []) : [];
        $raw = $res === false ? '' : $res;
        if (isset($rawHeaders[0]) && preg_match('#HTTP/\S+\s+(\d+)#', $rawHeaders[0], $m)) { $status = (int)$m[1]; }
    }

    $map = [];
    foreach ($rawHeaders as $line) {
        if (strpos($line, ':') !== false) {
            [$k, $v] = explode(':', $line, 2);
            $map[strtolower(trim($k))] = trim($v);
        }
    }
    $json = json_decode($raw, true);
    return ['status' => $status, 'headers' => $map, 'body' => $raw, 'json' => is_array($json) ? $json : null];
}

// ---------------------------------------------------------------------------
// Servidor de pruebas
// ---------------------------------------------------------------------------
final class TestServer {
    public string $base;
    private $proc;

    public static function start(string $root, string $dbPath, string $logFile, array $extraEnv = []): self {
        $s = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        $name = stream_socket_get_name($s, false);
        fclose($s);
        $port = (int)substr(strrchr($name, ':'), 1);

        $env = getenv();
        $env = array_merge($env, [
            'SI3_SQLITE_PATH' => $dbPath, 'DB_HOST' => '127.0.0.1', 'DB_PORT' => '1',
            'APP_DEBUG' => '', 'CORS_ALLOWED_ORIGINS' => '',
        ], $extraEnv);

        $self = new self();
        $self->base = "http://127.0.0.1:{$port}";
        $self->proc = proc_open(
            [PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $root . '/public', $root . '/public/router.php'],
            [0 => ['file', '/dev/null', 'r'], 1 => ['file', $logFile, 'a'], 2 => ['file', $logFile, 'a']],
            $pipes, $root, $env
        );
        if (!is_resource($self->proc)) {
            throw new RuntimeException('No se pudo iniciar php -S');
        }

        for ($i = 0; $i < 100; $i++) {
            $fp = @fsockopen('127.0.0.1', $port, $e, $m, 0.2);
            if ($fp) {
                fclose($fp);
                $r = http('GET', $self->base . '/api');
                if ($r['status'] === 200) { return $self; }
            }
            usleep(100000);
        }
        $self->stop();
        throw new RuntimeException("El servidor de pruebas no respondió. Log: " . @file_get_contents($logFile));
    }

    public function stop(): void {
        if (is_resource($this->proc)) {
            @proc_terminate($this->proc);
            @proc_close($this->proc);
            $this->proc = null;
        }
    }
}

// ---------------------------------------------------------------------------
// Contexto de la suite
// ---------------------------------------------------------------------------
final class Ctx {
    public string $base;
    public string $dbPath;
    public PDO $pdo;
    public string $admin = '';
    public string $root = '';
    public string $tmp = '';
    public array $cleanup = [];

    /** Petición como administrador (token por defecto). */
    public function a(string $m, string $path, $body = null): array {
        return http($m, $this->base . $path, $body, $this->admin);
    }
    /** Petición pública (sin token). */
    public function p(string $m, string $path, $body = null, array $headers = []): array {
        return http($m, $this->base . $path, $body, null, $headers);
    }
    /** Petición con un token específico. */
    public function t(string $m, string $path, ?string $token, $body = null): array {
        return http($m, $this->base . $path, $body, $token);
    }
    public function scalar(string $sql, array $params = []) {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchColumn();
    }
    public function rows(string $sql, array $params = []): array {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }
    public function exec(string $sql, array $params = []): void {
        $this->pdo->prepare($sql)->execute($params);
    }
    public function login(string $correo, string $password): array {
        return http('POST', $this->base . '/api/auth/login', ['correo' => $correo, 'password' => $password]);
    }
    /** Crea una sesión directamente en la BD y devuelve el token en claro. */
    public function makeSession(int $userId, int $ttl = 3600): string {
        $token = bin2hex(random_bytes(32));
        $this->exec("INSERT INTO sesiones (usuario_id, token_hash, expira_en) VALUES (:u, :h, :e)",
            [':u' => $userId, ':h' => hash('sha256', $token), ':e' => date('Y-m-d H:i:s', time() + $ttl)]);
        return $token;
    }
}

function arr(?array $r, string $key = 'data'): array {
    return is_array($r['json'][$key] ?? null) ? $r['json'][$key] : [];
}

// ===========================================================================
// SUITE: AUTENTICACIÓN
// ===========================================================================
function suiteAuth(Ctx $c): void {
    section('Autenticación y sesiones');

    // Rutas protegidas sin token
    $protected = [
        ['POST', '/api/proyectos'], ['PUT', '/api/proyectos/1'], ['DELETE', '/api/proyectos/1'],
        ['POST', '/api/produccion'], ['PUT', '/api/produccion/1'], ['DELETE', '/api/produccion/1'],
        ['POST', '/api/publicaciones'], ['POST', '/api/investigadores'], ['POST', '/api/categorias'],
        ['GET', '/api/admin/stats'], ['POST', '/api/upload/pdf'],
        ['GET', '/api/eje3/proyectos'], ['GET', '/api/eje3/monitoreo'], ['GET', '/api/eje3/catalogos'], ['GET', '/api/eje3/visualizar'],
        ['GET', '/api/eje3/participantes'], ['GET', '/api/eje3/retribucion-social'], ['GET', '/api/eje3/egresados'],
        ['GET', '/api/eje3/docentes'], ['PUT', '/api/eje3/docentes/1/snii'], ['POST', '/api/eje3/eventos'],
        ['PUT', '/api/eje3/eventos/1'], ['DELETE', '/api/eje3/eventos/1'],
    ];
    $bad = [];
    foreach ($protected as [$m, $p]) {
        $r = $c->p($m, $p, in_array($m, ['POST', 'PUT'], true) ? ['x' => 1] : null);
        if ($r['status'] !== 401) { $bad[] = "{$m} {$p} => {$r['status']}"; }
    }
    ok('Sin token: todas las rutas protegidas responden 401 (' . count($protected) . ' rutas)', !$bad, implode('; ', $bad));

    // Token inventado (formato válido pero inexistente) y token corto
    $fake = bin2hex(random_bytes(32));
    $bad = [];
    foreach ([['POST', '/api/proyectos'], ['POST', '/api/produccion'], ['GET', '/api/eje3/monitoreo'],
              ['POST', '/api/eje3/eventos'], ['POST', '/api/upload/pdf'], ['GET', '/api/auth/me']] as [$m, $p]) {
        $r = $c->t($m, $p, $fake, ['titulo' => 'x']);
        if ($r['status'] !== 401) { $bad[] = "{$m} {$p} => {$r['status']}"; }
    }
    ok('Token inventado de 64 caracteres: 401 en todas las rutas probadas', !$bad, implode('; ', $bad));
    eq('Token de 16+ caracteres arbitrario ya no sirve (antes aceptaba cualquiera)', 401,
        $c->t('POST', '/api/proyectos', 'abcdefghijklmnopqrstuvwxyz', ['titulo' => 'x'])['status']);
    eq('Token corto: 401', 401, $c->t('GET', '/api/eje3/monitoreo', 'corto')['status']);
    $r = http('GET', $c->base . '/api/eje3/monitoreo', null, null, ['Authorization: Basic abcdef']);
    eq('Esquema Authorization distinto de Bearer: 401', 401, $r['status']);

    // Validación de entrada del login
    eq('Login con correo inválido: 400', 400, $c->login('no-es-correo', 'admin123')['status']);
    eq('Login con contraseña corta: 400', 400, $c->login('admin@buap.mx', 'abc')['status']);
    eq('Login con usuario inexistente: 401', 401, $c->login('nadie@buap.mx', 'admin123')['status']);

    // Puerta trasera eliminada (contraseña de respaldo)
    $sessionsBefore = (int)$c->scalar("SELECT COUNT(*) FROM sesiones");
    $r = $c->login('admin@buap.mx', 'Admin2026*');
    eq('Contraseña de respaldo Admin2026* ya no funciona: 401', 401, $r['status']);
    // (Auditoría SEC-P03: el mensaje ya no revela cuántos intentos quedan; es el mismo que para un correo desconocido)
    ok('Contraseña incorrecta: mensaje genérico de credenciales incorrectas', str_contains((string)($r['json']['message'] ?? ''), 'Credenciales de acceso incorrectas'), snippet($r));
    ok('No se generó sesión con la contraseña de respaldo', $sessionsBefore === (int)$c->scalar("SELECT COUNT(*) FROM sesiones") && !isset($r['json']['data']['token']));

    // Login válido
    $r = $c->login('admin@buap.mx', 'admin123');
    eq('Login válido: 200', 200, $r['status']);
    $token = (string)($r['json']['data']['token'] ?? '');
    ok('Login devuelve token hex de 64 caracteres', (bool)preg_match('/^[a-f0-9]{64}$/', $token), $token);
    eq('Login devuelve user.correo', 'admin@buap.mx', $r['json']['data']['user']['correo'] ?? null);
    eq('Login devuelve user.rol administrador', 'administrador', $r['json']['data']['user']['rol'] ?? null);
    ok('Login devuelve user con id, nombre y cargo', isset($r['json']['data']['user']['id'], $r['json']['data']['user']['nombre'], $r['json']['data']['user']['cargo']));

    // Sesión guardada con hash y expiración de 8 h
    $row = $c->rows("SELECT * FROM sesiones WHERE token_hash = :h", [':h' => hash('sha256', $token)])[0] ?? null;
    ok('Se guarda sha256(token) en sesiones', $row !== null);
    ok('El token en claro NO se guarda en la BD', (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE token_hash = :t", [':t' => $token]) === 0);
    $ttl = $row ? strtotime($row['expira_en']) - time() : 0;
    ok('La sesión expira en ~8 horas', $ttl > 7.9 * 3600 && $ttl <= 8 * 3600 + 5, "ttl={$ttl}s");

    // El token funciona en rutas de administrador
    eq('Token válido abre ruta de admin (GET /api/eje3/catalogos): 200', 200, $c->t('GET', '/api/eje3/catalogos', $token)['status']);
    eq('Token válido abre GET /api/admin/stats: 200', 200, $c->t('GET', '/api/admin/stats', $token)['status']);

    // me()
    $r = $c->t('GET', '/api/auth/me', $token);
    eq('me con token válido: 200', 200, $r['status']);
    eq('me devuelve el usuario de la sesión (correo)', 'admin@buap.mx', $r['json']['data']['correo'] ?? null);
    eq('me sin token: 401', 401, $c->p('GET', '/api/auth/me')['status']);

    // Logout real
    $r = $c->t('POST', '/api/auth/logout', $token);
    eq('Logout: 200', 200, $r['status']);
    eq('Tras logout, me responde 401', 401, $c->t('GET', '/api/auth/me', $token)['status']);
    eq('Tras logout, ruta de admin responde 401', 401, $c->t('GET', '/api/eje3/catalogos', $token)['status']);
    eq('Tras logout la fila de sesión se elimina', 0, (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE token_hash = :h", [':h' => hash('sha256', $token)]));
    eq('Logout sin token no falla (200)', 200, $c->p('POST', '/api/auth/logout')['status']);

    // Sesión expirada
    $r = $c->login('admin@buap.mx', 'admin123');
    $t2 = (string)$r['json']['data']['token'];
    eq('Nueva sesión funciona antes de expirar', 200, $c->t('GET', '/api/eje3/catalogos', $t2)['status']);
    $c->exec("UPDATE sesiones SET expira_en = :e WHERE token_hash = :h", [':e' => date('Y-m-d H:i:s', time() - 60), ':h' => hash('sha256', $t2)]);
    eq('Sesión expirada: 401 en ruta de admin', 401, $c->t('GET', '/api/eje3/catalogos', $t2)['status']);
    eq('Sesión expirada: me responde 401', 401, $c->t('GET', '/api/auth/me', $t2)['status']);

    // Rol no administrador y usuario inactivo
    // Rol 'lector' (cuenta creada por la prueba) e 'investigador' SIN ficha: el login se rechaza (403).
    // (El docente demo investigador@buap.mx SÍ entra, pero como docente: ver suiteDocenteAuth.)
    $hashL = password_hash('lector123', PASSWORD_BCRYPT, ['cost' => 4]);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Lector prueba', 'lector@test.mx', :h, 'lector', 'x', 1)", [':h' => $hashL]);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Investigador sin ficha', 'sinficha@test.mx', :h, 'investigador', 'x', 1)", [':h' => $hashL]);
    $r = $c->login('lector@test.mx', 'lector123');
    eq('Usuario con rol lector no puede iniciar sesión: 403', 403, $r['status']);
    ok('Login de lector: sin token en la respuesta', !isset($r['json']['data']['token']), snippet($r));
    $r = $c->login('sinficha@test.mx', 'lector123');
    eq('Usuario investigador SIN ficha ligada no puede iniciar sesión: 403', 403, $r['status']);
    ok('Investigador sin ficha: mensaje de cuenta no ligada', str_contains((string)($r['json']['message'] ?? ''), 'no está ligada a un docente'), snippet($r));
    $tLector = $c->makeSession((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'lector@test.mx'"));
    eq('Sesión de un no administrador: 403 en ruta de admin', 403, $c->t('GET', '/api/eje3/catalogos', $tLector)['status']);
    eq('Sesión de un no administrador: 403 al crear proyecto', 403, $c->t('POST', '/api/proyectos', $tLector, ['titulo' => 'x'])['status']);

    $hash = password_hash('Clave-Segura-1', PASSWORD_BCRYPT, ['cost' => 4]);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Admin inactivo', 'inactivo@test.mx', :h, 'administrador', 'x', 0)", [':h' => $hash]);
    $idInactivo = (int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'inactivo@test.mx'");
    $tIna = $c->makeSession($idInactivo);
    eq('Administrador inactivo con sesión: 401', 401, $c->t('GET', '/api/eje3/catalogos', $tIna)['status']);
    eq('Login de cuenta inactiva: 403', 403, $c->login('inactivo@test.mx', 'Clave-Segura-1')['status']);

    // Bloqueo por 5 intentos fallidos (lógica intacta)
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Admin bloqueo', 'bloqueo@test.mx', :h, 'administrador', 'x', 1)", [':h' => $hash]);
    $codes = [];
    for ($i = 0; $i < 5; $i++) { $codes[] = $c->login('bloqueo@test.mx', 'incorrecta-' . $i)['status']; }
    eq('Cinco fallos: 401,401,401,401 y el quinto bloquea (403)', [401, 401, 401, 401, 403], $codes);
    $r = $c->login('bloqueo@test.mx', 'Clave-Segura-1');
    eq('Con la cuenta bloqueada ni la contraseña correcta entra (403)', 403, $r['status']);
    ok('Mensaje de bloqueo temporal', str_contains((string)($r['json']['message'] ?? ''), 'bloqueado'), snippet($r));

    // Un login correcto resetea el contador de fallos
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Admin reset', 'reset@test.mx', :h, 'administrador', 'x', 1)", [':h' => $hash]);
    $c->login('reset@test.mx', 'mala-clave-1');
    eq('Login correcto tras un fallo: 200', 200, $c->login('reset@test.mx', 'Clave-Segura-1')['status']);
    eq('El contador de intentos fallidos se reinicia', 0, (int)$c->scalar("SELECT intentos_fallidos FROM usuarios WHERE correo = 'reset@test.mx'"));
}

// ===========================================================================
// SUITE: REGRESIÓN DE ENDPOINTS EXISTENTES
// ===========================================================================
function suiteRegression(Ctx $c): void {
    section('Regresión de endpoints existentes');

    $r = $c->p('GET', '/api');
    eq('GET /api: 200', 200, $r['status']);
    foreach (['investigadores', 'proyectos', 'publicaciones', 'produccion', 'metricas', 'difusion'] as $k) {
        ok("GET /api conserva el módulo '{$k}'", isset($r['json']['data']['modulos'][$k]));
    }

    $r = $c->p('GET', '/api/investigadores');
    eq('GET /api/investigadores: 200', 200, $r['status']);
    $inv = arr($r);
    ok('Investigadores: lista no vacía con campos clásicos', count($inv) >= 5 && isset($inv[0]['nombre_completo'], $inv[0]['correo'], $inv[0]['total_publicaciones'], $inv[0]['total_proyectos']), snippet($r));
    $invAdm = arr($c->a('GET', '/api/investigadores'));
    ok('Investigadores: incluye las columnas nuevas snii_nivel (público) y snii_elegible (solo admin)', array_key_exists('snii_nivel', $inv[0] ?? []) && !array_key_exists('snii_elegible', $inv[0] ?? []) && array_key_exists('snii_elegible', $invAdm[0] ?? []));
    eq('GET /api/investigadores/:id: 200', 200, $c->p('GET', '/api/investigadores/' . $inv[0]['id'])['status']);
    eq('GET /api/investigadores/999999: 404', 404, $c->p('GET', '/api/investigadores/999999')['status']);

    $r = $c->p('GET', '/api/publicaciones');
    eq('GET /api/publicaciones: 200', 200, $r['status']);
    $pubs = arr($r);
    ok('Publicaciones: filas con campos clásicos', count($pubs) >= 1 && isset($pubs[0]['titulo'], $pubs[0]['investigador_nombre'], $pubs[0]['anio']), snippet($r));
    ok('Publicaciones: incluye origen/evento_id', array_key_exists('origen', $pubs[0] ?? []) && array_key_exists('evento_id', $pubs[0] ?? []));
    eq('GET /api/publicaciones/:id: 200', 200, $c->p('GET', '/api/publicaciones/' . $pubs[0]['id'])['status']);
    $r = $c->p('GET', '/api/publicaciones/carpetas');
    eq('GET /api/publicaciones/carpetas: 200', 200, $r['status']);
    ok('Carpetas por año: estructura intacta', isset(arr($r)[0]['anio'], arr($r)[0]['nombre_carpeta'], arr($r)[0]['articulos']), snippet($r));
    eq('GET /api/publicaciones/eventos: 200', 200, $c->p('GET', '/api/publicaciones/eventos')['status']);
    eq('POST /api/publicaciones/:id/vista: 200', 200, $c->p('POST', '/api/publicaciones/' . $pubs[0]['id'] . '/vista')['status']);

    $r = $c->p('GET', '/api/categorias');
    eq('GET /api/categorias: 200', 200, $r['status']);
    ok('Categorías: hay registros', count(arr($r)) > 0);

    $r = $c->p('GET', '/api/metricas/dashboard');
    eq('GET /api/metricas/dashboard: 200 (FIELD() ya no falla en SQLite)', 200, $r['status']);
    ok('Dashboard: contiene kpis', isset($r['json']['data']['kpis']), snippet($r));
    // El orden de cuartiles debe ser Q1, Q2, Q3, Q4, Sin cuartil (antes usaba FIELD(), solo MySQL)
    $found = null;
    foreach ((array)($r['json']['data'] ?? []) as $v) {
        if (is_array($v) && isset($v[0]['cuartil'])) { $found = array_column($v, 'cuartil'); }
    }
    $rank = ['Q1' => 1, 'Q2' => 2, 'Q3' => 3, 'Q4' => 4, 'Sin cuartil' => 5];
    $sorted = $found ?? [];
    usort($sorted, fn($a, $b) => ($rank[$a] ?? 9) <=> ($rank[$b] ?? 9));
    ok('Dashboard: distribución por cuartil presente y ordenada Q1..Q4', $found !== null && $sorted === $found, json_encode($found));

    $r = $c->p('GET', '/api/difusion/buscar?q=a');
    eq('GET /api/difusion/buscar?q=a: 200 (YEAR() ya no falla en SQLite)', 200, $r['status']);
    $proy = $r['json']['data']['proyectos'] ?? [];
    ok('Búsqueda: proyectos con año numérico', !$proy || (is_numeric($proy[0]['anio']) && (int)$proy[0]['anio'] > 2000), json_encode($proy[0] ?? null));
    $invs = $r['json']['data']['investigadores'] ?? [];
    ok('Búsqueda: investigadores con año numérico', !$invs || (is_numeric($invs[0]['anio']) && (int)$invs[0]['anio'] > 2000), json_encode($invs[0] ?? null));
    eq('GET /api/difusion/buscar sin q: 400', 400, $c->p('GET', '/api/difusion/buscar')['status']);
    eq('GET /api/difusion/perfil/:id: 200', 200, $c->p('GET', '/api/difusion/perfil/' . $inv[0]['id'])['status']);
    eq('GET /api/difusion/bibtex/:id: 200', 200, $c->p('GET', '/api/difusion/bibtex/' . $pubs[0]['id'])['status']);

    $r = $c->p('GET', '/api/produccion');
    eq('GET /api/produccion (pública): 200', 200, $r['status']);

    $r = $c->p('GET', '/api/proyectos');
    eq('GET /api/proyectos (pública): 200', 200, $r['status']);
    $proj = arr($r);
    ok('Proyectos: campos clásicos intactos', count($proj) >= 5 && isset($proj[0]['codigo'], $proj[0]['investigador_principal_nombre'], $proj[0]['total_publicaciones_derivadas']), snippet($r));
    ok('Proyectos: columnas nuevas con valores por defecto', ($proj[0]['tipo'] ?? null) !== null && array_key_exists('articulado_civ', $proj[0]));
    eq('GET /api/proyectos/:id: 200', 200, $c->p('GET', '/api/proyectos/' . $proj[0]['id'])['status']);
    eq('Ruta inexistente: 404 JSON', 404, $c->p('GET', '/api/no-existe')['status']);

    $r = $c->p('GET', '/');
    ok('GET / sirve la SPA (router.php) cuando existe public/index.html', $r['status'] === 200 && stripos($r['body'], '<html') !== false || !file_exists($c->root . '/public/index.html'), 'HTTP ' . $r['status']);

    // CRUD clásico de proyectos con administrador (cuerpo clásico, sin campos del Eje 3)
    $body = ['codigo' => 'TEST-LEGACY-001', 'titulo' => 'Proyecto clásico', 'investigador_principal_id' => $inv[0]['id'],
             'fecha_inicio' => '2026-01-10', 'linea_investigacion' => 'Pruebas'];
    $r = $c->a('POST', '/api/proyectos', $body);
    eq('POST /api/proyectos (admin, cuerpo clásico): 201', 201, $r['status']);
    $id = (int)($r['json']['data']['id'] ?? 0);
    eq('El proyecto clásico toma tipo=investigacion por defecto', 'investigacion', $r['json']['data']['tipo'] ?? null);
    $r = $c->a('PUT', "/api/proyectos/{$id}", $body + ['estado' => 'completado']);
    eq('PUT /api/proyectos/:id (admin): 200', 200, $r['status']);
    eq('PUT conserva el tipo del Eje 3', 'investigacion', $r['json']['data']['tipo'] ?? null);
    $r = $c->a('DELETE', "/api/proyectos/{$id}");
    eq('DELETE /api/proyectos/:id (admin): 200', 200, $r['status']);

    // CRUD clásico de producción técnica
    $body = ['tipo' => 'software', 'titulo' => 'Producción de prueba', 'investigador_id' => $inv[0]['id'], 'autores' => 'Prueba', 'anio' => 2026];
    $r = $c->a('POST', '/api/produccion', $body);
    eq('POST /api/produccion (admin): 201', 201, $r['status']);
    $id = (int)($r['json']['data']['id'] ?? 0);
    eq('PUT /api/produccion/:id (admin): 200', 200, $c->a('PUT', "/api/produccion/{$id}", $body + ['titulo' => 'Cambiado'])['status']);
    eq('DELETE /api/produccion/:id (admin): 200', 200, $c->a('DELETE', "/api/produccion/{$id}")['status']);

    // Upload exige admin
    eq('POST /api/upload/pdf sin token: 401', 401, $c->p('POST', '/api/upload/pdf')['status']);
    eq('POST /api/upload/pdf con admin pero sin archivo: 400', 400, $c->a('POST', '/api/upload/pdf')['status']);
}

// ===========================================================================
// SUITE: SEGURIDAD (CORS y no fuga de errores)
// ===========================================================================
function suiteSecurity(Ctx $c, string $root): void {
    section('Seguridad: CORS y errores');

    // CORS por defecto (CORS_ALLOWED_ORIGINS sin definir)
    $r = $c->p('GET', '/api', null, ['Origin: http://evil.example']);
    eq('CORS sin configurar: Allow-Origin es *', '*', $r['headers']['access-control-allow-origin'] ?? null);
    ok('CORS: no se envía Allow-Credentials', !isset($r['headers']['access-control-allow-credentials']), json_encode($r['headers']));
    $r = http('OPTIONS', $c->base . '/api/proyectos', null, null, ['Origin: http://evil.example', 'Access-Control-Request-Method: POST']);
    eq('Preflight OPTIONS: 200', 200, $r['status']);
    ok('Preflight: sin Allow-Credentials y con Allow-Methods', !isset($r['headers']['access-control-allow-credentials']) && isset($r['headers']['access-control-allow-methods']));

    // CORS con lista blanca (segundo servidor con la misma BD)
    $log = $c->tmp . '/server-cors.log';
    $srv = TestServer::start($root, $c->dbPath, $log, ['CORS_ALLOWED_ORIGINS' => 'http://ok.example, http://otro.example']);
    try {
        $r = http('GET', $srv->base . '/api', null, null, ['Origin: http://ok.example']);
        eq('CORS con lista: origen permitido se refleja', 'http://ok.example', $r['headers']['access-control-allow-origin'] ?? null);
        ok('CORS con lista: sin Allow-Credentials', !isset($r['headers']['access-control-allow-credentials']));
        $r = http('GET', $srv->base . '/api', null, null, ['Origin: http://otro.example']);
        eq('CORS con lista: segundo origen de la lista (con espacios) se refleja', 'http://otro.example', $r['headers']['access-control-allow-origin'] ?? null);
        $r = http('GET', $srv->base . '/api', null, null, ['Origin: http://evil.example']);
        ok('CORS con lista: origen no permitido NO recibe Allow-Origin', !isset($r['headers']['access-control-allow-origin']), json_encode($r['headers']));
    } finally {
        $srv->stop();
    }

    // No fuga de errores internos: código duplicado en el CRUD clásico provoca PDOException
    $inv = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $dup = (string)$c->scalar("SELECT codigo FROM proyectos ORDER BY id LIMIT 1");
    $body = ['codigo' => $dup, 'titulo' => 'Duplicado', 'investigador_principal_id' => $inv, 'fecha_inicio' => '2026-01-01', 'linea_investigacion' => 'x'];
    $r = $c->a('POST', '/api/proyectos', $body);
    eq('Error de BD: responde 500', 500, $r['status']);
    $msg = (string)($r['json']['message'] ?? '');
    ok('Error de BD: mensaje genérico, sin SQLSTATE/UNIQUE/tabla', !preg_match('/SQLSTATE|UNIQUE|constraint|proyectos\.|PDO/i', $r['body']), snippet($r));
    ok('Error de BD: sin rutas de archivo ni trazas', !preg_match('#\.php|/Users/|/home/|Stack trace#', $r['body']), snippet($r));
    ok('Error de BD: success=false y mensaje presente', ($r['json']['success'] ?? null) === false && $msg !== '');

    // Con APP_DEBUG=1 sí se muestra el detalle
    $srv = TestServer::start($root, $c->dbPath, $c->tmp . '/server-debug.log', ['APP_DEBUG' => '1']);
    try {
        $r = http('POST', $srv->base . '/api/proyectos', $body, $c->admin);
        eq('APP_DEBUG=1: error de BD sigue siendo 500', 500, $r['status']);
        ok('APP_DEBUG=1: el mensaje incluye el detalle técnico', (bool)preg_match('/SQLSTATE|UNIQUE|constraint/i', (string)($r['json']['message'] ?? '')), snippet($r));
    } finally {
        $srv->stop();
    }

    // Entradas hostiles: JSON roto y tipos inesperados no deben producir 500 ni fuga
    $r = http('POST', $c->base . '/api/eje3/eventos', '{no es json', $c->admin);
    ok('JSON inválido en POST: 400 (no 500)', $r['status'] === 400, snippet($r));
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => ['x'], 'tipo' => ['congreso']]);
    ok('Campos con tipo inesperado (arreglos): 400', $r['status'] === 400, snippet($r));
    $r = $c->a('GET', "/api/eje3/participantes?search=" . urlencode("' OR 1=1 --"));
    ok('Búsqueda con comillas es parametrizada (200, sin error SQL)', $r['status'] === 200 && !preg_match('/SQLSTATE/', $r['body']), snippet($r));
}

// ===========================================================================
// SUITE: EVENTOS
// ===========================================================================
function suiteEvents(Ctx $c): void {
    section('Eje 3 · Eventos');

    $seedEvents = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion");
    ok('Semilla: al menos 4 eventos', $seedEvents >= 4, "hay {$seedEvents}");
    $types = array_column($c->rows("SELECT DISTINCT tipo FROM eventos_investigacion"), 'tipo');
    ok('Semilla: hay eventos de semilleros, congreso y revista_pyad', count(array_intersect(['semilleros', 'congreso', 'revista_pyad'], $types)) === 3, json_encode($types));
    ok('Semilla: existe un evento concluido de 2025', (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE estado='concluido' AND fecha_inicio LIKE '2025%'") >= 1);
    ok('Semilla: nombres esperados (Encuentro de Semilleros 2026 y Congreso Internacional 2026)',
        (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE nombre LIKE 'Encuentro de Semilleros de Investigación 2026%'") === 1
        && (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE nombre LIKE 'Congreso Internacional de Investigación en Ciencias Económico Administrativas 2026%'") === 1);

    // Lista pública vs. admin
    $pub = $c->p('GET', '/api/eje3/eventos');
    eq('GET /api/eje3/eventos (público): 200', 200, $pub['status']);
    $rows = arr($pub);
    ok('Público: solo eventos con publico=1', $rows && count(array_filter($rows, fn($e) => (int)$e['publico'] !== 1)) === 0);
    $expectedPublic = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE publico = 1");
    eq('Público: cuenta igual al SQL independiente', $expectedPublic, count($rows));
    $keys = ['id', 'nombre', 'tipo', 'edicion', 'fecha_inicio', 'fecha_fin', 'sede', 'descripcion', 'estado', 'publico', 'total_proyectos', 'total_participantes', 'total_publicaciones', 'created_at', 'updated_at'];
    ok('Fila de evento con todas las claves del contrato', !array_diff($keys, array_keys($rows[0] ?? [])), json_encode(array_diff($keys, array_keys($rows[0] ?? []))));
    $adm = arr($c->a('GET', '/api/eje3/eventos'));
    eq('Admin: ve todos los eventos (incluye no públicos)', $seedEvents, count($adm));
    $hidden = $c->rows("SELECT id FROM eventos_investigacion WHERE publico = 0 LIMIT 1")[0]['id'] ?? null;
    ok('Semilla: existe al menos un evento no público', $hidden !== null);
    if ($hidden !== null) {
        eq('Evento no público: 404 para anónimo', 404, $c->p('GET', "/api/eje3/eventos/{$hidden}")['status']);
        eq('Evento no público: 200 para admin', 200, $c->a('GET', "/api/eje3/eventos/{$hidden}")['status']);
    }
    eq('Evento inexistente: 404', 404, $c->p('GET', '/api/eje3/eventos/999999')['status']);

    // Totales del evento contra SQL independiente
    $withProjects = $c->rows("SELECT evento_id, COUNT(*) n FROM proyectos WHERE evento_id IS NOT NULL GROUP BY evento_id")[0] ?? null;
    if ($withProjects) {
        $ev = arr($c->a('GET', '/api/eje3/eventos/' . $withProjects['evento_id']));
        eq('total_proyectos del evento coincide con SQL (solo aprobados)', (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE evento_id = :e AND registro_estado = 'aprobado'", [':e' => $withProjects['evento_id']]), $ev['total_proyectos'] ?? null);
        eq('total_participantes coincide con SQL', (int)$c->scalar("SELECT COUNT(*) FROM participantes_evento WHERE evento_id = :e", [':e' => $withProjects['evento_id']]), $ev['total_participantes'] ?? null);
        eq('total_publicaciones coincide con SQL (solo publicadas)', (int)$c->scalar("SELECT COUNT(*) FROM publicaciones WHERE evento_id = :e AND estado='publicado'", [':e' => $withProjects['evento_id']]), $ev['total_publicaciones'] ?? null);
    }

    // Filtros
    $r = arr($c->a('GET', '/api/eje3/eventos?tipo=congreso'));
    ok('Filtro tipo=congreso', $r && count(array_filter($r, fn($e) => $e['tipo'] !== 'congreso')) === 0);
    $r = arr($c->a('GET', '/api/eje3/eventos?estado=concluido'));
    ok('Filtro estado=concluido', $r && count(array_filter($r, fn($e) => $e['estado'] !== 'concluido')) === 0);
    $r = arr($c->a('GET', '/api/eje3/eventos?search=' . urlencode('Semilleros')));
    ok('Búsqueda por texto', $r && count(array_filter($r, fn($e) => stripos(json_encode($e, JSON_UNESCAPED_UNICODE), 'semilleros') === false)) === 0);

    // Alta: validaciones
    $r = $c->a('POST', '/api/eje3/eventos', []);
    eq('POST evento vacío: 400', 400, $r['status']);
    ok('POST evento vacío: errores en nombre y tipo', isset($r['json']['errors']['nombre'], $r['json']['errors']['tipo']), snippet($r));
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => 'X', 'tipo' => 'inexistente']);
    ok('Tipo fuera del catálogo: 400', $r['status'] === 400 && isset($r['json']['errors']['tipo']), snippet($r));
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => 'X', 'tipo' => 'otro', 'estado' => 'raro']);
    ok('Estado fuera del catálogo: 400', $r['status'] === 400 && isset($r['json']['errors']['estado']), snippet($r));
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => 'X', 'tipo' => 'otro', 'fecha_inicio' => '2030-05-10', 'fecha_fin' => '2030-05-01']);
    ok('Fecha fin anterior al inicio: 400', $r['status'] === 400 && isset($r['json']['errors']['fecha_fin']), snippet($r));
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => 'X', 'tipo' => 'otro', 'fecha_inicio' => '2030-02-31']);
    ok('Fecha inexistente: 400', $r['status'] === 400 && isset($r['json']['errors']['fecha_inicio']), snippet($r));

    // Alta válida con defaults
    $r = $c->a('POST', '/api/eje3/eventos', ['nombre' => 'Evento de prueba', 'tipo' => 'otro']);
    eq('POST evento válido: 201', 201, $r['status']);
    $ev = arr($r);
    eq('Defaults: estado programado', 'programado', $ev['estado'] ?? null);
    eq('Defaults: publico = 1', 1, $ev['publico'] ?? null);
    eq('Totales iniciales en cero', [0, 0, 0], [$ev['total_proyectos'] ?? null, $ev['total_participantes'] ?? null, $ev['total_publicaciones'] ?? null]);
    $id = (int)($ev['id'] ?? 0);

    // Actualización parcial y completa
    $r = $c->a('PUT', "/api/eje3/eventos/{$id}", ['nombre' => 'Evento renombrado', 'estado' => 'en_curso']);
    eq('PUT evento: 200', 200, $r['status']);
    eq('PUT cambia nombre', 'Evento renombrado', $r['json']['data']['nombre'] ?? null);
    eq('PUT cambia estado', 'en_curso', $r['json']['data']['estado'] ?? null);
    eq('PUT parcial conserva el tipo', 'otro', $r['json']['data']['tipo'] ?? null);
    $r = $c->a('PUT', "/api/eje3/eventos/{$id}", ['nombre' => '', 'tipo' => 'otro']);
    ok('PUT con nombre vacío: 400', $r['status'] === 400 && isset($r['json']['errors']['nombre']), snippet($r));
    eq('PUT 404 si no existe', 404, $c->a('PUT', '/api/eje3/eventos/999999', ['nombre' => 'x', 'tipo' => 'otro'])['status']);

    // Visibilidad: ocultar y volver a mostrar
    $c->a('PUT', "/api/eje3/eventos/{$id}", ['publico' => 0]);
    eq('Evento ocultado: 404 para anónimo', 404, $c->p('GET', "/api/eje3/eventos/{$id}")['status']);
    ok('Evento ocultado: no aparece en la lista pública', !in_array($id, array_column(arr($c->p('GET', '/api/eje3/eventos')), 'id'), true));
    ok('Evento ocultado: sí aparece en la lista de admin', in_array($id, array_column(arr($c->a('GET', '/api/eje3/eventos')), 'id'), true));
    $c->a('PUT', "/api/eje3/eventos/{$id}", ['publico' => true]);
    eq('Evento visible de nuevo: 200 para anónimo', 200, $c->p('GET', "/api/eje3/eventos/{$id}")['status']);

    // Al borrar el evento, los hijos quedan con evento_id NULL
    $inv = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $p = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Ligado a evento', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'evento_id' => $id]));
    $part = arr($c->a('POST', '/api/eje3/participantes', ['rol' => 'relator', 'nombre_completo' => 'Relator ligado', 'evento_id' => $id]));
    $pubId = (int)$c->scalar("SELECT id FROM publicaciones ORDER BY id LIMIT 1");
    $origPub = $c->rows("SELECT origen, evento_id FROM publicaciones WHERE id = :i", [':i' => $pubId])[0];
    $c->exec("UPDATE publicaciones SET evento_id = :e WHERE id = :i", [':e' => $id, ':i' => $pubId]);
    $ev = arr($c->a('GET', "/api/eje3/eventos/{$id}"));
    eq('El evento cuenta sus hijos (proyectos, participantes, publicaciones)', [1, 1], [$ev['total_proyectos'] ?? null, $ev['total_participantes'] ?? null]);
    $r = $c->a('DELETE', "/api/eje3/eventos/{$id}");
    eq('DELETE evento: 200', 200, $r['status']);
    eq('Evento borrado: 404', 404, $c->a('GET', "/api/eje3/eventos/{$id}")['status']);
    eq('DELETE de nuevo: 404', 404, $c->a('DELETE', "/api/eje3/eventos/{$id}")['status']);
    ok('Proyecto del evento borrado sigue existiendo con evento_id NULL', $c->scalar("SELECT evento_id FROM proyectos WHERE id = :i", [':i' => $p['id']]) === null && (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE id = :i", [':i' => $p['id']]) === 1);
    ok('Participante del evento borrado queda con evento_id NULL', $c->scalar("SELECT evento_id FROM participantes_evento WHERE id = :i", [':i' => $part['id']]) === null);
    ok('Publicación del evento borrado queda con evento_id NULL', $c->scalar("SELECT evento_id FROM publicaciones WHERE id = :i", [':i' => $pubId]) === null);
    // Limpieza
    $c->a('DELETE', '/api/eje3/proyectos/' . $p['id']);
    $c->a('DELETE', '/api/eje3/participantes/' . $part['id']);
    $c->exec("UPDATE publicaciones SET evento_id = :e WHERE id = :i", [':e' => $origPub['evento_id'], ':i' => $pubId]);
}

// ===========================================================================
// SUITE: PROYECTOS DEL EJE 3
// ===========================================================================
function suiteProjects(Ctx $c): void {
    section('Eje 3 · Proyectos (investigación / semilleros / titulación)');

    $inv = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $seedSem = (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE tipo = 'semillero'");
    $seedTit = (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE tipo = 'titulacion' AND articulado_civ = 1");
    $seedInv = (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE tipo = 'investigacion'");
    ok('Semilla: al menos 3 proyectos de investigación', $seedInv >= 3, "hay {$seedInv}");
    ok('Semilla: al menos 3 proyectos de semilleros', $seedSem >= 3, "hay {$seedSem}");
    ok('Semilla: al menos 2 proyectos de titulación articulados al CIV', $seedTit >= 2, "hay {$seedTit}");
    ok('Semilla: cada proyecto de semillero tiene evento y 2-3 apartados',
        (int)$c->scalar("SELECT COUNT(*) FROM proyectos p WHERE tipo='semillero' AND (evento_id IS NULL OR (SELECT COUNT(*) FROM proyecto_apartados a WHERE a.proyecto_id=p.id) NOT BETWEEN 2 AND 3)") === 0);

    // Listado
    $r = $c->a('GET', '/api/eje3/proyectos');
    eq('GET /api/eje3/proyectos (admin): 200', 200, $r['status']);
    $rows = arr($r);
    $keys = ['id', 'codigo', 'titulo', 'resumen', 'investigador_principal_id', 'investigador_principal_nombre', 'co_investigadores', 'estado', 'fecha_inicio', 'fecha_fin', 'presupuesto', 'entidad_financiadora', 'linea_investigacion', 'tipo', 'evento_id', 'evento_nombre', 'articulado_civ', 'total_apartados'];
    ok('Fila con todas las claves del contrato', !array_diff($keys, array_keys($rows[0] ?? [])), json_encode(array_diff($keys, array_keys($rows[0] ?? []))));
    eq('Total de proyectos igual al SQL', (int)$c->scalar("SELECT COUNT(*) FROM proyectos"), count($rows));
    $r = arr($c->a('GET', '/api/eje3/proyectos?tipo=semillero'));
    ok('Filtro tipo=semillero', count($r) === $seedSem && count(array_filter($r, fn($p) => $p['tipo'] !== 'semillero')) === 0);
    $evId = (int)$c->scalar("SELECT evento_id FROM proyectos WHERE tipo='semillero' LIMIT 1");
    $r = arr($c->a('GET', "/api/eje3/proyectos?evento_id={$evId}"));
    ok('Filtro evento_id', $r && count(array_filter($r, fn($p) => (int)$p['evento_id'] !== $evId)) === 0 && $r[0]['evento_nombre'] !== null);
    $r = arr($c->a('GET', '/api/eje3/proyectos?estado=completado'));
    ok('Filtro estado', count(array_filter($r, fn($p) => $p['estado'] !== 'completado')) === 0);
    $r = arr($c->a('GET', '/api/eje3/proyectos?search=' . urlencode('economía circular')));
    ok('Búsqueda por texto en título/resumen', count($r) >= 1 || (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE titulo LIKE '%economía circular%' OR resumen LIKE '%economía circular%'") === 0);

    // Validaciones de alta
    $r = $c->a('POST', '/api/eje3/proyectos', []);
    ok('POST vacío: 400 con errores de titulo, investigador y tipo', $r['status'] === 400 && isset($r['json']['errors']['titulo'], $r['json']['errors']['investigador_principal_id'], $r['json']['errors']['tipo']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => 'abc', 'tipo' => 'semillero']);
    ok('Investigador no numérico: 400', $r['status'] === 400 && isset($r['json']['errors']['investigador_principal_id']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => 999999, 'tipo' => 'semillero']);
    ok('Investigador inexistente: 400', $r['status'] === 400 && isset($r['json']['errors']['investigador_principal_id']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'otra-cosa']);
    ok('Tipo inválido: 400', $r['status'] === 400 && isset($r['json']['errors']['tipo']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'evento_id' => 999999]);
    ok('Evento inexistente: 400', $r['status'] === 400 && isset($r['json']['errors']['evento_id']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'estado' => 'raro']);
    ok('Estado inválido: 400', $r['status'] === 400 && isset($r['json']['errors']['estado']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'presupuesto' => -5]);
    ok('Presupuesto negativo: 400', $r['status'] === 400 && isset($r['json']['errors']['presupuesto']), snippet($r));
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'apartados' => [['apartado' => '', 'contenido' => 'sin título']]]);
    ok('Apartado sin título: 400', $r['status'] === 400 && isset($r['json']['errors']['apartados']), snippet($r));
    $existingCode = (string)$c->scalar("SELECT codigo FROM proyectos ORDER BY id LIMIT 1");
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'x', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'codigo' => $existingCode]);
    ok('Código duplicado: 400 (no 500)', $r['status'] === 400 && isset($r['json']['errors']['codigo']), snippet($r));

    // Alta válida, defaults y autogeneración de código
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Semillero de prueba', 'investigador_principal_id' => $inv, 'tipo' => 'semillero']);
    eq('POST válido: 201', 201, $r['status']);
    $s1 = arr($r);
    ok('Código autogenerado SEM-AAAA-NNN', (bool)preg_match('/^SEM-\d{4}-\d{3}$/', (string)($s1['codigo'] ?? '')), (string)($s1['codigo'] ?? ''));
    eq('Defaults: estado en_ejecucion', 'en_ejecucion', $s1['estado'] ?? null);
    eq('Defaults: línea General', 'General', $s1['linea_investigacion'] ?? null);
    eq('Defaults: presupuesto 0', 0.0, (float)($s1['presupuesto'] ?? -1));
    eq('Defaults: fecha_inicio es una fecha de hoy (±1 día)', true, abs(strtotime($s1['fecha_inicio'] ?? '1970-01-01') - time()) < 2 * 86400);
    eq('Defaults: articulado_civ 0 y sin apartados', [0, 0, []], [$s1['articulado_civ'] ?? null, $s1['total_apartados'] ?? null, $s1['apartados'] ?? null]);
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Otro semillero', 'investigador_principal_id' => $inv, 'tipo' => 'semillero']);
    $s2 = arr($r);
    ok('Segundo código autogenerado es distinto (único)', ($s2['codigo'] ?? '') !== ($s1['codigo'] ?? ''), json_encode([$s1['codigo'] ?? null, $s2['codigo'] ?? null]));
    $t1 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Titulación prueba', 'investigador_principal_id' => $inv, 'tipo' => 'titulacion', 'articulado_civ' => true]));
    $i1 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Investigación prueba', 'investigador_principal_id' => $inv, 'tipo' => 'investigacion']));
    ok('Código TIT-AAAA-NNN', (bool)preg_match('/^TIT-\d{4}-\d{3}$/', (string)($t1['codigo'] ?? '')), (string)($t1['codigo'] ?? ''));
    ok('Código INV-AAAA-NNN', (bool)preg_match('/^INV-\d{4}-\d{3}$/', (string)($i1['codigo'] ?? '')), (string)($i1['codigo'] ?? ''));
    eq('articulado_civ=true se guarda como 1', 1, $t1['articulado_civ'] ?? null);

    // Apartados: alta con apartados, reemplazo, conservación y vaciado
    $evId = (int)$c->scalar("SELECT id FROM eventos_investigacion WHERE tipo = 'semilleros' LIMIT 1");
    $r = $c->a('POST', '/api/eje3/proyectos', ['codigo' => 'TEST-SEM-900', 'titulo' => 'Con apartados', 'investigador_principal_id' => $inv, 'tipo' => 'semillero', 'evento_id' => $evId,
        'apartados' => [['apartado' => 'Introducción', 'contenido' => 'Texto uno'], ['apartado' => 'Método', 'contenido' => 'Texto dos']]]);
    eq('POST con apartados: 201', 201, $r['status']);
    $p = arr($r);
    $pid = (int)$p['id'];
    eq('Código explícito respetado', 'TEST-SEM-900', $p['codigo'] ?? null);
    eq('total_apartados = 2', 2, $p['total_apartados'] ?? null);
    eq('Apartados conservan el orden enviado', ['Introducción', 'Método'], array_column($p['apartados'] ?? [], 'apartado'));
    eq('Apartados traen orden numérico', [0, 1], array_column($p['apartados'] ?? [], 'orden'));
    eq('evento_nombre resuelto', (string)$c->scalar("SELECT nombre FROM eventos_investigacion WHERE id = :i", [':i' => $evId]), $p['evento_nombre'] ?? null);

    $r = $c->a('GET', "/api/eje3/proyectos/{$pid}");
    eq('GET /api/eje3/proyectos/:id: 200', 200, $r['status']);
    ok('Detalle incluye apartados {id,apartado,contenido,orden}', !array_diff(['id', 'apartado', 'contenido', 'orden'], array_keys(arr($r)['apartados'][0] ?? [])));
    eq('GET proyecto inexistente: 404', 404, $c->a('GET', '/api/eje3/proyectos/999999')['status']);

    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['titulo' => 'Con apartados (editado)', 'apartados' => [['apartado' => 'Único', 'contenido' => 'Reemplazo']]]);
    eq('PUT con apartados: 200', 200, $r['status']);
    eq('PUT reemplaza TODO el conjunto de apartados', ['Único'], array_column(arr($r)['apartados'] ?? [], 'apartado'));
    eq('PUT parcial conserva el tipo y el evento', ['semillero', $evId], [arr($r)['tipo'] ?? null, arr($r)['evento_id'] ?? null]);
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['estado' => 'completado']);
    eq('PUT sin `apartados` no los toca', 1, arr($r)['total_apartados'] ?? null);
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['apartados' => []]);
    eq('PUT con apartados vacío los elimina', 0, arr($r)['total_apartados'] ?? null);
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['evento_id' => null]);
    ok('PUT con evento_id null desliga el evento', array_key_exists('evento_id', arr($r)) && arr($r)['evento_id'] === null, snippet($r));
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['tipo' => 'titulacion', 'articulado_civ' => 1]);
    eq('PUT puede cambiar tipo y articulación', ['titulacion', 1], [arr($r)['tipo'] ?? null, arr($r)['articulado_civ'] ?? null]);
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['codigo' => $existingCode]);
    ok('PUT con código ajeno: 400', $r['status'] === 400 && isset($r['json']['errors']['codigo']), snippet($r));
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['investigador_principal_id' => 999999]);
    ok('PUT con investigador inexistente: 400', $r['status'] === 400, snippet($r));
    $r = $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['fecha_inicio' => '2026-05-10', 'fecha_fin' => '2026-05-01']);
    ok('PUT con fechas incoherentes: 400', $r['status'] === 400 && isset($r['json']['errors']['fecha_fin']), snippet($r));
    eq('PUT inexistente: 404', 404, $c->a('PUT', '/api/eje3/proyectos/999999', ['titulo' => 'x'])['status']);

    // El proyecto también es visible para el administrador en el endpoint clásico; el público
    // solo ve proyectos de investigación (los de semilleros/titulación se publican vía eventos públicos)
    $r = $c->a('GET', "/api/proyectos/{$pid}");
    eq('El proyecto del Eje 3 se ve para el admin en GET /api/proyectos/:id (clásico)', 200, $r['status']);

    // Borrado
    $c->a('PUT', "/api/eje3/proyectos/{$pid}", ['apartados' => [['apartado' => 'A', 'contenido' => 'b']]]);
    $r = $c->a('DELETE', "/api/eje3/proyectos/{$pid}");
    eq('DELETE proyecto: 200', 200, $r['status']);
    eq('DELETE elimina sus apartados', 0, (int)$c->scalar("SELECT COUNT(*) FROM proyecto_apartados WHERE proyecto_id = :i", [':i' => $pid]));
    eq('Proyecto borrado: 404', 404, $c->a('GET', "/api/eje3/proyectos/{$pid}")['status']);
    eq('DELETE de nuevo: 404', 404, $c->a('DELETE', "/api/eje3/proyectos/{$pid}")['status']);

    // Un proyecto con publicaciones derivadas se puede borrar (la publicación se conserva)
    $pubId = (int)$c->scalar("SELECT id FROM publicaciones ORDER BY id LIMIT 1");
    $orig = $c->scalar("SELECT proyecto_id FROM publicaciones WHERE id = :i", [':i' => $pubId]);
    $tmp = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Con publicación', 'investigador_principal_id' => $inv, 'tipo' => 'investigacion']));
    $c->exec("UPDATE publicaciones SET proyecto_id = :p WHERE id = :i", [':p' => $tmp['id'], ':i' => $pubId]);
    eq('Borrar proyecto con publicación derivada: 200', 200, $c->a('DELETE', '/api/eje3/proyectos/' . $tmp['id'])['status']);
    ok('La publicación sigue existiendo con proyecto_id NULL', $c->scalar("SELECT proyecto_id FROM publicaciones WHERE id = :i", [':i' => $pubId]) === null);
    $c->exec("UPDATE publicaciones SET proyecto_id = :p WHERE id = :i", [':p' => $orig, ':i' => $pubId]);

    // Limpieza de los proyectos de prueba
    foreach ([$s1, $s2, $t1, $i1] as $x) { $c->a('DELETE', '/api/eje3/proyectos/' . ($x['id'] ?? 0)); }
}

// ===========================================================================
// SUITE: CATÁLOGOS GENÉRICOS (participantes, retribución social, egresados)
// ===========================================================================
function registryCrud(Ctx $c, string $title, string $path, array $valid, array $invalidCases, array $update, string $uniqueField, string $filterField, string $filterValue): void {
    section("Eje 3 · {$title}");

    eq("GET {$path} sin token: 401", 401, $c->p('GET', $path)['status']);
    eq("POST {$path} sin token: 401", 401, $c->p('POST', $path, $valid)['status']);

    $r = $c->a('GET', $path);
    eq("GET {$path} (admin): 200", 200, $r['status']);
    $before = count(arr($r));

    foreach ($invalidCases as $label => [$body, $field]) {
        $r = $c->a('POST', $path, $body);
        ok("POST inválido ({$label}): 400 con errores en '{$field}'", $r['status'] === 400 && isset($r['json']['errors'][$field]), snippet($r));
    }

    $marker = 'MARCA-' . bin2hex(random_bytes(3));
    $body = $valid;
    $body[$uniqueField] = $marker;
    $r = $c->a('POST', $path, $body);
    eq("POST válido: 201", 201, $r['status']);
    $row = arr($r);
    $id = (int)($row['id'] ?? 0);
    ok('POST devuelve el registro con id', $id > 0, snippet($r));
    eq('POST guarda el campo enviado', $marker, $row[$uniqueField] ?? null);
    eq('La lista crece en uno', $before + 1, count(arr($c->a('GET', $path))));

    $r = $c->a('GET', "{$path}/{$id}");
    eq("GET {$path}/:id: 200", 200, $r['status']);
    eq('GET :id devuelve el mismo registro', $marker, arr($r)[$uniqueField] ?? null);
    eq("GET {$path}/999999: 404", 404, $c->a('GET', "{$path}/999999")['status']);
    eq("GET {$path}/:id sin token: 401", 401, $c->p('GET', "{$path}/{$id}")['status']);

    // Búsqueda y filtro
    $r = arr($c->a('GET', $path . '?search=' . urlencode($marker)));
    eq('Búsqueda por texto encuentra exactamente el registro', [$id], array_map('intval', array_column($r, 'id')));
    $r = arr($c->a('GET', $path . '?' . $filterField . '=' . urlencode($filterValue)));
    ok("Filtro {$filterField}={$filterValue}", $r && count(array_filter($r, fn($x) => ($x[$filterField] ?? null) !== $filterValue)) === 0 && in_array($id, array_map('intval', array_column($r, 'id')), true));

    // Actualización
    $r = $c->a('PUT', "{$path}/{$id}", $update);
    eq('PUT: 200', 200, $r['status']);
    $k = array_key_first($update);
    eq("PUT cambia '{$k}'", $update[$k], arr($r)[$k] ?? null);
    eq('PUT parcial conserva el resto de campos', $marker, arr($r)[$uniqueField] ?? null);
    foreach ($invalidCases as $label => [$bad, $field]) {
        if ($bad === [] ) { continue; }
        $r = $c->a('PUT', "{$path}/{$id}", $bad);
        ok("PUT inválido ({$label}): 400 con errores en '{$field}'", $r['status'] === 400 && isset($r['json']['errors'][$field]), snippet($r));
        break;
    }
    eq('PUT sobre inexistente: 404', 404, $c->a('PUT', "{$path}/999999", $update)['status']);

    // Borrado
    eq('DELETE: 200', 200, $c->a('DELETE', "{$path}/{$id}")['status']);
    eq('Tras borrar: GET 404', 404, $c->a('GET', "{$path}/{$id}")['status']);
    eq('DELETE de nuevo: 404', 404, $c->a('DELETE', "{$path}/{$id}")['status']);
    eq('La lista vuelve a su tamaño original', $before, count(arr($c->a('GET', $path))));
}

function suiteRegistries(Ctx $c): void {
    // Participantes
    $evId = (int)$c->scalar("SELECT id FROM eventos_investigacion ORDER BY id LIMIT 1");
    registryCrud($c, 'Participantes de evento', '/api/eje3/participantes',
        ['rol' => 'dictaminador', 'nombre_completo' => 'Nombre base', 'correo' => 'base@ejemplo.mx', 'institucion' => 'Institución', 'especialidad' => 'Área', 'evento_id' => $evId],
        [
            'vacío'          => [[], 'rol'],
            'rol inválido'   => [['rol' => 'jefe', 'nombre_completo' => 'X'], 'rol'],
            'sin nombre'     => [['rol' => 'relator'], 'nombre_completo'],
            'correo inválido' => [['rol' => 'relator', 'nombre_completo' => 'X', 'correo' => 'no-es-correo'], 'correo'],
            'evento inexistente' => [['rol' => 'relator', 'nombre_completo' => 'X', 'evento_id' => 999999], 'evento_id'],
        ],
        ['institucion' => 'Institución cambiada'], 'nombre_completo', 'rol', 'dictaminador');

    $r = arr($c->a('GET', '/api/eje3/participantes'));
    ok('Fila de participante con evento_nombre y activo', !array_diff(['id', 'rol', 'nombre_completo', 'correo', 'institucion', 'especialidad', 'evento_id', 'evento_nombre', 'activo'], array_keys($r[0] ?? [])));
    foreach (['dictaminador', 'moderador', 'relator', 'dictaminador_pyad'] as $rol) {
        $n = count(arr($c->a('GET', '/api/eje3/participantes?rol=' . $rol)));
        ok("Semilla: al menos 3 participantes con rol {$rol}", $n >= 3, "hay {$n}");
    }
    $withEvent = $c->rows("SELECT evento_id FROM participantes_evento WHERE evento_id IS NOT NULL LIMIT 1")[0]['evento_id'] ?? null;
    if ($withEvent) {
        $x = arr($c->a('GET', '/api/eje3/participantes?evento_id=' . $withEvent));
        ok('Filtro evento_id en participantes', $x && count(array_filter($x, fn($p) => (int)$p['evento_id'] !== (int)$withEvent)) === 0 && $x[0]['evento_nombre'] !== null);
    }
    foreach (['dictaminador', 'moderador', 'relator', 'dictaminador_pyad'] as $rol) {
        eq("Rol '{$rol}' se acepta", 201, ($rr = $c->a('POST', '/api/eje3/participantes', ['rol' => $rol, 'nombre_completo' => 'Rol ' . $rol]))['status']);
        $c->a('DELETE', '/api/eje3/participantes/' . (arr($rr)['id'] ?? 0));
    }

    // Retribución social
    registryCrud($c, 'Retribución social', '/api/eje3/retribucion-social',
        ['programa' => 'MGT', 'tipo_participante' => 'estudiante', 'nombre_participante' => 'Nombre', 'actividad' => 'Actividad', 'horas' => 12, 'fecha' => '2026-03-01', 'periodo' => '2026-1'],
        [
            'vacío'              => [[], 'programa'],
            'programa inválido'  => [['programa' => 'ZZZ', 'tipo_participante' => 'estudiante', 'nombre_participante' => 'X', 'actividad' => 'Y'], 'programa'],
            'tipo inválido'      => [['programa' => 'MGT', 'tipo_participante' => 'director', 'nombre_participante' => 'X', 'actividad' => 'Y'], 'tipo_participante'],
            'horas negativas'    => [['programa' => 'MGT', 'tipo_participante' => 'profesor', 'nombre_participante' => 'X', 'actividad' => 'Y', 'horas' => -3], 'horas'],
            'horas no numéricas' => [['programa' => 'MGT', 'tipo_participante' => 'profesor', 'nombre_participante' => 'X', 'actividad' => 'Y', 'horas' => 'abc'], 'horas'],
            'fecha inválida'     => [['programa' => 'MGT', 'tipo_participante' => 'profesor', 'nombre_participante' => 'X', 'actividad' => 'Y', 'fecha' => '2026-13-45'], 'fecha'],
            'sin actividad'      => [['programa' => 'MGT', 'tipo_participante' => 'profesor', 'nombre_participante' => 'X'], 'actividad'],
        ],
        ['horas' => 40], 'nombre_participante', 'programa', 'MGT');
    foreach (['MPYMES', 'MGT', 'MDGE'] as $prog) {
        $n = count(arr($c->a('GET', '/api/eje3/retribucion-social?programa=' . $prog)));
        ok("Semilla: al menos 2 registros de retribución social en {$prog}", $n >= 2, "hay {$n}");
    }
    $x = arr($c->a('GET', '/api/eje3/retribucion-social'));
    $tipos = array_unique(array_column($x, 'tipo_participante'));
    ok('Semilla de retribución mezcla estudiantes y profesores', in_array('estudiante', $tipos, true) && in_array('profesor', $tipos, true));
    $x = arr($c->a('GET', '/api/eje3/retribucion-social?tipo_participante=profesor'));
    ok('Filtro tipo_participante=profesor', $x && count(array_filter($x, fn($r) => $r['tipo_participante'] !== 'profesor')) === 0);
    $created = arr($c->a('POST', '/api/eje3/retribucion-social', ['programa' => 'MDGE', 'tipo_participante' => 'profesor', 'nombre_participante' => 'Horas por defecto', 'actividad' => 'A']));
    eq('Horas por defecto = 0 y tipo entero', 0, $created['horas'] ?? null);
    $c->a('DELETE', '/api/eje3/retribucion-social/' . ($created['id'] ?? 0));

    // Egresados
    registryCrud($c, 'Actividades de egresados', '/api/eje3/egresados',
        ['programa' => 'MGT', 'nombre_egresado' => 'Egresado base', 'generacion' => '2020-2022', 'actividad' => 'Actividad', 'tipo' => 'empleo', 'institucion' => 'Empresa', 'fecha' => '2026-01-15'],
        [
            'vacío'         => [[], 'nombre_egresado'],
            'tipo inválido' => [['nombre_egresado' => 'X', 'actividad' => 'Y', 'tipo' => 'vacaciones'], 'tipo'],
            'sin actividad' => [['nombre_egresado' => 'X', 'tipo' => 'otro'], 'actividad'],
        ],
        ['institucion' => 'Otra institución'], 'nombre_egresado', 'tipo', 'empleo');
    $n = count(arr($c->a('GET', '/api/eje3/egresados')));
    ok('Semilla: al menos 4 actividades de egresados', $n >= 4, "hay {$n}");
    $tipos = array_unique(array_column(arr($c->a('GET', '/api/eje3/egresados')), 'tipo'));
    ok('Semilla de egresados cubre varios tipos', count($tipos) >= 3, json_encode($tipos));
    $x = arr($c->a('GET', '/api/eje3/egresados?programa=MGT'));
    ok('Filtro programa en egresados', count(array_filter($x, fn($r) => $r['programa'] !== 'MGT')) === 0);
}

// ===========================================================================
// SUITE: DOCENTES / SNII y CATÁLOGOS (hub)
// ===========================================================================
function suiteFaculty(Ctx $c): void {
    section('Eje 3 · Docentes y SNII');

    $r = $c->a('GET', '/api/eje3/docentes');
    eq('GET /api/eje3/docentes: 200', 200, $r['status']);
    $rows = arr($r);
    ok('Fila con claves del contrato', !array_diff(['id', 'nombre_completo', 'correo', 'afiliacion', 'categoria', 'linea_investigacion', 'snii_nivel', 'snii_elegible', 'activo', 'total_proyectos'], array_keys($rows[0] ?? [])));
    eq('Lista todos los docentes', (int)$c->scalar("SELECT COUNT(*) FROM investigadores"), count($rows));
    $row = $rows[0];
    eq('total_proyectos coincide con SQL (solo aprobados)', (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE investigador_principal_id = :i AND registro_estado = 'aprobado'", [':i' => $row['id']]), $row['total_proyectos']);

    $x = arr($c->a('GET', '/api/eje3/docentes?snii=en_snii'));
    ok('Filtro en_snii: todos con nivel', $x && count(array_filter($x, fn($d) => empty($d['snii_nivel']))) === 0);
    eq('Filtro en_snii: cuenta igual al SQL', (int)$c->scalar("SELECT COUNT(*) FROM investigadores WHERE snii_nivel IS NOT NULL AND snii_nivel <> ''"), count($x));
    $x = arr($c->a('GET', '/api/eje3/docentes?snii=elegibles'));
    ok('Filtro elegibles: elegibles sin nivel', $x && count(array_filter($x, fn($d) => (int)$d['snii_elegible'] !== 1 || !empty($d['snii_nivel']))) === 0);
    $x = arr($c->a('GET', '/api/eje3/docentes?snii=sin'));
    ok('Filtro sin: sin nivel y no elegibles', count(array_filter($x, fn($d) => !empty($d['snii_nivel']) || (int)$d['snii_elegible'] === 1)) === 0);
    $x = arr($c->a('GET', '/api/eje3/docentes?search=' . urlencode(explode(' ', $row['nombre_completo'])[1] ?? 'a')));
    ok('Búsqueda de docentes', count($x) >= 1);
    $x = arr($c->a('GET', '/api/eje3/docentes?snii=valor-raro'));
    eq('Filtro snii desconocido se trata como "todos"', count($rows), count($x));
    ok('Semilla: hay docentes con nivel SNII y otros elegibles', (int)$c->scalar("SELECT COUNT(*) FROM investigadores WHERE snii_nivel IS NOT NULL") >= 2 && (int)$c->scalar("SELECT COUNT(*) FROM investigadores WHERE snii_elegible = 1") >= 1);

    // Edición de la marca SNII
    $id = (int)$row['id'];
    $orig = $c->rows("SELECT snii_nivel, snii_elegible FROM investigadores WHERE id = :i", [':i' => $id])[0];
    $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'II', 'snii_elegible' => true]);
    eq('PUT snii: 200', 200, $r['status']);
    eq('PUT snii guarda nivel y elegibilidad', ['II', 1], [arr($r)['snii_nivel'] ?? null, arr($r)['snii_elegible'] ?? null]);
    $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => null, 'snii_elegible' => 0]);
    ok('PUT snii con null limpia el nivel', array_key_exists('snii_nivel', arr($r)) && arr($r)['snii_nivel'] === null && (arr($r)['snii_elegible'] ?? null) === 0, snippet($r));
    foreach (['Candidato', 'I', 'II', 'III'] as $nivel) {
        $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => $nivel, 'snii_elegible' => 0]);
        if ($r['status'] !== 200 || ($r['json']['data']['snii_nivel'] ?? null) !== $nivel) { ok("Nivel {$nivel} aceptado", false, snippet($r)); }
    }
    ok('Los 4 niveles válidos se aceptan', true);
    $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'IV']);
    ok('Nivel inválido: 400', $r['status'] === 400 && isset($r['json']['errors']['snii_nivel']), snippet($r));
    $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_elegible' => 'tal vez']);
    ok('Elegible inválido: 400', $r['status'] === 400 && isset($r['json']['errors']['snii_elegible']), snippet($r));
    $r = $c->a('PUT', "/api/eje3/docentes/{$id}/snii", []);
    eq('Cuerpo sin campos SNII: 400', 400, $r['status']);
    eq('Docente inexistente: 404', 404, $c->a('PUT', '/api/eje3/docentes/999999/snii', ['snii_nivel' => 'I'])['status']);
    eq('Sin token: 401', 401, $c->p('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'I'])['status']);
    $c->exec("UPDATE investigadores SET snii_nivel = :n, snii_elegible = :e WHERE id = :i", [':n' => $orig['snii_nivel'], ':e' => $orig['snii_elegible'], ':i' => $id]);

    section('Eje 3 · Resumen del hub (catálogos)');
    $r = $c->a('GET', '/api/eje3/catalogos');
    eq('GET /api/eje3/catalogos: 200', 200, $r['status']);
    $d = arr($r);
    $keys = ['proyectos_investigacion', 'proyectos_semilleros', 'proyectos_titulacion', 'dictaminadores', 'moderadores', 'relatores', 'dictaminadores_pyad', 'retribucion_mpymes', 'retribucion_mgt', 'retribucion_mdge', 'egresados', 'eventos', 'docentes'];
    ok('Trae las 13 claves del contrato', !array_diff($keys, array_keys($d)), json_encode(array_diff($keys, array_keys($d))));
    ok('Todos los valores son enteros', count(array_filter($d, 'is_int')) === count($d), json_encode($d));
    $count = fn(string $p) => count(arr($c->a('GET', $p)));
    eq('proyectos_investigacion = lista filtrada', $count('/api/eje3/proyectos?tipo=investigacion'), $d['proyectos_investigacion'] ?? null);
    eq('proyectos_semilleros = lista filtrada', $count('/api/eje3/proyectos?tipo=semillero'), $d['proyectos_semilleros'] ?? null);
    eq('proyectos_titulacion = lista filtrada', $count('/api/eje3/proyectos?tipo=titulacion'), $d['proyectos_titulacion'] ?? null);
    eq('dictaminadores = lista filtrada', $count('/api/eje3/participantes?rol=dictaminador'), $d['dictaminadores'] ?? null);
    eq('moderadores = lista filtrada', $count('/api/eje3/participantes?rol=moderador'), $d['moderadores'] ?? null);
    eq('relatores = lista filtrada', $count('/api/eje3/participantes?rol=relator'), $d['relatores'] ?? null);
    eq('dictaminadores_pyad = lista filtrada', $count('/api/eje3/participantes?rol=dictaminador_pyad'), $d['dictaminadores_pyad'] ?? null);
    eq('retribucion_mpymes = lista filtrada', $count('/api/eje3/retribucion-social?programa=MPYMES'), $d['retribucion_mpymes'] ?? null);
    eq('retribucion_mgt = lista filtrada', $count('/api/eje3/retribucion-social?programa=MGT'), $d['retribucion_mgt'] ?? null);
    eq('retribucion_mdge = lista filtrada', $count('/api/eje3/retribucion-social?programa=MDGE'), $d['retribucion_mdge'] ?? null);
    eq('egresados = lista', $count('/api/eje3/egresados'), $d['egresados'] ?? null);
    eq('eventos = lista de admin', $count('/api/eje3/eventos'), $d['eventos'] ?? null);
    eq('docentes = lista de docentes', $count('/api/eje3/docentes'), $d['docentes'] ?? null);
}

// ===========================================================================
// SUITE: MONITOREO
// ===========================================================================
function suiteMonitoring(Ctx $c): void {
    section('Eje 3 · Monitoreo');

    $get = fn() => arr($c->a('GET', '/api/eje3/monitoreo'));
    $r = $c->a('GET', '/api/eje3/monitoreo');
    eq('GET /api/eje3/monitoreo: 200', 200, $r['status']);
    $m = arr($r);
    $keys = ['docentes_con_proyectos', 'docentes_titulacion_civ', 'profesores_snii', 'profesores_elegibles_snii', 'total_docentes', 'docentes_con_semilleros', 'snii_por_nivel', 'detalle'];
    ok('Trae todas las claves del contrato', !array_diff($keys, array_keys($m)));
    ok('Detalle con las 4 listas', !array_diff(['con_proyectos', 'titulacion_civ', 'en_snii', 'elegibles'], array_keys($m['detalle'] ?? [])));
    ok('snii_por_nivel con Candidato, I, II, III', !array_diff(['Candidato', 'I', 'II', 'III'], array_keys($m['snii_por_nivel'] ?? [])));

    // Contra SQL independiente
    $sql = [
        'docentes_con_proyectos'    => "SELECT COUNT(DISTINCT investigador_principal_id) FROM proyectos WHERE tipo = 'investigacion' AND registro_estado = 'aprobado'",
        'docentes_titulacion_civ'   => "SELECT COUNT(DISTINCT investigador_principal_id) FROM proyectos WHERE tipo = 'titulacion' AND articulado_civ = 1 AND registro_estado = 'aprobado'",
        'profesores_snii'           => "SELECT COUNT(*) FROM investigadores WHERE activo = 1 AND snii_nivel IS NOT NULL AND snii_nivel <> ''",
        'profesores_elegibles_snii' => "SELECT COUNT(*) FROM investigadores WHERE activo = 1 AND snii_elegible = 1 AND (snii_nivel IS NULL OR snii_nivel = '')",
        'total_docentes'            => "SELECT COUNT(*) FROM investigadores WHERE activo = 1",
        'docentes_con_semilleros'   => "SELECT COUNT(DISTINCT investigador_principal_id) FROM proyectos WHERE tipo = 'semillero' AND registro_estado = 'aprobado'",
    ];
    foreach ($sql as $k => $q) {
        eq("{$k} coincide con el SQL independiente", (int)$c->scalar($q), $m[$k] ?? null);
    }
    foreach (['Candidato', 'I', 'II', 'III'] as $nivel) {
        eq("snii_por_nivel.{$nivel} coincide con SQL", (int)$c->scalar("SELECT COUNT(*) FROM investigadores WHERE activo = 1 AND snii_nivel = :n", [':n' => $nivel]), $m['snii_por_nivel'][$nivel] ?? null);
    }
    eq('Longitud de detalle.con_proyectos = docentes_con_proyectos', $m['docentes_con_proyectos'], count($m['detalle']['con_proyectos']));
    eq('Longitud de detalle.titulacion_civ = docentes_titulacion_civ', $m['docentes_titulacion_civ'], count($m['detalle']['titulacion_civ']));
    eq('Longitud de detalle.en_snii = profesores_snii', $m['profesores_snii'], count($m['detalle']['en_snii']));
    eq('Longitud de detalle.elegibles = profesores_elegibles_snii', $m['profesores_elegibles_snii'], count($m['detalle']['elegibles']));
    ok('detalle.con_proyectos trae {id, nombre_completo, total}', !array_diff(['id', 'nombre_completo', 'total'], array_keys($m['detalle']['con_proyectos'][0] ?? [])));
    ok('detalle.en_snii trae snii_nivel', isset($m['detalle']['en_snii'][0]['snii_nivel']));
    $totals = array_column($m['detalle']['con_proyectos'], 'total');
    $sorted = $totals; rsort($sorted);
    ok('detalle.con_proyectos ordenado por total descendente', $totals === $sorted);
    $levels = array_column($m['detalle']['en_snii'], 'snii_nivel');
    $rank = ['III' => 1, 'II' => 2, 'I' => 3, 'Candidato' => 4];
    $lr = array_map(fn($x) => $rank[$x] ?? 9, $levels); $lrs = $lr; sort($lrs);
    ok('detalle.en_snii ordenado de mayor a menor nivel', $lr === $lrs);

    // Datos conocidos: se crea un docente nuevo y se verifican los incrementos exactos
    $b = $get();
    $inv = arr($c->a('POST', '/api/investigadores', ['nombre_completo' => 'Docente de Monitoreo', 'correo' => 'monitoreo.' . bin2hex(random_bytes(3)) . '@prueba.mx', 'afiliacion' => 'Facultad de Pruebas', 'linea_investigacion' => 'Pruebas']));
    $id = (int)($inv['id'] ?? 0);
    ok('Docente de prueba creado', $id > 0);
    $a = $get();
    eq('Nuevo docente activo: total_docentes +1', $b['total_docentes'] + 1, $a['total_docentes']);
    eq('Sin proyectos aún: docentes_con_proyectos igual', $b['docentes_con_proyectos'], $a['docentes_con_proyectos']);

    $p1 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Inv 1', 'investigador_principal_id' => $id, 'tipo' => 'investigacion']));
    $a = $get();
    eq('Proyecto de investigación nuevo: docentes_con_proyectos +1', $b['docentes_con_proyectos'] + 1, $a['docentes_con_proyectos']);
    $p2 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Inv 2', 'investigador_principal_id' => $id, 'tipo' => 'investigacion']));
    $a = $get();
    eq('Segundo proyecto del mismo docente: no suma (distinct)', $b['docentes_con_proyectos'] + 1, $a['docentes_con_proyectos']);
    $mine = array_values(array_filter($a['detalle']['con_proyectos'], fn($x) => (int)$x['id'] === $id))[0] ?? null;
    eq('El detalle muestra total=2 para ese docente', 2, $mine['total'] ?? null);

    $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Sem', 'investigador_principal_id' => $id, 'tipo' => 'semillero']);
    $a2 = $get();
    eq('Un semillero suma a docentes_con_semilleros, no a docentes_con_proyectos', [$b['docentes_con_semilleros'] + 1, $b['docentes_con_proyectos'] + 1], [$a2['docentes_con_semilleros'], $a2['docentes_con_proyectos']]);

    $t0 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Tit sin CIV', 'investigador_principal_id' => $id, 'tipo' => 'titulacion', 'articulado_civ' => 0]));
    $a = $get();
    eq('Titulación NO articulada al CIV: docentes_titulacion_civ igual', $b['docentes_titulacion_civ'], $a['docentes_titulacion_civ']);
    $t1 = arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Tit con CIV', 'investigador_principal_id' => $id, 'tipo' => 'titulacion', 'articulado_civ' => 1]));
    $a = $get();
    eq('Titulación articulada al CIV: docentes_titulacion_civ +1', $b['docentes_titulacion_civ'] + 1, $a['docentes_titulacion_civ']);
    $c->a('PUT', '/api/eje3/proyectos/' . $t0['id'], ['articulado_civ' => 1]);
    $a = $get();
    eq('Marcar otra titulación del mismo docente al CIV: no suma', $b['docentes_titulacion_civ'] + 1, $a['docentes_titulacion_civ']);
    $titu = array_values(array_filter($a['detalle']['titulacion_civ'], fn($x) => (int)$x['id'] === $id))[0] ?? null;
    eq('Detalle titulacion_civ: total=2 para ese docente', 2, $titu['total'] ?? null);

    // SNII
    $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'I', 'snii_elegible' => 0]);
    $a = $get();
    eq('Asignar nivel I: profesores_snii +1', $b['profesores_snii'] + 1, $a['profesores_snii']);
    eq('Asignar nivel I: snii_por_nivel.I +1', $b['snii_por_nivel']['I'] + 1, $a['snii_por_nivel']['I']);
    $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'I', 'snii_elegible' => 1]);
    $a = $get();
    eq('Con nivel asignado, marcar elegible NO suma a elegibles', $b['profesores_elegibles_snii'], $a['profesores_elegibles_snii']);
    $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => null, 'snii_elegible' => 1]);
    $a = $get();
    eq('Sin nivel y elegible: profesores_elegibles_snii +1', $b['profesores_elegibles_snii'] + 1, $a['profesores_elegibles_snii']);
    eq('Sin nivel: profesores_snii vuelve a su valor', $b['profesores_snii'], $a['profesores_snii']);
    ok('El docente aparece en detalle.elegibles', in_array($id, array_column($a['detalle']['elegibles'], 'id'), true));
    $c->a('PUT', "/api/eje3/docentes/{$id}/snii", ['snii_nivel' => 'III', 'snii_elegible' => 0]);
    $a = $get();
    ok('El docente aparece en detalle.en_snii con su nivel', (array_values(array_filter($a['detalle']['en_snii'], fn($x) => (int)$x['id'] === $id))[0]['snii_nivel'] ?? null) === 'III');

    // Docente inactivo: no cuenta para SNII ni total (sí para proyectos, según contrato)
    $c->exec("UPDATE investigadores SET activo = 0 WHERE id = :i", [':i' => $id]);
    $a = $get();
    eq('Docente inactivo: total_docentes vuelve a su valor', $b['total_docentes'], $a['total_docentes']);
    eq('Docente inactivo: no cuenta en profesores_snii', $b['profesores_snii'], $a['profesores_snii']);
    eq('Docente inactivo: snii_por_nivel.III vuelve a su valor', $b['snii_por_nivel']['III'], $a['snii_por_nivel']['III']);

    // Limpieza
    foreach ([$p1, $p2, $t0, $t1] as $x) { $c->a('DELETE', '/api/eje3/proyectos/' . ($x['id'] ?? 0)); }
    foreach ($c->rows("SELECT id FROM proyectos WHERE investigador_principal_id = :i", [':i' => $id]) as $row) { $c->a('DELETE', '/api/eje3/proyectos/' . $row['id']); }
    $c->a('DELETE', "/api/investigadores/{$id}");
    $a = $get();
    eq('Tras la limpieza, docentes_con_proyectos vuelve al valor inicial', $b['docentes_con_proyectos'], $a['docentes_con_proyectos']);
    eq('Tras la limpieza, docentes_titulacion_civ vuelve al valor inicial', $b['docentes_titulacion_civ'], $a['docentes_titulacion_civ']);
    eq('Tras la limpieza, docentes_con_semilleros vuelve al valor inicial', $b['docentes_con_semilleros'], $a['docentes_con_semilleros']);
}

// ===========================================================================
// SUITE: VISUALIZAR (solo administrador)
// ===========================================================================
function suiteVisualization(Ctx $c): void {
    section('Eje 3 · Visualizar (solo administrador)');

    // Permisos: Producción académica vive en la zona de administración
    eq('GET /api/eje3/visualizar sin token: 401', 401, $c->p('GET', '/api/eje3/visualizar')['status']);
    eq('GET /api/eje3/visualizar con token inventado: 401', 401, $c->p('GET', '/api/eje3/visualizar', null, ['Authorization: Bearer 0123456789abcdef0123456789abcdef'])['status']);

    $get = fn() => arr($c->a('GET', '/api/eje3/visualizar'));
    $r = $c->a('GET', '/api/eje3/visualizar');
    eq('GET /api/eje3/visualizar como admin: 200', 200, $r['status']);
    $v = arr($r);
    ok('Trae todas las claves del contrato', !array_diff(['publicaciones_evento_pyad', 'por_origen', 'por_anio', 'produccion_docentes', 'totales'], array_keys($v)));

    $cnt = fn(string $w) => (int)$c->scalar("SELECT COUNT(*) FROM publicaciones WHERE estado = 'publicado' AND {$w}");
    eq('publicaciones_evento_pyad = SQL (origen evento o revista_pyad, publicadas)', $cnt("origen IN ('evento','revista_pyad')"), $v['publicaciones_evento_pyad']);
    eq('por_origen.evento = SQL', $cnt("origen = 'evento'"), $v['por_origen']['evento'] ?? null);
    eq('por_origen.revista_pyad = SQL', $cnt("origen = 'revista_pyad'"), $v['por_origen']['revista_pyad'] ?? null);
    eq('por_origen.otra = SQL', $cnt("origen = 'otra'"), $v['por_origen']['otra'] ?? null);
    ok('La semilla marca publicaciones de evento y de revista PYAD', $v['por_origen']['evento'] >= 1 && $v['por_origen']['revista_pyad'] >= 1, json_encode($v['por_origen']));

    $years = array_column($v['por_anio'], 'anio');
    $sy = $years; sort($sy);
    ok('por_anio en orden ascendente y sin repetidos', $years === $sy && count($years) === count(array_unique($years)));
    ok('por_anio: cada fila trae anio, evento, revista_pyad, otra, total', !array_diff(['anio', 'evento', 'revista_pyad', 'otra', 'total'], array_keys($v['por_anio'][0] ?? [])));
    $bad = array_filter($v['por_anio'], fn($y) => $y['total'] !== $y['evento'] + $y['revista_pyad'] + $y['otra']
        || $y['total'] !== (int)$c->scalar("SELECT COUNT(*) FROM publicaciones WHERE estado='publicado' AND anio = :a", [':a' => $y['anio']]));
    ok('por_anio: total = suma de orígenes = SQL por año', !$bad, json_encode($bad));
    eq('Suma de por_anio = total de publicadas', $cnt('1=1'), array_sum(array_column($v['por_anio'], 'total')));

    $pd = $v['produccion_docentes'];
    ok('produccion_docentes: claves del contrato', !array_diff(['investigador_id', 'nombre_completo', 'afiliacion', 'publicaciones', 'proyectos', 'produccion_tecnica', 'total'], array_keys($pd[0] ?? [])));
    ok('produccion_docentes: máximo 20, solo con total>0 y total = suma', count($pd) <= 20 && count(array_filter($pd, fn($d) => $d['total'] <= 0 || $d['total'] !== $d['publicaciones'] + $d['proyectos'] + $d['produccion_tecnica'])) === 0);
    $t = array_column($pd, 'total'); $st = $t; rsort($st);
    ok('produccion_docentes ordenado por total descendente', $t === $st);
    $d0 = $pd[0];
    eq('Publicaciones del primer docente = SQL', (int)$c->scalar("SELECT COUNT(*) FROM publicaciones WHERE estado='publicado' AND investigador_id = :i", [':i' => $d0['investigador_id']]), $d0['publicaciones']);
    eq('Proyectos (aprobados) del primer docente = SQL', (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE registro_estado = 'aprobado' AND investigador_principal_id = :i", [':i' => $d0['investigador_id']]), $d0['proyectos']);
    eq('totales.publicaciones = SQL', $cnt('1=1'), $v['totales']['publicaciones'] ?? null);
    eq('totales.proyectos = SQL (solo aprobados)', (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE registro_estado = 'aprobado'"), $v['totales']['proyectos'] ?? null);
    eq('totales.produccion_tecnica = SQL', (int)$c->scalar("SELECT COUNT(*) FROM produccion_tecnica"), $v['totales']['produccion_tecnica'] ?? null);
    eq('totales.docentes = docentes activos', (int)$c->scalar("SELECT COUNT(*) FROM investigadores WHERE activo = 1"), $v['totales']['docentes'] ?? null);

    // Datos conocidos: publicaciones nuevas vía el CRUD clásico (admite origen/evento_id)
    $b = $get();
    $invId = (int)$c->scalar("SELECT id FROM investigadores WHERE activo = 1 ORDER BY id LIMIT 1");
    $evId = (int)$c->scalar("SELECT id FROM eventos_investigacion ORDER BY id LIMIT 1");
    $base = ['titulo' => 'Pub de prueba', 'investigador_id' => $invId, 'autores' => 'Prueba, A.', 'revista_editorial' => 'Revista de prueba', 'anio' => 2031];
    $r = $c->a('POST', '/api/publicaciones', $base + ['origen' => 'evento', 'evento_id' => $evId]);
    eq('POST /api/publicaciones con origen/evento_id: 201', 201, $r['status']);
    $pubId = (int)($r['json']['data']['id'] ?? 0);
    eq('La publicación guarda origen y evento_id', ['evento', $evId], [$r['json']['data']['origen'] ?? null, isset($r['json']['data']['evento_id']) ? (int)$r['json']['data']['evento_id'] : null]);
    $a = $get();
    eq('Publicación de evento nueva: publicaciones_evento_pyad +1', $b['publicaciones_evento_pyad'] + 1, $a['publicaciones_evento_pyad']);
    eq('Publicación de evento nueva: por_origen.evento +1', $b['por_origen']['evento'] + 1, $a['por_origen']['evento']);
    $y2031 = array_values(array_filter($a['por_anio'], fn($y) => $y['anio'] === 2031))[0] ?? null;
    eq('por_anio incluye 2031 con evento=1 y total=1', [1, 1], [$y2031['evento'] ?? null, $y2031['total'] ?? null]);
    eq('El año nuevo queda al final (orden ascendente)', 2031, end($a['por_anio'])['anio'] ?? null);

    $r = $c->a('PUT', "/api/publicaciones/{$pubId}", $base + ['origen' => 'revista_pyad']);
    eq('PUT con origen=revista_pyad: 200', 200, $r['status']);
    $a = $get();
    eq('Cambio de origen: evento vuelve y revista_pyad +1', [$b['por_origen']['evento'], $b['por_origen']['revista_pyad'] + 1], [$a['por_origen']['evento'], $a['por_origen']['revista_pyad']]);
    eq('El cambio de origen no altera el total evento+PYAD', $b['publicaciones_evento_pyad'] + 1, $a['publicaciones_evento_pyad']);
    $r = $c->a('PUT', "/api/publicaciones/{$pubId}", $base + ['titulo' => 'Pub de prueba editada']);
    eq('PUT sin origen conserva el origen y el evento', ['revista_pyad', $evId], [$r['json']['data']['origen'] ?? null, isset($r['json']['data']['evento_id']) ? (int)$r['json']['data']['evento_id'] : null]);
    $r = $c->a('PUT', "/api/publicaciones/{$pubId}", $base + ['evento_id' => null]);
    ok('PUT con evento_id null desliga el evento', array_key_exists('evento_id', $r['json']['data'] ?? []) && $r['json']['data']['evento_id'] === null, snippet($r));
    $r = $c->a('PUT', "/api/publicaciones/{$pubId}", $base + ['origen' => 'inventado']);
    eq('Origen inválido se ignora y conserva el actual', 'revista_pyad', $r['json']['data']['origen'] ?? null);

    $r = $c->a('PUT', "/api/publicaciones/{$pubId}", $base + ['estado' => 'borrador']);
    $a = $get();
    eq('Un borrador no cuenta en publicaciones_evento_pyad', $b['publicaciones_evento_pyad'], $a['publicaciones_evento_pyad']);
    $c->a('DELETE', "/api/publicaciones/{$pubId}");
    $a = $get();
    eq('Tras eliminar, por_origen vuelve al inicio', $b['por_origen'], $a['por_origen']);

    // Límite de 20 docentes en el ranking
    $ids = [];
    for ($i = 0; $i < 22; $i++) {
        $x = arr($c->a('POST', '/api/investigadores', ['nombre_completo' => sprintf('Docente Ranking %02d', $i), 'correo' => 'ranking' . $i . '.' . bin2hex(random_bytes(2)) . '@prueba.mx', 'afiliacion' => 'Pruebas', 'linea_investigacion' => 'Pruebas']));
        $ids[] = (int)($x['id'] ?? 0);
        $c->a('POST', '/api/eje3/proyectos', ['titulo' => 'Proyecto ranking ' . $i, 'investigador_principal_id' => end($ids), 'tipo' => 'investigacion']);
    }
    $a = $get();
    eq('produccion_docentes se limita a 20 filas', 20, count($a['produccion_docentes']));
    $tot = array_column($a['produccion_docentes'], 'total'); $stt = $tot; rsort($stt);
    ok('Con más de 20 candidatos sigue ordenado por total descendente', $tot === $stt);
    foreach ($ids as $id) {
        foreach ($c->rows("SELECT id FROM proyectos WHERE investigador_principal_id = :i", [':i' => $id]) as $row) { $c->a('DELETE', '/api/eje3/proyectos/' . $row['id']); }
        $c->a('DELETE', "/api/investigadores/{$id}");
    }
}

// ===========================================================================
// SUITE: DIFUSIÓN (público)
// ===========================================================================
function suiteDissemination(Ctx $c): void {
    section('Eje 3 · Difusión (público)');

    $r = $c->p('GET', '/api/eje3/difusion');
    eq('GET /api/eje3/difusion sin token: 200', 200, $r['status']);
    $d = arr($r);
    ok('Trae semilleros, congreso, otros_eventos y proximos', !array_diff(['semilleros', 'congreso', 'otros_eventos', 'proximos'], array_keys($d)));
    $hiddenIds = array_map('intval', array_column($c->rows("SELECT id FROM eventos_investigacion WHERE publico = 0"), 'id'));
    $all = array_merge($d['semilleros'], $d['congreso'], $d['otros_eventos'], $d['proximos']);
    ok('Ningún evento no público aparece en difusión', !array_intersect($hiddenIds, array_map('intval', array_column($all, 'id'))));
    ok('semilleros: solo eventos tipo semilleros con proyectos[]', $d['semilleros'] && count(array_filter($d['semilleros'], fn($e) => $e['tipo'] !== 'semilleros' || !is_array($e['proyectos'] ?? null))) === 0);
    ok('congreso: solo eventos tipo congreso con totales', $d['congreso'] && count(array_filter($d['congreso'], fn($e) => $e['tipo'] !== 'congreso' || !isset($e['total_proyectos'], $e['total_publicaciones']))) === 0);
    ok('otros_eventos: ni semilleros ni congreso (incluye revista PYAD)', $d['otros_eventos'] && count(array_filter($d['otros_eventos'], fn($e) => in_array($e['tipo'], ['semilleros', 'congreso'], true))) === 0);
    eq('Los eventos públicos quedan repartidos sin perder ninguno', (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE publico = 1"), count($d['semilleros']) + count($d['congreso']) + count($d['otros_eventos']));
    $proj = null;
    foreach ($d['semilleros'] as $e) { if (!empty($e['proyectos'])) { $proj = $e['proyectos'][0]; break; } }
    ok('Proyecto público trae {id, codigo, titulo, investigador_principal_nombre, apartados}', $proj && !array_diff(['id', 'codigo', 'titulo', 'investigador_principal_nombre', 'apartados'], array_keys($proj)));
    ok('Los apartados públicos traen {apartado, contenido}', $proj && !array_diff(['apartado', 'contenido'], array_keys($proj['apartados'][0] ?? [])));
    $ev = $d['semilleros'][0];
    eq('El número de proyectos de un evento coincide con SQL (solo aprobados)', (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE evento_id = :e AND registro_estado = 'aprobado'", [':e' => $ev['id']]), count($ev['proyectos']));
    eq('total_proyectos del evento coincide con la lista', count($ev['proyectos']), $ev['total_proyectos']);

    // Próximos eventos: máximo 5, ascendentes, desde hoy
    $today = date('Y-m-d');
    $p = $d['proximos'];
    ok('proximos: máximo 5, públicos y con fecha_inicio >= hoy', count($p) <= 5 && count(array_filter($p, fn($e) => (int)$e['publico'] !== 1 || $e['fecha_inicio'] < $today)) === 0);
    $f = array_column($p, 'fecha_inicio'); $sf = $f; sort($sf);
    ok('proximos en orden ascendente por fecha', $f === $sf);
    $created = [];
    for ($i = 1; $i <= 6; $i++) {
        $created[] = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => "Futuro {$i}", 'tipo' => 'otro', 'fecha_inicio' => sprintf('2090-0%d-10', $i)]))['id'] ?? 0;
    }
    $oculto = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => 'Futuro oculto', 'tipo' => 'otro', 'fecha_inicio' => '2089-01-01', 'publico' => 0]));
    $created[] = $oculto['id'] ?? 0;
    $past = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => 'Pasado', 'tipo' => 'otro', 'fecha_inicio' => '2000-01-01']));
    $created[] = $past['id'] ?? 0;
    $p = arr($c->p('GET', '/api/eje3/difusion'))['proximos'];
    eq('proximos limita a 5 aunque haya más', 5, count($p));
    $f = array_column($p, 'fecha_inicio'); $sf = $f; sort($sf);
    ok('proximos sigue en orden ascendente por fecha', $f === $sf);
    ok('proximos: excluye eventos no públicos y pasados', !in_array($oculto['id'], array_column($p, 'id'), true) && !in_array($past['id'], array_column($p, 'id'), true));

    // Detalle de evento público
    $pubEv = (int)$ev['id'];
    $r = $c->p('GET', "/api/eje3/difusion/eventos/{$pubEv}");
    eq('GET /api/eje3/difusion/eventos/:id público: 200', 200, $r['status']);
    $det = arr($r);
    ok('Detalle trae proyectos[] y publicaciones[]', is_array($det['proyectos'] ?? null) && is_array($det['publicaciones'] ?? null));
    eq('Detalle: id y nombre del evento', [$pubEv, $ev['nombre']], [$det['id'] ?? null, $det['nombre'] ?? null]);
    $withPubs = $c->rows("SELECT evento_id FROM publicaciones WHERE evento_id IS NOT NULL AND estado='publicado' AND evento_id IN (SELECT id FROM eventos_investigacion WHERE publico = 1) LIMIT 1")[0]['evento_id'] ?? null;
    if ($withPubs) {
        $det = arr($c->p('GET', "/api/eje3/difusion/eventos/{$withPubs}"));
        ok('Publicaciones ligadas: {id, titulo, autores, anio}', !array_diff(['id', 'titulo', 'autores', 'anio'], array_keys($det['publicaciones'][0] ?? [])));
        eq('Número de publicaciones ligadas = SQL (publicadas)', (int)$c->scalar("SELECT COUNT(*) FROM publicaciones WHERE evento_id = :e AND estado='publicado'", [':e' => $withPubs]), count($det['publicaciones']));
    }
    $hid = $hiddenIds[0] ?? ($oculto['id'] ?? 0);
    eq('Detalle de evento no público: 404', 404, $c->p('GET', "/api/eje3/difusion/eventos/{$hid}")['status']);
    eq('Detalle de evento inexistente: 404', 404, $c->p('GET', '/api/eje3/difusion/eventos/999999')['status']);

    foreach ($created as $id) { $c->a('DELETE', "/api/eje3/eventos/{$id}"); }
}

// ===========================================================================
// SUITE: MIGRACIÓN / ESQUEMA
// ===========================================================================
function suiteSchema(Ctx $c): void {
    section('Esquema y migración');
    foreach (['eventos_investigacion', 'proyecto_apartados', 'participantes_evento', 'retribucion_social', 'actividades_egresados', 'sesiones'] as $t) {
        ok("Existe la tabla {$t}", (int)$c->scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = :n", [':n' => $t]) === 1);
    }
    $cols = fn(string $t) => array_column($c->rows("PRAGMA table_info({$t})"), 'name');
    ok('investigadores: snii_nivel y snii_elegible', !array_diff(['snii_nivel', 'snii_elegible'], $cols('investigadores')));
    ok('proyectos: tipo, evento_id y articulado_civ', !array_diff(['tipo', 'evento_id', 'articulado_civ'], $cols('proyectos')));
    ok('publicaciones: origen y evento_id', !array_diff(['origen', 'evento_id'], $cols('publicaciones')));
    ok('sesiones: token_hash es UNIQUE', (int)$c->scalar("SELECT COUNT(*) FROM sqlite_master WHERE tbl_name='sesiones' AND sql LIKE '%token_hash TEXT NOT NULL UNIQUE%'") === 1);
    // Idempotencia: las peticiones repetidas no duplican la semilla
    $n1 = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion") + (int)$c->scalar("SELECT COUNT(*) FROM participantes_evento");
    for ($i = 0; $i < 3; $i++) { $c->p('GET', '/api'); }
    $n2 = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion") + (int)$c->scalar("SELECT COUNT(*) FROM participantes_evento");
    eq('La inicialización repetida no duplica la semilla', $n1, $n2);
    eq('PRAGMA user_version = versión de esquema actual (SqliteInitializer::SCHEMA_VERSION)', 3, (int)$c->scalar("PRAGMA user_version"));
    eq('La BD queda en modo WAL (lecturas y escrituras no se bloquean entre sí)', 'wal', strtolower((string)$c->scalar("PRAGMA journal_mode")));

    // REGRESIÓN DE RENDIMIENTO: antes cada petición ejecutaba DDL de escritura y se quedaba
    // esperando (hasta 30 s) si otra conexión mantenía una lectura o escritura abierta.
    $c->pdo->exec('BEGIN');
    $c->pdo->query('SELECT COUNT(*) FROM publicaciones')->fetchColumn();
    $t0 = microtime(true);
    $r = $c->p('GET', '/api/publicaciones');
    $dt = microtime(true) - $t0;
    $c->pdo->exec('COMMIT');
    ok('Con otra conexión leyendo, una petición NO se bloquea (< 2 s)', $r['status'] === 200 && $dt < 2.0, sprintf('status %d en %.2f s', $r['status'], $dt));

    $c->pdo->exec('BEGIN IMMEDIATE');
    $t0 = microtime(true);
    $r = $c->p('GET', '/api/eje3/difusion');
    $dt = microtime(true) - $t0;
    $c->pdo->exec('COMMIT');
    ok('Con otra conexión escribiendo, las lecturas públicas NO se bloquean (< 2 s)', $r['status'] === 200 && $dt < 2.0, sprintf('status %d en %.2f s', $r['status'], $dt));
    // Una BD vaciada de eventos NO se vuelve a sembrar (no resucita datos borrados)
    $evCount = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion");
    ok('Semilla de eventos presente solo una vez', $evCount >= 4 && $evCount < 20, "eventos: {$evCount}");
}

// ===========================================================================
// SUITE: AUDITORÍA DE SEGURIDAD (correcciones de SECURITY_AUDIT_EJE3.md)
// ===========================================================================
function suiteAudit(Ctx $c): void {
    section('Auditoría de seguridad: correcciones');
    $inv = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $tag = 'AUD' . bin2hex(random_bytes(3));

    // --- SEC-001: los proyectos del Eje 3 no se filtran por los endpoints públicos clásicos ---
    $evPriv = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => "Evento privado {$tag}", 'tipo' => 'semilleros', 'publico' => 0]));
    $evPub = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => "Evento publico {$tag}", 'tipo' => 'semilleros', 'publico' => 1]));
    $mk = fn(string $titulo, string $tipo, ?int $ev) => arr($c->a('POST', '/api/eje3/proyectos', ['titulo' => $titulo, 'investigador_principal_id' => $inv, 'tipo' => $tipo, 'evento_id' => $ev, 'presupuesto' => 777]));
    $pSem = $mk("Semillero {$tag}", 'semillero', (int)$evPub['id']);
    $pTit = $mk("Titulacion {$tag}", 'titulacion', null);
    $pInvPriv = $mk("Investigacion evento privado {$tag}", 'investigacion', (int)$evPriv['id']);
    $pInv = $mk("Investigacion normal {$tag}", 'investigacion', null);
    ok('Se crearon los proyectos de prueba', $pSem && $pTit && $pInvPriv && $pInv);

    $titles = fn(array $r) => array_column(arr($r), 'titulo');
    $anon = $titles($c->p('GET', '/api/proyectos?search=' . $tag));
    ok('GET /api/proyectos anónimo: sí muestra el proyecto de investigación normal', in_array("Investigacion normal {$tag}", $anon, true), json_encode($anon));
    ok('GET /api/proyectos anónimo: oculta semillero, titulación y proyecto de evento no público',
        !array_intersect(["Semillero {$tag}", "Titulacion {$tag}", "Investigacion evento privado {$tag}"], $anon), json_encode($anon));
    $adm = $titles($c->a('GET', '/api/proyectos?search=' . $tag));
    eq('GET /api/proyectos como admin: ve los 4 proyectos', 4, count($adm));
    eq('GET /api/proyectos/:id anónimo de un semillero: 404', 404, $c->p('GET', '/api/proyectos/' . $pSem['id'])['status']);
    eq('GET /api/proyectos/:id anónimo de titulación: 404', 404, $c->p('GET', '/api/proyectos/' . $pTit['id'])['status']);
    eq('GET /api/proyectos/:id anónimo de proyecto en evento no público: 404', 404, $c->p('GET', '/api/proyectos/' . $pInvPriv['id'])['status']);
    eq('GET /api/proyectos/:id anónimo de investigación normal: 200', 200, $c->p('GET', '/api/proyectos/' . $pInv['id'])['status']);
    eq('GET /api/proyectos/:id como admin de un semillero: 200', 200, $c->a('GET', '/api/proyectos/' . $pSem['id'])['status']);
    $r = $c->p('GET', '/api/difusion/buscar?q=' . urlencode($tag));
    $found = array_column($r['json']['data']['proyectos'] ?? [], 'titulo');
    ok('Búsqueda pública: solo encuentra el proyecto de investigación normal', $found === ["Investigacion normal {$tag}"], json_encode($found));
    $r = $c->p('GET', '/api/difusion/perfil/' . $inv);
    $perfil = array_column($r['json']['data']['proyectos'] ?? [], 'titulo');
    ok('Perfil público: no lista semilleros, titulación ni proyectos de eventos no públicos', !preg_grep('/' . $tag . '/', array_diff($perfil, ["Investigacion normal {$tag}"])), json_encode($perfil));
    ok('Perfil público: sí lista el proyecto de investigación normal', in_array("Investigacion normal {$tag}", $perfil, true));
    $pub = arr($c->p('GET', '/api/eje3/difusion/eventos/' . $evPub['id']));
    ok('Difusión del evento público sigue mostrando su semillero', in_array("Semillero {$tag}", array_column($pub['proyectos'] ?? [], 'titulo'), true));

    // --- SEC-002: la marca interna snii_elegible no es pública ---
    $r = $c->p('GET', '/api/investigadores');
    ok('GET /api/investigadores anónimo: sin snii_elegible', !preg_match('/snii_elegible/', $r['body']));
    ok('GET /api/investigadores anónimo: conserva snii_nivel y datos previos', isset(arr($r)[0]['snii_nivel']) || array_key_exists('snii_nivel', arr($r)[0] ?? []), snippet($r));
    ok('GET /api/investigadores/:id anónimo: sin snii_elegible', !preg_match('/snii_elegible/', $c->p('GET', "/api/investigadores/{$inv}")['body']));
    ok('GET /api/investigadores como admin: incluye snii_elegible', array_key_exists('snii_elegible', arr($c->a('GET', '/api/investigadores'))[0] ?? []));
    ok('GET /api/investigadores/:id como admin: incluye snii_elegible', array_key_exists('snii_elegible', arr($c->a('GET', "/api/investigadores/{$inv}"))));

    // --- SEC-003: parámetros de consulta en forma de arreglo no producen 500 ni avisos ---
    $bad = [];
    foreach (['/api/eje3/eventos?search[]=x', '/api/eje3/eventos?tipo[]=x&estado[a]=b', '/api/investigadores?search[]=x', '/api/proyectos?search[]=x&estado[]=x'] as $path) {
        $r = $c->p('GET', $path);
        if ($r['status'] !== 200) { $bad[] = "{$path} => {$r['status']}"; }
    }
    foreach (['/api/eje3/docentes?search[]=x', '/api/eje3/docentes?snii[]=x', '/api/eje3/participantes?rol[]=x&search[]=y', '/api/eje3/retribucion-social?programa[]=x',
              '/api/eje3/egresados?tipo[]=x', '/api/eje3/proyectos?search[]=x&tipo[]=x&evento_id[]=1'] as $path) {
        $r = $c->a('GET', $path);
        if ($r['status'] !== 200) { $bad[] = "{$path} => {$r['status']}"; }
    }
    ok('Parámetros ?campo[]= no provocan 500 en listados', !$bad, implode('; ', $bad));
    $log = @file_get_contents($c->tmp . '/server.log') ?: '';
    ok('El log no registra "Array to string conversion"', strpos($log, 'Array to string conversion') === false);

    // --- SEC-004: topes de tamaño y rango en los campos del Eje 3 ---
    $rs = ['programa' => 'MGT', 'tipo_participante' => 'estudiante', 'nombre_participante' => "Tope {$tag}", 'actividad' => 'Prueba'];
    eq('horas = 1e30: 400', 400, $c->a('POST', '/api/eje3/retribucion-social', $rs + ['horas' => 1e30])['status']);
    eq('horas > INT (3 000 000 000): 400', 400, $c->a('POST', '/api/eje3/retribucion-social', $rs + ['horas' => 3000000000])['status']);
    $r = $c->a('POST', '/api/eje3/retribucion-social', $rs + ['horas' => 120]);
    eq('horas razonables (120): 201', 201, $r['status']);
    if (!empty($r['json']['data']['id'])) { $c->a('DELETE', '/api/eje3/retribucion-social/' . $r['json']['data']['id']); }
    $pr = ['titulo' => "Tope {$tag}", 'investigador_principal_id' => $inv, 'tipo' => 'investigacion'];
    eq('presupuesto = "1e999" (infinito): 400', 400, $c->a('POST', '/api/eje3/proyectos', $pr + ['presupuesto' => '1e999'])['status']);
    eq('presupuesto = 1e13 (fuera de DECIMAL(14,2)): 400', 400, $c->a('POST', '/api/eje3/proyectos', $pr + ['presupuesto' => 1e13])['status']);
    $r = $c->a('POST', '/api/eje3/proyectos', $pr + ['presupuesto' => 1250000.5]);
    eq('presupuesto razonable: 201', 201, $r['status']);
    if (!empty($r['json']['data']['id'])) { $c->a('DELETE', '/api/eje3/proyectos/' . $r['json']['data']['id']); }
    $big = str_repeat('a', 65536);
    eq('Evento con descripción > 65 535 bytes: 400', 400, $c->a('POST', '/api/eje3/eventos', ['nombre' => "Grande {$tag}", 'tipo' => 'otro', 'descripcion' => $big])['status']);
    eq('Apartado con contenido > 65 535 bytes: 400', 400, $c->a('POST', '/api/eje3/proyectos', $pr + ['apartados' => [['apartado' => 'A', 'contenido' => $big]]])['status']);
    $many = array_fill(0, 101, ['apartado' => 'A', 'contenido' => 'x']);
    eq('Más de 100 apartados: 400', 400, $c->a('POST', '/api/eje3/proyectos', $pr + ['apartados' => $many])['status']);
    eq('Apartado con título/contenido en forma de arreglo: 400', 400, $c->a('POST', '/api/eje3/proyectos', $pr + ['apartados' => [['apartado' => ['x'], 'contenido' => ['y']]]])['status']);
    $r = $c->a('POST', '/api/eje3/proyectos', $pr + ['apartados' => [['apartado' => 'A', 'contenido' => str_repeat('b', 60000)]]]);
    eq('Apartado con contenido grande pero válido (60 000 bytes): 201', 201, $r['status']);
    if (!empty($r['json']['data']['id'])) { $c->a('DELETE', '/api/eje3/proyectos/' . $r['json']['data']['id']); }
    eq('No quedaron proyectos de tope en la BD', 0, (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE titulo = :t", [':t' => "Tope {$tag}"]));

    // Limpieza
    foreach ([$pSem, $pTit, $pInvPriv, $pInv] as $p) { if (!empty($p['id'])) { $c->a('DELETE', '/api/eje3/proyectos/' . $p['id']); } }
    foreach ([$evPriv, $evPub] as $e) { if (!empty($e['id'])) { $c->a('DELETE', '/api/eje3/eventos/' . $e['id']); } }
}

// ===========================================================================
// ROL DOCENTE · utilidades
// ===========================================================================
/** Crea un docente (ficha) y su cuenta desde la API de admin. */
function mkTeacher(Ctx $c, string $tag, ?string $correo = null): array {
    $inv = arr($c->a('POST', '/api/investigadores', ['nombre_completo' => "Docente {$tag}", 'correo' => strtolower("doc.{$tag}@prueba.mx"),
        'afiliacion' => 'Facultad de Pruebas', 'linea_investigacion' => 'Pruebas', 'categoria' => 'Profesor de prueba']));
    $body = ['investigador_id' => $inv['id'] ?? 0];
    if ($correo !== null) { $body['correo'] = $correo; }
    $r = $c->a('POST', '/api/eje3/usuarios-docentes', $body);
    $row = arr($r);
    return ['inv' => (int)($inv['id'] ?? 0), 'uid' => (int)($row['id'] ?? 0), 'correo' => (string)($row['correo'] ?? ''),
        'temp' => (string)($row['password_temporal'] ?? ''), 'row' => $row, 'status' => $r['status'], 'pass' => 'Docente-Clave-1'];
}

/** Inicia sesión con la temporal y cambia la contraseña: devuelve un token SIN el bloqueo de contraseña temporal. */
function teacherToken(Ctx $c, array &$t, string $newPass = 'Docente-Clave-1'): string {
    $r = $c->login($t['correo'], $t['temp']);
    $token = (string)($r['json']['data']['token'] ?? '');
    $c->t('POST', '/api/auth/cambiar-password', $token, ['actual' => $t['temp'], 'nueva' => $newPass]);
    $t['pass'] = $newPass;
    return $token;
}

/** Proyecto mínimo y completo para enviar a revisión (los extras reemplazan a los valores base). */
function projBody(string $titulo, string $tipo = 'investigacion', array $extra = []): array {
    return array_merge(['titulo' => $titulo, 'tipo' => $tipo, 'resumen' => 'Resumen de prueba del proyecto.', 'linea_investigacion' => 'Línea de prueba'], $extra);
}

/** Un 409 debe traer un mensaje legible en español (el código va solo en errors.codigo). */
function humanConflict(array $r): bool {
    $m = (string)($r['json']['message'] ?? '');
    $code = (string)($r['json']['errors']['codigo'][0] ?? '');
    return $r['status'] === 409 && $code !== '' && $m !== $code && strpos($m, '_') === false && strpos($m, ' ') !== false && mb_strlen($m) > 15;
}

/** Valor de una clave distinguiendo "ausente" de null (con ?? un null se confunde con ausente). */
function g($row, string $key) {
    return is_array($row) && array_key_exists($key, $row) ? $row[$key] : '<<ausente>>';
}

/** Rutas [A] declaradas en public/index.php (comentario `// [A]`), con :id sustituido por 1. */
function adminRoutesFromIndex(string $root): array {
    $routes = [];
    foreach (file($root . '/public/index.php') as $line) {
        if (preg_match("#\\\$router->(get|post|put|delete)\\('([^']+)'.*//\\s*\\[A\\]#", $line, $m)) {
            $routes[] = [strtoupper($m[1]), preg_replace('/:\w+/', '1', $m[2])];
        }
    }
    return $routes;
}

// ===========================================================================
// SUITE: ROL DOCENTE · ESQUEMA, SEMILLA DEMO Y ARCHIVOS SQL
// ===========================================================================
function suiteDocenteSchema(Ctx $c, string $root): void {
    section('Rol docente · esquema, semilla demo y archivos SQL');

    $cols = fn(string $t) => array_column($c->rows("PRAGMA table_info({$t})"), null, 'name');
    $u = $cols('usuarios');
    $p = $cols('proyectos');
    ok('usuarios: investigador_id y debe_cambiar_password', isset($u['investigador_id'], $u['debe_cambiar_password']));
    eq('usuarios.debe_cambiar_password: NOT NULL DEFAULT 0', [1, '0'], [(int)($u['debe_cambiar_password']['notnull'] ?? 0), $u['debe_cambiar_password']['dflt_value'] ?? null]);
    ok('proyectos: registro_estado, comentario_revision, enviado_en, revisado_en, revisado_por, creado_por_usuario_id',
        !array_diff(['registro_estado', 'comentario_revision', 'enviado_en', 'revisado_en', 'revisado_por', 'creado_por_usuario_id'], array_keys($p)));
    eq("proyectos.registro_estado: NOT NULL DEFAULT 'aprobado'", [1, "'aprobado'"], [(int)($p['registro_estado']['notnull'] ?? 0), $p['registro_estado']['dflt_value'] ?? null]);
    foreach (['idx_proyecto_registro', 'idx_proyecto_investigador', 'idx_usuario_investigador', 'uq_usuario_investigador'] as $ix) {
        ok("Existe el índice {$ix}", (int)$c->scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name = :n", [':n' => $ix]) === 1);
    }
    ok('uq_usuario_investigador es UNIQUE y parcial (WHERE investigador_id IS NOT NULL)',
        (bool)preg_match('/UNIQUE INDEX.*WHERE\s+investigador_id IS NOT NULL/is', (string)$c->scalar("SELECT sql FROM sqlite_master WHERE name = 'uq_usuario_investigador'")));

    // Unicidad: una sola cuenta por investigador (pero varias sin ficha)
    $h = password_hash('x-no-se-usa-1', PASSWORD_BCRYPT, ['cost' => 4]);
    $first = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $threw = false;
    try {
        $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, investigador_id) VALUES ('Dup', 'dup1@test.mx', :h, 'investigador', :i)", [':h' => $h, ':i' => $first]);
    } catch (Throwable $e) { $threw = true; }
    ok('Dos cuentas con el mismo investigador_id: la BD lo rechaza (UNIQUE parcial)', $threw);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ('NullA', 'nulla@test.mx', :h, 'investigador')", [':h' => $h]);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ('NullB', 'nullb@test.mx', :h, 'investigador')", [':h' => $h]);
    ok('Varias cuentas con investigador_id NULL sí se permiten', (int)$c->scalar("SELECT COUNT(*) FROM usuarios WHERE correo IN ('nulla@test.mx','nullb@test.mx')") === 2);
    $c->exec("DELETE FROM usuarios WHERE correo IN ('nulla@test.mx','nullb@test.mx')");

    // Semilla demo: cuenta investigador@buap.mx ligada al primer docente, con un proyecto por estado
    $demo = $c->rows("SELECT id, rol, investigador_id, debe_cambiar_password, activo FROM usuarios WHERE correo = 'investigador@buap.mx'")[0] ?? null;
    ok('Existe la cuenta demo investigador@buap.mx', $demo !== null);
    eq('Cuenta demo: rol investigador, ligada al PRIMER docente (id menor), sin cambio obligatorio y activa',
        ['investigador', $first, 0, 1], [$demo['rol'] ?? null, (int)($demo['investigador_id'] ?? 0), (int)($demo['debe_cambiar_password'] ?? -1), (int)($demo['activo'] ?? -1)]);
    $states = $c->rows("SELECT registro_estado, COUNT(*) n FROM proyectos WHERE creado_por_usuario_id = :u AND investigador_principal_id = :i GROUP BY registro_estado ORDER BY registro_estado",
        [':u' => $demo['id'] ?? 0, ':i' => $first]);
    eq('Semilla demo: exactamente un proyecto en cada estado (aprobado, borrador, devuelto, enviado)',
        ['aprobado' => 1, 'borrador' => 1, 'devuelto' => 1, 'enviado' => 1], array_column($states, 'n', 'registro_estado'));
    $dev = $c->rows("SELECT comentario_revision, revisado_en, revisado_por FROM proyectos WHERE creado_por_usuario_id = :u AND registro_estado = 'devuelto'", [':u' => $demo['id'] ?? 0])[0] ?? [];
    ok('Demo devuelto: trae comentario del revisor, fecha y revisor', !empty($dev['comentario_revision']) && !empty($dev['revisado_en']) && !empty($dev['revisado_por']), json_encode($dev));
    $env = $c->rows("SELECT enviado_en, comentario_revision, evento_id FROM proyectos WHERE creado_por_usuario_id = :u AND registro_estado = 'enviado'", [':u' => $demo['id'] ?? 0])[0] ?? [];
    ok('Demo enviado: con fecha de envío, sin comentario y ligado a un evento público',
        !empty($env['enviado_en']) && empty($env['comentario_revision']) && (int)$c->scalar("SELECT publico FROM eventos_investigacion WHERE id = :e", [':e' => $env['evento_id'] ?? 0]) === 1);
    eq('Los proyectos que existían antes (sin creador) quedaron todos aprobados',
        0, (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE creado_por_usuario_id IS NULL AND registro_estado <> 'aprobado'"));
    ok('Cada proyecto demo es de tipo válido y con apartados salvo el borrador',
        (int)$c->scalar("SELECT COUNT(*) FROM proyectos p WHERE creado_por_usuario_id = :u AND registro_estado <> 'borrador' AND (SELECT COUNT(*) FROM proyecto_apartados a WHERE a.proyecto_id = p.id) = 0", [':u' => $demo['id'] ?? 0]) === 0);

    // Archivos SQL de MySQL: columnas nuevas sí, cuenta/proyectos demo del docente no
    $newCols = ['registro_estado', 'comentario_revision', 'enviado_en', 'revisado_en', 'revisado_por', 'creado_por_usuario_id', 'investigador_id', 'debe_cambiar_password'];
    foreach (['schema.sql', 'deploy_mysql.sql', 'seed.sql'] as $f) {
        $sql = (string)file_get_contents($root . '/src/Database/' . $f);
        // seed.sql solo inserta datos: lista las columnas con valor explícito (el resto toma su DEFAULT)
        $need = $f === 'seed.sql' ? ['registro_estado', 'investigador_id', 'debe_cambiar_password'] : $newCols;
        $missing = array_filter($need, fn($col) => strpos($sql, "`{$col}`") === false);
        ok("{$f} contiene las columnas nuevas del rol docente", !$missing, implode(',', $missing));
        $demoHits = array_filter(['INV-2026-901', 'SEM-2026-901', 'INV-2026-902', 'TIT-2026-901', 'Falta precisar los objetivos'], fn($needle) => strpos($sql, $needle) !== false);
        ok("{$f} NO incluye proyectos demo del docente", !$demoHits, implode(',', $demoHits));
        if (preg_match('/INSERT INTO `usuarios`[^;]*;/s', $sql, $m)) {
            ok("{$f}: los usuarios sembrados quedan SIN docente ligado (investigador_id NULL, sin cambio obligatorio)",
                preg_match_all("/, NULL, 0\\)/", $m[0]) === 2 && strpos($m[0], '`investigador_id`') !== false, substr($m[0], 0, 120));
        }
    }
    foreach (['schema.sql', 'deploy_mysql.sql'] as $f) {
        $sql = (string)file_get_contents($root . '/src/Database/' . $f);
        ok("{$f}: ENUM de registro_estado con los 4 estados y DEFAULT 'aprobado'",
            (bool)preg_match("/`registro_estado` ENUM\\('borrador', 'enviado', 'aprobado', 'devuelto'\\) NOT NULL DEFAULT 'aprobado'/", $sql));
        ok("{$f}: índices idx_proyecto_registro, idx_proyecto_investigador y UNIQUE de usuarios.investigador_id",
            strpos($sql, 'idx_proyecto_registro') !== false && strpos($sql, 'idx_proyecto_investigador') !== false && (bool)preg_match('/UNIQUE[^,\n]*`investigador_id`/', $sql));
        ok("{$f}: FK de usuarios.investigador_id a investigadores con ON DELETE SET NULL",
            (bool)preg_match('/FOREIGN KEY \(`investigador_id`\) REFERENCES `investigadores`\(`id`\) ON DELETE SET NULL/', $sql));
    }
    $mig = $root . '/src/Database/migrations/002_docentes.sql';
    ok('Existe migrations/002_docentes.sql', is_file($mig));
    $m = is_file($mig) ? (string)file_get_contents($mig) : '';
    ok('002_docentes.sql: sin DROP ni TRUNCATE ni DELETE (no destruye datos)', !preg_match('/\b(DROP\s+(TABLE|COLUMN|INDEX|DATABASE|FOREIGN)|TRUNCATE|DELETE\s+FROM)\b/i', $m));
    ok('002_docentes.sql: contiene todas las columnas nuevas', !array_filter($newCols, fn($col) => strpos($m, "`{$col}`") === false));
    ok('002_docentes.sql: cada ALTER va protegido con information_schema (idempotente)',
        substr_count($m, 'ALTER TABLE') > 0 && substr_count($m, 'information_schema') >= substr_count($m, 'ALTER TABLE'),
        'ALTER=' . substr_count($m, 'ALTER TABLE') . ' info=' . substr_count($m, 'information_schema'));
    ok('002_docentes.sql: no siembra cuenta ni proyectos demo', !preg_match('/INSERT\s+INTO/i', $m));
}

// ===========================================================================
// SUITE: ROL DOCENTE · MIGRACIÓN SQLITE v2 -> v3 (en proceso, con BD temporales)
// ===========================================================================
function suiteDocenteMigration(Ctx $c, string $root): void {
    section('Rol docente · migración SQLite (v2 -> v3) e idempotencia');
    require_once $root . '/src/Database/SqliteInitializer.php';
    $open = function (string $path): PDO {
        $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    };
    $one = fn(PDO $pdo, string $sql) => $pdo->query($sql)->fetchColumn();
    $snapshot = fn(PDO $pdo) => [
        (int)$one($pdo, "SELECT COUNT(*) FROM usuarios"), (int)$one($pdo, "SELECT COUNT(*) FROM proyectos"),
        (int)$one($pdo, "SELECT COUNT(*) FROM proyecto_apartados"), (int)$one($pdo, "SELECT COUNT(*) FROM eventos_investigacion"),
    ];

    // 1) BD nueva: queda en v3 con la semilla demo del docente
    $f1 = $c->tmp . '/mig-nueva.sqlite';
    $pdo = $open($f1);
    \App\Database\SqliteInitializer::initialize($pdo);
    eq('BD nueva: user_version = 3', 3, (int)$one($pdo, "PRAGMA user_version"));
    eq('BD nueva: cuenta demo ligada al primer docente', (int)$one($pdo, "SELECT MIN(id) FROM investigadores"),
        (int)$one($pdo, "SELECT investigador_id FROM usuarios WHERE correo = 'investigador@buap.mx'"));
    eq('BD nueva: 4 proyectos demo del docente (uno por estado)', 4, (int)$one($pdo, "SELECT COUNT(DISTINCT registro_estado) FROM proyectos WHERE creado_por_usuario_id IS NOT NULL"));
    eq('BD nueva: la semilla no marca como aprobado lo que no lo es (el resto de proyectos sí lo está)', 0,
        (int)$one($pdo, "SELECT COUNT(*) FROM proyectos WHERE creado_por_usuario_id IS NULL AND registro_estado <> 'aprobado'"));

    // 2) Idempotencia: forzar la migración otra vez NO duplica ni cambia nada
    $before = $snapshot($pdo);
    $pdo->exec("PRAGMA user_version = 2");
    \App\Database\SqliteInitializer::initialize($pdo);
    eq('Reinicializar (v2 forzada) no duplica usuarios, proyectos, apartados ni eventos', $before, $snapshot($pdo));
    eq('Tras reinicializar vuelve a v3', 3, (int)$one($pdo, "PRAGMA user_version"));
    $pdo->exec("PRAGMA user_version = 0");
    \App\Database\SqliteInitializer::initialize($pdo);
    eq('Reinicializar desde v0 tampoco duplica', $before, $snapshot($pdo));
    // Camino rápido: con v3 no se ejecuta ningún DDL ni escritura
    $tracer = $open($f1);
    $locker = $open($f1);
    $locker->exec('BEGIN IMMEDIATE');
    $t0 = microtime(true);
    \App\Database\SqliteInitializer::initialize($tracer);
    ok('Camino rápido (v3) no escribe: no espera a otra conexión que tiene el bloqueo de escritura', microtime(true) - $t0 < 1.0);
    $locker->exec('COMMIT');
    unset($tracer, $locker);

    // 3) Simulación de una BD v2 real: se quitan las columnas/índices nuevos y se añade un proyecto "viejo"
    $dropped = true;
    try {
        $pdo->exec("PRAGMA foreign_keys = OFF");
        $pdo->exec("DROP INDEX IF EXISTS uq_usuario_investigador");
        $pdo->exec("DROP INDEX IF EXISTS idx_usuario_investigador");
        $pdo->exec("DROP INDEX IF EXISTS idx_proyecto_registro");
        $pdo->exec("DROP INDEX IF EXISTS idx_proyecto_investigador");
        $pdo->exec("DELETE FROM proyectos WHERE creado_por_usuario_id IS NOT NULL");
        $pdo->exec("DELETE FROM proyecto_apartados WHERE proyecto_id NOT IN (SELECT id FROM proyectos)");
        foreach (['registro_estado', 'comentario_revision', 'enviado_en', 'revisado_en', 'revisado_por', 'creado_por_usuario_id'] as $col) {
            $pdo->exec("ALTER TABLE proyectos DROP COLUMN {$col}");
        }
        foreach (['investigador_id', 'debe_cambiar_password'] as $col) {
            $pdo->exec("ALTER TABLE usuarios DROP COLUMN {$col}");
        }
        $pdo->exec("PRAGMA foreign_keys = ON");
        $pdo->exec("PRAGMA user_version = 2");
    } catch (Throwable $e) {
        $dropped = false;
        echo "      (No se pudo simular v2 con DROP COLUMN: " . $e->getMessage() . ")\n";
    }
    ok('Se pudo reconstruir una BD en esquema v2 (sin columnas del rol docente)', $dropped);
    if ($dropped) {
        $pdo->exec("INSERT INTO proyectos (codigo, titulo, investigador_principal_id, fecha_inicio, linea_investigacion) VALUES ('LEGADO-001', 'Proyecto anterior a la migración', 1, '2024-01-01', 'x')");
        $legacy = (int)$one($pdo, "SELECT COUNT(*) FROM proyectos");
        \App\Database\SqliteInitializer::initialize($pdo);
        eq('v2 -> v3: user_version = 3', 3, (int)$one($pdo, "PRAGMA user_version"));
        eq("v2 -> v3: los proyectos existentes quedan 'aprobado'", 'aprobado', $one($pdo, "SELECT registro_estado FROM proyectos WHERE codigo = 'LEGADO-001'"));
        eq('v2 -> v3: ningún proyecto previo cambió de estado', 0, (int)$one($pdo, "SELECT COUNT(*) FROM proyectos WHERE codigo <> 'LEGADO-001' AND creado_por_usuario_id IS NULL AND registro_estado <> 'aprobado'"));
        eq('v2 -> v3: se sembraron exactamente los 4 proyectos demo (se conservan los anteriores)', $legacy + 4, (int)$one($pdo, "SELECT COUNT(*) FROM proyectos"));
        eq('v2 -> v3: cuenta demo ligada al primer docente, sin cambio obligatorio', [1, 0],
            [(int)$one($pdo, "SELECT investigador_id FROM usuarios WHERE correo = 'investigador@buap.mx'"), (int)$one($pdo, "SELECT debe_cambiar_password FROM usuarios WHERE correo = 'investigador@buap.mx'")]);
        eq('v2 -> v3: el índice único parcial quedó creado', 1, (int)$one($pdo, "SELECT COUNT(*) FROM sqlite_master WHERE name = 'uq_usuario_investigador'"));
        $again = $snapshot($pdo);
        $pdo->exec("PRAGMA user_version = 2");
        \App\Database\SqliteInitializer::initialize($pdo);
        eq('v2 -> v3 repetida: idempotente', $again, $snapshot($pdo));
    }

    // 4) Sin la cuenta demo (BD v2 donde se borró) la semilla no inventa nada y no falla
    $pdo->exec("PRAGMA user_version = 2");
    $pdo->exec("DELETE FROM proyectos WHERE creado_por_usuario_id IS NOT NULL");
    $pdo->exec("DELETE FROM usuarios WHERE correo = 'investigador@buap.mx'");
    $threw = null;
    try { \App\Database\SqliteInitializer::initialize($pdo); } catch (Throwable $e) { $threw = $e->getMessage(); }
    ok('Sin la cuenta demo: la migración no falla', $threw === null, (string)$threw);
    eq('Sin la cuenta demo: no se siembra ningún proyecto demo ni se crea la cuenta', [0, 0],
        [(int)$one($pdo, "SELECT COUNT(*) FROM proyectos WHERE codigo IN ('INV-2026-901','SEM-2026-901','INV-2026-902','TIT-2026-901')"),
         (int)$one($pdo, "SELECT COUNT(*) FROM usuarios WHERE correo = 'investigador@buap.mx'")]);
    unset($pdo);
}

// ===========================================================================
// SUITE: ROL DOCENTE · AUTENTICACIÓN (login por rol, me, cambiar-password, gate)
// ===========================================================================
function suiteDocenteAuth(Ctx $c): void {
    section('Rol docente · login por rol, me y cambio de contraseña');
    $userKeys = ['id', 'nombre', 'correo', 'cargo', 'rol', 'investigador_id', 'debe_cambiar_password'];
    $first = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");

    // Login del administrador: misma respuesta de siempre + campos nuevos neutros
    $r = $c->login('admin@buap.mx', 'admin123');
    $u = $r['json']['data']['user'] ?? [];
    ok('Login admin: user con {id,nombre,correo,cargo,rol,investigador_id,debe_cambiar_password}', !array_diff($userKeys, array_keys($u)), json_encode($u));
    eq('Login admin: investigador_id null y debe_cambiar_password 0', [null, 0], [g($u, 'investigador_id'), g($u, 'debe_cambiar_password')]);
    $tAdmin = (string)($r['json']['data']['token'] ?? '');

    // Login del docente demo
    $r = $c->login('investigador@buap.mx', 'lector123');
    eq('Login del docente demo (rol investigador ligado a ficha): 200', 200, $r['status']);
    $u = $r['json']['data']['user'] ?? [];
    ok('Login docente: user con las 7 claves del contrato', !array_diff($userKeys, array_keys($u)), json_encode($u));
    eq('Login docente: rol investigador, investigador_id del primer docente y sin cambio obligatorio', ['investigador', $first, 0],
        [$u['rol'] ?? null, $u['investigador_id'] ?? null, $u['debe_cambiar_password'] ?? null]);
    $tDemo = (string)($r['json']['data']['token'] ?? '');
    ok('Login docente: token hex de 64 caracteres y sin hash en la respuesta', (bool)preg_match('/^[a-f0-9]{64}$/', $tDemo) && !preg_match('/password_hash|\$2y\$/', $r['body']));
    $ttl = strtotime((string)$c->scalar("SELECT expira_en FROM sesiones WHERE token_hash = :h", [':h' => hash('sha256', $tDemo)])) - time();
    ok('La sesión del docente también dura ~8 horas', $ttl > 7.9 * 3600 && $ttl <= 8 * 3600 + 5, "ttl={$ttl}");

    // me: admin y docente
    $r = $c->t('GET', '/api/auth/me', $tAdmin);
    eq('me (admin): 200 con las 7 claves', [200, []], [$r['status'], array_diff($userKeys, array_keys(arr($r)))]);
    $r = $c->t('GET', '/api/auth/me', $tDemo);
    eq('me (docente): 200', 200, $r['status']);
    eq('me (docente): investigador_id y debe_cambiar_password', [$first, 0], [arr($r)['investigador_id'] ?? null, arr($r)['debe_cambiar_password'] ?? null]);
    $lectorTok = $c->makeSession((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'lector@test.mx'"));
    eq('me con sesión de un lector: 401', 401, $c->t('GET', '/api/auth/me', $lectorTok)['status']);
    $sinFicha = $c->makeSession((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'sinficha@test.mx'"));
    eq('me con sesión de investigador sin ficha: 401', 401, $c->t('GET', '/api/auth/me', $sinFicha)['status']);
    eq('me sin token: 401', 401, $c->p('GET', '/api/auth/me')['status']);

    // Cuenta inactiva / bloqueo por 5 intentos, también para docentes
    $t1 = mkTeacher($c, 'Auth' . bin2hex(random_bytes(2)));
    eq('Se creó la cuenta del docente de prueba', 201, $t1['status']);
    $tok1 = teacherToken($c, $t1);
    $c->exec("UPDATE usuarios SET activo = 0 WHERE id = :u", [':u' => $t1['uid']]);
    eq('Docente inactivo: login 403', 403, $c->login($t1['correo'], $t1['pass'])['status']);
    eq('Docente inactivo: la sesión que tenía deja de servir (401) en /api/docente/resumen', 401, $c->t('GET', '/api/docente/resumen', $tok1)['status']);
    eq('Docente inactivo: me responde 401', 401, $c->t('GET', '/api/auth/me', $tok1)['status']);
    $c->exec("UPDATE usuarios SET activo = 1 WHERE id = :u", [':u' => $t1['uid']]);
    eq('Docente reactivado: su sesión vuelve a ser válida', 200, $c->t('GET', '/api/docente/resumen', $tok1)['status']);

    $codes = [];
    for ($i = 0; $i < 5; $i++) { $codes[] = $c->login($t1['correo'], 'incorrecta-' . $i)['status']; }
    eq('Docente: cinco fallos 401,401,401,401 y el quinto bloquea (403)', [401, 401, 401, 401, 403], $codes);
    eq('Docente bloqueado: ni la contraseña correcta entra (403)', 403, $c->login($t1['correo'], $t1['pass'])['status']);
    $c->exec("UPDATE usuarios SET bloqueado_hasta = NULL, intentos_fallidos = 0 WHERE id = :u", [':u' => $t1['uid']]);
    eq('Docente desbloqueado: vuelve a entrar', 200, $c->login($t1['correo'], $t1['pass'])['status']);
    $r1 = $c->login($t1['correo'], 'mala-clave-xyz');
    $r2 = $c->login('nadie.existe@prueba.mx', 'mala-clave-xyz');
    ok('Mensaje de credenciales incorrectas del docente no revela el rol ni la ficha', !preg_match('/docente|investigador|ficha/i', (string)($r1['json']['message'] ?? '')), snippet($r1));
    ok('Un 401 de login no incluye token', !isset($r1['json']['data']['token']) && !isset($r2['json']['data']['token']));

    // Gate de contraseña temporal
    $t2 = mkTeacher($c, 'Gate' . bin2hex(random_bytes(2)));
    $r = $c->login($t2['correo'], $t2['temp']);
    eq('Login con la contraseña temporal: 200', 200, $r['status']);
    eq('Login con temporal: debe_cambiar_password = 1', 1, $r['json']['data']['user']['debe_cambiar_password'] ?? null);
    $tg = (string)($r['json']['data']['token'] ?? '');
    $bad = [];
    foreach ([['GET', '/api/docente/resumen'], ['GET', '/api/docente/proyectos'], ['GET', '/api/docente/proyectos/1'], ['POST', '/api/docente/proyectos'],
              ['PUT', '/api/docente/proyectos/1'], ['DELETE', '/api/docente/proyectos/1'], ['POST', '/api/docente/proyectos/1/enviar']] as [$m, $path]) {
        $x = $c->t($m, $path, $tg, projBody('x'));
        if ($x['status'] !== 403 || ($x['json']['errors']['codigo'][0] ?? null) !== 'cambio_password_obligatorio') { $bad[] = "{$m} {$path} => {$x['status']}"; }
    }
    ok('Con contraseña temporal: TODAS las rutas /api/docente/* responden 403 cambio_password_obligatorio', !$bad, implode('; ', $bad));
    $x = $c->t('GET', '/api/docente/resumen', $tg);
    eq("Gate: errors es EXACTAMENTE {codigo: ['cambio_password_obligatorio']}", ['codigo' => ['cambio_password_obligatorio']], $x['json']['errors'] ?? null);
    eq('Gate: mensaje en español', 'Debes cambiar tu contraseña temporal antes de continuar.', $x['json']['message'] ?? null);
    $x = $c->t('GET', '/api/auth/me', $tg);
    eq('Con temporal: /api/auth/me SÍ responde (200) e informa debe_cambiar_password = 1', [200, 1], [$x['status'], arr($x)['debe_cambiar_password'] ?? null]);
    eq('Con temporal: /api/auth/cambiar-password es alcanzable (400 por cuerpo vacío, no 403)', 400, $c->t('POST', '/api/auth/cambiar-password', $tg, [])['status']);
    $t2b = $c->login($t2['correo'], $t2['temp']);
    $tgb = (string)($t2b['json']['data']['token'] ?? '');
    eq('Con temporal: /api/auth/logout SÍ responde (200) y cierra la sesión', 200, $c->t('POST', '/api/auth/logout', $tgb)['status']);
    eq('Tras el logout la sesión ya no sirve', 401, $c->t('GET', '/api/auth/me', $tgb)['status']);

    // cambiar-password: autenticación y reglas de validación
    eq('cambiar-password sin token: 401', 401, $c->p('POST', '/api/auth/cambiar-password', ['actual' => 'x', 'nueva' => 'y'])['status']);
    eq('cambiar-password con token inventado: 401', 401, $c->t('POST', '/api/auth/cambiar-password', bin2hex(random_bytes(32)), ['actual' => 'x', 'nueva' => 'yyyyyyyyyy'])['status']);
    eq('cambiar-password con sesión de lector: 403', 403, $c->t('POST', '/api/auth/cambiar-password', $lectorTok, ['actual' => 'lector123', 'nueva' => 'otra-clave-1'])['status']);
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, []);
    ok('Cuerpo vacío: 400 con errores en actual y nueva', $x['status'] === 400 && isset($x['json']['errors']['actual'], $x['json']['errors']['nueva']), snippet($x));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => $t2['temp'], 'nueva' => 'corta7!']);
    ok('Nueva de menos de 8 caracteres: 400 (errors.nueva)', $x['status'] === 400 && isset($x['json']['errors']['nueva']), snippet($x));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => $t2['temp'], 'nueva' => $t2['temp']]);
    ok('Nueva igual a la actual: 400 (errors.nueva)', $x['status'] === 400 && isset($x['json']['errors']['nueva']), snippet($x));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => $t2['temp'], 'nueva' => str_repeat('a', 73)]);
    ok('Nueva de más de 72 caracteres (límite de bcrypt): 400', $x['status'] === 400 && isset($x['json']['errors']['nueva']), snippet($x));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => ['x'], 'nueva' => ['y']]);
    ok('Campos en forma de arreglo: 400 (no 500)', $x['status'] === 400, snippet($x));
    eq('Las validaciones de formato NO cuentan como intento fallido', 0, (int)$c->scalar("SELECT intentos_fallidos FROM usuarios WHERE id = :u", [':u' => $t2['uid']]));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => 'no-es-la-clave', 'nueva' => 'Nueva-Clave-123']);
    ok('Contraseña actual incorrecta: 400 con errors.actual (no 401, para no cerrar la sesión del cliente)', $x['status'] === 400 && isset($x['json']['errors']['actual']), snippet($x));
    eq('Actual incorrecta cuenta como intento fallido', 1, (int)$c->scalar("SELECT intentos_fallidos FROM usuarios WHERE id = :u", [':u' => $t2['uid']]));
    eq('Tras fallar, el gate sigue activo (no se cambió nada)', 1, (int)$c->scalar("SELECT debe_cambiar_password FROM usuarios WHERE id = :u", [':u' => $t2['uid']]));

    // Cambio correcto: invalida las demás sesiones, conserva la actual, quita el gate y reinicia intentos
    $oldHash = (string)$c->scalar("SELECT password_hash FROM usuarios WHERE id = :u", [':u' => $t2['uid']]);
    $other = (string)($c->login($t2['correo'], $t2['temp'])['json']['data']['token'] ?? '');
    $other2 = (string)($c->login($t2['correo'], $t2['temp'])['json']['data']['token'] ?? '');
    eq('Hay varias sesiones abiertas antes del cambio', 3, (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE usuario_id = :u", [':u' => $t2['uid']]));
    $x = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => $t2['temp'], 'nueva' => 'Nueva-Clave-123']);
    eq('Cambio de contraseña correcto: 200', 200, $x['status']);
    ok('La respuesta del cambio no devuelve hashes ni la contraseña', !preg_match('/\$2y\$|password_hash|Nueva-Clave-123/', $x['body']), snippet($x));
    $row = $c->rows("SELECT password_hash, debe_cambiar_password, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE id = :u", [':u' => $t2['uid']])[0];
    ok('Se guarda un hash bcrypt NUEVO que verifica la nueva contraseña', $row['password_hash'] !== $oldHash && str_starts_with($row['password_hash'], '$2y$') && password_verify('Nueva-Clave-123', $row['password_hash']));
    eq('Se quita la marca de contraseña temporal y se reinician intentos/bloqueo', [0, 0, null], [(int)$row['debe_cambiar_password'], (int)$row['intentos_fallidos'], $row['bloqueado_hasta']]);
    eq('La sesión actual se conserva', 200, $c->t('GET', '/api/auth/me', $tg)['status']);
    eq('Las demás sesiones se invalidan (401)', [401, 401], [$c->t('GET', '/api/auth/me', $other)['status'], $c->t('GET', '/api/auth/me', $other2)['status']]);
    eq('Solo queda 1 sesión del usuario', 1, (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE usuario_id = :u", [':u' => $t2['uid']]));
    eq('Con la nueva contraseña: /api/docente/resumen ya responde 200 (gate quitado)', 200, $c->t('GET', '/api/docente/resumen', $tg)['status']);
    eq('La contraseña temporal anterior ya no inicia sesión (401)', 401, $c->login($t2['correo'], $t2['temp'])['status']);
    $r = $c->login($t2['correo'], 'Nueva-Clave-123');
    eq('La nueva contraseña sí inicia sesión, sin cambio obligatorio', [200, 0], [$r['status'], $r['json']['data']['user']['debe_cambiar_password'] ?? null]);

    // Bloqueo por intentos fallidos al cambiar la contraseña (mismo bloqueo que el login)
    $codes = [];
    for ($i = 0; $i < 5; $i++) { $codes[] = $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => 'incorrecta-' . $i, 'nueva' => 'Otra-Clave-9999'])['status']; }
    eq('cambiar-password: cinco actuales incorrectas -> 400,400,400,400 y el quinto bloquea (403)', [400, 400, 400, 400, 403], $codes);
    ok('Tras el bloqueo la cuenta queda con bloqueado_hasta en el futuro', strtotime((string)$c->scalar("SELECT bloqueado_hasta FROM usuarios WHERE id = :u", [':u' => $t2['uid']])) > time());
    eq('Bloqueada: ni con la contraseña correcta se puede cambiar (403)', 403, $c->t('POST', '/api/auth/cambiar-password', $tg, ['actual' => 'Nueva-Clave-123', 'nueva' => 'Otra-Clave-9999'])['status']);
    eq('Bloqueada: el login también se rechaza (403)', 403, $c->login($t2['correo'], 'Nueva-Clave-123')['status']);

    // El administrador también puede cambiar su contraseña (cuenta aparte para no alterar la de las pruebas)
    $hA = password_hash('Admin-Prueba-1', PASSWORD_BCRYPT, ['cost' => 4]);
    $c->exec("INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo) VALUES ('Admin cambio', 'admincambio@test.mx', :h, 'administrador', 'x', 1)", [':h' => $hA]);
    $a1 = (string)($c->login('admincambio@test.mx', 'Admin-Prueba-1')['json']['data']['token'] ?? '');
    $a2 = (string)($c->login('admincambio@test.mx', 'Admin-Prueba-1')['json']['data']['token'] ?? '');
    eq('Admin: cambiar-password 200', 200, $c->t('POST', '/api/auth/cambiar-password', $a1, ['actual' => 'Admin-Prueba-1', 'nueva' => 'Admin-Nueva-22'])['status']);
    eq('Admin: su sesión actual sigue y la otra se invalida', [200, 401], [$c->t('GET', '/api/auth/me', $a1)['status'], $c->t('GET', '/api/auth/me', $a2)['status']]);
    eq('Admin: entra con la nueva contraseña', 200, $c->login('admincambio@test.mx', 'Admin-Nueva-22')['status']);
}

// ===========================================================================
// SUITE: ROL DOCENTE · MATRIZ DE PERMISOS
// ===========================================================================
function suiteDocentePermissions(Ctx $c, string $root): void {
    section('Rol docente · matriz de permisos (docente / admin / sin token / token inventado)');

    $t = mkTeacher($c, 'Perm' . bin2hex(random_bytes(2)));
    $tDoc = teacherToken($c, $t);
    $demo = (string)($c->login('investigador@buap.mx', 'lector123')['json']['data']['token'] ?? '');
    $lector = $c->makeSession((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'lector@test.mx'"));
    $sinFicha = $c->makeSession((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'sinficha@test.mx'"));
    $fake = bin2hex(random_bytes(32));

    // Todas las rutas [A] declaradas en index.php + las clásicas que exigen admin
    $adminRoutes = adminRoutesFromIndex($root);
    ok('Se detectaron las rutas [A] de index.php (>= 34)', count($adminRoutes) >= 34, 'n=' . count($adminRoutes));
    foreach ([['POST', '/api/proyectos'], ['PUT', '/api/proyectos/1'], ['DELETE', '/api/proyectos/1'], ['POST', '/api/produccion'], ['PUT', '/api/produccion/1'],
              ['DELETE', '/api/produccion/1'], ['POST', '/api/publicaciones'], ['PUT', '/api/publicaciones/1'], ['DELETE', '/api/publicaciones/1'], ['POST', '/api/investigadores'],
              ['PUT', '/api/investigadores/1'], ['DELETE', '/api/investigadores/1'], ['POST', '/api/categorias'], ['PUT', '/api/categorias/1'], ['DELETE', '/api/categorias/1'],
              ['GET', '/api/admin/stats'], ['POST', '/api/upload/pdf']] as $r) {
        $adminRoutes[] = $r;
    }
    $docenteRoutes = [['GET', '/api/docente/resumen'], ['GET', '/api/docente/proyectos'], ['GET', '/api/docente/proyectos/1'], ['POST', '/api/docente/proyectos'],
        ['PUT', '/api/docente/proyectos/1'], ['DELETE', '/api/docente/proyectos/1'], ['POST', '/api/docente/proyectos/1/enviar']];
    $body = fn(string $m) => in_array($m, ['POST', 'PUT'], true) ? ['titulo' => 'x', 'tipo' => 'investigacion', 'accion' => 'aprobar', 'investigador_id' => 1] : null;

    $matrix = function (string $label, ?string $token, array $routes, int $expected) use ($c, $body): void {
        $bad = [];
        foreach ($routes as [$m, $path]) {
            $x = http($m, $c->base . $path, $body($m), $token);
            if ($x['status'] !== $expected) { $bad[] = "{$m} {$path} => {$x['status']}"; }
        }
        ok("{$label}: {$expected} en las " . count($routes) . ' rutas', !$bad, implode('; ', array_slice($bad, 0, 8)));
    };

    $matrix('Token de docente en rutas de administrador', $tDoc, $adminRoutes, 403);
    $matrix('Docente DEMO (investigador@buap.mx) en rutas de administrador', $demo, $adminRoutes, 403);
    $matrix('Sesión de lector en rutas de administrador', $lector, $adminRoutes, 403);
    $matrix('Sesión de investigador sin ficha en rutas de administrador', $sinFicha, $adminRoutes, 403);
    $matrix('Token de administrador en rutas /api/docente/*', $c->admin, $docenteRoutes, 403);
    $matrix('Sesión de lector en rutas /api/docente/*', $lector, $docenteRoutes, 403);
    $matrix('Investigador sin ficha en rutas /api/docente/*', $sinFicha, $docenteRoutes, 403);
    $matrix('Sin token en rutas /api/docente/*', null, $docenteRoutes, 401);
    $matrix('Token inventado en rutas /api/docente/*', $fake, $docenteRoutes, 401);
    $matrix('Sin token en rutas de administrador', null, $adminRoutes, 401);
    $matrix('Token inventado en rutas de administrador', $fake, $adminRoutes, 401);

    // Un token expirado y un esquema distinto de Bearer
    $exp = $c->makeSession($t['uid'], -60);
    eq('Token de docente expirado: 401', 401, $c->t('GET', '/api/docente/resumen', $exp)['status']);
    $r = http('GET', $c->base . '/api/docente/resumen', null, null, ['Authorization: Basic abcdef']);
    eq('Esquema Authorization distinto de Bearer en /api/docente/*: 401', 401, $r['status']);

    // El docente sigue viendo el portal público como cualquier visitante (no hereda poderes de admin)
    $pubEvents = (int)$c->scalar("SELECT COUNT(*) FROM eventos_investigacion WHERE publico = 1");
    $x = $c->t('GET', '/api/eje3/eventos', $tDoc);
    eq('Docente (con token) en /api/eje3/eventos: 200', 200, $x['status']);
    eq('Docente en /api/eje3/eventos: solo ve eventos públicos', [$pubEvents, 0], [count(arr($x)), count(array_filter(arr($x), fn($e) => (int)$e['publico'] !== 1))]);
    eq('Docente en /api/eje3/eventos/:id de un evento no público: 404', 404, $c->t('GET', '/api/eje3/eventos/' . (int)$c->scalar("SELECT id FROM eventos_investigacion WHERE publico = 0 LIMIT 1"), $tDoc)['status']);
    ok('Admin GET /api/eje3/proyectos/:id incluye apartados (comprobado con admin)', is_array(arr($c->a('GET', '/api/eje3/proyectos/' . (int)$c->scalar("SELECT id FROM proyectos WHERE tipo = 'semillero' LIMIT 1")))['apartados'] ?? null));
    ok('Docente en /api/investigadores: no ve snii_elegible (campo interno)', !preg_match('/snii_elegible/', $c->t('GET', '/api/investigadores', $tDoc)['body']));
    eq('Docente en /api/difusion/buscar y /api/eje3/difusion: 200', [200, 200], [$c->t('GET', '/api/difusion/buscar?q=a', $tDoc)['status'], $c->t('GET', '/api/eje3/difusion', $tDoc)['status']]);
    // Nunca se devuelven hashes ni tokens
    ok('Respuestas docente: sin password_hash ni token_hash', !preg_match('/password_hash|token_hash|\$2y\$/', $c->t('GET', '/api/docente/resumen', $tDoc)['body'] . $c->t('GET', '/api/auth/me', $tDoc)['body']));
}

// ===========================================================================
// SUITE: ROL DOCENTE · PROYECTOS (CRUD, aislamiento, máquina de estados)
// ===========================================================================
function suiteDocenteProjects(Ctx $c): void {
    section('Rol docente · proyectos propios, aislamiento y máquina de estados');
    $tag = 'DP' . bin2hex(random_bytes(3));
    $A = mkTeacher($c, "A{$tag}");
    $B = mkTeacher($c, "B{$tag}");
    $ta = teacherToken($c, $A);
    $tb = teacherToken($c, $B);
    $da = fn(string $m, string $path, $body = null) => $c->t($m, $path, $ta, $body);
    $db = fn(string $m, string $path, $body = null) => $c->t($m, $path, $tb, $body);

    $rowKeys = ['id', 'codigo', 'titulo', 'resumen', 'tipo', 'estado', 'registro_estado', 'comentario_revision', 'enviado_en', 'revisado_en', 'fecha_inicio',
        'fecha_fin', 'linea_investigacion', 'evento_id', 'evento_nombre', 'co_investigadores', 'articulado_civ', 'presupuesto', 'entidad_financiadora', 'total_apartados'];

    // ---- Resumen personal (solo lectura) ----
    $r = $da('GET', '/api/docente/resumen');
    eq('GET /api/docente/resumen: 200', 200, $r['status']);
    $s = arr($r);
    ok('Resumen: claves del contrato', !array_diff(['docente', 'proyectos_por_estado', 'total_proyectos', 'publicaciones', 'total_publicaciones', 'produccion_tecnica', 'total_produccion_tecnica'], array_keys($s)));
    ok('Resumen.docente: claves del contrato', !array_diff(['id', 'nombre_completo', 'correo', 'afiliacion', 'categoria', 'linea_investigacion', 'snii_nivel', 'snii_elegible'], array_keys($s['docente'] ?? [])));
    eq('Resumen: es la ficha del docente de la sesión', $A['inv'], $s['docente']['id'] ?? null);
    eq('Resumen inicial: los 4 estados en cero', ['borrador' => 0, 'enviado' => 0, 'aprobado' => 0, 'devuelto' => 0], $s['proyectos_por_estado'] ?? null);
    eq('Resumen inicial: sin proyectos, publicaciones ni producción', [0, 0, 0, [], []], [$s['total_proyectos'] ?? null, $s['total_publicaciones'] ?? null, $s['total_produccion_tecnica'] ?? null, $s['publicaciones'] ?? null, $s['produccion_tecnica'] ?? null]);
    // Publicaciones (solo 'publicado') y producción técnica del docente, capturadas por el admin
    $pubBase = ['investigador_id' => $A['inv'], 'autores' => 'Prueba, A.', 'revista_editorial' => 'Revista de prueba', 'anio' => 2030];
    $c->a('POST', '/api/publicaciones', $pubBase + ['titulo' => "Publicada {$tag}"]);
    $c->a('POST', '/api/publicaciones', $pubBase + ['titulo' => "Borrador {$tag}", 'estado' => 'borrador']);
    $c->a('POST', '/api/publicaciones', ['investigador_id' => $B['inv'], 'titulo' => "De B {$tag}", 'autores' => 'B', 'revista_editorial' => 'R', 'anio' => 2030]);
    $c->a('POST', '/api/produccion', ['tipo' => 'software', 'titulo' => "Software {$tag}", 'investigador_id' => $A['inv'], 'autores' => 'A', 'anio' => 2029]);
    $s = arr($da('GET', '/api/docente/resumen'));
    eq('Resumen: solo cuenta publicaciones PUBLICADAS y propias', [1, [["Publicada {$tag}"]]], [$s['total_publicaciones'] ?? null, [array_column($s['publicaciones'] ?? [], 'titulo')]]);
    ok('Resumen: publicaciones con {id,titulo,anio,revista_editorial,origen}', !array_diff(['id', 'titulo', 'anio', 'revista_editorial', 'origen'], array_keys($s['publicaciones'][0] ?? [])));
    eq('Resumen: producción técnica propia', [1, ["Software {$tag}"]], [$s['total_produccion_tecnica'] ?? null, array_column($s['produccion_tecnica'] ?? [], 'titulo')]);
    ok('Resumen: producción técnica con {id,tipo,titulo,anio}', !array_diff(['id', 'tipo', 'titulo', 'anio'], array_keys($s['produccion_tecnica'][0] ?? [])));

    // ---- Alta: validaciones ----
    $r = $da('POST', '/api/docente/proyectos', []);
    ok('POST vacío: 400 con errores en titulo y tipo', $r['status'] === 400 && isset($r['json']['errors']['titulo'], $r['json']['errors']['tipo']), snippet($r));
    $bad = fn(string $name, array $extra, string $field) => ok($name, ($x = $da('POST', '/api/docente/proyectos', projBody("V {$tag}", 'investigacion', $extra)))['status'] === 400 && isset($x['json']['errors'][$field]), snippet($x));
    $bad('Tipo inválido: 400', ['tipo' => 'otra-cosa'], 'tipo');
    $bad("Estado 'suspendido' no está permitido al docente: 400", ['estado' => 'suspendido'], 'estado');
    $bad('Estado inválido: 400', ['estado' => 'raro'], 'estado');
    $bad('Presupuesto negativo: 400', ['presupuesto' => -1], 'presupuesto');
    $bad('Presupuesto fuera de DECIMAL(14,2): 400', ['presupuesto' => 1e13], 'presupuesto');
    $bad('Fecha inexistente: 400', ['fecha_inicio' => '2026-02-31'], 'fecha_inicio');
    $bad('Fin anterior al inicio: 400', ['fecha_inicio' => '2026-05-10', 'fecha_fin' => '2026-05-01'], 'fecha_fin');
    $bad('Título de más de 255 caracteres: 400', ['titulo' => str_repeat('t', 256)], 'titulo');
    $bad('Título en forma de arreglo: 400', ['titulo' => ['x']], 'titulo');
    $bad('Resumen de más de 65 535 bytes: 400', ['resumen' => str_repeat('r', 65536)], 'resumen');
    $bad('Más de 100 apartados: 400', ['apartados' => array_fill(0, 101, ['apartado' => 'A', 'contenido' => 'x'])], 'apartados');
    $bad('Apartado sin título: 400', ['apartados' => [['apartado' => '', 'contenido' => 'x']]], 'apartados');
    $bad('Apartado con contenido de más de 65 535 bytes: 400', ['apartados' => [['apartado' => 'A', 'contenido' => str_repeat('b', 65536)]]], 'apartados');
    $bad('Evento inexistente: 400', ['evento_id' => 999999], 'evento_id');
    $bad('Evento no numérico: 400', ['evento_id' => 'abc'], 'evento_id');
    $hidden = (int)$c->scalar("SELECT id FROM eventos_investigacion WHERE publico = 0 ORDER BY id LIMIT 1");
    ok('Existe un evento NO público en la semilla', $hidden > 0);
    $bad('Evento NO público: 400 (el docente solo liga a eventos públicos)', ['evento_id' => $hidden], 'evento_id');
    eq('Ninguna de las altas inválidas creó proyectos', 0, (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE investigador_principal_id = :i", [':i' => $A['inv']]));

    // ---- Alta válida ----
    $pubEvent = (int)$c->scalar("SELECT id FROM eventos_investigacion WHERE publico = 1 AND tipo = 'semilleros' ORDER BY id LIMIT 1");
    $r = $da('POST', '/api/docente/proyectos', projBody("Proyecto 1 {$tag}", 'investigacion', [
        'co_investigadores' => 'Est. Uno, Est. Dos', 'evento_id' => $pubEvent, 'presupuesto' => 1500.5, 'articulado_civ' => 1,
        'apartados' => [['apartado' => 'Introducción', 'contenido' => 'Texto'], ['apartado' => 'Método', 'contenido' => 'Más texto']]]));
    eq('POST /api/docente/proyectos válido: 201', 201, $r['status']);
    $p1 = arr($r);
    $id1 = (int)($p1['id'] ?? 0);
    ok('201: fila con todas las claves del contrato + apartados', !array_diff(array_merge($rowKeys, ['apartados']), array_keys($p1)), json_encode(array_diff(array_merge($rowKeys, ['apartados']), array_keys($p1))));
    ok('La fila del docente no expone campos internos (investigador, revisor ni creador)',
        !array_intersect(['investigador_principal_id', 'investigador_principal_nombre', 'revisado_por', 'creado_por_usuario_id'], array_keys($p1)));
    eq("Se crea en 'borrador' sin comentario ni fechas de revisión", ['borrador', null, null, null], [g($p1, 'registro_estado'), g($p1, 'comentario_revision'), g($p1, 'enviado_en'), g($p1, 'revisado_en')]);
    ok('Código autogenerado INV-AAAA-NNN', (bool)preg_match('/^INV-\d{4}-\d{3}$/', (string)($p1['codigo'] ?? '')), (string)($p1['codigo'] ?? ''));
    eq('Defaults del docente: estado en_ejecucion', 'en_ejecucion', $p1['estado'] ?? null);
    eq("articulado_civ solo aplica a titulación: tipo 'investigacion' lo fuerza a 0", 0, $p1['articulado_civ'] ?? null);
    eq('Apartados guardados en orden', ['Introducción', 'Método'], array_column($p1['apartados'] ?? [], 'apartado'));
    eq('Evento público ligado y resuelto', [$pubEvent, (string)$c->scalar("SELECT nombre FROM eventos_investigacion WHERE id = :i", [':i' => $pubEvent])], [$p1['evento_id'] ?? null, $p1['evento_nombre'] ?? null]);
    $dbRow = $c->rows("SELECT investigador_principal_id, creado_por_usuario_id, registro_estado, presupuesto FROM proyectos WHERE id = :i", [':i' => $id1])[0] ?? [];
    eq('En BD: investigador principal = el de la sesión y creado_por_usuario_id = su usuario', [$A['inv'], $A['uid']], [(int)($dbRow['investigador_principal_id'] ?? 0), (int)($dbRow['creado_por_usuario_id'] ?? 0)]);
    eq('Presupuesto numérico guardado', 1500.5, (float)($dbRow['presupuesto'] ?? 0));
    $r = $da('POST', '/api/docente/proyectos', ['titulo' => "Tit {$tag}", 'tipo' => 'titulacion', 'articulado_civ' => true]);
    eq('Titulación + articulado_civ=true: 201 y se guarda 1', [201, 1, 'TIT'], [$r['status'], arr($r)['articulado_civ'] ?? null, substr((string)(arr($r)['codigo'] ?? ''), 0, 3)]);
    $idTit = (int)(arr($r)['id'] ?? 0);
    eq('Sin línea de investigación: se guarda vacía (pendiente de completar), no NULL', '', arr($r)['linea_investigacion'] ?? null);
    $r = $da('POST', '/api/docente/proyectos', ['titulo' => "Sem {$tag}", 'tipo' => 'semillero']);
    ok('Semillero: código SEM-AAAA-NNN distinto', preg_match('/^SEM-\d{4}-\d{3}$/', (string)(arr($r)['codigo'] ?? '')) === 1);
    $idSem = (int)(arr($r)['id'] ?? 0);

    // ---- Asignación masiva: campos prohibidos se ignoran en silencio ----
    $r = $da('POST', '/api/docente/proyectos', projBody("Masivo {$tag}") + ['investigador_principal_id' => $B['inv'], 'codigo' => 'HACK-001', 'registro_estado' => 'aprobado',
        'comentario_revision' => 'aprobado por mí', 'revisado_por' => 1, 'revisado_en' => '2020-01-01 00:00:00', 'enviado_en' => '2020-01-01 00:00:00', 'creado_por_usuario_id' => 1, 'id' => 99999]);
    eq('POST con campos prohibidos: 201 (se ignoran, no se rechazan)', 201, $r['status']);
    $idM = (int)(arr($r)['id'] ?? 0);
    $m = $c->rows("SELECT * FROM proyectos WHERE id = :i", [':i' => $idM])[0] ?? [];
    eq('Mass-assignment POST: principal de la sesión, código autogenerado, borrador, sin revisión ni envío, creador = sesión',
        [$A['inv'], false, 'borrador', null, null, null, null, $A['uid']],
        [(int)($m['investigador_principal_id'] ?? 0), ($m['codigo'] ?? '') === 'HACK-001', g($m, 'registro_estado'), g($m, 'comentario_revision'), g($m, 'revisado_por'), g($m, 'revisado_en'), g($m, 'enviado_en'), (int)($m['creado_por_usuario_id'] ?? 0)]);
    ok('Mass-assignment POST: el id del cuerpo no se usa', $idM !== 99999 && (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE id = 99999") === 0);
    $r = $da('PUT', "/api/docente/proyectos/{$idM}", ['titulo' => "Masivo editado {$tag}", 'investigador_principal_id' => $B['inv'], 'codigo' => 'HACK-002', 'registro_estado' => 'aprobado',
        'comentario_revision' => 'x', 'revisado_por' => 1, 'creado_por_usuario_id' => 1]);
    eq('PUT con campos prohibidos: 200', 200, $r['status']);
    $m = $c->rows("SELECT * FROM proyectos WHERE id = :i", [':i' => $idM])[0] ?? [];
    eq('Mass-assignment PUT: nada de lo prohibido cambia, el título sí',
        [$A['inv'], false, 'borrador', null, null, $A['uid'], "Masivo editado {$tag}"],
        [(int)$m['investigador_principal_id'], $m['codigo'] === 'HACK-002', $m['registro_estado'], $m['comentario_revision'], $m['revisado_por'], (int)$m['creado_por_usuario_id'], $m['titulo']]);
    eq("El código nunca cambia por PUT ('HACK-002' ignorado)", 1, (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE id = :i AND codigo LIKE 'INV-%'", [':i' => $idM]));

    // ---- Listas solo propias, filtros y detalle ----
    $rb = $db('POST', '/api/docente/proyectos', projBody("De B {$tag}", 'semillero'));
    $idB = (int)(arr($rb)['id'] ?? 0);
    $listA = arr($da('GET', '/api/docente/proyectos'));
    eq('Lista de A: solo sus 4 proyectos', 4, count($listA));
    ok('Lista de A: ninguno de B', !in_array($idB, array_column($listA, 'id'), true));
    ok('Lista: filas con todas las claves del contrato', !array_diff($rowKeys, array_keys($listA[0] ?? [])));
    $listB = arr($db('GET', '/api/docente/proyectos'));
    eq('Lista de B: solo el suyo', [$idB], array_column($listB, 'id'));
    eq('Filtro tipo=titulacion', [$idTit], array_column(arr($da('GET', '/api/docente/proyectos?tipo=titulacion')), 'id'));
    eq('Filtro registro_estado=borrador: los 4', 4, count(arr($da('GET', '/api/docente/proyectos?registro_estado=borrador'))));
    eq('Filtro registro_estado=enviado: ninguno', 0, count(arr($da('GET', '/api/docente/proyectos?registro_estado=enviado'))));
    eq('Búsqueda por texto en el título', [$id1], array_column(arr($da('GET', '/api/docente/proyectos?search=' . urlencode("Proyecto 1 {$tag}"))), 'id'));
    $x = $da('GET', '/api/docente/proyectos?search=' . urlencode("' OR 1=1 --"));
    ok('Búsqueda con comillas es parametrizada (200, vacía, sin error SQL)', $x['status'] === 200 && arr($x) === [] && !preg_match('/SQLSTATE/', $x['body']), snippet($x));
    $x = $da('GET', '/api/docente/proyectos?search[]=x&tipo[]=y&registro_estado[a]=b');
    eq('Parámetros en forma de arreglo no provocan 500', 200, $x['status']);
    eq('Mis proyectos: lo de B tampoco aparece buscando su título', 0, count(arr($da('GET', '/api/docente/proyectos?search=' . urlencode("De B {$tag}")))));
    $r = $da('GET', "/api/docente/proyectos/{$id1}");
    eq('GET detalle propio: 200 con apartados', [200, 2], [$r['status'], count(arr($r)['apartados'] ?? [])]);
    ok('Detalle: apartados con {id,apartado,contenido,orden}', !array_diff(['id', 'apartado', 'contenido', 'orden'], array_keys(arr($r)['apartados'][0] ?? [])));

    // ---- Aislamiento: el proyecto de B es invisible e intocable para A (404, nunca 403) ----
    $before = $c->rows("SELECT titulo, registro_estado, resumen FROM proyectos WHERE id = :i", [':i' => $idB])[0];
    eq('A no puede ver un proyecto de B: 404', 404, $da('GET', "/api/docente/proyectos/{$idB}")['status']);
    eq('A no puede editar un proyecto de B: 404', 404, $da('PUT', "/api/docente/proyectos/{$idB}", ['titulo' => 'secuestrado'])['status']);
    eq('A no puede borrar un proyecto de B: 404', 404, $da('DELETE', "/api/docente/proyectos/{$idB}")['status']);
    eq('A no puede enviar a revisión un proyecto de B: 404', 404, $da('POST', "/api/docente/proyectos/{$idB}/enviar")['status']);
    eq('El proyecto de B quedó intacto', $before, $c->rows("SELECT titulo, registro_estado, resumen FROM proyectos WHERE id = :i", [':i' => $idB])[0]);
    eq('Y B tampoco toca los de A (GET/PUT/DELETE/enviar): 404', [404, 404, 404, 404],
        [$db('GET', "/api/docente/proyectos/{$id1}")['status'], $db('PUT', "/api/docente/proyectos/{$id1}", ['titulo' => 'x'])['status'], $db('DELETE', "/api/docente/proyectos/{$id1}")['status'], $db('POST', "/api/docente/proyectos/{$id1}/enviar")['status']]);
    eq('Proyecto inexistente: 404 en las 4 operaciones', [404, 404, 404, 404],
        [$da('GET', '/api/docente/proyectos/999999')['status'], $da('PUT', '/api/docente/proyectos/999999', ['titulo' => 'x'])['status'], $da('DELETE', '/api/docente/proyectos/999999')['status'], $da('POST', '/api/docente/proyectos/999999/enviar')['status']]);
    $demoTok = (string)($c->login('investigador@buap.mx', 'lector123')['json']['data']['token'] ?? '');
    $demoList = arr($c->t('GET', '/api/docente/proyectos', $demoTok));
    $demoInv = (int)$c->scalar("SELECT investigador_id FROM usuarios WHERE correo = 'investigador@buap.mx'");
    $demoStates = array_column($demoList, 'registro_estado');
    sort($demoStates);
    $sqlStates = array_column($c->rows("SELECT registro_estado FROM proyectos WHERE investigador_principal_id = :i ORDER BY registro_estado", [':i' => $demoInv]), 'registro_estado');
    eq('El docente demo ve exactamente los proyectos de SU ficha (SQL) y nada más', $sqlStates, $demoStates);
    ok('El docente demo tiene uno en cada estado (borrador, enviado, devuelto y aprobados)', count(array_unique($demoStates)) === 4);
    ok('...y no ve ninguno de A ni de B', !array_intersect(array_column($demoList, 'id'), array_merge($listA ? array_column($listA, 'id') : [], [$idB])));
    $demoDev = array_values(array_filter($demoList, fn($p) => $p['registro_estado'] === 'devuelto'))[0] ?? [];
    ok('Demo: el devuelto trae el comentario del administrador', !empty($demoDev['comentario_revision']));

    // ---- Edición parcial ----
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['titulo' => "Proyecto 1 editado {$tag}"]);
    eq('PUT parcial: 200', 200, $r['status']);
    eq('PUT parcial: solo cambia el título (resto y apartados intactos)', ["Proyecto 1 editado {$tag}", 'Resumen de prueba del proyecto.', 2, 'borrador'],
        [arr($r)['titulo'] ?? null, arr($r)['resumen'] ?? null, count(arr($r)['apartados'] ?? []), arr($r)['registro_estado'] ?? null]);
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['apartados' => [['apartado' => 'Único', 'contenido' => 'Reemplazo']]]);
    eq('PUT con apartados los reemplaza todos', ['Único'], array_column(arr($r)['apartados'] ?? [], 'apartado'));
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['apartados' => []]);
    eq('PUT con apartados vacío los elimina', 0, arr($r)['total_apartados'] ?? null);
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['titulo' => '']);
    ok('PUT con título vacío: 400', $r['status'] === 400 && isset($r['json']['errors']['titulo']), snippet($r));
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['evento_id' => null]);
    ok('PUT con evento_id null desliga el evento', $r['status'] === 200 && array_key_exists('evento_id', arr($r)) && arr($r)['evento_id'] === null, snippet($r));
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['evento_id' => $hidden]);
    ok('PUT con evento NO público: 400', $r['status'] === 400 && isset($r['json']['errors']['evento_id']), snippet($r));
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['estado' => 'suspendido']);
    ok("PUT con estado 'suspendido': 400", $r['status'] === 400 && isset($r['json']['errors']['estado']), snippet($r));
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['tipo' => 'titulacion', 'articulado_civ' => 1]);
    eq('PUT: cambiar a titulación permite articulado_civ', ['titulacion', 1], [arr($r)['tipo'] ?? null, arr($r)['articulado_civ'] ?? null]);
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['tipo' => 'semillero']);
    eq('PUT: al dejar de ser titulación, articulado_civ se fuerza a 0', ['semillero', 0], [arr($r)['tipo'] ?? null, arr($r)['articulado_civ'] ?? null]);
    $da('PUT', "/api/docente/proyectos/{$id1}", ['tipo' => 'investigacion', 'evento_id' => $pubEvent]);
    // Un evento que luego deja de ser público no impide seguir editando el proyecto
    $c->exec("UPDATE eventos_investigacion SET publico = 0 WHERE id = :e", [':e' => $pubEvent]);
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['titulo' => "Proyecto 1 sigue editable {$tag}"]);
    eq('Evento que se volvió privado: el docente aún puede editar otros campos', 200, $r['status']);
    $r = $da('PUT', "/api/docente/proyectos/{$id1}", ['evento_id' => $pubEvent]);
    eq('Reenviar el mismo evento ya ligado no falla', 200, $r['status']);
    $r = $da('POST', '/api/docente/proyectos', projBody("Nuevo en evento privado {$tag}", 'investigacion', ['evento_id' => $pubEvent]));
    ok('Pero un proyecto NUEVO ya no puede ligarse a ese evento (ahora privado): 400', $r['status'] === 400 && isset($r['json']['errors']['evento_id']), snippet($r));
    $c->exec("UPDATE eventos_investigacion SET publico = 1 WHERE id = :e", [':e' => $pubEvent]);

    // ---- Visibilidad hacia el administrador ----
    $admRow = array_values(array_filter(arr($c->a('GET', '/api/eje3/proyectos?registro_estado=borrador')), fn($p) => (int)$p['id'] === $id1))[0] ?? null;
    ok('El administrador ve el borrador del docente con registro_estado y comentario_revision', $admRow !== null && ($admRow['registro_estado'] ?? null) === 'borrador' && array_key_exists('comentario_revision', $admRow) && array_key_exists('enviado_en', $admRow) && array_key_exists('revisado_en', $admRow));
    eq('Admin GET /api/eje3/proyectos/:id incluye registro_estado', 'borrador', arr($c->a('GET', "/api/eje3/proyectos/{$id1}"))['registro_estado'] ?? null);

    // ---- Máquina de estados: borrador -> enviado -> devuelto -> enviado -> aprobado ----
    $r = $da('POST', "/api/docente/proyectos/{$idSem}/enviar");
    ok('Enviar sin resumen ni línea: 400 con errores por campo', $r['status'] === 400 && isset($r['json']['errors']['resumen'], $r['json']['errors']['linea_investigacion']) && !isset($r['json']['errors']['titulo']), snippet($r));
    eq('Tras el 400 el proyecto sigue en borrador', 'borrador', $c->scalar("SELECT registro_estado FROM proyectos WHERE id = :i", [':i' => $idSem]));
    $da('PUT', "/api/docente/proyectos/{$idSem}", ['resumen' => '   ', 'linea_investigacion' => '   ']);
    eq('Resumen y línea de solo espacios tampoco cuentan: 400', 400, $da('POST', "/api/docente/proyectos/{$idSem}/enviar")['status']);
    $da('PUT', "/api/docente/proyectos/{$idSem}", ['resumen' => 'Ya tengo resumen', 'linea_investigacion' => 'Mi línea']);

    $r = $da('POST', "/api/docente/proyectos/{$idSem}/enviar");
    eq('Enviar un borrador completo: 200', 200, $r['status']);
    eq("Pasa a 'enviado' con enviado_en y sin comentario", ['enviado', true, null], [g(arr($r), 'registro_estado'), !empty(arr($r)['enviado_en']), g(arr($r), 'comentario_revision')]);
    $r = $da('PUT', "/api/docente/proyectos/{$idSem}", ['titulo' => 'cambio a escondidas']);
    ok("PUT en 'enviado': 409 proyecto_bloqueado", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'proyecto_bloqueado', snippet($r));
    ok('Todo 409 trae un message legible en español (el código va solo en errors.codigo)', humanConflict($r), snippet($r));
    $r = $da('DELETE', "/api/docente/proyectos/{$idSem}");
    ok("DELETE en 'enviado': 409 proyecto_bloqueado", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'proyecto_bloqueado', snippet($r));
    $r = $da('POST', "/api/docente/proyectos/{$idSem}/enviar");
    ok("Enviar de nuevo (ya 'enviado'): 409 transicion_invalida", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));
    eq("El proyecto 'enviado' sigue intacto tras los intentos bloqueados", ['enviado', 'Sem ' . $tag], [$c->scalar("SELECT registro_estado FROM proyectos WHERE id = :i", [':i' => $idSem]), $c->scalar("SELECT titulo FROM proyectos WHERE id = :i", [':i' => $idSem])]);
    eq('El docente no puede aprobarse a sí mismo: no hay ruta de revisión para él (403)', 403, $da('POST', "/api/eje3/proyectos/{$idSem}/revision", ['accion' => 'aprobar'])['status']);
    eq('Y el proyecto sigue sin aprobar', 'enviado', $c->scalar("SELECT registro_estado FROM proyectos WHERE id = :i", [':i' => $idSem]));

    // El administrador devuelve con comentario
    $r = $c->a('POST', "/api/eje3/proyectos/{$idSem}/revision", ['accion' => 'devolver', 'comentario' => 'Precisa el objetivo general.']);
    eq('Admin devuelve: 200', 200, $r['status']);
    $r = $da('GET', "/api/docente/proyectos/{$idSem}");
    eq("El docente ve 'devuelto' con el comentario y la fecha de revisión", ['devuelto', 'Precisa el objetivo general.', true], [arr($r)['registro_estado'] ?? null, arr($r)['comentario_revision'] ?? null, !empty(arr($r)['revisado_en'])]);
    $r = $da('PUT', "/api/docente/proyectos/{$idSem}", ['resumen' => 'Resumen corregido']);
    eq("En 'devuelto' sí puede editar (y sigue 'devuelto')", [200, 'devuelto'], [$r['status'], arr($r)['registro_estado'] ?? null]);
    $r = $da('POST', "/api/docente/proyectos/{$idSem}/enviar");
    eq("Reenviar un devuelto: 200, 'enviado' y el comentario del revisor se limpia", [200, 'enviado', null], [$r['status'], g(arr($r), 'registro_estado'), g(arr($r), 'comentario_revision')]);
    $r = $c->a('POST', "/api/eje3/proyectos/{$idSem}/revision", ['accion' => 'aprobar']);
    eq('Admin aprueba: 200', 200, $r['status']);
    $r = $da('GET', "/api/docente/proyectos/{$idSem}");
    eq("El docente ve 'aprobado'", 'aprobado', arr($r)['registro_estado'] ?? null);
    $r = $da('PUT', "/api/docente/proyectos/{$idSem}", ['titulo' => 'x']);
    ok("PUT en 'aprobado': 409 proyecto_bloqueado", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'proyecto_bloqueado', snippet($r));
    $r = $da('DELETE', "/api/docente/proyectos/{$idSem}");
    ok("DELETE en 'aprobado': 409 proyecto_bloqueado", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'proyecto_bloqueado', snippet($r));
    $r = $da('POST', "/api/docente/proyectos/{$idSem}/enviar");
    ok("Enviar un 'aprobado': 409 transicion_invalida", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));
    ok('El proyecto aprobado conserva sus datos tras los intentos', $c->scalar("SELECT resumen FROM proyectos WHERE id = :i", [':i' => $idSem]) === 'Resumen corregido');

    // Si el admin lo devuelve de nuevo (no puede: solo 'enviado'); el admin edita sin cambiar el registro
    $r = $c->a('PUT', "/api/eje3/proyectos/{$idSem}", ['titulo' => "Sem {$tag} (admin)", 'registro_estado' => 'borrador']);
    eq("El admin edita un aprobado del docente SIN cambiar su registro_estado (registro_estado del cuerpo se ignora)", [200, 'aprobado'], [$r['status'], arr($r)['registro_estado'] ?? null]);
    $r = $c->a('POST', "/api/eje3/proyectos/{$idSem}/revision", ['accion' => 'devolver', 'comentario' => 'Revisar de nuevo']);
    ok("El admin no puede devolver un aprobado: 409 transicion_invalida", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));

    // Borrado del docente en borrador y en devuelto
    $da('PUT', "/api/docente/proyectos/{$idTit}", ['apartados' => [['apartado' => 'A', 'contenido' => 'b']]]);
    $r = $da('DELETE', "/api/docente/proyectos/{$idTit}");
    eq('DELETE de un borrador propio: 200', 200, $r['status']);
    eq('Borrado: 404 después y se eliminan sus apartados', [404, 0], [$da('GET', "/api/docente/proyectos/{$idTit}")['status'], (int)$c->scalar("SELECT COUNT(*) FROM proyecto_apartados WHERE proyecto_id = :i", [':i' => $idTit])]);
    eq('Borrar de nuevo: 404', 404, $da('DELETE', "/api/docente/proyectos/{$idTit}")['status']);
    $rd = $da('POST', '/api/docente/proyectos', projBody("Para devolver {$tag}"));
    $idD = (int)(arr($rd)['id'] ?? 0);
    $da('POST', "/api/docente/proyectos/{$idD}/enviar");
    $c->a('POST', "/api/eje3/proyectos/{$idD}/revision", ['accion' => 'devolver', 'comentario' => 'No cumple']);
    eq("DELETE de un proyecto 'devuelto' propio: 200", 200, $da('DELETE', "/api/docente/proyectos/{$idD}")['status']);

    // Resumen final: cuenta todos SUS estados
    $s = arr($da('GET', '/api/docente/resumen'));
    $expected = ['borrador' => 0, 'enviado' => 0, 'aprobado' => 0, 'devuelto' => 0];
    foreach ($c->rows("SELECT registro_estado, COUNT(*) n FROM proyectos WHERE investigador_principal_id = :i GROUP BY registro_estado", [':i' => $A['inv']]) as $row) { $expected[$row['registro_estado']] = (int)$row['n']; }
    eq('Resumen: proyectos_por_estado coincide con SQL e incluye TODOS sus estados', $expected, $s['proyectos_por_estado'] ?? null);
    eq('Resumen: total_proyectos = suma de estados', array_sum($expected), $s['total_proyectos'] ?? null);
}

// ===========================================================================
// SUITE: REVISIÓN DEL ADMINISTRADOR
// ===========================================================================
function suiteDocenteReview(Ctx $c): void {
    section('Rol docente · revisión del administrador (aprobar / devolver)');
    $tag = 'RV' . bin2hex(random_bytes(3));
    $A = mkTeacher($c, "A{$tag}");
    $ta = teacherToken($c, $A);
    $da = fn(string $m, string $path, $body = null) => $c->t($m, $path, $ta, $body);
    $mk = function (string $title, string $tipo = 'investigacion') use ($da): int {
        return (int)(arr($da('POST', '/api/docente/proyectos', projBody($title, $tipo, ['apartados' => [['apartado' => 'A1', 'contenido' => 'x'], ['apartado' => 'A2', 'contenido' => 'y']]])))['id'] ?? 0);
    };
    $send = fn(int $id) => $da('POST', "/api/docente/proyectos/{$id}/enviar");

    $before = arr($c->a('GET', '/api/eje3/revision'));
    ok('GET /api/eje3/revision: {pendientes, proyectos}', array_key_exists('pendientes', $before) && is_array($before['proyectos'] ?? null), json_encode(array_keys($before)));
    eq('pendientes = número de proyectos en la lista = SQL', [(int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE registro_estado = 'enviado'")] , [$before['pendientes'] ?? null]);
    eq('La bandeja trae solo proyectos enviados', 0, count(array_filter($before['proyectos'] ?? [], fn($p) => $p['registro_estado'] !== 'enviado')));
    eq('Sin token: 401; con docente: 403', [401, 403], [$c->p('GET', '/api/eje3/revision')['status'], $c->t('GET', '/api/eje3/revision', $ta)['status']]);

    $p1 = $mk("Rev 1 {$tag}");
    $p2 = $mk("Rev 2 {$tag}", 'semillero');
    $p3 = $mk("Rev 3 {$tag}", 'titulacion');
    $mid = arr($c->a('GET', '/api/eje3/revision'));
    eq('Los borradores NO aparecen en la bandeja', $before['pendientes'], $mid['pendientes'] ?? null);
    // Se envían en orden inverso al id para comprobar el orden por enviado_en ascendente
    $send($p2); $send($p1); $send($p3);
    $c->exec("UPDATE proyectos SET enviado_en = :d WHERE id = :i", [':d' => date('Y-m-d H:i:s', time() - 3 * 86400), ':i' => $p2]);
    $c->exec("UPDATE proyectos SET enviado_en = :d WHERE id = :i", [':d' => date('Y-m-d H:i:s', time() - 2 * 86400), ':i' => $p1]);
    $c->exec("UPDATE proyectos SET enviado_en = :d WHERE id = :i", [':d' => date('Y-m-d H:i:s', time() - 1 * 86400), ':i' => $p3]);
    $after = arr($c->a('GET', '/api/eje3/revision'));
    eq('Tras enviar 3 proyectos: pendientes +3', $before['pendientes'] + 3, $after['pendientes'] ?? null);
    eq('pendientes = longitud de la lista', count($after['proyectos'] ?? []), $after['pendientes'] ?? null);
    $mine = array_values(array_filter($after['proyectos'], fn($p) => in_array((int)$p['id'], [$p1, $p2, $p3], true)));
    eq('Orden por enviado_en ascendente (el más antiguo primero)', [$p2, $p1, $p3], array_map('intval', array_column($mine, 'id')));
    ok('Fila de la bandeja con investigador_principal_nombre y total_apartados', ($mine[0]['investigador_principal_nombre'] ?? null) === "Docente A{$tag}" && ($mine[0]['total_apartados'] ?? null) === 2, json_encode($mine[0] ?? null));
    ok('Fila de la bandeja con registro_estado, comentario_revision, enviado_en y revisado_en', !array_diff(['registro_estado', 'comentario_revision', 'enviado_en', 'revisado_en'], array_keys($mine[0] ?? [])));
    $cat = arr($c->a('GET', '/api/eje3/catalogos'));
    eq('catalogos.proyectos_pendientes = pendientes de la bandeja', $after['pendientes'], $cat['proyectos_pendientes'] ?? null);
    ok('catalogos conserva las 13 claves anteriores y añade proyectos_pendientes (14 enteros)', count($cat) === 14 && count(array_filter($cat, 'is_int')) === 14, json_encode(array_keys($cat)));

    // Validaciones y errores de la revisión
    $rev = fn(int $id, $body, ?string $tok = null) => http('POST', $c->base . "/api/eje3/proyectos/{$id}/revision", $body, $tok ?? $c->admin);
    eq('Revisión sin token: 401', 401, http('POST', $c->base . "/api/eje3/proyectos/{$p1}/revision", ['accion' => 'aprobar'])['status']);
    eq('Revisión con token de docente: 403', 403, $rev($p1, ['accion' => 'aprobar'], $ta)['status']);
    eq('Revisión de proyecto inexistente: 404', 404, $rev(999999, ['accion' => 'aprobar'])['status']);
    $r = $rev($p1, []);
    ok('Sin acción: 400 (errors.accion)', $r['status'] === 400 && isset($r['json']['errors']['accion']), snippet($r));
    $r = $rev($p1, ['accion' => 'borrar']);
    ok('Acción inválida: 400', $r['status'] === 400 && isset($r['json']['errors']['accion']), snippet($r));
    $r = $rev($p1, ['accion' => ['aprobar']]);
    ok('Acción en forma de arreglo: 400', $r['status'] === 400, snippet($r));
    $r = $rev($p1, ['accion' => 'devolver']);
    ok('Devolver sin comentario: 400 (errors.comentario)', $r['status'] === 400 && isset($r['json']['errors']['comentario']), snippet($r));
    $r = $rev($p1, ['accion' => 'devolver', 'comentario' => '   ']);
    ok('Devolver con comentario en blanco: 400', $r['status'] === 400 && isset($r['json']['errors']['comentario']), snippet($r));
    $r = $rev($p1, ['accion' => 'devolver', 'comentario' => ' ab ']);
    ok('Devolver con comentario de menos de 3 caracteres (tras trim): 400', $r['status'] === 400 && isset($r['json']['errors']['comentario']), snippet($r));
    $r = $rev($p1, ['accion' => 'devolver', 'comentario' => str_repeat('c', 2001)]);
    ok('Comentario de más de 2000 caracteres: 400', $r['status'] === 400 && isset($r['json']['errors']['comentario']), snippet($r));
    $r = $rev($p1, ['accion' => 'aprobar', 'comentario' => str_repeat('c', 2001)]);
    ok('Aprobar con comentario de más de 2000 caracteres: 400', $r['status'] === 400, snippet($r));
    $r = $rev($p1, ['accion' => 'devolver', 'comentario' => ['x']]);
    ok('Comentario en forma de arreglo: 400', $r['status'] === 400, snippet($r));
    eq('Las revisiones inválidas no cambiaron el estado', 'enviado', $c->scalar("SELECT registro_estado FROM proyectos WHERE id = :i", [':i' => $p1]));

    // Transición inválida: solo desde 'enviado'
    $borrador = $mk("Rev borrador {$tag}");
    $r = $rev($borrador, ['accion' => 'aprobar']);
    ok("Aprobar un borrador: 409 transicion_invalida", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));
    ok('409 de revisión: message legible en español', humanConflict($r), snippet($r));
    $r = $rev($borrador, ['accion' => 'devolver', 'comentario' => 'No aplica']);
    ok("Devolver un borrador: 409 transicion_invalida", $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));
    eq('El borrador sigue en borrador', 'borrador', $c->scalar("SELECT registro_estado FROM proyectos WHERE id = :i", [':i' => $borrador]));

    // Aprobar (sin comentario)
    $adminId = (int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'admin@buap.mx'");
    $r = $rev($p1, ['accion' => 'aprobar']);
    eq('Aprobar: 200', 200, $r['status']);
    $d = arr($r);
    eq("Devuelve el proyecto actualizado ('aprobado', con apartados)", ['aprobado', 2], [$d['registro_estado'] ?? null, count($d['apartados'] ?? [])]);
    $row = $c->rows("SELECT registro_estado, comentario_revision, revisado_en, revisado_por FROM proyectos WHERE id = :i", [':i' => $p1])[0];
    eq('BD: aprobado, sin comentario, con revisado_en y revisado_por = admin', ['aprobado', null, true, $adminId], [$row['registro_estado'], $row['comentario_revision'], !empty($row['revisado_en']), (int)$row['revisado_por']]);
    $r = $rev($p1, ['accion' => 'aprobar']);
    ok('Aprobar dos veces: 409', $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'transicion_invalida', snippet($r));
    $r = $rev($p1, ['accion' => 'devolver', 'comentario' => 'Ya está aprobado']);
    eq('Devolver un aprobado: 409', 409, $r['status']);

    // Aprobar con comentario opcional
    $r = $rev($p3, ['accion' => 'aprobar', 'comentario' => '  Buen trabajo  ']);
    eq('Aprobar con comentario opcional: 200 y se guarda recortado', [200, 'Buen trabajo'], [$r['status'], arr($r)['comentario_revision'] ?? null]);

    // Devolver con comentario
    $r = $rev($p2, ['accion' => 'devolver', 'comentario' => 'Falta el cronograma.']);
    eq('Devolver con comentario: 200', 200, $r['status']);
    $row = $c->rows("SELECT registro_estado, comentario_revision, revisado_en, revisado_por FROM proyectos WHERE id = :i", [':i' => $p2])[0];
    eq('BD: devuelto, con comentario, revisado_en y revisado_por', ['devuelto', 'Falta el cronograma.', true, $adminId], [$row['registro_estado'], $row['comentario_revision'], !empty($row['revisado_en']), (int)$row['revisado_por']]);
    $r = $rev($p2, ['accion' => 'devolver', 'comentario' => 'Otra vez']);
    eq('Devolver un devuelto: 409', 409, $r['status']);
    eq('La bandeja ya no incluye los revisados', $before['pendientes'] + 0, arr($c->a('GET', '/api/eje3/revision'))['pendientes'] ?? null);

    // Listado y detalle del Registro admin: nuevos campos y filtro por estado
    $list = arr($c->a('GET', '/api/eje3/proyectos'));
    ok('El Registro lista TODOS los estados (borrador, enviado, aprobado y devuelto)', count(array_unique(array_column($list, 'registro_estado'))) === 4, json_encode(array_unique(array_column($list, 'registro_estado'))));
    eq('Total del listado = SQL (sin filtrar por estado)', (int)$c->scalar("SELECT COUNT(*) FROM proyectos"), count($list));
    foreach (['borrador', 'enviado', 'aprobado', 'devuelto'] as $st) {
        $f = arr($c->a('GET', "/api/eje3/proyectos?registro_estado={$st}"));
        eq("Filtro registro_estado={$st} = SQL", (int)$c->scalar("SELECT COUNT(*) FROM proyectos WHERE registro_estado = :s", [':s' => $st]), count($f));
        ok("Filtro registro_estado={$st}: todos del estado", count(array_filter($f, fn($p) => $p['registro_estado'] !== $st)) === 0);
    }
    eq('Filtro registro_estado desconocido: lista vacía', 0, count(arr($c->a('GET', '/api/eje3/proyectos?registro_estado=raro'))));
    eq('Filtro registro_estado en forma de arreglo: 200 sin error', 200, $c->a('GET', '/api/eje3/proyectos?registro_estado[]=x')['status']);
    $det = arr($c->a('GET', "/api/eje3/proyectos/{$p2}"));
    eq('Detalle admin: registro_estado, comentario_revision y revisado_en', ['devuelto', 'Falta el cronograma.', true], [$det['registro_estado'] ?? null, $det['comentario_revision'] ?? null, !empty($det['revisado_en'])]);

    // El administrador captura ya validado: crea 'aprobado' y registro_estado del cuerpo se ignora
    $inv = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $r = $c->a('POST', '/api/eje3/proyectos', ['titulo' => "Admin crea {$tag}", 'investigador_principal_id' => $inv, 'tipo' => 'investigacion', 'registro_estado' => 'borrador']);
    eq("POST admin: 201 y registro_estado = 'aprobado' (el valor del cuerpo se ignora)", [201, 'aprobado'], [$r['status'], arr($r)['registro_estado'] ?? null]);
    $idAdm = (int)(arr($r)['id'] ?? 0);
    $r = $c->a('PUT', "/api/eje3/proyectos/{$idAdm}", ['titulo' => "Admin edita {$tag}", 'registro_estado' => 'devuelto', 'comentario_revision' => 'x']);
    eq('PUT admin no cambia registro_estado ni comentario', ['aprobado', null], [g(arr($r), 'registro_estado'), g(arr($r), 'comentario_revision')]);
    $r = $c->a('POST', '/api/proyectos', ['codigo' => "LEG-{$tag}", 'titulo' => 'Clásico', 'investigador_principal_id' => $inv, 'fecha_inicio' => '2026-01-10', 'linea_investigacion' => 'x']);
    eq("POST /api/proyectos (clásico, admin): 201 y queda 'aprobado'", [201, 'aprobado'], [$r['status'], $c->scalar("SELECT registro_estado FROM proyectos WHERE codigo = :c", [':c' => "LEG-{$tag}"])]);
    $c->a('DELETE', '/api/eje3/proyectos/' . $idAdm);
    $c->exec("DELETE FROM proyectos WHERE codigo = :c", [':c' => "LEG-{$tag}"]);
    eq('El admin puede borrar cualquier proyecto del docente, en cualquier estado', 200, $c->a('DELETE', "/api/eje3/proyectos/{$p1}")['status']);
}

// ===========================================================================
// SUITE: USUARIOS DOCENTES (administrador)
// ===========================================================================
function suiteTeacherAccounts(Ctx $c): void {
    section('Rol docente · usuarios docentes (alta, restablecer, activar/desactivar)');
    $tag = 'UD' . bin2hex(random_bytes(3));
    $keys = ['id', 'nombre', 'correo', 'activo', 'investigador_id', 'investigador_nombre', 'debe_cambiar_password', 'ultimo_acceso', 'total_proyectos'];

    // Permisos
    $docTok = (string)($c->login('investigador@buap.mx', 'lector123')['json']['data']['token'] ?? '');
    foreach ([['GET', '/api/eje3/usuarios-docentes'], ['POST', '/api/eje3/usuarios-docentes'], ['POST', '/api/eje3/usuarios-docentes/1/restablecer'], ['PUT', '/api/eje3/usuarios-docentes/1']] as [$m, $p]) {
        eq("{$m} {$p}: sin token 401 y con docente 403", [401, 403], [http($m, $c->base . $p, ['x' => 1])['status'], http($m, $c->base . $p, ['x' => 1], $docTok)['status']]);
    }

    // Alta: validaciones
    $inv = arr($c->a('POST', '/api/investigadores', ['nombre_completo' => "Docente Alta {$tag}", 'correo' => strtolower("alta.{$tag}@prueba.mx"), 'afiliacion' => 'Facultad de Pruebas', 'linea_investigacion' => 'Pruebas', 'categoria' => 'Profesor Titular']));
    $invId = (int)($inv['id'] ?? 0);
    $post = fn($b) => $c->a('POST', '/api/eje3/usuarios-docentes', $b);
    $r = $post([]);
    ok('POST vacío: 400 con errors.investigador_id', $r['status'] === 400 && isset($r['json']['errors']['investigador_id']), snippet($r));
    $r = $post(['investigador_id' => 'abc']);
    ok('investigador_id no numérico: 400', $r['status'] === 400 && isset($r['json']['errors']['investigador_id']), snippet($r));
    $r = $post(['investigador_id' => 999999]);
    ok('investigador_id inexistente: 400', $r['status'] === 400 && isset($r['json']['errors']['investigador_id']), snippet($r));
    $r = $post(['investigador_id' => [$invId]]);
    ok('investigador_id en forma de arreglo: 400', $r['status'] === 400, snippet($r));
    $r = $post(['investigador_id' => $invId, 'correo' => 'no-es-correo']);
    ok('Correo con formato inválido: 400 (errors.correo)', $r['status'] === 400 && isset($r['json']['errors']['correo']), snippet($r));
    $r = $post(['investigador_id' => $invId, 'correo' => ['a@b.mx']]);
    ok('Correo en forma de arreglo: 400', $r['status'] === 400, snippet($r));
    $r = $post(['investigador_id' => $invId, 'correo' => str_repeat('a', 115) . '@b.mx']);
    ok('Correo de más de 120 caracteres: 400', $r['status'] === 400 && isset($r['json']['errors']['correo']), snippet($r));
    $r = $post(['investigador_id' => $invId, 'correo' => 'ADMIN@buap.mx']);
    ok('Correo ya usado por otro usuario (sin distinguir mayúsculas): 409 correo_duplicado', $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'correo_duplicado', snippet($r));
    eq('Ninguna alta inválida creó cuentas para ese docente', 0, (int)$c->scalar("SELECT COUNT(*) FROM usuarios WHERE investigador_id = :i", [':i' => $invId]));
    $first = (int)$c->scalar("SELECT id FROM investigadores ORDER BY id LIMIT 1");
    $r = $post(['investigador_id' => $first]);
    ok('Docente que ya tiene cuenta (la demo): 409 docente_con_cuenta', $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'docente_con_cuenta', snippet($r));
    ok('409 de usuarios docentes: message legible en español', humanConflict($r), snippet($r));

    // Alta válida con correo por defecto
    $r = $post(['investigador_id' => $invId]);
    eq('POST válido: 201', 201, $r['status']);
    $row = arr($r);
    ok('Fila con las claves del contrato + password_temporal', !array_diff(array_merge($keys, ['password_temporal']), array_keys($row)), json_encode(array_diff(array_merge($keys, ['password_temporal']), array_keys($row))));
    $temp = (string)($row['password_temporal'] ?? '');
    ok('La temporal tiene 12 caracteres sin ambiguos (sin 0, O, 1, l, I)', (bool)preg_match('/^[A-HJ-NP-Za-km-z2-9]{12}$/', $temp), $temp);
    eq('Correo por defecto = correo de la ficha', strtolower("alta.{$tag}@prueba.mx"), $row['correo'] ?? null);
    eq('Fila: nombre de la ficha, activo 1, cambio obligatorio 1, ficha ligada, sin proyectos ni acceso',
        ["Docente Alta {$tag}", 1, 1, $invId, "Docente Alta {$tag}", 0, null], [$row['nombre'] ?? null, $row['activo'] ?? null, $row['debe_cambiar_password'] ?? null, $row['investigador_id'] ?? null, $row['investigador_nombre'] ?? null, $row['total_proyectos'] ?? null, g($row, 'ultimo_acceso')]);
    $db = $c->rows("SELECT rol, cargo, password_hash, activo FROM usuarios WHERE id = :i", [':i' => $row['id'] ?? 0])[0] ?? [];
    eq('BD: rol investigador y cargo = categoría de la ficha', ['investigador', 'Profesor Titular'], [$db['rol'] ?? null, $db['cargo'] ?? null]);
    ok('BD: solo se guarda el hash bcrypt de la temporal (nunca la temporal)', ($db['password_hash'] ?? '') !== $temp && str_starts_with($db['password_hash'] ?? '', '$2y$') && password_verify($temp, $db['password_hash'] ?? ''));
    ok('La temporal no está en ninguna columna de la BD', (int)$c->scalar("SELECT COUNT(*) FROM usuarios WHERE nombre = :t OR correo = :t OR cargo = :t", [':t' => $temp]) === 0);
    ok('La respuesta de alta no incluye password_hash', !preg_match('/password_hash|\$2y\$/', $r['body']));
    eq('La respuesta con contraseña temporal no se guarda en caché (Cache-Control: no-store)', 'no-store', $r['headers']['cache-control'] ?? null);
    $r2 = $c->a('GET', '/api/eje3/usuarios-docentes');
    ok('La contraseña temporal NO vuelve a mostrarse (ni en la lista)', !str_contains($r2['body'], $temp) && !preg_match('/password_temporal|password_hash|\$2y\$/', $r2['body']));
    $listRow = array_values(array_filter(arr($r2), fn($x) => (int)$x['id'] === (int)$row['id']))[0] ?? [];
    ok('Fila de la lista con las 9 claves del contrato (sin password_temporal)', !array_diff($keys, array_keys($listRow)) && !array_key_exists('password_temporal', $listRow), json_encode(array_keys($listRow)));
    $r = $post(['investigador_id' => $invId, 'correo' => 'otro.' . $tag . '@prueba.mx']);
    ok('Segunda cuenta para el mismo docente: 409 docente_con_cuenta (una cuenta por docente)', $r['status'] === 409 && ($r['json']['errors']['codigo'][0] ?? null) === 'docente_con_cuenta', snippet($r));

    // La temporal funciona y exige el cambio
    $r = $c->login($row['correo'], $temp);
    eq('Login con la temporal: 200 y debe_cambiar_password=1', [200, 1], [$r['status'], $r['json']['data']['user']['debe_cambiar_password'] ?? null]);
    $c->exec("UPDATE usuarios SET ultimo_acceso = :u WHERE id = :i", [':u' => date('Y-m-d H:i:s'), ':i' => $row['id']]);
    eq('El listado refleja ultimo_acceso', true, !empty(array_values(array_filter(arr($c->a('GET', '/api/eje3/usuarios-docentes')), fn($x) => (int)$x['id'] === (int)$row['id']))[0]['ultimo_acceso']));

    // Correo propio y temporales distintas
    $inv2 = arr($c->a('POST', '/api/investigadores', ['nombre_completo' => "Docente Dos {$tag}", 'correo' => strtolower("dos.{$tag}@prueba.mx"), 'afiliacion' => 'Facultad de Pruebas', 'linea_investigacion' => 'Pruebas']));
    $r = $post(['investigador_id' => $inv2['id'], 'correo' => "  Cuenta.Propia.{$tag}@Prueba.mx "]);
    eq('Correo personalizado (recortado): 201', [201, "Cuenta.Propia.{$tag}@Prueba.mx"], [$r['status'], arr($r)['correo'] ?? null]);
    $temp2 = (string)(arr($r)['password_temporal'] ?? '');
    ok('Cada alta genera una temporal distinta', $temp2 !== '' && $temp2 !== $temp);
    eq('Login por correo sin distinguir mayúsculas con la cuenta recién creada', 200, $c->login(strtolower("cuenta.propia.{$tag}@prueba.mx"), $temp2)['status']);
    $uid2 = (int)(arr($r)['id'] ?? 0);
    eq('Cargo por defecto = categoría de la ficha', $c->scalar("SELECT categoria FROM investigadores WHERE id = :i", [':i' => $inv2['id']]), $c->scalar("SELECT cargo FROM usuarios WHERE id = :i", [':i' => $uid2]));

    // Lista: solo docentes (rol investigador), búsqueda y total_proyectos con todos los estados
    $all = arr($c->a('GET', '/api/eje3/usuarios-docentes'));
    $expectedIds = array_map('intval', array_column($c->rows("SELECT id FROM usuarios WHERE rol = 'investigador'"), 'id'));
    $gotIds = array_map('intval', array_column($all, 'id'));
    sort($expectedIds); sort($gotIds);
    eq('La lista incluye SOLO usuarios con rol investigador (no administradores ni lectores)', $expectedIds, $gotIds);
    ok('La lista no incluye al administrador ni al lector', !in_array((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'admin@buap.mx'"), $gotIds, true) && !in_array((int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'lector@test.mx'"), $gotIds, true));
    $s = arr($c->a('GET', '/api/eje3/usuarios-docentes?search=' . urlencode("Alta {$tag}")));
    eq('?search encuentra por nombre', [(int)$row['id']], array_map('intval', array_column($s, 'id')));
    eq('?search encuentra por correo', 1, count(arr($c->a('GET', '/api/eje3/usuarios-docentes?search=' . urlencode(strtolower("cuenta.propia.{$tag}"))))));
    $x = $c->a('GET', '/api/eje3/usuarios-docentes?search[]=x');
    eq('?search en forma de arreglo: 200', 200, $x['status']);
    $x = $c->a('GET', '/api/eje3/usuarios-docentes?search=' . urlencode("' OR 1=1 --"));
    ok('?search con comillas: parametrizado', $x['status'] === 200 && !preg_match('/SQLSTATE/', $x['body']) && arr($x) === [], snippet($x));
    // total_proyectos cuenta todos los estados
    $tt = ['uid' => (int)$row['id'], 'inv' => $invId, 'correo' => $row['correo'], 'temp' => $temp];
    $tok = teacherToken($c, $tt);
    $ids = [];
    foreach (['a', 'b', 'c'] as $n) { $ids[] = (int)(arr($c->t('POST', '/api/docente/proyectos', $tok, projBody("Conteo {$n} {$tag}")))['id'] ?? 0); }
    $c->t('POST', "/api/docente/proyectos/{$ids[0]}/enviar", $tok);
    $x = array_values(array_filter(arr($c->a('GET', '/api/eje3/usuarios-docentes')), fn($u) => (int)$u['id'] === (int)$row['id']))[0] ?? [];
    eq('total_proyectos cuenta TODOS los estados (borrador + enviado)', 3, $x['total_proyectos'] ?? null);
    eq('...y el cambio de contraseña dejó debe_cambiar_password = 0 en la lista', 0, $x['debe_cambiar_password'] ?? null);

    // Restablecer
    $adminHashBefore = (string)$c->scalar("SELECT password_hash FROM usuarios WHERE correo = 'admin@buap.mx'");
    $adminId = (int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'admin@buap.mx'");
    $lectorId = (int)$c->scalar("SELECT id FROM usuarios WHERE correo = 'lector@test.mx'");
    eq('Restablecer un usuario inexistente: 404', 404, $c->a('POST', '/api/eje3/usuarios-docentes/999999/restablecer')['status']);
    eq('Restablecer al ADMINISTRADOR: 404 (solo docentes)', 404, $c->a('POST', "/api/eje3/usuarios-docentes/{$adminId}/restablecer")['status']);
    eq('Restablecer a un lector: 404', 404, $c->a('POST', "/api/eje3/usuarios-docentes/{$lectorId}/restablecer")['status']);
    eq('La contraseña del administrador no cambió', $adminHashBefore, $c->scalar("SELECT password_hash FROM usuarios WHERE correo = 'admin@buap.mx'"));
    $oldTok2 = $tok;
    $oldTok3 = (string)($c->login($row['correo'], $tt['pass'] ?? 'Docente-Clave-1')['json']['data']['token'] ?? '');
    $c->exec("UPDATE usuarios SET intentos_fallidos = 5, bloqueado_hasta = :b WHERE id = :i", [':b' => date('Y-m-d H:i:s', time() + 900), ':i' => $row['id']]);
    eq('Cuenta bloqueada antes de restablecer: el login se rechaza (403)', 403, $c->login($row['correo'], 'Docente-Clave-1')['status']);
    $r = $c->a('POST', "/api/eje3/usuarios-docentes/{$row['id']}/restablecer");
    eq('Restablecer: 200', 200, $r['status']);
    $rr = arr($r);
    $temp3 = (string)($rr['password_temporal'] ?? '');
    ok('Nueva temporal válida y distinta de la anterior', (bool)preg_match('/^[A-HJ-NP-Za-km-z2-9]{12}$/', $temp3) && $temp3 !== $temp);
    eq('La fila vuelve con debe_cambiar_password = 1', 1, $rr['debe_cambiar_password'] ?? null);
    $d = $c->rows("SELECT password_hash, intentos_fallidos, bloqueado_hasta, debe_cambiar_password FROM usuarios WHERE id = :i", [':i' => $row['id']])[0];
    eq('BD: intentos en 0, sin bloqueo, cambio obligatorio', [0, null, 1], [(int)$d['intentos_fallidos'], $d['bloqueado_hasta'], (int)$d['debe_cambiar_password']]);
    ok('BD: guarda el hash de la nueva temporal, no la temporal', $d['password_hash'] !== $temp3 && password_verify($temp3, $d['password_hash']) && !password_verify('Docente-Clave-1', $d['password_hash']));
    eq('Restablecer borra TODAS las sesiones del docente', 0, (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE usuario_id = :i", [':i' => $row['id']]));
    eq('Las sesiones anteriores ya no sirven (401)', [401, 401], [$c->t('GET', '/api/auth/me', $oldTok2)['status'], $c->t('GET', '/api/auth/me', $oldTok3)['status']]);
    eq('La contraseña anterior ya no entra (401)', 401, $c->login($row['correo'], 'Docente-Clave-1')['status']);
    $r = $c->login($row['correo'], $temp3);
    eq('La nueva temporal entra y exige cambio (el bloqueo se limpió)', [200, 1], [$r['status'], $r['json']['data']['user']['debe_cambiar_password'] ?? null]);
    eq('Con la nueva temporal el gate vuelve a aplicarse en /api/docente/*', [403, 'cambio_password_obligatorio'],
        [$c->t('GET', '/api/docente/resumen', $r['json']['data']['token'] ?? '')['status'], $c->t('GET', '/api/docente/resumen', $r['json']['data']['token'] ?? '')['json']['errors']['codigo'][0] ?? null]);
    ok('La respuesta de restablecer no filtra hashes y no se guarda en caché', !preg_match('/password_hash|\$2y\$/', $c->a('POST', "/api/eje3/usuarios-docentes/{$row['id']}/restablecer")['body']));

    // Activar / desactivar
    $tmp = (string)(arr($c->a('POST', "/api/eje3/usuarios-docentes/{$row['id']}/restablecer"))['password_temporal'] ?? '');
    $tt['temp'] = $tmp;
    $tokAct = teacherToken($c, $tt);
    eq('Antes de desactivar la sesión funciona', 200, $c->t('GET', '/api/docente/resumen', $tokAct)['status']);
    eq('PUT sin activo: 400', 400, $c->a('PUT', "/api/eje3/usuarios-docentes/{$row['id']}", [])['status']);
    eq('PUT activo inválido: 400', 400, $c->a('PUT', "/api/eje3/usuarios-docentes/{$row['id']}", ['activo' => 'tal vez'])['status']);
    eq('PUT activo en forma de arreglo: 400', 400, $c->a('PUT', "/api/eje3/usuarios-docentes/{$row['id']}", ['activo' => [0]])['status']);
    $r = $c->a('PUT', "/api/eje3/usuarios-docentes/{$row['id']}", ['activo' => 0]);
    eq('Desactivar: 200 con la fila (activo 0)', [200, 0], [$r['status'], arr($r)['activo'] ?? null]);
    eq('Desactivar borra sus sesiones', 0, (int)$c->scalar("SELECT COUNT(*) FROM sesiones WHERE usuario_id = :i", [':i' => $row['id']]));
    eq('Desactivada: la sesión previa da 401 en /api/docente/*', 401, $c->t('GET', '/api/docente/resumen', $tokAct)['status']);
    eq('Desactivada: no puede iniciar sesión (403)', 403, $c->login($row['correo'], $tt['pass'])['status']);
    $r = $c->a('PUT', "/api/eje3/usuarios-docentes/{$row['id']}", ['activo' => true]);
    eq('Reactivar (true): 200 con activo 1', [200, 1], [$r['status'], arr($r)['activo'] ?? null]);
    eq('Reactivada: vuelve a iniciar sesión', 200, $c->login($row['correo'], $tt['pass'])['status']);
    eq('PUT sobre un usuario inexistente: 404', 404, $c->a('PUT', '/api/eje3/usuarios-docentes/999999', ['activo' => 0])['status']);
    eq('PUT sobre el ADMINISTRADOR: 404 (y sigue activo)', [404, 1], [$c->a('PUT', "/api/eje3/usuarios-docentes/{$adminId}", ['activo' => 0])['status'], (int)$c->scalar("SELECT activo FROM usuarios WHERE id = :i", [':i' => $adminId])]);
    eq('PUT sobre un lector: 404 (y sigue activo)', [404, 1], [$c->a('PUT', "/api/eje3/usuarios-docentes/{$lectorId}", ['activo' => 0])['status'], (int)$c->scalar("SELECT activo FROM usuarios WHERE id = :i", [':i' => $lectorId])]);
    eq('El administrador sigue pudiendo operar', 200, $c->a('GET', '/api/eje3/usuarios-docentes')['status']);
    eq('Si se borra la ficha del docente, la cuenta queda sin docente y su login se rechaza (403)', 403, (function () use ($c, $row, $tt, $ids) {
        foreach ($ids as $i) { $c->exec("DELETE FROM proyecto_apartados WHERE proyecto_id = :p", [':p' => $i]); $c->exec("DELETE FROM proyectos WHERE id = :p", [':p' => $i]); }
        $c->exec("PRAGMA foreign_keys = ON");
        $c->exec("DELETE FROM investigadores WHERE id = :i", [':i' => $tt['inv']]);
        return $c->login($row['correo'], $tt['pass'])['status'];
    })());
    ok('...y investigador_id quedó en NULL (ON DELETE SET NULL)', $c->scalar("SELECT investigador_id FROM usuarios WHERE id = :i", [':i' => $row['id']]) === null);
}

// ===========================================================================
// SUITE: REGLA "SOLO APROBADOS" EN MONITOREO, VISUALIZAR, DIFUSIÓN Y ENDPOINTS PÚBLICOS
// ===========================================================================
function suiteApprovedOnly(Ctx $c): void {
    section('Rol docente · regla "solo aprobados" (antes/después de aprobar)');
    $tag = 'AP' . bin2hex(random_bytes(3));
    $T = mkTeacher($c, "T{$tag}");              // docente sin proyectos aprobados: lo mide todo desde cero
    $tt = teacherToken($c, $T);
    $dt = fn(string $m, string $path, $body = null) => $c->t($m, $path, $tt, $body);
    $ev = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => "Encuentro {$tag}", 'tipo' => 'semilleros', 'publico' => 1]));
    $evId = (int)($ev['id'] ?? 0);

    // Estado inicial (antes de crear nada del docente)
    $snap = function () use ($c, $T, $evId): array {
        $mon = arr($c->a('GET', '/api/eje3/monitoreo'));
        $vis = arr($c->a('GET', '/api/eje3/visualizar'));
        $dif = arr($c->p('GET', '/api/eje3/difusion'));
        $evDetail = arr($c->p('GET', "/api/eje3/difusion/eventos/{$evId}"));
        $evAdmin = arr($c->a('GET', "/api/eje3/eventos/{$evId}"));
        $evList = array_values(array_filter(arr($c->a('GET', '/api/eje3/eventos')), fn($e) => (int)$e['id'] === $evId))[0] ?? [];
        $doc = array_values(array_filter(arr($c->a('GET', '/api/eje3/docentes')), fn($d) => (int)$d['id'] === $T['inv']))[0] ?? [];
        $semEvents = array_values(array_filter($dif['semilleros'] ?? [], fn($e) => (int)$e['id'] === $evId))[0] ?? [];
        return [
            'mon' => [$mon['docentes_con_proyectos'] ?? null, $mon['docentes_titulacion_civ'] ?? null, $mon['docentes_con_semilleros'] ?? null],
            'mon_detalle' => [in_array($T['inv'], array_column($mon['detalle']['con_proyectos'] ?? [], 'id'), true), in_array($T['inv'], array_column($mon['detalle']['titulacion_civ'] ?? [], 'id'), true)],
            'vis_totales' => $vis['totales']['proyectos'] ?? null,
            'vis_docente' => in_array($T['inv'], array_column($vis['produccion_docentes'] ?? [], 'investigador_id'), true),
            'dif_proyectos' => count($semEvents['proyectos'] ?? []),
            'dif_total' => $semEvents['total_proyectos'] ?? null,
            'detalle_evento' => [count($evDetail['proyectos'] ?? []), $evDetail['total_proyectos'] ?? null],
            'evento_admin' => [$evAdmin['total_proyectos'] ?? null, $evList['total_proyectos'] ?? null],
            'docentes_total_proyectos' => $doc['total_proyectos'] ?? null,
        ];
    };
    $pubSnap = function () use ($c, $T, $tag): array {
        $titles = fn($r) => array_column(arr($r), 'titulo');
        $buscar = $c->p('GET', '/api/difusion/buscar?q=' . urlencode($tag));
        $perfil = $c->p('GET', '/api/difusion/perfil/' . $T['inv']);
        $invList = array_values(array_filter(arr($c->p('GET', '/api/investigadores')), fn($i) => (int)$i['id'] === $T['inv']))[0] ?? [];
        $dash = arr($c->p('GET', '/api/metricas/dashboard'));
        return [
            'proyectos' => count(array_filter($titles($c->p('GET', '/api/proyectos?search=' . urlencode($tag))), fn($t) => str_contains($t, $tag))),
            'buscar' => count(array_filter(array_column($buscar['json']['data']['proyectos'] ?? [], 'titulo'), fn($t) => str_contains($t, $tag))),
            'perfil' => count(array_filter(array_column($perfil['json']['data']['proyectos'] ?? [], 'titulo'), fn($t) => str_contains($t, $tag))),
            'inv_total' => (int)($invList['total_proyectos'] ?? -1),
            'inv_total_detalle' => (int)(arr($c->p('GET', '/api/investigadores/' . $T['inv']))['total_proyectos'] ?? -1),
            'kpi_proyectos' => (int)($dash['kpis']['proyectos']['total'] ?? -1),
            'por_estado' => (int)array_sum(array_column($dash['proyectos_por_estado'] ?? [], 'cantidad')),
        ];
    };
    $base = $snap();
    $pbase = $pubSnap();

    // El docente crea un proyecto de cada tipo (el de investigación, el de semillero con evento público y la titulación al CIV)
    $inv = (int)(arr($dt('POST', '/api/docente/proyectos', projBody("Inv {$tag}", 'investigacion')))['id'] ?? 0);
    $sem = (int)(arr($dt('POST', '/api/docente/proyectos', projBody("Sem {$tag}", 'semillero', ['evento_id' => $evId, 'apartados' => [['apartado' => 'Objetivo', 'contenido' => 'Texto']]])))['id'] ?? 0);
    $tit = (int)(arr($dt('POST', '/api/docente/proyectos', projBody("Tit {$tag}", 'titulacion', ['articulado_civ' => 1])))['id'] ?? 0);
    ok('Se crearon los 3 proyectos del docente', $inv > 0 && $sem > 0 && $tit > 0);

    // 1) BORRADOR: nada cambia en ninguna cifra ni lista pública
    eq('BORRADOR: monitoreo, visualizar, difusión y docentes no cambian', $base, $snap());
    eq('BORRADOR: endpoints públicos clásicos no cambian (proyectos, buscar, perfil, investigadores, dashboard)', $pbase, $pubSnap());
    eq('BORRADOR: el admin SÍ lo ve en GET /api/proyectos/:id clásico, el visitante no', [200, 404], [$c->a('GET', "/api/proyectos/{$inv}")['status'], $c->p('GET', "/api/proyectos/{$inv}")['status']]);
    eq('BORRADOR: el Registro admin sí lista el proyecto', true, in_array($inv, array_column(arr($c->a('GET', '/api/eje3/proyectos?search=' . urlencode($tag))), 'id'), true));

    // 2) ENVIADO y 3) DEVUELTO: tampoco cuentan
    foreach ([$inv, $sem, $tit] as $id) { $dt('POST', "/api/docente/proyectos/{$id}/enviar"); }
    eq('ENVIADO: ninguna cifra cambia', [$base, $pbase], [$snap(), $pubSnap()]);
    $c->a('POST', "/api/eje3/proyectos/{$inv}/revision", ['accion' => 'devolver', 'comentario' => 'Ajustar el resumen']);
    eq('DEVUELTO: ninguna cifra cambia', [$base, $pbase], [$snap(), $pubSnap()]);
    $dt('POST', "/api/docente/proyectos/{$inv}/enviar");
    // Catálogos sí cuenta TODOS los estados (el Registro los lista todos)
    $cat = arr($c->a('GET', '/api/eje3/catalogos'));
    eq('catalogos.proyectos_investigacion cuenta todos los estados (= lista filtrada del Registro)', count(arr($c->a('GET', '/api/eje3/proyectos?tipo=investigacion'))), $cat['proyectos_investigacion'] ?? null);

    // 4) APROBADOS uno por uno: cada cifra sube exactamente lo esperado
    $c->a('POST', "/api/eje3/proyectos/{$inv}/revision", ['accion' => 'aprobar']);
    $a1 = $snap();
    eq('Aprobar investigación: docentes_con_proyectos +1 y detalle lo incluye', [$base['mon'][0] + 1, true], [$a1['mon'][0], $a1['mon_detalle'][0]]);
    eq('Aprobar investigación: no cambia titulación-CIV ni semilleros', [$base['mon'][1], $base['mon'][2]], [$a1['mon'][1], $a1['mon'][2]]);
    eq('Aprobar investigación: visualizar.totales.proyectos +1 y el docente entra al ranking', [$base['vis_totales'] + 1, true], [$a1['vis_totales'], $a1['vis_docente']]);
    eq('Aprobar investigación: /api/eje3/docentes total_proyectos = 1', 1, $a1['docentes_total_proyectos']);
    $p1 = $pubSnap();
    eq('Aprobar investigación: ya es visible en /api/proyectos, buscar y perfil públicos', [1, 1, 1], [$p1['proyectos'], $p1['buscar'], $p1['perfil']]);
    eq('Aprobar investigación: investigadores.total_proyectos (lista y detalle) = 1', [1, 1], [$p1['inv_total'], $p1['inv_total_detalle']]);
    eq('Aprobar investigación: dashboard cuenta +1 (kpis y por estado)', [$pbase['kpi_proyectos'] + 1, $pbase['por_estado'] + 1], [$p1['kpi_proyectos'], $p1['por_estado']]);
    eq('Aprobar investigación: el visitante ya puede abrir /api/proyectos/:id', 200, $c->p('GET', "/api/proyectos/{$inv}")['status']);
    eq('Pero el semillero (enviado) sigue sin contar en difusión ni en el evento', [$base['dif_proyectos'], $base['dif_total'], $base['mon'][2]], [$a1['dif_proyectos'], $a1['dif_total'], $a1['mon'][2]]);

    $c->a('POST', "/api/eje3/proyectos/{$sem}/revision", ['accion' => 'aprobar']);
    $a2 = $snap();
    eq('Aprobar semillero: docentes_con_semilleros +1', $base['mon'][2] + 1, $a2['mon'][2]);
    eq('Aprobar semillero: aparece en la difusión pública del evento (lista y total_proyectos)', [1, 1], [$a2['dif_proyectos'], $a2['dif_total']]);
    eq('Aprobar semillero: detalle público del evento y total del admin coinciden', [[1, 1], [1, 1]], [$a2['detalle_evento'], $a2['evento_admin']]);
    $evPub = arr($c->p('GET', "/api/eje3/difusion/eventos/{$evId}"));
    eq('El proyecto del evento trae sus apartados públicos', ["Sem {$tag}", 1], [$evPub['proyectos'][0]['titulo'] ?? null, count($evPub['proyectos'][0]['apartados'] ?? [])]);
    eq('Aprobar semillero: visualizar.totales.proyectos +2 en total', $base['vis_totales'] + 2, $a2['vis_totales']);
    eq('El semillero sigue sin ser público en /api/proyectos (solo investigación)', $p1['proyectos'], $pubSnap()['proyectos']);

    $c->a('POST', "/api/eje3/proyectos/{$tit}/revision", ['accion' => 'aprobar']);
    $a3 = $snap();
    eq('Aprobar titulación CIV: docentes_titulacion_civ +1 y detalle', [$base['mon'][1] + 1, true], [$a3['mon'][1], $a3['mon_detalle'][1]]);
    eq('Con los 3 aprobados: docentes_total_proyectos = 3 y visualizar +3', [3, $base['vis_totales'] + 3], [$a3['docentes_total_proyectos'], $a3['vis_totales']]);
    $d = array_values(array_filter(arr($c->a('GET', '/api/eje3/visualizar'))['produccion_docentes'] ?? [], fn($x) => (int)$x['investigador_id'] === $T['inv']))[0] ?? [];
    eq('produccion_docentes.proyectos del docente = 3 (solo aprobados)', 3, $d['proyectos'] ?? null);

    // 5) Regresar a borrador cuenta menos: el admin lo borra o el docente crea otro borrador -> no suma
    $extra = (int)(arr($dt('POST', '/api/docente/proyectos', projBody("Extra {$tag}", 'investigacion')))['id'] ?? 0);
    eq('Un nuevo borrador del mismo docente no altera ninguna cifra', $a3, $snap());
    $dt('DELETE', "/api/docente/proyectos/{$extra}");

    // 6) Los mismos filtros siguen aplicando visibilidad de la auditoría (evento no público)
    $c->a('PUT', "/api/eje3/eventos/{$evId}", ['publico' => 0]);
    $afterHide = $snap();
    eq('Si el evento se oculta, su semillero aprobado desaparece de la difusión pública', 404, $c->p('GET', "/api/eje3/difusion/eventos/{$evId}")['status']);
    ok('...y el semillero ya no figura en ningún evento de /api/eje3/difusion', !in_array($sem, array_map('intval', array_merge(...array_map(fn($e) => array_column($e['proyectos'] ?? [], 'id'), arr($c->p('GET', '/api/eje3/difusion'))['semilleros'] ?? [[]]))), true));
    $c->a('PUT', "/api/eje3/eventos/{$evId}", ['publico' => 1]);

    // Limpieza
    foreach ([$inv, $sem, $tit] as $id) { $c->a('DELETE', "/api/eje3/proyectos/{$id}"); }
    $c->a('DELETE', "/api/eje3/eventos/{$evId}");
    eq('Tras borrar los proyectos aprobados las cifras vuelven al punto de partida (monitoreo y visualizar)', [$base['mon'], $base['vis_totales']], (function () use ($snap) { $s = $snap(); return [$s['mon'], $s['vis_totales']]; })());
}

// ===========================================================================
// SUITE: AUDITORÍA DE SEGURIDAD · ROL DOCENTE (adenda de SECURITY_AUDIT_EJE3.md)
// ===========================================================================
/** Lanza varias peticiones EN PARALELO (curl_multi) y devuelve [status, cuerpo JSON] de cada una. */
function httpParallel(array $requests): array {
    $mh = curl_multi_init();
    $handles = [];
    foreach ($requests as $i => [$method, $url, $body, $token]) {
        $ch = curl_init($url);
        $h = ['Accept: application/json', 'Content-Type: application/json'];
        if ($token !== null) { $h[] = "Authorization: Bearer {$token}"; }
        curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60, CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body)]);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running) { curl_multi_select($mh, 0.2); }
    } while ($running && $status === CURLM_OK);
    $out = [];
    foreach ($handles as $i => $ch) {
        $raw = (string)curl_multi_getcontent($ch);
        $json = json_decode($raw, true);
        $out[$i] = ['status' => (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE), 'json' => is_array($json) ? $json : null, 'body' => $raw];
        curl_multi_remove_handle($mh, $ch);
    }
    curl_multi_close($mh);
    return $out;
}

function suiteDocenteAudit(Ctx $c, string $root): void {
    section('Auditoría de seguridad · rol docente');
    $tag = 'DA' . bin2hex(random_bytes(3));

    // --- 1. Campos internos del flujo de revisión no son públicos ---
    $T = mkTeacher($c, "A{$tag}");
    $tt = teacherToken($c, $T);
    $p = arr($c->t('POST', '/api/docente/proyectos', $tt, projBody("Interno {$tag}")));
    $pid = (int)($p['id'] ?? 0);
    $c->t('POST', "/api/docente/proyectos/{$pid}/enviar", $tt);
    $r = $c->a('POST', "/api/eje3/proyectos/{$pid}/revision", ['accion' => 'aprobar', 'comentario' => "NOTA-INTERNA-{$tag}"]);
    eq('Aprobar con comentario interno: 200', 200, $r['status']);
    $internal = ['comentario_revision', 'revisado_por', 'revisado_en', 'enviado_en', 'creado_por_usuario_id'];
    $leak = function (string $path) use ($c, $internal, $tag): array {
        $r = $c->p('GET', $path);
        $found = [];
        foreach ($internal as $k) { if (preg_match('/"' . $k . '"/', $r['body'])) { $found[] = $k; } }
        if (strpos($r['body'], "NOTA-INTERNA-{$tag}") !== false) { $found[] = 'texto-del-comentario'; }
        return $found;
    };
    eq('GET /api/proyectos/:id anónimo: sin campos internos de revisión', [], $leak("/api/proyectos/{$pid}"));
    eq('GET /api/proyectos (lista) anónimo: sin campos internos de revisión', [], $leak('/api/proyectos?search=' . urlencode("Interno {$tag}")));
    eq('GET /api/difusion/perfil/:id anónimo: sin campos internos de revisión', [], $leak("/api/difusion/perfil/{$T['inv']}"));
    ok('GET /api/proyectos/:id anónimo sigue mostrando el proyecto aprobado', ($c->p('GET', "/api/proyectos/{$pid}")['json']['data']['titulo'] ?? null) === "Interno {$tag}");
    $x = $c->a('GET', "/api/proyectos/{$pid}");
    eq('GET /api/proyectos/:id como admin: SÍ ve el comentario de revisión', "NOTA-INTERNA-{$tag}", $x['json']['data']['comentario_revision'] ?? null);
    $c->exec("UPDATE investigadores SET snii_elegible = 1 WHERE id = :i", [':i' => $T['inv']]);
    ok('GET /api/difusion/perfil/:id anónimo: sin snii_elegible', !preg_match('/snii_elegible/', $c->p('GET', "/api/difusion/perfil/{$T['inv']}")['body']));
    eq('GET /api/difusion/perfil/:id como admin: conserva snii_elegible', 1, (int)($c->a('GET', "/api/difusion/perfil/{$T['inv']}")['json']['data']['perfil']['snii_elegible'] ?? -1));

    // --- 2. Login: mismo código y mensaje para correo desconocido y contraseña errónea ---
    $unknown = $c->login("nadie.{$tag}@prueba.mx", 'Clave-Erronea-1');
    $wrong = $c->login($T['correo'], 'Clave-Erronea-1');
    eq('Login: correo desconocido y contraseña errónea responden el MISMO código (401)', [401, 401], [$unknown['status'], $wrong['status']]);
    eq('Login: correo desconocido y contraseña errónea responden el MISMO mensaje', $unknown['json']['message'] ?? null, $wrong['json']['message'] ?? 'x');
    ok('Login: el mensaje no menciona intentos restantes ni "no registrado"', !preg_match('/quedan|intento|no registrado/i', (string)($wrong['json']['message'] ?? '')), snippet($wrong));
    eq('Login: el mensaje sigue siendo útil (credenciales incorrectas)', true, str_contains((string)($wrong['json']['message'] ?? ''), 'Credenciales de acceso incorrectas'));
    $c->exec("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = :u", [':u' => $T['uid']]);
    // Cuenta inactiva: contraseña errónea parece cualquier otro fallo; solo con la correcta se informa
    $c->exec("UPDATE usuarios SET activo = 0 WHERE id = :u", [':u' => $T['uid']]);
    $r = $c->login($T['correo'], 'Clave-Erronea-1');
    eq('Cuenta inactiva + contraseña errónea: igual que un correo desconocido (401, mismo mensaje)', [401, $unknown['json']['message'] ?? null], [$r['status'], $r['json']['message'] ?? null]);
    $r = $c->login($T['correo'], $T['pass']);
    eq('Cuenta inactiva + contraseña correcta: 403 con aviso de cuenta inactiva', 403, $r['status']);
    ok('Cuenta inactiva: el mensaje habla de cuenta inactiva', str_contains((string)($r['json']['message'] ?? ''), 'inactiva'), snippet($r));
    $c->exec("UPDATE usuarios SET activo = 1 WHERE id = :u", [':u' => $T['uid']]);

    // --- 3. Contraseñas con costo bcrypt fijo (el tiempo de verificación no delata qué correos existen) ---
    $T2 = mkTeacher($c, "B{$tag}");
    $hash = (string)$c->scalar("SELECT password_hash FROM usuarios WHERE id = :u", [':u' => $T2['uid']]);
    eq('Contraseña temporal: hash bcrypt con costo 12', 12, password_get_info($hash)['options']['cost'] ?? null);
    $tok2 = teacherToken($c, $T2);
    $hash = (string)$c->scalar("SELECT password_hash FROM usuarios WHERE id = :u", [':u' => $T2['uid']]);
    eq('Contraseña cambiada por el docente: hash bcrypt con costo 12', 12, password_get_info($hash)['options']['cost'] ?? null);

    // --- 4. Token Bearer: solo el esquema exacto "Bearer <token>" ---
    $r = http('GET', $c->base . '/api/auth/me', null, null, ["Authorization: Bearer {$tok2}"]);
    eq('Authorization: Bearer <token>: 200', 200, $r['status']);
    $r = http('GET', $c->base . '/api/auth/me', null, null, ["Authorization: Basic x Bearer {$tok2}"]);
    eq('Authorization: "Basic x Bearer <token>" (esquema coladizo): 401', 401, $r['status']);
    $r = http('GET', $c->base . '/api/auth/me', null, null, ["Authorization: Token {$tok2}"]);
    eq('Authorization con otro esquema: 401', 401, $r['status']);

    // --- 5. Las respuestas con sesión no se almacenan en caché ---
    foreach (['/api/docente/resumen', '/api/auth/me', '/api/docente/proyectos'] as $path) {
        $r = $c->t('GET', $path, $tok2);
        ok("GET {$path} con sesión: Cache-Control no-store", str_contains(strtolower($r['headers']['cache-control'] ?? ''), 'no-store'), json_encode($r['headers']));
    }
    $r = $c->p('POST', '/api/auth/login', ['correo' => $T2['correo'], 'password' => $T2['pass']]);
    ok('Respuesta del login (con token): se emite sin cabecera de caché permisiva', !preg_match('/max-age=[1-9]|public/i', $r['headers']['cache-control'] ?? ''));
    $r = $c->a('POST', "/api/eje3/usuarios-docentes/{$T2['uid']}/restablecer");
    ok('Restablecer contraseña: no-store (la temporal no se cachea)', str_contains(strtolower($r['headers']['cache-control'] ?? ''), 'no-store'), json_encode($r['headers']));
    $teacherTmp = (string)($r['json']['data']['password_temporal'] ?? '');
    $log = @file_get_contents($c->tmp . '/server.log') ?: '';
    ok('El log del servidor no contiene contraseñas temporales ni claves', $teacherTmp !== '' && strpos($log, $teacherTmp) === false && strpos($log, $T2['pass']) === false);

    // --- 6. Evento privado e inexistente no se distinguen para el docente ---
    $evPriv = arr($c->a('POST', '/api/eje3/eventos', ['nombre' => "Privado {$tag}", 'tipo' => 'semilleros', 'publico' => 0]));
    $r1 = $c->t('POST', '/api/docente/proyectos', $tt, projBody("EvPriv {$tag}", 'investigacion', ['evento_id' => (int)$evPriv['id']]));
    $r2 = $c->t('POST', '/api/docente/proyectos', $tt, projBody("EvNo {$tag}", 'investigacion', ['evento_id' => 99999999]));
    eq('Evento privado vs inexistente: ambos 400', [400, 400], [$r1['status'], $r2['status']]);
    eq('Evento privado vs inexistente: mismo mensaje de error', $r2['json']['errors']['evento_id'] ?? null, $r1['json']['errors']['evento_id'] ?? 'x');
    $c->a('DELETE', '/api/eje3/eventos/' . $evPriv['id']);

    // --- 7. Tope de proyectos por docente ---
    $T3 = mkTeacher($c, "C{$tag}");
    $tok3 = teacherToken($c, $T3);
    $max = 300;
    $c->pdo->beginTransaction();
    $ins = $c->pdo->prepare("INSERT INTO proyectos (codigo, titulo, investigador_principal_id, fecha_inicio, linea_investigacion, tipo, registro_estado)
        VALUES (:c, :t, :i, '2026-01-01', 'x', 'investigacion', 'borrador')");
    for ($i = 1; $i <= $max; $i++) { $ins->execute([':c' => "LIM-{$tag}-{$i}", ':t' => "Relleno {$i}", ':i' => $T3['inv']]); }
    $c->pdo->commit();
    $r = $c->t('POST', '/api/docente/proyectos', $tok3, projBody("Excede {$tag}"));
    eq('Docente con 300 proyectos: crear otro responde 409 limite_proyectos', [409, 'limite_proyectos'], [$r['status'], $r['json']['errors']['codigo'][0] ?? null]);
    ok('El 409 por límite trae un mensaje legible en español', humanConflict($r), snippet($r));
    $c->exec("DELETE FROM proyectos WHERE codigo = :c", [':c' => "LIM-{$tag}-1"]);
    eq('Al liberar un cupo se puede crear de nuevo (201)', 201, $c->t('POST', '/api/docente/proyectos', $tok3, projBody("Cabe {$tag}"))['status']);
    $c->exec("DELETE FROM proyectos WHERE investigador_principal_id = :i", [':i' => $T3['inv']]);

    // --- 8. Concurrencia (servidor con varios procesos sobre la misma BD) ---
    if (!function_exists('curl_multi_init')) {
        ok('curl_multi disponible para las pruebas de concurrencia', false);
        return;
    }
    $srv = TestServer::start($root, $c->dbPath, $c->tmp . '/server-workers.log', ['PHP_CLI_SERVER_WORKERS' => '8']);
    try {
        // 8a. El bloqueo por 5 intentos no se esquiva con intentos en paralelo (ni hay 500 ni intentos sin contar)
        $T4 = mkTeacher($c, "D{$tag}");
        $tok4 = teacherToken($c, $T4);
        $reqs = [];
        for ($i = 0; $i < 16; $i++) {
            $reqs[] = ['POST', $srv->base . '/api/auth/login', ['correo' => $T4['correo'], 'password' => "Incorrecta-{$i}-xyz"], null];
        }
        $res = httpParallel($reqs);
        $codes = array_count_values(array_column($res, 'status'));
        ksort($codes);
        ok('16 intentos fallidos simultáneos: ningún 500 (solo 401/403)', !array_diff(array_keys($codes), [401, 403]), json_encode($codes));
        $row = $c->rows("SELECT intentos_fallidos AS n, bloqueado_hasta AS b FROM usuarios WHERE id = :u", [':u' => $T4['uid']])[0] ?? [];
        ok('16 intentos fallidos simultáneos: la cuenta queda bloqueada', !empty($row['b']), json_encode($row));
        ok('16 intentos fallidos simultáneos: el contador no pierde incrementos (>= 5)', (int)($row['n'] ?? 0) >= 5, json_encode($row));
        eq('Con la cuenta bloqueada ni la contraseña correcta entra (403)', 403, http('POST', $srv->base . '/api/auth/login', ['correo' => $T4['correo'], 'password' => $T4['pass']])['status']);

        // 8b. Enviar y vaciar los campos obligatorios a la vez nunca deja un proyecto 'enviado' incompleto
        $T5 = mkTeacher($c, "E{$tag}");
        $tok5 = teacherToken($c, $T5);
        $pr = arr($c->t('POST', '/api/docente/proyectos', $tok5, projBody("Carrera {$tag}")));
        $rid = (int)($pr['id'] ?? 0);
        $bad = 0; $five = 0; $rounds = 30;
        for ($i = 0; $i < $rounds; $i++) {
            $c->exec("UPDATE proyectos SET resumen = 'Resumen completo', linea_investigacion = 'Linea X', registro_estado = 'borrador', enviado_en = NULL WHERE id = :i", [':i' => $rid]);
            $res = httpParallel([
                ['PUT', $srv->base . "/api/docente/proyectos/{$rid}", ['resumen' => '', 'linea_investigacion' => ''], $tok5],
                ['POST', $srv->base . "/api/docente/proyectos/{$rid}/enviar", null, $tok5],
            ]);
            foreach ($res as $x) { if ($x['status'] >= 500) { $five++; } }
            $row = $c->rows("SELECT registro_estado AS e, resumen, linea_investigacion AS l FROM proyectos WHERE id = :i", [':i' => $rid])[0] ?? [];
            if (($row['e'] ?? '') === 'enviado' && (trim((string)$row['resumen']) === '' || trim((string)$row['l']) === '')) { $bad++; }
        }
        eq("{$rounds} rondas de PUT(vaciar) + enviar simultáneos: nunca queda 'enviado' con resumen o línea vacíos", 0, $bad);
        eq("{$rounds} rondas de PUT + enviar simultáneos: ninguna respuesta 5xx", 0, $five);

        // 8c. Dos revisiones simultáneas del mismo proyecto: solo una se aplica
        $okRev = 0; $conf = 0; $mixed = 0;
        for ($i = 0; $i < 10; $i++) {
            $c->exec("UPDATE proyectos SET registro_estado = 'enviado', comentario_revision = NULL, revisado_en = NULL WHERE id = :i", [':i' => $rid]);
            $res = httpParallel([
                ['POST', $srv->base . "/api/eje3/proyectos/{$rid}/revision", ['accion' => 'aprobar', 'comentario' => 'AAA'], $c->admin],
                ['POST', $srv->base . "/api/eje3/proyectos/{$rid}/revision", ['accion' => 'devolver', 'comentario' => 'BBB'], $c->admin],
            ]);
            $st = array_column($res, 'status'); sort($st);
            if ($st === [200, 409]) { $okRev++; } elseif ($st === [409, 409] || $st === [200, 200]) { $conf++; } else { $mixed++; }
            $row = $c->rows("SELECT registro_estado AS e, comentario_revision AS c FROM proyectos WHERE id = :i", [':i' => $rid])[0] ?? [];
            if (!(($row['e'] === 'aprobado' && $row['c'] === 'AAA') || ($row['e'] === 'devuelto' && $row['c'] === 'BBB'))) { $mixed++; }
        }
        eq('10 revisiones dobles simultáneas: siempre exactamente una se aplica (200 + 409) y el estado es coherente', [10, 0], [$okRev, $mixed]);
        $c->exec("DELETE FROM proyectos WHERE id IN (:a, :b)", [':a' => $rid, ':b' => $pid]);
    } finally {
        $srv->stop();
    }
}

// ===========================================================================
// ORQUESTACIÓN
// ===========================================================================
function rrmdir(string $dir): void {
    if (!is_dir($dir)) { return; }
    foreach (scandir($dir) as $f) {
        if ($f === '.' || $f === '..') { continue; }
        $p = $dir . '/' . $f;
        is_dir($p) ? rrmdir($p) : @unlink($p);
    }
    @rmdir($dir);
}

function runScenario(string $label, string $root, ?string $seedDb): void {
    global $SCENARIO;
    $SCENARIO = $label;
    echo "\n\033[1;36m==================================================================\033[0m\n";
    echo "\033[1;36m ESCENARIO: {$label}\033[0m\n";
    echo "\033[1;36m==================================================================\033[0m\n";

    $tmp = sys_get_temp_dir() . '/si3-tests-' . bin2hex(random_bytes(4));
    mkdir($tmp, 0777, true);
    $db = $tmp . '/database.sqlite';
    if ($seedDb !== null) { copy($seedDb, $db); }

    $server = null;
    try {
        $server = TestServer::start($root, $db, $tmp . '/server.log');
        $c = new Ctx();
        $c->base = $server->base;
        $c->dbPath = $db;
        $c->root = $root;
        $c->tmp = $tmp;

        // La primera petición ya inicializó/migró la BD; ahora se puede abrir para el oráculo SQL
        $c->pdo = new PDO('sqlite:' . $db, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 10]);
        $c->pdo->exec('PRAGMA busy_timeout = 10000');

        $r = $c->login('admin@buap.mx', 'admin123');
        if ($r['status'] !== 200) {
            ok('Se puede iniciar sesión como administrador', false, snippet($r));
            return;
        }
        $c->admin = (string)$r['json']['data']['token'];

        suiteSchema($c);
        suiteDocenteSchema($c, $root);
        suiteAuth($c);
        suiteRegression($c);
        suiteEvents($c);
        suiteProjects($c);
        suiteRegistries($c);
        suiteFaculty($c);
        suiteMonitoring($c);
        suiteVisualization($c);
        suiteDissemination($c);
        suiteSecurity($c, $root);
        suiteAudit($c);
        // Rol DOCENTE (cuentas, proyectos propios, revisión del admin y regla "solo aprobados")
        suiteDocenteMigration($c, $root);
        suiteDocenteAuth($c);
        suiteDocentePermissions($c, $root);
        suiteDocenteProjects($c);
        suiteDocenteReview($c);
        suiteTeacherAccounts($c);
        suiteApprovedOnly($c);
        suiteDocenteAudit($c, $root);

        $log = @file_get_contents($tmp . '/server.log') ?: '';
        ok('El log del servidor no contiene errores fatales de PHP', !preg_match('/PHP (Fatal error|Parse error)|Uncaught/', $log), substr($log, -400));
    } catch (Throwable $e) {
        ok('La suite terminó sin excepciones', false, get_class($e) . ': ' . $e->getMessage() . ' en ' . basename($e->getFile()) . ':' . $e->getLine());
    } finally {
        if ($server) { $server->stop(); }
        rrmdir($tmp);
    }
}

$hashBefore = file_exists($REPO_DB) ? md5_file($REPO_DB) : null;
$uploadsBefore = glob($ROOT . '/public/uploads/documents/*') ?: [];

runScenario('BD copiada del repositorio (migración sobre una BD existente)', $ROOT, $REPO_DB);
runScenario('BD inexistente (creación desde cero + semilla)', $ROOT, null);

section('Integridad del repositorio');
ok('La BD tracked backend/src/Database/database.sqlite no fue modificada', $hashBefore === (file_exists($REPO_DB) ? md5_file($REPO_DB) : null));
ok('backend/public/uploads/documents no cambió', ($uploadsBefore) === (glob($ROOT . '/public/uploads/documents/*') ?: []));

echo "\n\033[1m================ RESUMEN ================\033[0m\n";
$total = $STATS['pass'] + $STATS['fail'];
echo "Casos: {$total} · \033[32m✔ {$STATS['pass']}\033[0m · " . ($STATS['fail'] ? "\033[31m✘ {$STATS['fail']}\033[0m" : "✘ 0") . "\n";
if ($STATS['fail']) {
    echo "\nFallos:\n";
    foreach ($STATS['failures'] as $f) { echo "  - {$f}\n"; }
    exit(1);
}
echo "Todo en verde.\n";
exit(0);
