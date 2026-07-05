package rd.dalventa.api.shared.domain;

import java.util.UUID;

public final class CustomerContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private CustomerContext() {}

    public static UUID get() {
        return CURRENT.get();
    }

    public static void set(UUID customerId) {
        CURRENT.set(customerId);
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static UUID require() {
        UUID id = CURRENT.get();
        if (id == null) {
            throw new IllegalStateException("No customer in context for this request");
        }
        return id;
    }
}
