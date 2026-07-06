package rd.dalventa.api.settings.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.settings.dto.InvoiceSettingsRequest;
import rd.dalventa.api.settings.dto.InvoiceSettingsResponse;
import rd.dalventa.api.settings.service.InvoiceSettingsService;
import rd.dalventa.api.shared.web.ApiResponse;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final InvoiceSettingsService invoiceSettingsService;

    @GetMapping("/invoice")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<InvoiceSettingsResponse> invoiceSettings() {
        return ApiResponse.ok(invoiceSettingsService.get());
    }

    @PutMapping("/invoice")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<InvoiceSettingsResponse> updateInvoiceSettings(@Valid @RequestBody InvoiceSettingsRequest req) {
        return ApiResponse.ok(invoiceSettingsService.update(req));
    }
}
