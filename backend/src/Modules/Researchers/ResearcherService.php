<?php
namespace App\Modules\Researchers;

use App\Core\Validator;

/**
 * ============================================================================
 * SERVICIO DE INVESTIGADORES (ResearcherService)
 * ============================================================================
 * Esta clase contiene las reglas de negocio de la entidad Investigador:
 * - Valida que los datos obligatorios existan y tengan el formato correcto.
 * - Asegura que el formato del identificador ORCID cumpla el estándar internacional.
 * - Sirve de puente entre el Controlador y el Repositorio de base de datos.
 */
class ResearcherService {
    private ResearcherRepository $repository;

    public function __construct() {
        $this->repository = new ResearcherRepository();
    }

    /**
     * Obtiene el catálogo de investigadores con opción de búsqueda.
     */
    public function getAllResearchers(?string $search = null): array {
        return $this->repository->findAll($search);
    }

    /**
     * Obtiene el detalle de un investigador específico.
     */
    public function getResearcherById(int $id): ?array {
        return $this->repository->findById($id);
    }

    /**
     * Valida y crea un nuevo investigador.
     *
     * @param array $data Datos enviados desde la interfaz
     * @return array [success => bool, data|errors => mixed]
     */
    /**
     * Valida y crea un nuevo investigador/autor.
     * Requerimiento: Solo se exige obligatoriamente nombre y apellido;
     * el resto de datos (facultad, universidad, correo, etc.) son opcionales.
     */
    public function createResearcher(array $data): array {
        // 1. Resolver el nombre completo a partir de nombre y apellido, o nombre_completo directo
        $nombre = trim((string)($data['nombre'] ?? ''));
        $apellido = trim((string)($data['apellido'] ?? ($data['apellidos'] ?? '')));

        if (!empty($nombre) && !empty($apellido)) {
            $data['nombre_completo'] = "{$nombre} {$apellido}";
        } elseif (empty($data['nombre_completo'])) {
            $data['nombre_completo'] = trim("{$nombre} {$apellido}");
        }

        $validator = new Validator();
        $validator->required($data['nombre_completo'] ?? null, 'nombre_completo', 'El nombre y apellido del autor son obligatorios.');

        if ($validator->fails()) {
            return [
                'success' => false,
                'errors'  => $validator->getErrors()
            ];
        }

        // 2. Resolver campos opcionales con valores predeterminados institucionales
        $universidad = trim((string)($data['universidad'] ?? ''));
        $facultad = trim((string)($data['facultad'] ?? ($data['afiliacion'] ?? '')));

        if (!empty($facultad) && !empty($universidad)) {
            $data['afiliacion'] = "{$facultad} - {$universidad}";
        } elseif (!empty($facultad)) {
            $data['afiliacion'] = $facultad;
        } elseif (!empty($universidad)) {
            $data['afiliacion'] = $universidad;
        } else {
            $data['afiliacion'] = 'Benemérita Universidad Autónoma de Puebla';
        }

        // Correo: opcional (si no se proporciona se genera un alias institucional limpio)
        if (empty($data['correo'])) {
            $cleanName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '.', $data['nombre_completo']));
            $cleanName = trim(preg_replace('/\.+/', '.', $cleanName), '.');
            $data['correo'] = "{$cleanName}." . rand(10, 99) . "@investigacion.buap.mx";
        } else {
            $validator->email($data['correo'], 'correo');
            if ($validator->fails()) {
                return ['success' => false, 'errors' => $validator->getErrors()];
            }
        }

        if (empty($data['linea_investigacion'])) {
            $data['linea_investigacion'] = 'Investigación Científica y Tecnológica';
        }

        if (empty($data['categoria'])) {
            $data['categoria'] = 'Investigador / Autor Adscrito';
        }

        if (empty($data['identificacion'])) {
            $data['identificacion'] = 'ID-' . rand(100000, 999999);
        }

        if (empty($data['orcid'])) {
            $data['orcid'] = null;
        }

        // 3. Persistir en la base de datos
        $newId = $this->repository->create($data);
        $created = $this->repository->findById($newId);

        return [
            'success' => true,
            'data'    => $created
        ];
    }

    /**
     * Valida y actualiza los datos de un investigador existente.
     */
    public function updateResearcher(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return [
                'success' => false,
                'notFound'=> true,
                'message' => "El investigador con ID {$id} no fue encontrado."
            ];
        }

        // Si se proveen nombre y apellido por separado
        $nombre = trim((string)($data['nombre'] ?? ''));
        $apellido = trim((string)($data['apellido'] ?? ($data['apellidos'] ?? '')));
        if (!empty($nombre) && !empty($apellido)) {
            $data['nombre_completo'] = "{$nombre} {$apellido}";
        } elseif (empty($data['nombre_completo'])) {
            $data['nombre_completo'] = $existing['nombre_completo'];
        }

        $validator = new Validator();
        $validator->required($data['nombre_completo'] ?? null, 'nombre_completo', 'El nombre y apellido son obligatorios.');

        if (!empty($data['correo'])) {
            $validator->email($data['correo'], 'correo');
        }

        if ($validator->fails()) {
            return [
                'success' => false,
                'errors'  => $validator->getErrors()
            ];
        }

        $data['correo'] = !empty($data['correo']) ? $data['correo'] : $existing['correo'];
        $data['afiliacion'] = !empty($data['afiliacion']) ? $data['afiliacion'] : ($data['facultad'] ?? $existing['afiliacion']);
        $data['linea_investigacion'] = !empty($data['linea_investigacion']) ? $data['linea_investigacion'] : $existing['linea_investigacion'];
        $data['categoria'] = !empty($data['categoria']) ? $data['categoria'] : $existing['categoria'];
        $data['identificacion'] = $data['identificacion'] ?? $existing['identificacion'];
        $data['orcid'] = !empty($data['orcid']) ? $data['orcid'] : null;
        $data['biografia'] = $data['biografia'] ?? $existing['biografia'];
        $data['avatar_url'] = $data['avatar_url'] ?? $existing['avatar_url'];
        $data['activo'] = isset($data['activo']) ? (int)$data['activo'] : ($existing['activo'] ?? 1);

        $this->repository->update($id, $data);
        $updated = $this->repository->findById($id);

        return [
            'success' => true,
            'data'    => $updated
        ];
    }

    /**
     * Elimina un investigador del sistema.
     */
    public function deleteResearcher(int $id): bool {
        return $this->repository->delete($id);
    }
}
