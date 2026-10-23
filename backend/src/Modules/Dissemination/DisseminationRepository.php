<?php
namespace App\Modules\Dissemination;

use App\Core\Database;
use PDO;

/**
 * ============================================================================
 * REPOSITORIO DE DIFUSIÓN CIENTÍFICA (DisseminationRepository)
 * ============================================================================
 * Realiza búsquedas transversales a través de toda la producción del sistema
 * (publicaciones, proyectos, patentes e investigadores) para el portal público.
 */
class DisseminationRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Búsqueda global federada para el portal de difusión.
     */
    public function searchCatalog(string $query, int $limit = 20): array {
        $searchTerm = "%{$query}%";

        // 1. Buscar en Publicaciones
        $sqlPub = "SELECT 
                    'publicacion' AS entidad_tipo,
                    id,
                    titulo,
                    autores AS autor_o_responsable,
                    anio,
                    revista_editorial AS medio_o_entidad,
                    cuartil,
                    doi,
                    url_documento
                FROM publicaciones
                WHERE titulo LIKE :term OR autores LIKE :term OR revista_editorial LIKE :term
                ORDER BY anio DESC LIMIT :limit";

        $stmtPub = $this->db->prepare($sqlPub);
        $stmtPub->bindValue(':term', $searchTerm, PDO::PARAM_STR);
        $stmtPub->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtPub->execute();
        $publicaciones = $stmtPub->fetchAll();

        // 2. Buscar en Proyectos
        $sqlProy = "SELECT 
                    'proyecto' AS entidad_tipo,
                    p.id,
                    p.titulo,
                    i.nombre_completo AS autor_o_responsable,
                    YEAR(p.fecha_inicio) AS anio,
                    p.entidad_financiadora AS medio_o_entidad,
                    p.estado AS cuartil,
                    p.codigo AS doi,
                    NULL AS url_documento
                FROM proyectos p
                JOIN investigadores i ON i.id = p.investigador_principal_id
                WHERE p.titulo LIKE :term OR p.resumen LIKE :term OR p.codigo LIKE :term
                ORDER BY p.fecha_inicio DESC LIMIT :limit";

        $stmtProy = $this->db->prepare($sqlProy);
        $stmtProy->bindValue(':term', $searchTerm, PDO::PARAM_STR);
        $stmtProy->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtProy->execute();
        $proyectos = $stmtProy->fetchAll();

        // 3. Buscar en Investigadores
        $sqlInv = "SELECT 
                    'investigador' AS entidad_tipo,
                    id,
                    nombre_completo AS titulo,
                    linea_investigacion AS autor_o_responsable,
                    YEAR(created_at) AS anio,
                    afiliacion AS medio_o_entidad,
                    categoria AS cuartil,
                    orcid AS doi,
                    avatar_url AS url_documento
                FROM investigadores
                WHERE nombre_completo LIKE :term OR linea_investigacion LIKE :term OR afiliacion LIKE :term
                LIMIT :limit";

        $stmtInv = $this->db->prepare($sqlInv);
        $stmtInv->bindValue(':term', $searchTerm, PDO::PARAM_STR);
        $stmtInv->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtInv->execute();
        $investigadores = $stmtInv->fetchAll();

        return [
            'total_coincidencias' => count($publicaciones) + count($proyectos) + count($investigadores),
            'publicaciones'       => $publicaciones,
            'proyectos'           => $proyectos,
            'investigadores'      => $investigadores
        ];
    }

    /**
     * Obtiene el perfil público completo de un investigador junto con toda su producción.
     */
    public function getPublicProfile(int $researcherId): ?array {
        // Investigador
        $stmt = $this->db->prepare("SELECT * FROM investigadores WHERE id = :id");
        $stmt->execute([':id' => $researcherId]);
        $researcher = $stmt->fetch();

        if (!$researcher) {
            return null;
        }

        // Publicaciones del investigador
        $stmtPub = $this->db->prepare("SELECT * FROM publicaciones WHERE investigador_id = :id ORDER BY anio DESC");
        $stmtPub->execute([':id' => $researcherId]);
        $publicaciones = $stmtPub->fetchAll();

        // Proyectos liderados
        $stmtProy = $this->db->prepare("SELECT * FROM proyectos WHERE investigador_principal_id = :id ORDER BY fecha_inicio DESC");
        $stmtProy->execute([':id' => $researcherId]);
        $proyectos = $stmtProy->fetchAll();

        // Producción técnica y patentes
        $stmtProd = $this->db->prepare("SELECT * FROM produccion_tecnica WHERE investigador_id = :id ORDER BY anio DESC");
        $stmtProd->execute([':id' => $researcherId]);
        $produccion = $stmtProd->fetchAll();

        return [
            'perfil'         => $researcher,
            'publicaciones'  => $publicaciones,
            'proyectos'      => $proyectos,
            'produccion'     => $produccion
        ];
    }
}
