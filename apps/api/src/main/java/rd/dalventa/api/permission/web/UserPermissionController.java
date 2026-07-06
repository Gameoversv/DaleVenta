package rd.dalventa.api.permission.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.dto.SetUserPermissionRequest;
import rd.dalventa.api.permission.dto.UserPermissionRow;
import rd.dalventa.api.permission.service.UserPermissionAdminService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/permissions")
@RequiredArgsConstructor
@PreAuthorize("@permissionService.has('USERS_MANAGE')")
public class UserPermissionController {

    private final UserPermissionAdminService userPermissionAdminService;

    @GetMapping
    public ApiResponse<List<UserPermissionRow>> list(@PathVariable UUID userId) {
        return ApiResponse.ok(userPermissionAdminService.list(userId));
    }

    @PutMapping("/{code}")
    public ApiResponse<Void> setOverride(
            @PathVariable UUID userId,
            @PathVariable PermissionCode code,
            @Valid @RequestBody SetUserPermissionRequest request
    ) {
        userPermissionAdminService.setOverride(userId, code, request.effect());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearOverride(@PathVariable UUID userId, @PathVariable PermissionCode code) {
        userPermissionAdminService.clearOverride(userId, code);
    }
}
