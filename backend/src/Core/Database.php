<?php
namespace App\Core;

use PDO;
use PDOException;

/**
 * ============================================================================
 * CLASE DATABASE (Patrón Singleton para Conexión PDO con MySQL)
 * ============================================================================
 * Esta clase se encarga de administrar una única instancia de conexión hacia
 * la base de datos MySQL a lo largo del ciclo de vida de la petición HTTP.
 * 
 * Ventajas:
 * 1. Evita abrir múltiples conexiones innecesarias a la base de datos.
 * 2. Maneja errores con mensajes claros y legibles para facilitar el desarrollo.
 * 3. Proporciona métodos convenientes para iniciar y revertir transacciones.
 */
class Database {
    /**
     * Instancia única de la conexión PDO (Singleton).
     */
    private static ?PDO $connection = null;
    private static string $driver = 'mysql';

    /**
     * El constructor se define como privado para evitar que la clase sea
     * instanciada directamente desde afuera con "new Database()".
     */
    private function __construct() {}

    /**
     * Obtiene la conexión activa a MySQL o conmuta automáticamente a SQLite local.
     *
     * @return PDO Objeto de conexión con soporte para sentencias preparadas.
     */
    public static function getConnection(): PDO {
        if (self::$connection === null) {
            $configPath = dirname(__DIR__, 2) . '/config/database.php';
            $config = file_exists($configPath) ? require $configPath : [];

            $host = $config['host'] ?? '127.0.0.1';
            $port = $config['port'] ?? '3306';
            $dbName = $config['database'] ?? 'investigacion_db';
            $user = $config['username'] ?? 'root';
            $pass = $config['password'] ?? '';
            $charset = $config['charset'] ?? 'utf8mb4';

            // 1. Intentar conectar con MySQL primero (con timeout de 1s para desarrollo rápido)
            try {
                $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";
                $options = ($config['options'] ?? []) + [
                    PDO::ATTR_TIMEOUT => 1,
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ];

                self::$connection = new PDO($dsn, $user, $pass, $options);
                self::$driver = 'mysql';
                return self::$connection;
            } catch (\Throwable $e) {
                // 2. Si MySQL no está disponible, activar SQLite local de alta resiliencia
                $sqliteDir = dirname(__DIR__) . '/Database';
                if (!is_dir($sqliteDir)) {
                    @mkdir($sqliteDir, 0777, true);
                }
                $sqlitePath = $sqliteDir . '/database.sqlite';

                self::$connection = new PDO("sqlite:{$sqlitePath}", null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);

                self::$connection->exec('PRAGMA foreign_keys = ON;');
                self::$driver = 'sqlite';

                // Inicializar tablas y datos semilla de forma automática
                require_once dirname(__DIR__) . '/Database/SqliteInitializer.php';
                \App\Database\SqliteInitializer::initialize(self::$connection);

                return self::$connection;
            }
        }

        return self::$connection;
    }

    public static function getDriver(): string {
        return self::$driver;
    }

    /**
     * Inicia una transacción SQL.
     * Útil cuando necesitas insertar un proyecto y sus hitos de forma atómica.
     */
    public static function beginTransaction(): bool {
        return self::getConnection()->beginTransaction();
    }

    /**
     * Confirma permanentemente los cambios de la transacción actual.
     */
    public static function commit(): bool {
        return self::getConnection()->commit();
    }

    /**
     * Deshace los cambios realizados durante la transacción en caso de error.
     */
    public static function rollBack(): bool {
        return self::getConnection()->rollBack();
    }
}
