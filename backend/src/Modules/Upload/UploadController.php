<?php
namespace App\Modules\Upload;

use App\Core\Request;
use App\Core\Response;
use App\Core\Storage\Storage;
use App\Modules\Auth\AuthController;

/**
 * ============================================================================
 * CONTROLADOR DE SUBIDA DE ARCHIVOS Y DOCUMENTOS (UploadController)
 * ============================================================================
 * Maneja la subida segura de archivos PDF para artículos e investigaciones:
 * 1. Control de acceso: Solo administradores autorizados pueden subir archivos.
 * 2. Validación estricta de extensión (.pdf).
 * 3. Validación de tipo MIME real en el contenido del archivo (application/pdf).
 * 4. Inspección de Magic Bytes binarios (%PDF-) para prevenir scripts camuflados.
 * 5. Límite de tamaño configurable (máximo 25 MB).
 * 6. Arquitectura modular de almacenamiento (StorageInterface: Local / S3 / Cloud).
 * 7. Generación de URLs públicas accesibles para descarga y visualización en el frontend.
 */
class UploadController {
    /**
     * Procesa la subida de un documento PDF.
     */
    public function uploadPdf(Request $request): void {
        // 1. Control de acceso: Solo el administrador puede subir archivos
        $admin = AuthController::checkAdmin($request);
        if (!$admin) {
            return; // checkAdmin ya envió la respuesta 401 o 403
        }

        // Buscar el archivo en los campos habituales de la petición multipart
        $file = $request->getFile('pdf') 
             ?? $request->getFile('file') 
             ?? $request->getFile('documento') 
             ?? $request->getFile('archivo');

        if (!$file || empty($file['tmp_name'])) {
            Response::badRequest('No se recibió ningún archivo PDF para subir. Verifica el campo "pdf" en el formulario.');
            return;
        }

        // 2. Verificar posibles errores en la subida nativa de PHP
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE   => 'El archivo excede el tamaño máximo permitido por el servidor (upload_max_filesize).',
                UPLOAD_ERR_FORM_SIZE  => 'El archivo excede el tamaño máximo permitido por el formulario.',
                UPLOAD_ERR_PARTIAL    => 'El archivo fue subido solo parcialmente.',
                UPLOAD_ERR_NO_FILE    => 'No se subió ningún archivo.',
                UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal en el servidor.',
                UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo en el disco.',
                UPLOAD_ERR_EXTENSION  => 'Una extensión de PHP detuvo la subida del archivo.'
            ];
            $msg = $errorMessages[$file['error']] ?? 'Error desconocido al subir el archivo.';
            Response::badRequest($msg);
            return;
        }

        // 3. Validación de tamaño (máximo 25 MB = 26,214,400 bytes)
        $maxBytes = 25 * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            Response::badRequest('El archivo excede el límite máximo permitido de 25 MB.');
            return;
        }

        // 4. Validación de extensión de archivo (.pdf)
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($extension !== 'pdf') {
            Response::badRequest('Formato no permitido. Solo se admiten documentos en formato PDF (.pdf).');
            return;
        }

        // 5. Validación de tipo MIME real del contenido
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);

            if ($mimeType !== 'application/pdf' && $mimeType !== 'application/x-pdf') {
                Response::badRequest("El contenido del archivo no corresponde a un documento PDF legítimo (MIME detectado: {$mimeType}).");
                return;
            }
        }

        // 6. Verificación de firma binaria (Magic Bytes: %PDF-)
        $handle = @fopen($file['tmp_name'], 'rb');
        if ($handle) {
            $header = fread($handle, 5);
            fclose($handle);

            if (strncmp($header, '%PDF-', 5) !== 0) {
                Response::badRequest('La cabecera del archivo no coincide con la firma estándar de un documento PDF (%PDF-).');
                return;
            }
        }

        // 7. Almacenamiento modular desacoplado (Local / S3)
        try {
            $storage = Storage::disk();
            $stored = $storage->putFile($file, 'documents');

            Response::created([
                'url'            => $stored['url'],
                'filename'       => $stored['filename'],
                'original_name'  => $stored['original_name'],
                'size'           => (int)$stored['size'],
                'storage_driver' => $stored['storage_driver'] ?? 'local',
                'mime'           => 'application/pdf',
                'uploaded_at'    => $stored['uploaded_at'] ?? date('Y-m-d H:i:s')
            ], 'Documento PDF subido, verificado y almacenado correctamente.');
        } catch (\Throwable $e) {
            Response::serverError('Error al guardar el archivo en el sistema de almacenamiento: ' . $e->getMessage());
        }
    }
}
