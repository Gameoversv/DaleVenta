package rd.dalventa.api.sale.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.customer.domain.Customer;
import rd.dalventa.api.customer.repository.CustomerRepository;
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
import rd.dalventa.api.shared.web.ResourceNotFoundException;
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

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(java.util.UUID saleId) {
        var tenantId = TenantContext.require();
        var sale = saleRepository.findByIdAndTenantId(saleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
        var branch = branchRepository.findById(sale.getBranchId()).orElse(null);
        var register = registerRepository.findById(sale.getRegisterId()).orElse(null);
        var fiscalProfile = fiscalProfileRepository.findByTenantId(tenantId).orElse(null);
        var isFiscalInvoice = sale.getFiscalNcf() != null;

        var items = saleItemRepository.findAllBySaleId(sale.getId()).stream()
                .map(item -> {
                    var itemProduct = productRepository.findById(item.getProductId())
                            .filter(product -> tenantId.equals(product.getTenantId()))
                            .orElse(null);
                    var productName = itemProduct != null ? itemProduct.getDescription() : "Producto eliminado";
                    var productUnit = itemProduct != null ? itemProduct.getUnit() : "unit";
                    return new InvoiceItemResponse(productName, productUnit, item.getQuantity(),
                            item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
                })
                .toList();
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
                new InvoiceResponse.BusinessInfo(
                        isFiscalInvoice && fiscalProfile != null ? fiscalProfile.getBusinessName() : tenant.getName(),
                        isFiscalInvoice && fiscalProfile != null ? fiscalProfile.getRnc() : tenant.getRnc(),
                        isFiscalInvoice && fiscalProfile != null ? fiscalProfile.getPhone() : tenant.getPhone(),
                        isFiscalInvoice && fiscalProfile != null ? fiscalProfile.getEmail() : tenant.getEmail(),
                        isFiscalInvoice && fiscalProfile != null ? fiscalProfile.getFiscalAddress() : tenant.getAddress(),
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
                ),
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
