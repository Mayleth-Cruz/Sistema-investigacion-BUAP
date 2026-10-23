<?php
namespace App\Modules\Dissemination;

use App\Modules\Publications\PublicationRepository;

/**
 * ============================================================================
 * SERVICIO DE DIFUSIÓN CIENTÍFICA (DisseminationService)
 * ============================================================================
 * Funcionalidades clave para visibilizar y difundir la ciencia institucional:
 * - Búsqueda unificada en el catálogo público.
 * - Generación automática de citas en formato BibTeX para investigadores y tesistas.
 * - Perfil público de investigadores con toda su producción consolidada.
 */
class DisseminationService {
    private DisseminationRepository $repository;
    private PublicationRepository $publicationRepository;

    public function __construct() {
        $this->repository = new DisseminationRepository();
        $this->publicationRepository = new PublicationRepository();
    }

    /**
     * Búsqueda en el catálogo de acceso público.
     */
    public function search(string $query): array {
        return $this->repository->searchCatalog($query);
    }

    /**
     * Obtiene el perfil público consolidado.
     */
    public function getResearcherProfile(int $id): ?array {
        return $this->repository->getPublicProfile($id);
    }

    /**
     * Genera la cita formateada en estándar BibTeX a partir del ID de una publicación.
     */
    public function generateBibTeX(int $publicationId): ?string {
        $pub = $this->publicationRepository->findById($publicationId);
        if (!$pub) {
            return null;
        }

        // Generamos una clave de citación única (ej: RamosSandoval2025deep)
        $firstAuthorWord = explode(' ', trim($pub['autores']))[0] ?? 'Autor';
        $cleanAuthor = preg_replace('/[^a-zA-Z]/', '', $firstAuthorWord);
        $firstTitleWord = explode(' ', trim($pub['titulo']))[0] ?? 'art';
        $cleanTitleWord = preg_replace('/[^a-zA-Z]/', '', $firstTitleWord);
        $citeKey = strtolower($cleanAuthor . $pub['anio'] . $cleanTitleWord);

        $tipoBib = ($pub['tipo'] === 'libro') ? 'book' : (($pub['tipo'] === 'conferencia') ? 'inproceedings' : 'article');

        // Construimos el bloque BibTeX
        $bibtex  = "@{$tipoBib}{{$citeKey},\n";
        $bibtex .= "  title = {{" . addslashes($pub['titulo']) . "}},\n";
        $bibtex .= "  author = {" . addslashes($pub['autores']) . "},\n";
        $bibtex .= "  journal = {" . addslashes($pub['revista_editorial']) . "},\n";
        $bibtex .= "  year = {" . $pub['anio'] . "},\n";
        if (!empty($pub['volumen'])) {
            $bibtex .= "  volume = {" . $pub['volumen'] . "},\n";
        }
        if (!empty($pub['numero'])) {
            $bibtex .= "  number = {" . $pub['numero'] . "},\n";
        }
        if (!empty($pub['paginas'])) {
            $bibtex .= "  pages = {" . $pub['paginas'] . "},\n";
        }
        if (!empty($pub['doi'])) {
            $bibtex .= "  doi = {" . $pub['doi'] . "},\n";
        }
        $bibtex .= "  note = {Indexada en " . $pub['indexacion'] . " - Cuartil " . $pub['cuartil'] . "}\n";
        $bibtex .= "}";

        return $bibtex;
    }
}
