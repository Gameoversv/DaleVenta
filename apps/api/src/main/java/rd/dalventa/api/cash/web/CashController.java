package rd.dalventa.api.cash.web;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.cash.dto.CashBalanceResponse;
import rd.dalventa.api.cash.dto.CashTransactionResponse;
import rd.dalventa.api.cash.dto.CreateCashTransactionRequest;
import rd.dalventa.api.cash.service.CashService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cash")
@RequiredArgsConstructor
public class CashController {

    private final CashService cashService;

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<CashTransactionResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(cashService.list(from, to, page, size));
    }

    @GetMapping("/balance")
    public ResponseEntity<ApiResponse<CashBalanceResponse>> balance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(cashService.balance(from, to));
    }

    @PostMapping("/transactions")
    public ResponseEntity<ApiResponse<CashTransactionResponse>> create(@RequestBody CreateCashTransactionRequest req) {
        return ResponseEntity.ok(cashService.create(req));
    }
}
