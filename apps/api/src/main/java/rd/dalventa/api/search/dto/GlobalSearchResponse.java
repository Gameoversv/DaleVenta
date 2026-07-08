package rd.dalventa.api.search.dto;

import java.util.List;

public record GlobalSearchResponse(
        String query,
        List<GlobalSearchResult> results
) {
}
