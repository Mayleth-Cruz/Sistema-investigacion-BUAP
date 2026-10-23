<?php
namespace App\Database;

use PDO;

class SqliteInitializer {
    public static function initialize(PDO $pdo): void {
        // Desactivar temporalmente foreign keys durante la creación y carga inicial
        $pdo->exec("PRAGMA foreign_keys = OFF;");

        // 1. Crear tablas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS investigadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_completo TEXT NOT NULL,
                correo TEXT NOT NULL UNIQUE,
                identificacion TEXT,
                orcid TEXT,
                afiliacion TEXT NOT NULL,
                categoria TEXT DEFAULT 'Investigador Asociado',
                linea_investigacion TEXT NOT NULL,
                biografia TEXT,
                avatar_url TEXT,
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS proyectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                titulo TEXT NOT NULL,
                resumen TEXT,
                investigador_principal_id INTEGER NOT NULL,
                co_investigadores TEXT,
                estado TEXT NOT NULL DEFAULT 'en_ejecucion',
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE,
                presupuesto REAL NOT NULL DEFAULT 0.00,
                entidad_financiadora TEXT DEFAULT 'Fondos Internos Institucionales',
                linea_investigacion TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (investigador_principal_id) REFERENCES investigadores(id)
            );

            CREATE TABLE IF NOT EXISTS publicaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'articulo_revista',
                investigador_id INTEGER NOT NULL,
                autores TEXT NOT NULL,
                revista_editorial TEXT NOT NULL,
                anio INTEGER NOT NULL,
                volumen TEXT,
                numero TEXT,
                paginas TEXT,
                doi TEXT,
                indexacion TEXT NOT NULL DEFAULT 'Scopus',
                cuartil TEXT NOT NULL DEFAULT 'Q1',
                citas_estimadas INTEGER NOT NULL DEFAULT 0,
                vistas INTEGER NOT NULL DEFAULT 0,
                descargas INTEGER NOT NULL DEFAULT 0,
                acceso_abierto INTEGER NOT NULL DEFAULT 1,
                url_documento TEXT,
                resumen TEXT,
                palabras_clave TEXT,
                area_conocimiento TEXT,
                evento TEXT,
                estado TEXT NOT NULL DEFAULT 'publicado',
                proyecto_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (investigador_id) REFERENCES investigadores(id),
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
            );

            CREATE TABLE IF NOT EXISTS produccion_tecnica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                investigador_id INTEGER NOT NULL,
                autores TEXT NOT NULL,
                anio INTEGER NOT NULL,
                numero_registro TEXT,
                institucion_evento TEXT,
                estado TEXT NOT NULL DEFAULT 'concedida',
                descripcion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (investigador_id) REFERENCES investigadores(id)
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                correo TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                rol TEXT NOT NULL DEFAULT 'lector',
                cargo TEXT,
                activo INTEGER DEFAULT 1,
                intentos_fallidos INTEGER DEFAULT 0,
                bloqueado_hasta DATETIME,
                ultimo_acceso DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                codigo TEXT UNIQUE,
                tipo TEXT NOT NULL DEFAULT 'area_conocimiento',
                descripcion TEXT,
                color TEXT DEFAULT '#003B5C',
                icono TEXT DEFAULT '📚',
                activo INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");

        // Migración dinámica de columnas faltantes para bases de datos SQLite ya creadas
        $cols = $pdo->query("PRAGMA table_info(publicaciones)")->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('resumen', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN resumen TEXT;");
        }
        if (!in_array('palabras_clave', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN palabras_clave TEXT;");
        }
        if (!in_array('area_conocimiento', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN area_conocimiento TEXT;");
        }
        if (!in_array('evento', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN evento TEXT;");
        }
        if (!in_array('estado', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN estado TEXT DEFAULT 'publicado';");
        }
        if (!in_array('vistas', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN vistas INTEGER DEFAULT 0;");
        }
        if (!in_array('descargas', $cols)) {
            $pdo->exec("ALTER TABLE publicaciones ADD COLUMN descargas INTEGER DEFAULT 0;");
        }

        // Asegurar que las publicaciones existentes cuenten con valores realistas si están en 0
        $pdo->exec("
            UPDATE publicaciones SET vistas = 420, descargas = 115 WHERE id = 1 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 380, descargas = 94 WHERE id = 2 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 512, descargas = 142 WHERE id = 3 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 290, descargas = 88 WHERE id = 4 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 185, descargas = 45 WHERE id = 5 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 240, descargas = 62 WHERE id = 6 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 195, descargas = 53 WHERE id = 7 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 310, descargas = 78 WHERE id = 8 AND (vistas IS NULL OR vistas = 0);
            UPDATE publicaciones SET vistas = 460, descargas = 130 WHERE id = 9 AND (vistas IS NULL OR vistas = 0);
        ");

        // Índices para optimizar búsquedas (título, autores, resumen) y filtros (año, cuartil, indexación, estado, área)
        $pdo->exec("
            CREATE INDEX IF NOT EXISTS idx_pub_anio ON publicaciones(anio);
            CREATE INDEX IF NOT EXISTS idx_pub_cuartil ON publicaciones(cuartil);
            CREATE INDEX IF NOT EXISTS idx_pub_indexacion ON publicaciones(indexacion);
            CREATE INDEX IF NOT EXISTS idx_pub_tipo ON publicaciones(tipo);
            CREATE INDEX IF NOT EXISTS idx_pub_estado ON publicaciones(estado);
            CREATE INDEX IF NOT EXISTS idx_pub_area ON publicaciones(area_conocimiento);
            CREATE INDEX IF NOT EXISTS idx_pub_investigador ON publicaciones(investigador_id);
            CREATE INDEX IF NOT EXISTS idx_pub_doi ON publicaciones(doi);
            CREATE INDEX IF NOT EXISTS idx_pub_titulo ON publicaciones(titulo);
            CREATE INDEX IF NOT EXISTS idx_pub_estado_anio ON publicaciones(estado, anio);
            CREATE INDEX IF NOT EXISTS idx_pub_estado_area ON publicaciones(estado, area_conocimiento);
        ");

        // 2. Insertar semilla de investigadores si está vacía
        $countInv = (int)$pdo->query("SELECT COUNT(*) FROM investigadores")->fetchColumn();
        if ($countInv === 0) {
            $pdo->exec("
                INSERT INTO investigadores (id, nombre_completo, correo, identificacion, orcid, afiliacion, categoria, linea_investigacion, biografia, avatar_url, activo)
                VALUES
                (1, 'Dra. Elena Ramos Sandoval', 'elena.ramos@universidad.edu', 'ID-882319', '0000-0002-8341-9921', 'Facultad de Ingeniería - Depto. de Computación', 'Investigador Senior (Nivel III)', 'Inteligencia Artificial y Procesamiento de Lenguaje Natural', 'Doctora en Ciencias de la Computación por la Universidad Politécnica de Valencia.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80', 1),
                (2, 'Dr. Carlos Mendoza Villalobos', 'carlos.mendoza@universidad.edu', 'ID-741209', '0000-0001-9234-5510', 'Facultad de Ciencias Básicas - Instituto de Biotecnología', 'Investigador Senior (Nivel II)', 'Biotecnología Molecular y Genómica Ambiental', 'Doctor en Biotecnología Agrícola y Ambiental.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', 1),
                (3, 'Dra. Sofía Valenzuela Duarte', 'sofia.valenzuela@universidad.edu', 'ID-630291', '0000-0003-4412-8876', 'Facultad de Ciencias de la Salud - Escuela de Medicina', 'Investigador Asociado', 'Epidemiología Espacial y Salud Pública', 'Doctora en Salud Global.', 'https://images.unsplash.com/photo-1594824813583-ce5f2a1b15be?w=400&auto=format&fit=crop&q=80', 1),
                (4, 'Dr. Martín Silva Guarnizo', 'martin.silva@universidad.edu', 'ID-551923', '0000-0002-1102-3948', 'Facultad de Ingeniería Mecánica y Eléctrica', 'Investigador Asociado', 'Energías Renovables y Microrredes Inteligentes', 'Ingeniero Eléctrico con Doctorado en Transición Energética.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 1),
                (5, 'MSc. Valentina Pineda Cruz', 'valentina.pineda@universidad.edu', 'ID-442817', '0000-0002-7718-4490', 'Facultad de Ciencias Sociales y Humanidades', 'Investigador Junior', 'Cienciometría, Acceso Abierto y Divulgación Científica', 'Maestra en Gestión de la Información y Estudios de la Ciencia.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80', 1);
            ");
        }

        $countProy = (int)$pdo->query("SELECT COUNT(*) FROM proyectos")->fetchColumn();
        if ($countProy === 0) {
            $pdo->exec("
                INSERT INTO proyectos (id, codigo, titulo, resumen, investigador_principal_id, co_investigadores, estado, fecha_inicio, fecha_fin, presupuesto, entidad_financiadora, linea_investigacion)
                VALUES
                (1, 'INV-2025-010', 'Plataforma de Diagnóstico Asistido por Visión Artificial y LLMs en Radiología Torácica', 'Desarrollo de un pipeline clínico de aprendizaje profundo que combina modelos de visión computacional con generadores de reportes contextuales.', 1, 'MSc. Lucas Arteaga, Dr. Andrés Correa', 'en_ejecucion', '2025-02-01', '2027-01-31', 85000.00, 'CONACYT', 'Inteligencia Artificial y Procesamiento de Lenguaje Natural'),
                (2, 'INV-2024-032', 'Biorremediación de Suelos Degradados Mediante Consorcios Bacterianos Nativos y Biochar', 'Aislamiento e identificación metagenómica de comunidades bacterianas capaces de metabolizar metales pesados.', 2, 'Dra. Sandra Lucía Gómez, Ing. Mateo Rios', 'en_ejecucion', '2024-06-15', '2026-12-15', 120000.00, 'Global Challenges', 'Biotecnología Molecular y Genómica Ambiental'),
                (3, 'INV-2024-008', 'Sistema de Alerta Temprana y Predicción de Brotes de Arbovirus con Sensores IoT y Mapas de Calor', 'Integración de estaciones meteorológicas comunitarias de bajo costo y datos de notificación epidemiológica.', 3, 'Dr. Roberto Meza, Est. Camilo Quintero', 'completado', '2024-01-10', '2025-07-30', 48500.00, 'OPS/OMS', 'Epidemiología Espacial y Salud Pública'),
                (4, 'INV-2025-045', 'Control Predictivo y Gemelos Digitales para la Integración de Baterías de Flujo en Redes Fotovoltaicas', 'Diseño de un gemelo digital para optimizar la vida útil y la eficiencia en el despacho de microrredes aisladas.', 4, 'Ing. Felipe Restrepo, Dr. Carlos Mendoza', 'en_ejecucion', '2025-04-01', '2027-04-01', 94000.00, 'MinEnergía', 'Energías Renovables y Microrredes Inteligentes'),
                (5, 'INV-2026-003', 'Mapeo del Ecosistema de Producción Científica Latinoamericana y su Adopción de Ciencia Abierta', 'Estudio cienciométrico sobre el impacto de los repositorios institucionales de acceso abierto.', 5, 'Dra. Elena Ramos Sandoval', 'propuesta', '2026-06-01', '2027-12-31', 25000.00, 'Vicerrectoría de Investigación', 'Cienciometría, Acceso Abierto y Divulgación Científica');
            ");
        }

        $countPub = (int)$pdo->query("SELECT COUNT(*) FROM publicaciones")->fetchColumn();
        if ($countPub === 0) {
            $pdo->exec("
                INSERT INTO publicaciones (id, titulo, tipo, investigador_id, autores, revista_editorial, anio, volumen, numero, paginas, doi, indexacion, cuartil, citas_estimadas, acceso_abierto, url_documento, proyecto_id)
                VALUES
                (1, 'Deep multimodal transformer architectures for automated chest radiograph report generation: A benchmark study', 'articulo_revista', 1, 'Ramos-Sandoval, E., Arteaga, L., Correa, A., & Zhang, Y.', 'IEEE Transactions on Medical Imaging', 2025, '44', '3', '812-825', '10.1109/TMI.2025.1092837', 'IEEE Xplore', 'Q1', 28, 1, 'https://doi.org/10.1109/TMI.2025.1092837', 1),
                (2, 'Metagenomic profiling of rhizosphere microbiome reveals novel heavy-metal resistant fungal and bacterial consortia', 'articulo_revista', 2, 'Mendoza-Villalobos, C., Gómez, S. L., & Chen, H.', 'Frontiers in Microbiology', 2024, '15', '2', '1044-1059', '10.3389/fmicb.2024.992811', 'Scopus', 'Q1', 42, 1, 'https://doi.org/10.3389/fmicb.2024.992811', 2),
                (3, 'Spatiotemporal modeling of dengue transmission dynamics using hyper-local climatic sensor grids in tropical urban environments', 'articulo_revista', 3, 'Valenzuela-Duarte, S., Meza, R., & Lopez-Gomez, J.', 'The Lancet Regional Health - Americas', 2025, '29', '1', '100650', '10.1016/j.lana.2024.100650', 'Scopus', 'Q1', 19, 1, 'https://doi.org/10.1016/j.lana.2024.100650', 3),
                (4, 'Decentralized energy management in renewable microgrids using deep reinforcement learning and battery state forecasting', 'articulo_revista', 4, 'Silva-Guarnizo, M., Restrepo, F., & Al-Ammar, E.', 'Applied Energy', 2024, '360', 'B', '122789', '10.1016/j.apenergy.2024.122789', 'Web of Science', 'Q1', 37, 0, 'https://doi.org/10.1016/j.apenergy.2024.122789', 4),
                (5, 'Open access adoption and altmetric impact in Latin American universities: A comprehensive 10-year bibliometric review', 'articulo_revista', 5, 'Pineda-Cruz, V., Ramos-Sandoval, E., & Morales, G.', 'Scientometrics', 2025, '129', '4', '2105-2127', '10.1007/s11192-025-05201-8', 'Scopus', 'Q2', 14, 1, 'https://doi.org/10.1007/s11192-025-05201-8', 5);
            ");
        }

        // 3. Insertar usuario Administrador y usuarios de prueba si no existen
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE correo = ?");
        $stmt->execute(['admin@buap.mx']);
        if ((int)$stmt->fetchColumn() === 0) {
            $adminHash = password_hash('admin123', PASSWORD_BCRYPT);
            $userHash = password_hash('lector123', PASSWORD_BCRYPT);

            $insertStmt = $pdo->prepare("
                INSERT INTO usuarios (nombre, correo, password_hash, rol, cargo, activo)
                VALUES (?, ?, ?, ?, ?, 1)
            ");
            
            // Administrador institucional oficial
            $insertStmt->execute([
                'Dra. María Elena Ramos',
                'admin@buap.mx',
                $adminHash,
                'administrador',
                'Administradora de Investigación VIEP'
            ]);

            // Usuario con rol 'investigador' para probar rechazo de acceso al login administrativo
            $insertStmt->execute([
                'Dr. Carlos Mendoza Villalobos',
                'investigador@buap.mx',
                $userHash,
                'investigador',
                'Investigador Titular'
            ]);
        }

        // 4. Insertar categorías y áreas del conocimiento por defecto si está vacía
        $countCat = (int)$pdo->query("SELECT COUNT(*) FROM categorias")->fetchColumn();
        if ($countCat === 0) {
            $catStmt = $pdo->prepare("
                INSERT INTO categorias (nombre, codigo, tipo, descripcion, color, icono, activo)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ");

            // Áreas del Conocimiento (VIEP-BUAP)
            $catStmt->execute(['Ciencias Exactas e Ingenierías', 'AREA_EXACTAS', 'area_conocimiento', 'Computación, Inteligencia Artificial, Física, Matemáticas, Nanotecnología y Electrónica', '#003B5C', 'settings']);
            $catStmt->execute(['Ciencias Naturales y de la Salud', 'AREA_SALUD', 'area_conocimiento', 'Medicina, Epidemiología, Biotecnología Molecular, Microbioma y Bioquímica', '#00A3E0', 'dna']);
            $catStmt->execute(['Ciencias Sociales y Humanidades', 'AREA_SOCIALES', 'area_conocimiento', 'Educación, Sociología, Historia, Filosofía, Derecho y Políticas Públicas', '#7C3AED', 'landmark']);
            $catStmt->execute(['Económico - Administrativas', 'AREA_ECONOMICA', 'area_conocimiento', 'Economía, Finanzas, Gestión de la Innovación y Políticas de Desarrollo', '#059669', 'chart']);
            $catStmt->execute(['Agropecuarias y Ambientales', 'AREA_AGRO', 'area_conocimiento', 'Agronomía, Veterinaria, Biorremediación, Ecología y Cambio Climático', '#16A34A', 'leaf']);
            $catStmt->execute(['Nivel Medio Superior', 'AREA_PREPARATORIAS', 'area_conocimiento', 'Proyectos Formativos de Investigación Jóvenes y Bachilleratos BUAP', '#D97706', 'graduation']);

            // Formatos / Géneros de Publicación
            $catStmt->execute(['Artículo Científico en Revista Indexada (Journal)', 'GEN_ARTICULO', 'genero_publicacion', 'Artículo original evaluado por pares en revistas internacionales o nacionales', '#0284C7', 'document']);
            $catStmt->execute(['Capítulo de Libro Científico Arbitrado', 'GEN_CAPITULO', 'genero_publicacion', 'Contribución temática arbitrada en obras colectivas especializadas', '#8B5CF6', 'book']);
            $catStmt->execute(['Libro Científico Completo / Monografía', 'GEN_LIBRO', 'genero_publicacion', 'Obra completa de investigación científica o texto universitario especializado', '#F59E0B', 'books']);
            $catStmt->execute(['Artículo de Conferencia / Proceedings Internacionales', 'GEN_CONFERENCIA', 'genero_publicacion', 'Ponencia dictaminada en actas de congresos y simposios científicos', '#10B981', 'microphone']);
            $catStmt->execute(['Reporte Técnico / Dictamen Institucional', 'GEN_REPORTE', 'genero_publicacion', 'Informe técnico de avance o entrega de resultados para organismos e industrias', '#64748B', 'document']);
            $catStmt->execute(['Tesis de Posgrado (Maestría / Doctorado)', 'GEN_TESIS', 'genero_publicacion', 'Tesis de grado o posgrado defendida y aprobada', '#EC4899', 'graduation']);
            $catStmt->execute(['Patente / Propiedad Industrial', 'GEN_PATENTE', 'genero_publicacion', 'Patente de invención o modelo de utilidad concedido o solicitado ante el IMPI', '#DC2626', 'lightbulb']);
        }

        // Reactivar verificación de llaves foráneas
        $pdo->exec("PRAGMA foreign_keys = ON;");
    }
}
