package rd.dalventa.api.search.dto;

public record GlobalSearchResult(
        String type,
        String title,
        String subtitle,
        String href
) {
}
