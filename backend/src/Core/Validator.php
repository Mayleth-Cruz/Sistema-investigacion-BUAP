<?php
namespace App\Core;

/**
 * ============================================================================
 * CLASE VALIDATOR (Validador de Datos de Entrada)
 * ============================================================================
 * Esta clase proporciona reglas de validación comunes para asegurar la integridad
 * de los datos antes de guardarlos en MySQL.
 * Emite mensajes de error claros y en español para cada campo.
 */
class Validator {
    private array $errors = [];

    /**
     * Valida que un campo no esté vacío o nulo.
     *
     * @param mixed $value Valor a comprobar
     * @param string $field Nombre del campo (para el mensaje de error)
     * @param string|null $customMessage Mensaje opcional personalizado
     */
    public function required($value, string $field, ?string $customMessage = null): self {
        if ($value === null || trim((string)$value) === '') {
            $this->errors[$field][] = $customMessage ?: "El campo '{$field}' es obligatorio.";
        }
        return $this;
    }

    /**
     * Valida que un valor tenga formato de correo electrónico válido.
     */
    public function email($value, string $field, ?string $customMessage = null): self {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = $customMessage ?: "El campo '{$field}' debe ser un correo electrónico válido.";
        }
        return $this;
    }

    /**
     * Valida que un valor sea numérico (entero o decimal).
     */
    public function numeric($value, string $field, ?string $customMessage = null): self {
        if (!empty($value) && !is_numeric($value)) {
            $this->errors[$field][] = $customMessage ?: "El campo '{$field}' debe ser un valor numérico.";
        }
        return $this;
    }

    /**
     * Valida que un texto tenga una longitud mínima.
     */
    public function minLength(string $value, int $min, string $field): self {
        if (!empty($value) && mb_strlen($value) < $min) {
            $this->errors[$field][] = "El campo '{$field}' debe tener al menos {$min} caracteres.";
        }
        return $this;
    }

    /**
     * Valida el formato del identificador de investigador ORCID (0000-0000-0000-0000).
     */
    public function orcid($value, string $field = 'orcid'): self {
        if (!empty($value)) {
            $pattern = '/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/';
            if (!preg_match($pattern, (string)$value)) {
                $this->errors[$field][] = "El ORCID no tiene el formato estándar (ejemplo: 0000-0002-1825-0097).";
            }
        }
        return $this;
    }

    /**
     * Comprueba si ocurrieron errores durante la validación.
     */
    public function fails(): bool {
        return !empty($this->errors);
    }

    /**
     * Obtiene el listado completo de errores detectados.
     */
    public function getErrors(): array {
        return $this->errors;
    }
}
