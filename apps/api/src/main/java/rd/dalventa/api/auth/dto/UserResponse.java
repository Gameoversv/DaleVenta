package rd.dalventa.api.auth.dto;

import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.service.LoginIdentifier;

import java.util.UUID;

public record UserResponse(UUID id, String name, String email, RoleName role, boolean active) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                LoginIdentifier.toDisplayName(user.getEmail()),
                user.getPrimaryRole(),
                user.isActive()
        );
    }
}
