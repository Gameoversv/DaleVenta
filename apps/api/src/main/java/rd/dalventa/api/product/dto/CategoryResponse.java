package rd.dalventa.api.product.dto;

import rd.dalventa.api.product.domain.Category;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, boolean active) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.isActive());
    }
}
