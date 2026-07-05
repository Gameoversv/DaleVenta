package rd.dalventa.api.auth.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.dto.ChangePasswordRequest;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.auth.service.AuthService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

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
    @PreAuthorize("hasRole('OWNER')")
    public ApiResponse<List<UserResponse>> list() {
        List<UserResponse> users = userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
        return ApiResponse.ok(users);
    }
}
