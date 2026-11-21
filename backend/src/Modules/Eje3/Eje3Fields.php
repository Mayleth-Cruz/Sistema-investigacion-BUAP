<?php
namespace App\Modules\Eje3;

use App\Core\Validator;
use PDO;

/**
 * ============================================================================
 * MOTOR DE VALIDACIÓN Y NORMALIZACIÓN DE CAMPOS DEL EJE 3 (Eje3Fields)
 * ============================================================================
 * Recibe una especificación declarativa de campos y el cuerpo de la petición y
 * devuelve los valores ya limpios (listos para el repositorio) junto con los
 * errores de validación en español, en el formato {campo: [mensajes]} que usa
 * el resto de la API.
 *
 * Tipos soportados: string, text, email, enum, int, decimal, bool, date y fk
 * (llave foránea que debe existir en la tabla indicada).
 *
 * Semántica POST/PUT:
 *  - Alta ($current vacío): los campos ausentes toman su 'default'.
 *  - Edición ($current = fila existente): los campos ausentes conservan su valor
 *    actual y los enviados lo reemplazan (se aceptan cuerpos parciales).
 */
class Eje3Fields {
    /** Tope de un campo de texto largo (columna TEXT). */
    public const MAX_TEXT_BYTES = 65535;
    /** Tope de un entero (columna INT). */
    public const MAX_INT = 2147483647;
    /** Tope de un decimal (columna DECIMAL(14,2) del presupuesto). */
    public const MAX_DECIMAL = 999999999999.99;

