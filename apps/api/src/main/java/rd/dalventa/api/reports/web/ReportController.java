package rd.dalventa.api.reports.web;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.reports.dto.*;
import rd.dalventa.api.reports.service.ReportService;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.domain.TenantContext;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SUPER_ADMIN')")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/sales")
    public ResponseEntity<ApiResponse<SalesSummaryResponse>> sales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "group_by", defaultValue = "day") String groupBy) {
        if (from == null) from = LocalDate.now().withDayOfMonth(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(
                reportService.salesReport(TenantContext.require(), from, to, groupBy)));
    }

    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<InventoryReportResponse>> inventory() {
        return ResponseEntity.ok(ApiResponse.ok(
                reportService.inventoryReport(TenantContext.require())));
    }

    @GetMapping("/mechanics")
    public ResponseEntity<ApiResponse<MechanicsReportResponse>> mechanics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = LocalDate.now().minusMonths(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(
                reportService.mechanicsReport(TenantContext.require(), from, to)));
    }
}
