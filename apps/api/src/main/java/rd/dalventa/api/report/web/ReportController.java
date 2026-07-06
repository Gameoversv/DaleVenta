package rd.dalventa.api.report.web;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.report.dto.SalesReportResponse;
import rd.dalventa.api.report.dto.DailyCloseReportResponse;
import rd.dalventa.api.report.service.DailyCloseReportService;
import rd.dalventa.api.report.service.SalesReportService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final SalesReportService salesReportService;
    private final DailyCloseReportService dailyCloseReportService;

    @GetMapping("/sales")
    @PreAuthorize("@permissionService.has('REPORTS_VIEW')")
    public ApiResponse<SalesReportResponse> sales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(salesReportService.sales(from, to));
    }

    @GetMapping("/daily-close")
    @PreAuthorize("@permissionService.has('REPORTS_VIEW')")
    public ApiResponse<DailyCloseReportResponse> dailyClose(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID registerId) {
        return ApiResponse.ok(dailyCloseReportService.report(date, registerId));
    }
}
