<?php
namespace App\Core\Storage;

/**
 * ============================================================================
 * GESTOR DE ALMACENAMIENTO (Storage Factory / Facade)
 * ============================================================================
 * Proporciona un punto de acceso centralizado a los drivers de almacenamiento.
 * Permite cambiar el backend de almacenamiento (disco local vs servicios cloud)
 * de forma transparente para toda la aplicación.
 */
class Storage {
    private static ?StorageInterface $driverInstance = null;

    /**
     * Obtiene la instancia del driver de almacenamiento configurado.
     *
     * @param string|null $driver Nombre opcional del driver ('local', 's3')
     * @return StorageInterface
     */
    public static function disk(?string $driver = null): StorageInterface {
        $selectedDriver = $driver ?: (getenv('STORAGE_DRIVER') ?: 'local');

        if (self::$driverInstance === null) {
            switch ($selectedDriver) {
                case 's3':
                    self::$driverInstance = new S3Storage();
                    break;
                case 'local':
                default:
                    self::$driverInstance = new LocalStorage();
                    break;
            }
        }

        return self::$driverInstance;
    }
}
