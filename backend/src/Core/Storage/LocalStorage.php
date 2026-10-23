<?php
namespace App\Core\Storage;

use RuntimeException;

/**
 * ============================================================================
 * DRIVER DE ALMACENAMIENTO LOCAL EN DISCO (LocalStorage)
 * ============================================================================
 * Implementa StorageInterface almacenando archivos en el sistema de archivos
 * del servidor (backend/public/uploads/) y sirviéndolos a través del servidor web.
 */
class LocalStorage implements StorageInterface {
    private string $baseDir;
    private string $baseUrl;

    public function __construct(?string $baseDir = null, ?string $baseUrl = null) {
        if ($baseDir) {
            $this->baseDir = rtrim($baseDir, '/');
        } else {
            $this->baseDir = dirname(__DIR__, 3) . '/public/uploads';
        }

        if (!is_dir($this->baseDir)) {
            @mkdir($this->baseDir, 0775, true);
        }

        if ($baseUrl) {
            $this->baseUrl = rtrim($baseUrl, '/');
        } else {
            $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
            $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
            $this->baseUrl = "{$scheme}://{$host}/uploads";
        }
    }

    /**
     * Guarda un archivo de $_FILES en disco local con sanitización de nombre.
     */
    public function putFile(array $file, string $subDirectory = 'documents'): array {
        $targetDir = $this->baseDir . '/' . trim($subDirectory, '/');
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0775, true);
        }

        $originalName = pathinfo($file['name'], PATHINFO_FILENAME);
        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($originalName));
        $cleanName = substr($cleanName, 0, 50);
        $random = bin2hex(random_bytes(4));
        $date = date('Ymd_His');
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $fileName = "doc_{$date}_{$random}_{$cleanName}.{$extension}";

        $destination = $targetDir . '/' . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException("No fue posible mover el archivo subido al directorio de destino en disco.");
        }

        $relativePath = trim($subDirectory, '/') . '/' . $fileName;
        $publicUrl = $this->baseUrl . '/' . $relativePath;

        return [
            'storage_driver' => 'local',
            'filename'       => $fileName,
            'relative_path'  => $relativePath,
            'url'            => $publicUrl,
            'size'           => $file['size'],
            'original_name'  => $file['name'],
            'uploaded_at'    => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Guarda contenido en bruto en una ruta relativa.
     */
    public function put(string $path, string $contents): string {
        $fullPath = $this->baseDir . '/' . ltrim($path, '/');
        $dir = dirname($fullPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        file_put_contents($fullPath, $contents);
        return $this->url($path);
    }

    /**
     * Elimina un archivo si existe.
     */
    public function delete(string $path): bool {
        $fullPath = $this->baseDir . '/' . ltrim($path, '/');
        if (file_exists($fullPath)) {
            return @unlink($fullPath);
        }
        return false;
    }

    /**
     * Verifica la existencia de un archivo.
     */
    public function exists(string $path): bool {
        $fullPath = $this->baseDir . '/' . ltrim($path, '/');
        return file_exists($fullPath);
    }

    /**
     * Retorna la URL pública de acceso.
     */
    public function url(string $path): string {
        return $this->baseUrl . '/' . ltrim($path, '/');
    }
}
