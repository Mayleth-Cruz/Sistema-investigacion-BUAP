<?php
namespace App\Modules\Docente;

use App\Core\Database;
use App\Modules\Eje3\Eje3ProjectRepository;
use PDO;

/**
 * ============================================================================
 * RESUMEN PERSONAL DEL DOCENTE (DocenteSummaryRepository) — solo lectura
 * ============================================================================
 * Ficha, nivel SNII, proyectos por estado de registro (todos SUS estados), publicaciones
 * publicadas y producción técnica. Las listas se limitan a las 100 más recientes; los
 * totales son siempre el conteo completo.
 */
class DocenteSummaryRepository {
    private const MAX_ITEMS = 100;

    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function build(int $teacherId): ?array {
        $stmt = $this->db->prepare("SELECT id, nombre_completo, correo, afiliacion, categoria, linea_investigacion,
                snii_nivel, snii_elegible FROM investigadores WHERE id = :id");
        $stmt->execute([':id' => $teacherId]);
        $docente = $stmt->fetch();
        if (!$docente) {
            return null;
        }
        $docente['id'] = (int)$docente['id'];
        $docente['snii_elegible'] = (int)$docente['snii_elegible'];

        $byState = (new Eje3ProjectRepository())->countByRegistroEstado($teacherId);

        $pubs = $this->db->prepare("SELECT id, titulo, anio, revista_editorial, origen FROM publicaciones
            WHERE investigador_id = :i AND estado = 'publicado' ORDER BY anio DESC, id DESC LIMIT " . self::MAX_ITEMS);
        $pubs->execute([':i' => $teacherId]);
        $publicaciones = $this->cast($pubs->fetchAll(), ['id', 'anio']);

        $tech = $this->db->prepare("SELECT id, tipo, titulo, anio FROM produccion_tecnica
            WHERE investigador_id = :i ORDER BY anio DESC, id DESC LIMIT " . self::MAX_ITEMS);
        $tech->execute([':i' => $teacherId]);
        $produccion = $this->cast($tech->fetchAll(), ['id', 'anio']);

        return [
            'docente'                  => $docente,
            'proyectos_por_estado'     => $byState,
            'total_proyectos'          => array_sum($byState),
            'publicaciones'            => $publicaciones,
            'total_publicaciones'      => $this->count("SELECT COUNT(*) FROM publicaciones WHERE investigador_id = :i AND estado = 'publicado'", $teacherId),
            'produccion_tecnica'       => $produccion,
            'total_produccion_tecnica' => $this->count("SELECT COUNT(*) FROM produccion_tecnica WHERE investigador_id = :i", $teacherId),
        ];
    }

    private function count(string $sql, int $teacherId): int {
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':i' => $teacherId]);
        return (int)$stmt->fetchColumn();
    }

    private function cast(array $rows, array $intKeys): array {
        foreach ($rows as &$row) {
            foreach ($intKeys as $key) {
                $row[$key] = (int)$row[$key];
            }
        }
        unset($row);
        return $rows;
    }
}
