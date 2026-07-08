package rd.dalventa.api.search.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.search.dto.GlobalSearchResponse;
import rd.dalventa.api.search.dto.GlobalSearchResult;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GlobalSearchService {

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PermissionResolutionService permissionResolutionService;

    @Transactional(readOnly = true)
    public GlobalSearchResponse search(String rawQuery) {
        var query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() < 2) {
            return new GlobalSearchResponse(query, List.of());
        }

        var tenantId = TenantContext.require();
        var user = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"));
        var results = new ArrayList<GlobalSearchResult>();
        var limit = PageRequest.of(0, 5);

        if (permissionResolutionService.has(user, PermissionCode.SALE_VIEW_HISTORY)) {
            saleRepository.searchInvoices(tenantId, query, limit).forEach(sale ->
                    results.add(new GlobalSearchResult(
                            "Factura",
                            sale.getFiscalNcf() != null ? sale.getFiscalNcf() : sale.getInvoiceNumber(),
                            sale.getInvoiceNumber() + " · RD$" + sale.getTotal() + " · " + sale.getStatus(),
                            "/sales/" + sale.getId() + "/invoice"
                    )));
        } else if (permissionResolutionService.has(user, PermissionCode.SALE_CREATE)) {
            saleRepository.searchOwnInvoices(tenantId, user.getId(), query, limit).forEach(sale ->
                    results.add(new GlobalSearchResult(
                            "Factura",
                            sale.getFiscalNcf() != null ? sale.getFiscalNcf() : sale.getInvoiceNumber(),
                            sale.getInvoiceNumber() + " · RD$" + sale.getTotal() + " · " + sale.getStatus(),
                            "/sales/" + sale.getId() + "/invoice"
                    )));
        }

        if (permissionResolutionService.has(user, PermissionCode.CUSTOMER_VIEW)) {
            customerRepository.searchTop(tenantId, query, limit).forEach(customer ->
                    results.add(new GlobalSearchResult(
                            "Cliente",
                            customer.getFirstName() + " " + customer.getLastName(),
                            firstNonBlank(customer.getDocumentId(), customer.getPhone(), customer.getWhatsapp(), customer.getEmail(), "Cliente activo"),
                            "/customers"
                    )));
        }

        if (permissionResolutionService.has(user, PermissionCode.INVENTORY_VIEW)) {
            productRepository.searchActive(tenantId, query, limit).forEach(product ->
                    results.add(new GlobalSearchResult(
                            "Producto",
                            product.getDescription(),
                            product.getInternalCode() + " · " + product.getUnit() + " · RD$" + product.getSalePrice(),
                            "/products"
                    )));
        }

        return new GlobalSearchResponse(query, results.stream().limit(15).toList());
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }
}
