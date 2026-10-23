<?php
namespace App\Core;

/**
 * ============================================================================
 * CLASE ROUTER (Enrutador RESTful de Alta Precisión)
 * ============================================================================
 * Este componente es el corazón del sistema de despacho de rutas.
 * Permite registrar endpoints de forma declarativa y asociarlos a un Controlador
 * y método específico.
 * 
 * Soporta parámetros dinámicos en la URL como:
 *   /api/investigadores/:id
 *   /api/proyectos/:id/publicaciones
 */
class Router {
    private array $routes = [];

    /**
     * Registra una ruta para el método HTTP GET.
     */
    public function get(string $path, $handler): void {
        $this->addRoute('GET', $path, $handler);
    }

    /**
     * Registra una ruta para el método HTTP POST.
     */
    public function post(string $path, $handler): void {
        $this->addRoute('POST', $path, $handler);
    }

    /**
     * Registra una ruta para el método HTTP PUT.
     */
    public function put(string $path, $handler): void {
        $this->addRoute('PUT', $path, $handler);
    }

    /**
     * Registra una ruta para el método HTTP DELETE.
     */
    public function delete(string $path, $handler): void {
        $this->addRoute('DELETE', $path, $handler);
    }

    /**
     * Método interno para registrar cualquier verbo HTTP.
     *
     * @param string $method GET|POST|PUT|DELETE
     * @param string $path Patrón de la ruta (ej: /api/investigadores/:id)
     * @param callable|array $handler Controlador y método a ejecutar [Controller::class, 'metodo']
     */
    private function addRoute(string $method, string $path, $handler): void {
        // Normalizamos la ruta eliminando diagonales finales redundantes
        $normalizedPath = rtrim($path, '/') ?: '/';
        $this->routes[] = [
            'method'  => $method,
            'path'    => $normalizedPath,
            'handler' => $handler
        ];
    }

    /**
     * Despacha la petición entrante buscando una coincidencia en las rutas registradas.
     *
     * @param Request $request Instancia de la petición HTTP actual
     */
    public function dispatch(Request $request): void {
        // Si el navegador envía una petición OPTIONS (pre-flight de CORS), respondemos 200 inmediatamente
        if ($request->getMethod() === 'OPTIONS') {
            Response::applyCorsHeaders();
            http_response_code(200);
            exit;
        }

        $requestMethod = $request->getMethod();
        $requestPath = rtrim($request->getPath(), '/') ?: '/';

        // Recorremos las rutas registradas
        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            // Convertimos la ruta con parámetros (:id) en una expresión regular
            // Ejemplo: /api/investigadores/:id -> #^/api/investigadores/(?P<id>[^/]+)$#
            $pattern = preg_replace('/\:([a-zA-Z0-9_]+)/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = "#^" . $pattern . "$#";

            if (preg_match($pattern, $requestPath, $matches)) {
                // Filtramos únicamente los parámetros nombrados
                $params = array_filter($matches, function($key) {
                    return !is_numeric($key);
                }, ARRAY_FILTER_USE_KEY);

                // Ejecutamos el manejador asociado
                $this->executeHandler($route['handler'], $request, $params);
                return;
            }
        }

        // Si ninguna ruta coincidió, enviamos un error 404 estandarizado
        Response::notFound("La ruta '{$requestMethod} {$requestPath}' no existe en la API.");
    }

    /**
     * Ejecuta el callback o método del controlador asignado a la ruta.
     */
    private function executeHandler($handler, Request $request, array $params): void {
        try {
            if (is_callable($handler)) {
                call_user_func($handler, $request, $params);
            } elseif (is_array($handler) && count($handler) === 2) {
                [$controllerClass, $methodName] = $handler;
                if (!class_exists($controllerClass)) {
                    Response::serverError("El controlador '{$controllerClass}' no fue encontrado.");
                    return;
                }
                $controllerInstance = new $controllerClass();
                if (!method_exists($controllerInstance, $methodName)) {
                    Response::serverError("El método '{$methodName}' no existe en '{$controllerClass}'.");
                    return;
                }
                $controllerInstance->$methodName($request, $params);
            } else {
                Response::serverError("Formato de ruta o handler inválido.");
            }
        } catch (\PDOException $e) {
            // Manejo amigable de errores de Base de Datos
            Response::serverError("Error en base de datos: " . $e->getMessage());
        } catch (\Throwable $e) {
            // Manejo de cualquier otra excepción imprevista
            Response::serverError("Excepción capturada: " . $e->getMessage());
        }
    }
}
