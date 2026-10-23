<?php
/**
 * ============================================================================
 * SISTEMA INTEGRAL DE INFORMACIÓN PARA LA INVESTIGACIÓN (SI3)
 * ============================================================================
 * ARCHIVO: backend/public/index.php
 * ROL: Front Controller / Punto de Entrada Principal de la API REST
 * 
 * Este archivo recibe todas las peticiones entrantes desde el cliente (React),
 * inicializa el autoloader de clases, configura las cabeceras CORS y
 * despacha las rutas correspondientes a cada módulo.
 * ============================================================================
 */

// 1. Manejo de Errores en tiempo de desarrollo
error_reporting(E_ALL);
ini_set('display_errors', '1');

// 2. Autoloader PSR-4 Nativo
// Carga automáticamente las clases bajo el namespace App\... desde la carpeta src/
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

use App\Core\Request;
use App\Core\Response;
use App\Core\Router;

// 3. Manejo de peticiones pre-flight CORS (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::applyCorsHeaders();
    http_response_code(200);
    exit;
}

// 4. Instanciamos los componentes del Núcleo
$request = new Request();
$router = new Router();

// ============================================================================
// REGISTRO MODULAR DE RUTAS (API REST)
// ============================================================================

// --- Ruta de Bienvenida / Health Check ---
$router->get('/api', function(Request $req) {
    Response::success([
        'plataforma' => 'Sistema Integral de Información para la Investigación (SI3)',
        'estado'     => 'API en línea y operativa',
        'version'    => '1.0.0',
        'modulos'    => [
            'investigadores' => '/api/investigadores',
            'proyectos'      => '/api/proyectos',
            'publicaciones'  => '/api/publicaciones',
            'produccion'     => '/api/produccion',
            'metricas'       => '/api/metricas/dashboard',
            'difusion'       => '/api/difusion/buscar?q={termino}'
        ]
    ], 'Bienvenido a la API del Sistema de Investigación');
});

// --- MÓDULO 1: INVESTIGADORES ---
use App\Modules\Researchers\ResearcherController;
$router->get('/api/investigadores',       [ResearcherController::class, 'index']);
$router->get('/api/investigadores/:id',   [ResearcherController::class, 'show']);
$router->post('/api/investigadores',      [ResearcherController::class, 'store']);
$router->put('/api/investigadores/:id',   [ResearcherController::class, 'update']);
$router->delete('/api/investigadores/:id',[ResearcherController::class, 'destroy']);

// --- MÓDULO 2: PROYECTOS DE INVESTIGACIÓN ---
use App\Modules\Projects\ProjectController;
$router->get('/api/proyectos',       [ProjectController::class, 'index']);
$router->get('/api/proyectos/:id',   [ProjectController::class, 'show']);
$router->post('/api/proyectos',      [ProjectController::class, 'store']);
$router->put('/api/proyectos/:id',   [ProjectController::class, 'update']);
$router->delete('/api/proyectos/:id',[ProjectController::class, 'destroy']);

// --- MÓDULO 3: PUBLICACIONES CIENTÍFICAS Y ADMINISTRACIÓN ---
use App\Modules\Publications\PublicationController;
$router->get('/api/admin/stats',                 [PublicationController::class, 'adminStats']);
$router->get('/api/publicaciones/eventos',       [PublicationController::class, 'events']);
$router->get('/api/publicaciones/carpetas',      [PublicationController::class, 'folders']);
$router->get('/api/publicaciones',               [PublicationController::class, 'index']);
$router->get('/api/publicaciones/:id',           [PublicationController::class, 'show']);
$router->post('/api/publicaciones',              [PublicationController::class, 'store']);
$router->put('/api/publicaciones/:id',           [PublicationController::class, 'update']);
$router->delete('/api/publicaciones/:id',        [PublicationController::class, 'destroy']);
$router->post('/api/publicaciones/:id/vista',    [PublicationController::class, 'recordView']);
$router->post('/api/publicaciones/:id/descarga', [PublicationController::class, 'recordDownload']);

// --- MÓDULO 4: PRODUCCIÓN TÉCNICA (Patentes, Tesis, Software) ---
use App\Modules\Production\ProductionController;
$router->get('/api/produccion',       [ProductionController::class, 'index']);
$router->get('/api/produccion/:id',   [ProductionController::class, 'show']);
$router->post('/api/produccion',      [ProductionController::class, 'store']);
$router->put('/api/produccion/:id',   [ProductionController::class, 'update']);
$router->delete('/api/produccion/:id',[ProductionController::class, 'destroy']);

// --- MÓDULO 5: MONITOREO Y MÉTRICAS (KPIs, Cuartiles Q1-Q4) ---
use App\Modules\Metrics\MetricsController;
$router->get('/api/metricas/dashboard', [MetricsController::class, 'dashboard']);

// --- MÓDULO 6: DIFUSIÓN CIENTÍFICA (Búsqueda, BibTeX, Perfil Público) ---
use App\Modules\Dissemination\DisseminationController;
$router->get('/api/difusion/buscar',      [DisseminationController::class, 'search']);
$router->get('/api/difusion/perfil/:id',  [DisseminationController::class, 'profile']);
$router->get('/api/difusion/bibtex/:id',  [DisseminationController::class, 'bibtex']);

// --- MÓDULO 7: AUTENTICACIÓN INSTITUCIONAL Y SEGURIDAD ---
use App\Modules\Auth\AuthController;
$router->post('/api/auth/login',          [AuthController::class, 'login']);
$router->get('/api/auth/me',              [AuthController::class, 'me']);
$router->post('/api/auth/logout',         [AuthController::class, 'logout']);

// --- MÓDULO 8: SUBIDA SEGURA DE ARCHIVOS PDF ---
use App\Modules\Upload\UploadController;
$router->post('/api/upload/pdf',          [UploadController::class, 'uploadPdf']);

// --- MÓDULO 9: CATEGORÍAS Y ÁREAS DEL CONOCIMIENTO ---
use App\Modules\Categories\CategoryController;
$router->get('/api/categorias',           [CategoryController::class, 'index']);
$router->get('/api/categorias/:id',       [CategoryController::class, 'show']);
$router->post('/api/categorias',          [CategoryController::class, 'store']);
$router->put('/api/categorias/:id',       [CategoryController::class, 'update']);
$router->delete('/api/categorias/:id',    [CategoryController::class, 'destroy']);

// 5. Despachamos la petición hacia la ruta coincidente
$router->dispatch($request);
