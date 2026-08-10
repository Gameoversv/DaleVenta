package rd.dalventa.api.auth.service;

import java.util.regex.Pattern;

/**
 * Traduce entre lo que el usuario escribe para entrar y lo que guarda la
 * columna users.email.
 *
 * Los negocios quieren usuarios como "caja1", no correos. En vez de cambiar el
 * esquema de autenticacion, un identificador sin arroba recibe un dominio
 * reservado y la columna sigue siendo un correo valido y unico.
 *
 * El dominio es .invalid a proposito: la RFC 2606 lo reserva justamente para
 * que nunca resuelva. Si algun dia se conecta el envio de correos, estas
 * direcciones rebotan en vez de llegarle a un tercero.
 *
 * Nota de deuda: la base termina guardando direcciones que no existen. El dia
 * que haga falta recuperar contrasenas por correo, toca una columna username
 * de verdad y dejar email nullable.
 */
public final class LoginIdentifier {

    public static final String RESERVED_DOMAIN = "daleventa.invalid";

    private static final String SUFFIX = "@" + RESERVED_DOMAIN;

    // Lo que puede vivir a la izquierda de la arroba sin romper la direccion.
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9._-]+$");

    private LoginIdentifier() {
    }

    /** Lo escrito al entrar o al crear, convertido a lo que guarda la columna. */
    public static String toStoredEmail(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("El usuario es requerido");
        }

        var clean = identifier.trim().toLowerCase();

        if (clean.contains("@")) {
            if (clean.endsWith(SUFFIX)) {
                // Si se aceptara, cualquiera podria reclamar el username de otro
                // escribiendolo con el dominio reservado a mano.
                throw new IllegalArgumentException("Usuario invalido");
            }
            return clean;
        }

        if (!USERNAME.matcher(clean).matches()) {
            throw new IllegalArgumentException(
                    "El usuario solo admite letras, numeros, punto, guion y guion bajo");
        }
        return clean + SUFFIX;
    }

    /** Lo guardado, listo para mostrarse: el dominio reservado no se ensena. */
    public static String toDisplayName(String storedEmail) {
        if (storedEmail == null || storedEmail.isBlank()) {
            return storedEmail;
        }
        if (storedEmail.endsWith(SUFFIX)) {
            return storedEmail.substring(0, storedEmail.length() - SUFFIX.length());
        }
        return storedEmail;
    }
}
