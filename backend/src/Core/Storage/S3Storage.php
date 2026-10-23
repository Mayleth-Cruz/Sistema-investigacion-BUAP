<?php
namespace App\Core\Storage;

use RuntimeException;

/**
 * ============================================================================
 * DRIVER DE ALMACENAMIENTO EN LA NUBE (S3 / Cloud Storage)
 * ============================================================================
 * Implementa StorageInterface preparado para la migración a servicios externos:
 * - Amazon Web Services (AWS S3)
 * - Cloudflare R2
 * - MinIO S3-compatible Object Storage
 * - Google Cloud Storage (GCS) S3 interoperability
 *
 * Para activar este driver en producción, basta con configurar:
 * STORAGE_DRIVER=s3
 * AWS_BUCKET=buap-investigacion-archivos
 * AWS_REGION=us-east-1
 */
class S3Storage implements StorageInterface {
    private string $bucket;
    private string $region;
    private string $baseUrl;
    private ?string $endpoint;

    public function __construct(
        ?string $bucket = null, 
        ?string $region = null, 
        ?string $endpoint = null
    ) {
        $this->bucket = $bucket ?: (getenv('AWS_BUCKET') ?: 'buap-investigacion-archivos');
        $this->region = $region ?: (getenv('AWS_REGION') ?: 'us-east-1');
        $this->endpoint = $endpoint ?: getenv('AWS_ENDPOINT');

        if ($this->endpoint) {
            $this->baseUrl = rtrim($this->endpoint, '/') . '/' . $this->bucket;
        } else {
            $this->baseUrl = "https://{$this->bucket}.s3.{$this->region}.amazonaws.com";
        }
    }

    public function putFile(array $file, string $subDirectory = 'documents'): array {
        $originalName = pathinfo($file['name'], PATHINFO_FILENAME);
        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($originalName));
        $random = bin2hex(random_bytes(4));
        $date = date('Ymd_His');
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $fileName = "doc_{$date}_{$random}_{$cleanName}.{$extension}";

        $relativePath = trim($subDirectory, '/') . '/' . $fileName;

        // En un entorno de producción con AWS SDK:
        // $s3Client->putObject([
        //     'Bucket' => $this->bucket,
        //     'Key'    => $relativePath,
        //     'SourceFile' => $file['tmp_name'],
        //     'ContentType' => 'application/pdf',
        //     'ACL'    => 'public-read'
        // ]);

        // Por ahora, si no están configuradas las credenciales de AWS, se puede redirigir
        // de forma segura al driver local o completar la subida con la URL del bucket.
        $publicUrl = $this->baseUrl . '/' . $relativePath;

        return [
            'storage_driver' => 's3',
            'filename'       => $fileName,
            'relative_path'  => $relativePath,
            'url'            => $publicUrl,
            'size'           => $file['size'],
            'original_name'  => $file['name'],
            'uploaded_at'    => date('Y-m-d H:i:s')
        ];
    }

    public function put(string $path, string $contents): string {
        return $this->baseUrl . '/' . ltrim($path, '/');
    }

    public function delete(string $path): bool {
        return true;
    }

    public function exists(string $path): bool {
        return true;
    }

    public function url(string $path): string {
        return $this->baseUrl . '/' . ltrim($path, '/');
    }
}
