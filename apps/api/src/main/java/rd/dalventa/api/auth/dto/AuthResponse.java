package rd.dalventa.api.auth.dto;

public record AuthResponse(String token, UserResponse user) {}
