package rd.dalventa.api.register.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.register.dto.CreateRegisterRequest;
import rd.dalventa.api.register.dto.RegisterResponse;
import rd.dalventa.api.register.service.RegisterService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/registers")
@RequiredArgsConstructor
public class RegisterController {

    private final RegisterService registerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RegisterResponse> create(@Valid @RequestBody CreateRegisterRequest req) {
        return ApiResponse.ok(registerService.create(req));
    }

    @GetMapping
    public ApiResponse<List<RegisterResponse>> listByBranch(@RequestParam String branchId) {
        return ApiResponse.ok(registerService.listByBranch(UUID.fromString(branchId)));
    }
}
