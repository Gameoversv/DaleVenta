package rd.dalventa.api.dashboard.dto;

import java.util.UUID;

public record AlertItem(
        String type,
        String description,
        UUID entityId,
        long daysOpen
) {}
