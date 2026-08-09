package rd.dalventa.api.sale.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.auth.service.UserOperationalScopeService;
import rd.dalventa.api.customer.domain.Customer;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.fiscal.domain.FiscalProfile;
import rd.dalventa.api.fiscal.repository.FiscalProfileRepository;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.rental.repository.RentalContractRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.sale.dto.InvoiceCustomerInfo;
import rd.dalventa.api.sale.dto.InvoiceItemResponse;
import rd.dalventa.api.sale.dto.InvoiceRentalInfo;
import rd.dalventa.api.sale.dto.InvoiceResponse;
import rd.dalventa.api.sale.dto.PaymentResponse;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.SaleItemRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.repository.TenantRepository;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final PaymentRepository paymentRepository;
    private final TenantRepository tenantRepository;
    private final BranchRepository branchRepository;
    private final RegisterRepository registerRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final FiscalProfileRepository fiscalProfileRepository;
    private final RentalContractRepository rentalContractRepository;
    private final UserOperationalScopeService userOperationalScopeService;

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(java.util.UUID saleId) {
        var tenantId = TenantContext.require();
        var sale = saleRepository.findByIdAndTenantId(saleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));
        userOperationalScopeService.requireRegisterAccess(sale.getRegisterId());
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
        var branch = branchRepository.findById(sale.getBranchId()).orElse(null);
        var register = registerRepository.findById(sale.getRegisterId()).orElse(null);
        var fiscalProfile = fiscalProfileRepository.findByTenantId(tenantId).orElse(null);
        var isFiscalInvoice = sale.getFiscalNcf() != null;

        var items = invoiceItems(sale.getId(), tenantId);
        var payments = paymentRepository.findAllBySaleId(sale.getId()).stream().map(PaymentResponse::from).toList();
        var amountPaid = payments.stream()
                .map(PaymentResponse::amount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        var rental = rentalContractRepository.findByTenantIdAndSaleId(tenantId, sale.getId())
                .map(InvoiceRentalInfo::from)
                .orElse(null);

        return new InvoiceResponse(
                sale.getId(),
                sale.getInvoiceNumber(),
                sale.getFiscalReceiptType(),
                sale.getFiscalNcf(),
                sale.getStatus(),
                sale.getCreatedAt(),
                businessInfo(tenant, isFiscalInvoice ? fiscalProfile : null),
                branch != null ? branch.getName() : "-",
                register != null ? register.getName() : "-",
                sale.getCustomerId() != null ? customerInfo(sale.getCustomerId(), tenantId) : null,
                sale.getSubtotal(),
                sale.getTaxTotal(),
                sale.getDiscountAmount(),
                sale.getTotal(),
                amountPaid,
                rental,
                items,
                payments
        );
    }

    private List<InvoiceItemResponse> invoiceItems(java.util.UUID saleId, java.util.UUID tenantId) {
        return saleItemRepository.findAllBySaleId(saleId).stream()
                .map(item -> {
                    // A product deleted after the sale must not break the reprint of an old invoice.
                    var itemProduct = productRepository.findById(item.getProductId())
                            .filter(product -> tenantId.equals(product.getTenantId()))
                            .orElse(null);
                    var productName = itemProduct != null ? itemProduct.getDescription() : "Producto eliminado";
                    var productUnit = itemProduct != null ? itemProduct.getUnit() : "unit";
                    return new InvoiceItemResponse(productName, productUnit, item.getQuantity(),
                            item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
                })
                .toList();
    }

    /**
     * Fiscal invoices must show the registered fiscal identity; everything else shows the business
     * profile. {@code fiscalProfile} is null whenever the tenant identity applies, so the header
     * fields fall back together instead of mixing the two sources.
     */
    private InvoiceResponse.BusinessInfo businessInfo(Tenant tenant, FiscalProfile fiscalProfile) {
        return new InvoiceResponse.BusinessInfo(
                fiscalProfile != null ? fiscalProfile.getBusinessName() : tenant.getName(),
                fiscalProfile != null ? fiscalProfile.getRnc() : tenant.getRnc(),
                fiscalProfile != null ? fiscalProfile.getPhone() : tenant.getPhone(),
                fiscalProfile != null ? fiscalProfile.getEmail() : tenant.getEmail(),
                fiscalProfile != null ? fiscalProfile.getFiscalAddress() : tenant.getAddress(),
                tenant.getCity(),
                tenant.getLogoUrl(),
                tenant.getInvoiceFooterMessage(),
                tenant.getInvoicePrintSize(),
                tenant.isInvoiceShowLogo(),
                tenant.isInvoiceShowRnc(),
                tenant.isInvoiceShowPhone(),
                tenant.isInvoiceShowEmail(),
                tenant.isInvoiceShowAddress(),
                tenant.isInvoiceShowCustomer(),
                tenant.isInvoiceShowTax()
        );
    }

    private InvoiceCustomerInfo customerInfo(java.util.UUID customerId, java.util.UUID tenantId) {
        return customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .map(this::toCustomerInfo)
                .orElse(null);
    }

    private InvoiceCustomerInfo toCustomerInfo(Customer customer) {
        return new InvoiceCustomerInfo(
                customer.getFirstName() + " " + customer.getLastName(),
                customer.getDocumentId(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getAddress()
        );
    }
}
