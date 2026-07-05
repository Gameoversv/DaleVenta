package rd.dalventa.api.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.inventory.domain.BranchInventory;
import rd.dalventa.api.inventory.domain.InventoryMovement;
import rd.dalventa.api.inventory.dto.CreateInventoryMovementRequest;
import rd.dalventa.api.inventory.dto.InventoryMovementResponse;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.inventory.repository.InventoryMovementRepository;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryMovementService {

    private final BranchInventoryRepository branchInventoryRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public InventoryMovementResponse recordMovement(CreateInventoryMovementRequest req) {
        var tenantId = TenantContext.require();

        branchRepository.findById(req.branchId())
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));
        productRepository.findByIdAndTenantId(req.productId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));

        var branchInventory = branchInventoryRepository
                .lockByTenantIdAndBranchIdAndProductId(tenantId, req.branchId(), req.productId())
                .orElseGet(() -> createBranchInventory(tenantId, req.branchId(), req.productId()));

        int previousStock = branchInventory.getCurrentStock();
        int newStock = switch (req.type()) {
            case ENTRY, ADJUSTMENT -> previousStock + req.quantity();
            case EXIT -> previousStock - req.quantity();
        };

        if (newStock < 0) {
            throw new IllegalArgumentException("Existencia insuficiente para esta salida");
        }

        branchInventory.setCurrentStock(newStock);
        branchInventoryRepository.save(branchInventory);

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();

        var movement = new InventoryMovement(branchInventory.getId(), req.type(), req.quantity(),
                previousStock, newStock, req.reason(), userId);
        movement.setTenantId(tenantId);
        return InventoryMovementResponse.from(inventoryMovementRepository.save(movement));
    }

    private BranchInventory createBranchInventory(UUID tenantId, UUID branchId, UUID productId) {
        var branchInventory = new BranchInventory(branchId, productId);
        branchInventory.setTenantId(tenantId);
        return branchInventoryRepository.save(branchInventory);
    }
}
