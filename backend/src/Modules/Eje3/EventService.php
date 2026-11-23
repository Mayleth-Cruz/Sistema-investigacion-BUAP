<?php
namespace App\Modules\Eje3;

use App\Core\Database;

/**
 * ============================================================================
 * SERVICIO DE EVENTOS DE INVESTIGACIÓN (EventService)
 * ============================================================================
 * Reglas de negocio de los eventos (encuentros de semilleros, congresos,
 * convocatorias de la revista PYAD): validación de tipo y estado, fechas
 * coherentes y visibilidad pública.
 */
class EventService {
    public const TIPOS = ['semilleros', 'congreso', 'revista_pyad', 'otro'];
    public const ESTADOS = ['programado', 'en_curso', 'concluido'];

    private EventRepository $repository;

    public function __construct() {
        $this->repository = new EventRepository();
    }

    /**
     * Especificación de campos del evento.
     */
    private function spec(): array {
        return [
            'nombre'       => ['type' => 'string', 'required' => true, 'max' => 250, 'label' => 'nombre'],
            'tipo'         => ['type' => 'enum', 'required' => true, 'values' => self::TIPOS, 'label' => 'tipo'],
            'edicion'      => ['type' => 'string', 'max' => 50],
            'fecha_inicio' => ['type' => 'date'],
            'fecha_fin'    => ['type' => 'date'],
            'sede'         => ['type' => 'string', 'max' => 200],
            'descripcion'  => ['type' => 'text'],
            'estado'       => ['type' => 'enum', 'values' => self::ESTADOS, 'default' => 'programado', 'required' => true],
            'publico'      => ['type' => 'bool', 'default' => 1],
        ];
    }

    /**
     * Lista eventos. Un usuario no administrador solo ve los públicos.
     */
    public function list(array $filters, bool $isAdmin): array {
        return $this->repository->findAll($filters, !$isAdmin);
    }

    /**
     * Detalle de un evento (404 si no existe o no es público para un no administrador).
     */
    public function get(int $id, bool $isAdmin): array {
        $event = $this->repository->findById($id);
        if (!$event || (!$isAdmin && (int)$event['publico'] !== 1)) {
            return ['success' => false, 'notFound' => true, 'message' => "El evento con ID {$id} no fue encontrado."];
        }
        return ['success' => true, 'data' => $event];
    }

    /**
     * Valida y crea un evento.
     */
    public function create(array $data): array {
        [$clean, $errors] = Eje3Fields::process($this->spec(), $data, [], Database::getConnection());
        $errors = $this->checkDates($clean, $errors);
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $id = $this->repository->create($clean);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }

    /**
     * Valida y actualiza un evento (acepta cuerpos parciales).
     */
    public function update(int $id, array $data): array {
        $existing = $this->repository->findById($id);
        if (!$existing) {
            return ['success' => false, 'notFound' => true, 'message' => "El evento con ID {$id} no fue encontrado."];
        }

        [$clean, $errors] = Eje3Fields::process($this->spec(), $data, $existing, Database::getConnection());
        $errors = $this->checkDates($clean, $errors);
        if ($errors) {
            return ['success' => false, 'errors' => $errors];
        }

        $this->repository->update($id, $clean);
        return ['success' => true, 'data' => $this->repository->findById($id)];
    }

    /**
     * Elimina un evento.
     */
    public function delete(int $id): array {
        if (!$this->repository->findById($id)) {
            return ['success' => false, 'notFound' => true, 'message' => "El evento con ID {$id} no fue encontrado."];
        }
        $this->repository->delete($id);
        return ['success' => true, 'data' => null];
    }

    /**
     * La fecha de fin no puede ser anterior a la de inicio.
     */
    private function checkDates(array $clean, array $errors): array {
        if (!empty($clean['fecha_inicio']) && !empty($clean['fecha_fin']) && $clean['fecha_fin'] < $clean['fecha_inicio']
            && empty($errors['fecha_inicio']) && empty($errors['fecha_fin'])) {
            $errors['fecha_fin'][] = "La fecha de fin no puede ser anterior a la fecha de inicio.";
        }
        return $errors;
    }
}
