<?php
namespace App\Core;

/**
 * ============================================================================
 * CLASE REQUEST (Abstracción de la Petición HTTP)
 * ============================================================================
 * Esta clase encapsula toda la información que llega desde el cliente (React):
 * - Método HTTP (GET, POST, PUT, DELETE, OPTIONS)
 * - Parámetros de la URL (Query String: ?page=1&search=biotecnologia)
 * - Cuerpo de la petición en formato JSON (Payload enviado en POST o PUT)
 * - Encabezados HTTP (Headers)
 */
class Request {
    private string $method;
    private string $path;
    private array $queryParams;
    private array $body;
    private array $headers;

    /**
     * El constructor inicializa y parsea automáticamente los datos de la petición entrante.
     */
    public function __construct() {
        // Detectamos el método HTTP (ej: GET, POST, PUT, DELETE)
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        // Extraemos la ruta limpia (sin parámetros de búsqueda)
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $parsedUrl = parse_url($uri);
        $this->path = $parsedUrl['path'] ?? '/';

        // Guardamos los parámetros query ($_GET)
        $this->queryParams = $_GET;

        // Leemos las cabeceras HTTP enviadas por el navegador o cliente
        $this->headers = function_exists('getallheaders') ? getallheaders() : [];

        // Parseamos el cuerpo de la petición si contiene datos en formato JSON
        $this->parseBody();
    }

    /**
     * Parsea el flujo de entrada 'php://input' cuando el cliente envía datos en formato application/json.
     */
    private function parseBody(): void {
        $rawInput = file_get_contents('php://input');

        if (!empty($rawInput)) {
            $decoded = json_decode($rawInput, true);
            // Si el JSON es válido, lo asignamos; si no, dejamos un arreglo vacío
            $this->body = is_array($decoded) ? $decoded : [];
        } else {
            // Si vino por formulario tradicional multipart o urlencoded
            $this->body = $_POST;
        }
    }

    /**
     * Obtiene el método HTTP de la petición (GET, POST, etc.).
     */
    public function getMethod(): string {
        return $this->method;
    }

    /**
     * Obtiene la ruta URL solicitada (ejemplo: "/api/investigadores").
     */
    public function getPath(): string {
        return $this->path;
    }

    /**
     * Obtiene el valor de un parámetro query (?param=valor) o un valor por defecto si no existe.
     *
     * @param string $key Nombre del parámetro
     * @param mixed $default Valor predeterminado en caso de no existir
     * @return mixed
     */
    public function getQuery(string $key, $default = null) {
        return $this->queryParams[$key] ?? $default;
    }

    /**
     * Devuelve todos los parámetros query como un arreglo asociativo.
     */
    public function getAllQueries(): array {
        return $this->queryParams;
    }

    /**
     * Obtiene un campo específico del cuerpo de la petición (body JSON).
     *
     * @param string $key Nombre del atributo enviado en el JSON
     * @param mixed $default Valor por defecto
     * @return mixed
     */
    public function getBodyParam(string $key, $default = null) {
        return $this->body[$key] ?? $default;
    }

    /**
     * Devuelve todo el cuerpo de la petición como un arreglo asociativo.
     */
    public function getBody(): array {
        return $this->body;
    }

    /**
     * Obtiene una cabecera HTTP específica.
     */
    public function getHeader(string $name, $default = null) {
        // Hacemos la búsqueda insensible a mayúsculas/minúsculas
        foreach ($this->headers as $key => $value) {
            if (strcasecmp($key, $name) === 0) {
                return $value;
            }
        }
        return $default;
    }

    /**
     * Obtiene los datos de un archivo subido en multipart/form-data ($_FILES).
     */
    public function getFile(string $key): ?array {
        return $_FILES[$key] ?? null;
    }

    /**
     * Obtiene todos los archivos subidos.
     */
    public function getFiles(): array {
        return $_FILES;
    }
}
