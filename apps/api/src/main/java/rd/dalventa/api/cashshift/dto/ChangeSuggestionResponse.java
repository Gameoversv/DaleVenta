package rd.dalventa.api.cashshift.dto;

import java.util.List;

public record ChangeSuggestionResponse(
        boolean exact,
        List<DenominationCountEntry> combination
) {}