    /**
     * @param array $spec    Especificación: nombre => [type, required, max, values, min, default, table]
     * @param array $input   Cuerpo de la petición
     * @param array $current Fila existente (edición) o arreglo vacío (alta)
     * @param PDO   $db      Conexión, para verificar llaves foráneas
     * @return array{0:array,1:array} [valores limpios, errores]
     */
    public static function process(array $spec, array $input, array $current, PDO $db): array {
        $isNew = empty($current);
        $clean = [];
        $errors = [];
        $validator = new Validator();

        foreach ($spec as $name => $rule) {
            $type = $rule['type'] ?? 'string';
            $label = $rule['label'] ?? $name;

            // 1. Valor de origen: lo enviado, o lo actual, o el valor por defecto
            if (array_key_exists($name, $input)) {
                $value = $input[$name];
            } else {
                $value = $current[$name] ?? null;
            }
            if (is_string($value)) {
                $value = trim($value);
            }
            if (($value === null || $value === '') && $isNew && array_key_exists('default', $rule)) {
                $value = $rule['default'];
            }
            $empty = ($value === null || $value === '');

            // 2. Obligatoriedad
            if (!empty($rule['required'])) {
                $validator->required($empty ? null : (is_scalar($value) ? (string)$value : 'x'), $name,
                    $rule['required_message'] ?? "El campo '{$label}' es obligatorio.");
            }
            if ($empty) {
                $clean[$name] = null;
                // Los booleanos y enteros con default no deben quedar nulos
                if ($type === 'bool' && array_key_exists('default', $rule)) { $clean[$name] = (int)$rule['default']; }
                if ($type === 'int' && array_key_exists('default', $rule)) { $clean[$name] = $rule['default']; }
                continue;
            }
            if (is_array($value) || is_object($value)) {
                $errors[$name][] = "El campo '{$label}' tiene un formato inválido.";
                continue;
            }

            // 3. Reglas por tipo
            switch ($type) {
                case 'string':
                case 'text':
                    $value = (string)$value;
                    if (!empty($rule['max']) && mb_strlen($value) > $rule['max']) {
                        $errors[$name][] = "El campo '{$label}' no debe exceder {$rule['max']} caracteres.";
                    } elseif ($type === 'text' && empty($rule['max']) && strlen($value) > self::MAX_TEXT_BYTES) {
                        // Tope de las columnas TEXT (65 535 bytes): evita cargas desmedidas y errores del motor
                        $errors[$name][] = "El campo '{$label}' no debe exceder " . self::MAX_TEXT_BYTES . ' bytes.';
                    }
                    $clean[$name] = $value;
                    break;

                case 'email':
                    $value = (string)$value;
                    $validator->email($value, $name, "El campo '{$label}' debe ser un correo electrónico válido.");
                    if (!empty($rule['max']) && mb_strlen($value) > $rule['max']) {
                        $errors[$name][] = "El campo '{$label}' no debe exceder {$rule['max']} caracteres.";
                    }
                    $clean[$name] = $value;
                    break;

                case 'enum':
                    if (!in_array($value, $rule['values'], true)) {
                        $errors[$name][] = "El campo '{$label}' debe ser uno de: " . implode(', ', $rule['values']) . '.';
                    }
                    $clean[$name] = $value;
                    break;

                case 'int':
                    if (!is_numeric($value) || (float)$value != floor((float)$value)) {
                        $errors[$name][] = "El campo '{$label}' debe ser un número entero.";
                        break;
                    }
                    $maxInt = $rule['max'] ?? self::MAX_INT;
                    if ((float)$value > $maxInt) {
                        $errors[$name][] = "El campo '{$label}' debe ser menor o igual a {$maxInt}.";
                        break;
                    }
                    $value = (int)$value;
                    if (isset($rule['min']) && $value < $rule['min']) {
                        $errors[$name][] = "El campo '{$label}' debe ser mayor o igual a {$rule['min']}.";
                    }
                    $clean[$name] = $value;
                    break;

                case 'decimal':
                    if (!is_numeric($value)) {
                        $errors[$name][] = "El campo '{$label}' debe ser un valor numérico.";
                        break;
                    }
                    $value = (float)$value;
                    $maxDec = $rule['max'] ?? self::MAX_DECIMAL;
                    if (is_nan($value) || $value > $maxDec) {
                        $errors[$name][] = "El campo '{$label}' debe ser menor o igual a " . number_format($maxDec, 2, '.', '') . '.';
                        break;
                    }
                    if (isset($rule['min']) && $value < $rule['min']) {
                        $errors[$name][] = "El campo '{$label}' debe ser mayor o igual a {$rule['min']}.";
                    }
                    $clean[$name] = $value;
                    break;

                case 'bool':
                    $bool = self::toBool($value);
                    if ($bool === null) {
                        $errors[$name][] = "El campo '{$label}' debe ser verdadero o falso (1 o 0).";
                        break;
                    }
                    $clean[$name] = $bool;
                    break;

                case 'date':
                    if (!self::isValidDate($value)) {
                        $errors[$name][] = "El campo '{$label}' debe ser una fecha válida con formato AAAA-MM-DD.";
                        break;
                    }
                    $clean[$name] = (string)$value;
                    break;

                case 'fk':
                    if (!is_numeric($value) || (int)$value <= 0) {
                        $errors[$name][] = "El campo '{$label}' debe ser un identificador numérico válido.";
                        break;
                    }
                    $value = (int)$value;
                    $stmt = $db->prepare("SELECT COUNT(*) FROM {$rule['table']} WHERE id = :id");
                    $stmt->execute([':id' => $value]);
                    if ((int)$stmt->fetchColumn() === 0) {
                        $errors[$name][] = $rule['missing_message'] ?? "El registro indicado en '{$label}' no existe.";
                    }
                    $clean[$name] = $value;
                    break;

                default:
                    $clean[$name] = $value;
            }
        }

        // Los errores del Validator (obligatorios, correo) se combinan con los propios
        foreach ($validator->getErrors() as $field => $messages) {
            foreach ($messages as $message) {
                $errors[$field][] = $message;
            }
        }

        return [$clean, $errors];
    }

    /**
     * Convierte 0/1, true/false, "1"/"0", "true"/"false" a 0 o 1. Devuelve null si no es válido.
     */
    public static function toBool($value): ?int {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
            if ((float)$value === 1.0) { return 1; }
            if ((float)$value === 0.0) { return 0; }
            return null;
        }
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if (in_array($v, ['true', 'si', 'sí', 'on', 'yes'], true)) { return 1; }
            if (in_array($v, ['false', 'no', 'off'], true)) { return 0; }
        }
        return null;
    }

    /**
     * Verifica que el texto sea una fecha real con formato AAAA-MM-DD.
     */
    public static function isValidDate($value): bool {
        if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) {
            return false;
        }
        return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
    }
}
