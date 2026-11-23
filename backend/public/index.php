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

// 1. Manejo de Errores: los detalles solo se muestran con APP_DEBUG=1 (nunca en producción)
$appDebug = in_array(strtolower(trim((string)getenv('APP_DEBUG'))), ['1', 'true', 'on', 'yes'], true);
error_reporting(E_ALL);
ini_set('display_errors', $appDebug ? '1' : '0');
ini_set('log_errors', '1');

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
            'difusion'       => '/api/difusion/buscar?q={termino}',
            'eje3'           => '/api/eje3/catalogos',
            'docente'        => '/api/docente/resumen'
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
$router->post('/api/auth/cambiar-password', [AuthController::class, 'changePassword']);  // admin o docente

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

// --- MÓDULO 10: EJE 3 · INVESTIGACIÓN APLICADA CON IMPACTO SOCIAL ---
// Leyenda: [A] requiere administrador · [P] público · [P*] público (un admin ve además lo no público)
// Las rutas estáticas se declaran antes que las dinámicas (:id) para evitar choques.
use App\Modules\Eje3\EventController;
use App\Modules\Eje3\Eje3ProjectController;
use App\Modules\Eje3\ParticipantController;
use App\Modules\Eje3\SocialReturnController;
use App\Modules\Eje3\GraduateController;
use App\Modules\Eje3\FacultyController;
use App\Modules\Eje3\CatalogController;
use App\Modules\Eje3\MonitoringController;
use App\Modules\Eje3\VisualizationController;
use App\Modules\Eje3\PublicDisseminationController;
use App\Modules\Eje3\TeacherAccountController;

// Eventos
$router->get('/api/eje3/eventos',                  [EventController::class, 'index']);        // [P*]
$router->get('/api/eje3/eventos/:id',              [EventController::class, 'show']);         // [P*]
$router->post('/api/eje3/eventos',                 [EventController::class, 'store']);        // [A]
$router->put('/api/eje3/eventos/:id',              [EventController::class, 'update']);       // [A]
$router->delete('/api/eje3/eventos/:id',           [EventController::class, 'destroy']);      // [A]

// Proyectos (investigación, semilleros y titulación) con apartados
$router->get('/api/eje3/proyectos',                [Eje3ProjectController::class, 'index']);  // [A]
$router->get('/api/eje3/proyectos/:id',            [Eje3ProjectController::class, 'show']);   // [A]
$router->post('/api/eje3/proyectos',               [Eje3ProjectController::class, 'store']);  // [A]
$router->put('/api/eje3/proyectos/:id',            [Eje3ProjectController::class, 'update']); // [A]
$router->delete('/api/eje3/proyectos/:id',         [Eje3ProjectController::class, 'destroy']);// [A]
$router->post('/api/eje3/proyectos/:id/revision',  [Eje3ProjectController::class, 'review']); // [A] aprobar | devolver
$router->get('/api/eje3/revision',                 [Eje3ProjectController::class, 'pending']);// [A] bandeja de enviados

// Cuentas de docentes (las crea el administrador; contraseña temporal)
$router->get('/api/eje3/usuarios-docentes',                  [TeacherAccountController::class, 'index']);  // [A]
$router->post('/api/eje3/usuarios-docentes',                 [TeacherAccountController::class, 'store']);  // [A]
$router->post('/api/eje3/usuarios-docentes/:id/restablecer', [TeacherAccountController::class, 'reset']);  // [A]
$router->put('/api/eje3/usuarios-docentes/:id',              [TeacherAccountController::class, 'update']); // [A]

// Participantes de evento (dictaminadores, moderadores, relatores, dictaminadores PYAD)
$router->get('/api/eje3/participantes',            [ParticipantController::class, 'index']);  // [A]
$router->get('/api/eje3/participantes/:id',        [ParticipantController::class, 'show']);   // [A]
$router->post('/api/eje3/participantes',           [ParticipantController::class, 'store']);  // [A]
$router->put('/api/eje3/participantes/:id',        [ParticipantController::class, 'update']); // [A]
$router->delete('/api/eje3/participantes/:id',     [ParticipantController::class, 'destroy']);// [A]

// Retribución social (MPYMES, MGT, MDGE)
$router->get('/api/eje3/retribucion-social',       [SocialReturnController::class, 'index']);   // [A]
$router->get('/api/eje3/retribucion-social/:id',   [SocialReturnController::class, 'show']);    // [A]
$router->post('/api/eje3/retribucion-social',      [SocialReturnController::class, 'store']);   // [A]
$router->put('/api/eje3/retribucion-social/:id',   [SocialReturnController::class, 'update']);  // [A]
$router->delete('/api/eje3/retribucion-social/:id',[SocialReturnController::class, 'destroy']); // [A]

// Actividades de egresados de posgrado
$router->get('/api/eje3/egresados',                [GraduateController::class, 'index']);     // [A]
$router->get('/api/eje3/egresados/:id',            [GraduateController::class, 'show']);      // [A]
$router->post('/api/eje3/egresados',               [GraduateController::class, 'store']);     // [A]
$router->put('/api/eje3/egresados/:id',            [GraduateController::class, 'update']);    // [A]
$router->delete('/api/eje3/egresados/:id',         [GraduateController::class, 'destroy']);   // [A]

// Docentes y SNII
$router->get('/api/eje3/docentes',                 [FacultyController::class, 'index']);      // [A]
$router->put('/api/eje3/docentes/:id/snii',        [FacultyController::class, 'updateSnii']); // [A]

// Hub de Registro, Monitoreo, Visualizar y Difundir
$router->get('/api/eje3/catalogos',                [CatalogController::class, 'index']);      // [A]
$router->get('/api/eje3/monitoreo',                [MonitoringController::class, 'index']);   // [A]
$router->get('/api/eje3/visualizar',               [VisualizationController::class, 'index']);// [A]
$router->get('/api/eje3/difusion',                 [PublicDisseminationController::class, 'index']);          // [P]
$router->get('/api/eje3/difusion/eventos/:id',     [PublicDisseminationController::class, 'showEvent']);      // [P]

// --- MÓDULO 11: ROL DOCENTE (prefijo /api/docente; solo docentes con sesión vigente) ---
// Cada ruta exige AuthController::checkDocente() y opera únicamente sobre los proyectos propios.
use App\Modules\Docente\DocenteController;
$router->get('/api/docente/resumen',               [DocenteController::class, 'summary']);
$router->get('/api/docente/proyectos',             [DocenteController::class, 'index']);
$router->post('/api/docente/proyectos',            [DocenteController::class, 'store']);
$router->get('/api/docente/proyectos/:id',         [DocenteController::class, 'show']);
$router->put('/api/docente/proyectos/:id',         [DocenteController::class, 'update']);
$router->delete('/api/docente/proyectos/:id',      [DocenteController::class, 'destroy']);
$router->post('/api/docente/proyectos/:id/enviar', [DocenteController::class, 'submit']);

// 5. Despachamos la petición hacia la ruta coincidente
$router->dispatch($request);
