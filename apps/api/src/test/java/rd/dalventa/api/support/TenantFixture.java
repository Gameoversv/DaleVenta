package rd.dalventa.api.support;

import java.util.UUID;

/**
 * Identifiers of a fully provisioned tenant (branch, register, catalog, customer, supplier and an
 * open cash shift), so module tests can start from a usable business state in one call.
 */
public record TenantFixture(
        String email,
        String token,
        UUID tenantId,
        UUID branchId,
        UUID registerId,
        UUID categoryId,
        UUID productId,
        UUID rentableProductId,
        UUID customerId,
        UUID supplierId,
        UUID cashShiftId,
        UUID denomination500Id
) {}
