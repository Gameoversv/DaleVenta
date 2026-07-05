package rd.dalventa.api.portal.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.invoice.dto.InvoiceResponse;
import rd.dalventa.api.portal.dto.PortalInvoiceResponse;
import rd.dalventa.api.portal.dto.PortalVehicleResponse;
import rd.dalventa.api.portal.service.PortalService;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.vehicle.dto.VehicleHistoryResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class PortalController {

    private final PortalService portalService;

    @GetMapping("/vehicles")
    public ResponseEntity<ApiResponse<List<PortalVehicleResponse>>> getVehicles() {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getCustomerVehicles()));
    }

    @GetMapping("/vehicles/{id}/history")
    public ResponseEntity<ApiResponse<VehicleHistoryResponse>> getVehicleHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getVehicleHistory(id)));
    }

    @GetMapping("/invoices")
    public ResponseEntity<ApiResponse<List<PortalInvoiceResponse>>> getInvoices() {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getCustomerInvoices()));
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getInvoiceDetail(id)));
    }
}
