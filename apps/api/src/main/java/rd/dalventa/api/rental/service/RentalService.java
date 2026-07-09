package rd.dalventa.api.rental.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.rental.domain.RentalContract;
import rd.dalventa.api.rental.domain.RentalContractItem;
import rd.dalventa.api.rental.dto.RentalContractItemResponse;
import rd.dalventa.api.rental.dto.RentalContractResponse;
import rd.dalventa.api.rental.repository.RentalContractItemRepository;
import rd.dalventa.api.rental.repository.RentalContractRepository;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleItem;
import rd.dalventa.api.sale.dto.RentalDetailsRequest;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RentalService {

    private final TenantRepository tenantRepository;
    private final RentalContractRepository rentalContractRepository;
    private final RentalContractItemRepository rentalContractItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public void createForSale(UUID tenantId, Sale sale, List<SaleItem> saleItems, RentalDetailsRequest rentalDetails, UUID userId) {
        var rentalItems = saleItems.stream()
                .filter(item -> productRepository.findByIdAndTenantId(item.getProductId(), tenantId)
                        .map(product -> product.isRentable() && product.isActive())
                        .orElse(false))
                .toList();
        if (rentalItems.isEmpty()) {
            return;
        }

        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
        if (!tenant.isRentalModuleEnabled()) {
            throw new IllegalArgumentException("El modulo de alquileres no esta activo para este tenant");
        }
        if (sale.getCustomerId() == null) {
            throw new IllegalArgumentException("Un alquiler requiere cliente");
        }
        if (rentalDetails == null || rentalDetails.expectedReturnAt() == null) {
            throw new IllegalArgumentException("Un alquiler requiere fecha esperada de devolucion");
        }

        var deposit = rentalDetails.depositAmount() != null
                ? rentalDetails.depositAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        if (deposit.signum() < 0) {
            throw new IllegalArgumentException("El deposito no puede ser negativo");
        }

        long sequence = rentalContractRepository.maxContractSequence(tenantId) + 1;
        var contract = new RentalContract("RT-%06d".formatted(sequence), sale.getId(), sale.getCustomerId(), userId,
                rentalDetails.expectedReturnAt(), deposit, rentalDetails.notes());
        contract.setTenantId(tenantId);
        contract = rentalContractRepository.save(contract);

        for (SaleItem item : rentalItems) {
            var contractItem = new RentalContractItem(contract.getId(), item.getProductId(), item.getQuantity());
            contractItem.setTenantId(tenantId);
            rentalContractItemRepository.save(contractItem);
        }
    }

    @Transactional
    public void cancelBySaleId(UUID tenantId, UUID saleId) {
        rentalContractRepository.findByTenantIdAndSaleId(tenantId, saleId).ifPresent(contract -> {
            contract.cancel();
            rentalContractRepository.save(contract);
        });
    }

    @Transactional(readOnly = true)
    public List<RentalContractResponse> list() {
        var tenantId = TenantContext.require();
        return rentalContractRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private RentalContractResponse toResponse(RentalContract contract) {
        var customerName = customerRepository.findByIdAndTenantIdAndActiveTrue(contract.getCustomerId(), contract.getTenantId())
                .map(c -> c.getFirstName() + " " + c.getLastName())
                .orElse("Cliente eliminado");
        var items = rentalContractItemRepository.findAllByRentalContractId(contract.getId())
                .stream()
                .map(item -> {
                    var productName = productRepository.findByIdAndTenantId(item.getProductId(), contract.getTenantId())
                            .map(p -> p.getDescription())
                            .orElse("Producto eliminado");
                    return RentalContractItemResponse.from(item, productName);
                })
                .toList();
        return RentalContractResponse.from(contract, customerName, items);
    }
}
