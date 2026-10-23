<?php
namespace App\Core\Storage;

/**
 * ============================================================================
 * INTERFAZ DE ALMACENAMIENTO (StorageInterface)
 * ============================================================================
 * Define el contrato estándar para el almacenamiento de archivos (PDFs, docs).
 * Permite desacoplar los controladores del medio físico para cambiar fácilmente
 * entre almacenamiento local en disco y servicios externos en la nube (AWS S3,
 * Google Cloud Storage, Azure Blob Storage, MinIO, Cloudflare R2).
 */
interface StorageInterface {
    /**
     * Almacena un archivo proveniente de $_FILES y retorna su metadata y URL pública.
     *
     * @param array $file Estructura $_FILES['campo']
     * @param string $subDirectory Subcarpeta de destino (ej. 'documents')
     * @return array Metadata con 'url', 'filename', 'relative_path', 'size', etc.
     */
    public function putFile(array $file, string $subDirectory = 'documents'): array;

    /**
     * Guarda contenido binario directo o texto en el almacenamiento.
     */
    public function put(string $path, string $contents): string;

    /**
     * Elimina un archivo del almacenamiento.
     */
    public function delete(string $path): bool;

    /**
     * Comprueba la existencia de un archivo.
     */
    public function exists(string $path): bool;

    /**
     * Retorna la URL pública accesible para el cliente.
     */
    public function url(string $path): string;
}
