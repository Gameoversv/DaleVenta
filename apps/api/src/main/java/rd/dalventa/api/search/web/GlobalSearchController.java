package rd.dalventa.api.search.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.search.dto.GlobalSearchResponse;
import rd.dalventa.api.search.service.GlobalSearchService;
import rd.dalventa.api.shared.web.ApiResponse;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class GlobalSearchController {

    private final GlobalSearchService globalSearchService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<GlobalSearchResponse> search(@RequestParam(defaultValue = "") String q) {
        return ApiResponse.ok(globalSearchService.search(q));
    }
}
