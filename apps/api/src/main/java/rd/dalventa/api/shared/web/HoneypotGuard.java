package rd.dalventa.api.shared.web;

/**
 * Lightweight bot-abuse guard for public forms. Pairs with a hidden "website" field on the
 * client that real users never see or fill (CSS-hidden). If it arrives populated, the submission
 * is treated as automated and rejected.
 */
public final class HoneypotGuard {

    private HoneypotGuard() {
    }

    public static void check(String honeypotValue) {
        if (honeypotValue != null && !honeypotValue.isBlank()) {
            throw new IllegalArgumentException("Solicitud inválida");
        }
    }
}
