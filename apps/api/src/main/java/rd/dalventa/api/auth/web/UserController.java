package rd.dalventa.api.auth.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.dto.ChangePasswordRequest;
import rd.dalventa.api.auth.dto.CreateUserRequest;
import rd.dalventa.api.auth.dto.ResetUserPasswordResponse;
import rd.dalventa.api.auth.dto.SetUserPasswordRequest;
import rd.dalventa.api.auth.dto.UpdateUserRequest;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.service.AuthService;
import rd.dalventa.api.auth.service.UserManagementService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final UserManagementService userManagementService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(UserResponse.from(user));
    }

    @PostMapping("/me/password")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changeOwnPassword(user.getUsername(), request);
        return ApiResponse.ok(null);
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('USERS_MANAGE')")
    public ApiResponse<List<UserResponse>> list() {
        return ApiResponse.ok(userManagementService.list());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has('USERS_MANAGE')")
    public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.ok(userManagementService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('USERS_MANAGE')")
    public ApiResponse<UserResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.ok(userManagementService.update(id, request));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("@permissionService.has('USERS_MANAGE')")
    public ApiResponse<ResetUserPasswordResponse> resetPassword(@PathVariable UUID id) {
        return ApiResponse.ok(userManagementService.resetPassword(id));
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("@permissionService.has('USERS_MANAGE')")
    public ApiResponse<Void> setPassword(@PathVariable UUID id, @Valid @RequestBody SetUserPasswordRequest request) {
        userManagementService.setPassword(id, request.newPassword());
        return ApiResponse.ok(null);
    }
}
