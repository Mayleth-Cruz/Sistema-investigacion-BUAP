<?php
namespace App\Modules\Publications;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE PUBLICACIONES CIENTÍFICAS (PublicationRepository)
 * ============================================================================
 * Gestiona el acceso a la tabla 'publicaciones'.
 * Ofrece consultas avanzadas para filtrar por cuartil (Q1-Q4), año, indexación
 * (Scopus, WoS, Scielo), o investigador.
 */
class PublicationRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Lista publicaciones con filtros opcionales de cuartil, año, tipo, indexación o investigador.
     */
    public function findAll(array $filters = []): array {
        $sql = "SELECT 
                    pub.*,
                    i.nombre_completo AS investigador_nombre,
                    i.correo AS investigador_correo,
                    i.orcid AS investigador_orcid,
                    pro.codigo AS proyecto_codigo,
                    pro.titulo AS proyecto_titulo
                FROM publicaciones pub
                JOIN investigadores i ON i.id = pub.investigador_id
                LEFT JOIN proyectos pro ON pro.id = pub.proyecto_id";

        $conditions = [];
        $params = [];

        if (!empty($filters['cuartil'])) {
            $conditions[] = "pub.cuartil = :cuartil";
            $params[':cuartil'] = $filters['cuartil'];
        }

        if (!empty($filters['anio'])) {
            $conditions[] = "pub.anio = :anio";
            $params[':anio'] = (int)$filters['anio'];
        }

        if (!empty($filters['indexacion'])) {
            $conditions[] = "pub.indexacion = :indexacion";
            $params[':indexacion'] = $filters['indexacion'];
        }

        if (!empty($filters['tipo'])) {
            $conditions[] = "pub.tipo = :tipo";
            $params[':tipo'] = $filters['tipo'];
        }

        if (!empty($filters['investigador_id'])) {
            $conditions[] = "pub.investigador_id = :investigador_id";
            $params[':investigador_id'] = (int)$filters['investigador_id'];
        }

        $areaFilter = !empty($filters['area_conocimiento']) ? $filters['area_conocimiento'] : (!empty($filters['categoria']) ? $filters['categoria'] : null);
        if (!empty($areaFilter) && strtolower($areaFilter) !== 'todas') {
            $conditions[] = "(pub.area_conocimiento LIKE :area OR pub.tipo LIKE :area)";
            $params[':area'] = "%{$areaFilter}%";
        }

        if (!empty($filters['autor'])) {
            $conditions[] = "(pub.autores LIKE :autor OR i.nombre_completo LIKE :autor)";
            $params[':autor'] = "%{$filters['autor']}%";
        }

        if (!empty($filters['evento'])) {
            $conditions[] = "pub.evento LIKE :evento";
            $params[':evento'] = "%{$filters['evento']}%";
        }

        if (!empty($filters['estado'])) {
            $conditions[] = "pub.estado = :estado";
            $params[':estado'] = $filters['estado'];
        } else if (empty($filters['include_drafts'])) {
            // Por defecto en consultas públicas, solo mostrar artículos publicados
            $conditions[] = "pub.estado = 'publicado'";
        }

        if (!empty($filters['search'])) {
            $conditions[] = "(pub.titulo LIKE :search OR pub.autores LIKE :search OR pub.resumen LIKE :search OR pub.palabras_clave LIKE :search OR pub.revista_editorial LIKE :search OR pub.doi LIKE :search OR pub.area_conocimiento LIKE :search OR pub.evento LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $sql .= " ORDER BY pub.anio DESC, pub.citas_estimadas DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Busca una publicación por su ID.
     */
    public function findById(int $id): ?array {
        $sql = "SELECT 
                    pub.*,
                    i.nombre_completo AS investigador_nombre,
                    i.correo AS investigador_correo,
                    i.orcid AS investigador_orcid,
                    pro.codigo AS proyecto_codigo,
                    pro.titulo AS proyecto_titulo
                FROM publicaciones pub
                JOIN investigadores i ON i.id = pub.investigador_id
                LEFT JOIN proyectos pro ON pro.id = pub.proyecto_id
                WHERE pub.id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Obtiene el listado de eventos académicos y congresos registrados en las publicaciones.
     */
    public function findDistinctEvents(): array {
        $stmt = $this->db->query("
            SELECT DISTINCT evento 
            FROM publicaciones 
            WHERE evento IS NOT NULL AND TRIM(evento) != '' 
            ORDER BY evento ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    /**
     * Obtiene los artículos agrupados en carpetas virtuales por año.
     * Solo incluye artículos publicados disponibles para la comunidad.
     */
    public function findArticlesGroupedByYear(): array {
        $sqlYears = "SELECT DISTINCT anio 
                     FROM publicaciones 
                     WHERE anio IS NOT NULL AND estado = 'publicado' 
                     ORDER BY anio DESC";
        $years = $this->db->query($sqlYears)->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $sqlPubs = "SELECT 
                        pub.id, pub.titulo, pub.tipo, pub.autores, pub.revista_editorial,
                        pub.anio, pub.created_at, pub.doi, pub.indexacion,
                        pub.cuartil, pub.acceso_abierto, pub.url_documento,
                        pub.resumen, pub.palabras_clave, pub.area_conocimiento,
                        pub.evento, pub.vistas, pub.descargas, pub.estado,
                        i.nombre_completo AS investigador_nombre,
                        i.correo AS investigador_correo,
                        i.orcid AS investigador_orcid
                    FROM publicaciones pub
                    JOIN investigadores i ON i.id = pub.investigador_id
                    WHERE pub.anio = :anio AND pub.estado = 'publicado'
                    ORDER BY pub.id DESC";
        $stmtPubs = $this->db->prepare($sqlPubs);

        $folders = [];
        foreach ($years as $yr) {
            $yearInt = (int)$yr;
            if ($yearInt <= 0) continue;

            $stmtPubs->execute([':anio' => $yearInt]);
            $articles = $stmtPubs->fetchAll();

            $totalVistas = 0;
            $totalDescargas = 0;
            foreach ($articles as $art) {
                $totalVistas += (int)($art['vistas'] ?? 0);
                $totalDescargas += (int)($art['descargas'] ?? 0);
            }

            $folders[] = [
                'anio'            => $yearInt,
                'nombre_carpeta'  => "Carpeta {$yearInt}",
                'total_articulos' => count($articles),
                'total_vistas'    => $totalVistas,
                'total_descargas' => $totalDescargas,
                'articulos'       => $articles
            ];
        }

        return $folders;
    }

    /**
     * Registra una nueva publicación científica.
     */
    public function create(array $data): int {
        $sql = "INSERT INTO publicaciones (
                    titulo, tipo, investigador_id, autores, revista_editorial, 
                    anio, volumen, numero, paginas, doi, indexacion, 
                    cuartil, citas_estimadas, acceso_abierto, url_documento,
                    resumen, palabras_clave, area_conocimiento, evento, estado, proyecto_id
                ) VALUES (
                    :titulo, :tipo, :investigador_id, :autores, :revista_editorial, 
                    :anio, :volumen, :numero, :paginas, :doi, :indexacion, 
                    :cuartil, :citas_estimadas, :acceso_abierto, :url_documento,
                    :resumen, :palabras_clave, :area_conocimiento, :evento, :estado, :proyecto_id
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':titulo'            => $data['titulo'],
            ':tipo'              => $data['tipo'] ?? 'articulo_revista',
            ':investigador_id'   => $data['investigador_id'] ?? 1,
            ':autores'           => $data['autores'],
            ':revista_editorial' => $data['revista_editorial'] ?? 'Revista de Investigación BUAP',
            ':anio'              => (int)($data['anio'] ?? date('Y')),
            ':volumen'           => $data['volumen'] ?? null,
            ':numero'            => $data['numero'] ?? null,
            ':paginas'           => $data['paginas'] ?? null,
            ':doi'               => $data['doi'] ?? null,
            ':indexacion'        => $data['indexacion'] ?? 'Scopus',
            ':cuartil'           => $data['cuartil'] ?? 'Q1',
            ':citas_estimadas'   => (int)($data['citas_estimadas'] ?? 0),
            ':acceso_abierto'    => isset($data['acceso_abierto']) ? (int)$data['acceso_abierto'] : 1,
            ':url_documento'     => $data['url_documento'] ?? null,
            ':resumen'           => $data['resumen'] ?? null,
            ':palabras_clave'    => $data['palabras_clave'] ?? null,
            ':area_conocimiento' => $data['area_conocimiento'] ?? ($data['categoria'] ?? null),
            ':evento'            => !empty($data['evento']) ? trim($data['evento']) : null,
            ':estado'            => $data['estado'] ?? 'publicado',
            ':proyecto_id'       => !empty($data['proyecto_id']) ? (int)$data['proyecto_id'] : null
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Actualiza los datos de una publicación científica.
     */
    public function update(int $id, array $data): bool {
        $sql = "UPDATE publicaciones SET 
                    titulo            = :titulo,
                    tipo              = :tipo,
                    investigador_id   = :investigador_id,
                    autores           = :autores,
                    revista_editorial = :revista_editorial,
                    anio              = :anio,
                    volumen           = :volumen,
                    numero            = :numero,
                    paginas           = :paginas,
                    doi               = :doi,
                    indexacion        = :indexacion,
                    cuartil           = :cuartil,
                    citas_estimadas   = :citas_estimadas,
                    acceso_abierto    = :acceso_abierto,
                    url_documento     = :url_documento,
                    resumen           = :resumen,
                    palabras_clave    = :palabras_clave,
                    area_conocimiento = :area_conocimiento,
                    evento            = :evento,
                    estado            = :estado,
                    proyecto_id       = :proyecto_id
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'                => $id,
            ':titulo'            => $data['titulo'],
            ':tipo'              => $data['tipo'] ?? 'articulo_revista',
            ':investigador_id'   => $data['investigador_id'] ?? 1,
            ':autores'           => $data['autores'],
            ':revista_editorial' => $data['revista_editorial'] ?? 'Revista de Investigación BUAP',
            ':anio'              => (int)($data['anio'] ?? date('Y')),
            ':volumen'           => $data['volumen'] ?? null,
            ':numero'            => $data['numero'] ?? null,
            ':paginas'           => $data['paginas'] ?? null,
            ':doi'               => $data['doi'] ?? null,
            ':indexacion'        => $data['indexacion'] ?? 'Scopus',
            ':cuartil'           => $data['cuartil'] ?? 'Q1',
            ':citas_estimadas'   => (int)($data['citas_estimadas'] ?? 0),
            ':acceso_abierto'    => isset($data['acceso_abierto']) ? (int)$data['acceso_abierto'] : 1,
            ':url_documento'     => $data['url_documento'] ?? null,
            ':resumen'           => $data['resumen'] ?? null,
            ':palabras_clave'    => $data['palabras_clave'] ?? null,
            ':area_conocimiento' => $data['area_conocimiento'] ?? ($data['categoria'] ?? null),
            ':evento'            => !empty($data['evento']) ? trim($data['evento']) : null,
            ':estado'            => $data['estado'] ?? 'publicado',
            ':proyecto_id'       => !empty($data['proyecto_id']) ? (int)$data['proyecto_id'] : null
        ]);
    }

    /**
     * Incrementa en 1 el contador de visualizaciones de una publicación.
     */
    public function incrementViews(int $id): void {
        $stmt = $this->db->prepare("UPDATE publicaciones SET vistas = COALESCE(vistas, 0) + 1 WHERE id = :id");
        $stmt->execute([':id' => $id]);
    }

    /**
     * Incrementa en 1 el contador de descargas del PDF de una publicación.
     */
    public function incrementDownloads(int $id): void {
        $stmt = $this->db->prepare("UPDATE publicaciones SET descargas = COALESCE(descargas, 0) + 1 WHERE id = :id");
        $stmt->execute([':id' => $id]);
    }

    /**
     * Obtiene métricas agregadas reales del repositorio para el panel de administración.
     */
    public function getAdminStats(): array {
        $stmt = $this->db->query("
            SELECT 
                COUNT(*) AS total_articulos,
                COALESCE(SUM(CASE WHEN estado = 'publicado' THEN 1 ELSE 0 END), 0) AS articulos_publicados,
                COALESCE(SUM(CASE WHEN estado = 'borrador' THEN 1 ELSE 0 END), 0) AS articulos_borradores,
                COALESCE(SUM(vistas), 0) AS total_visitas,
                COALESCE(SUM(descargas), 0) AS total_descargas,
                COALESCE(SUM(citas_estimadas), 0) AS total_citas
            FROM publicaciones
        ");
        $pubStats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [
            'total_articulos' => 0,
            'articulos_publicados' => 0,
            'articulos_borradores' => 0,
            'total_visitas' => 0,
            'total_descargas' => 0,
            'total_citas' => 0
        ];

        $totalInv = (int)$this->db->query("SELECT COUNT(*) FROM investigadores WHERE activo = 1")->fetchColumn();
        $totalCat = (int)$this->db->query("SELECT COUNT(*) FROM categorias WHERE activo = 1")->fetchColumn();

        return [
            'articulos_publicados' => (int)$pubStats['articulos_publicados'],
            'articulos_borradores' => (int)$pubStats['articulos_borradores'],
            'total_articulos'      => (int)$pubStats['total_articulos'],
            'total_visitas'        => (int)$pubStats['total_visitas'],
            'total_descargas'      => (int)$pubStats['total_descargas'],
            'total_citas'          => (int)$pubStats['total_citas'],
            'total_investigadores' => $totalInv,
            'total_categorias'     => $totalCat
        ];
    }

    /**
     * Elimina una publicación por ID.
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM publicaciones WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }
}

