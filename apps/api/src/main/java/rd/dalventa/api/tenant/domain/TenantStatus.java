package rd.dalventa.api.tenant.domain;

public enum TenantStatus {
    PENDING,
    TRIAL,
    ACTIVE,
    SUSPENDED,
    CANCELLED;

    /** Whether this status denies application access to the tenant's users. */
    public boolean blocksAccess() {
        return this == SUSPENDED || this == CANCELLED;
    }
}
