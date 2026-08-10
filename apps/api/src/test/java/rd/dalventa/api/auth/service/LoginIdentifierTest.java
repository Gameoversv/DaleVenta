package rd.dalventa.api.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Los negocios quieren entrar con "caja1", no con un correo. La columna sigue
 * siendo email, asi que un usuario sin arroba recibe un dominio reservado.
 */
class LoginIdentifierTest {

    @Test
    @DisplayName("a plain username becomes an address under the reserved domain")
    void username_getsTheReservedDomain() {
        assertThat(LoginIdentifier.toStoredEmail("caja1")).isEqualTo("caja1@daleventa.invalid");
    }

    @Test
    @DisplayName("a real address is stored as typed, so today's users keep signing in")
    void realEmail_isLeftAlone() {
        assertThat(LoginIdentifier.toStoredEmail("maranathacafeteria@gmail.com"))
                .isEqualTo("maranathacafeteria@gmail.com");
    }

    @Test
    @DisplayName("case and spacing never decide whether a login works")
    void identifier_isNormalised() {
        assertThat(LoginIdentifier.toStoredEmail("  Caja1  ")).isEqualTo("caja1@daleventa.invalid");
        assertThat(LoginIdentifier.toStoredEmail("Admin@Negocio.DO")).isEqualTo("admin@negocio.do");
    }

    @Test
    @DisplayName("the reserved domain is hidden again when the user is shown")
    void display_stripsTheReservedDomain() {
        assertThat(LoginIdentifier.toDisplayName("caja1@daleventa.invalid")).isEqualTo("caja1");
    }

    @Test
    @DisplayName("a real address is shown whole, it is not a disguised username")
    void display_keepsRealEmails() {
        assertThat(LoginIdentifier.toDisplayName("maranathacafeteria@gmail.com"))
                .isEqualTo("maranathacafeteria@gmail.com");
    }

    @Test
    @DisplayName("null and blank survive the round trip without exploding")
    void display_toleratesMissingValues() {
        assertThat(LoginIdentifier.toDisplayName(null)).isNull();
        assertThat(LoginIdentifier.toDisplayName("")).isEmpty();
    }

    @Test
    @DisplayName("a username with characters an address cannot hold is rejected")
    void username_rejectsInvalidCharacters() {
        assertThatThrownBy(() -> LoginIdentifier.toStoredEmail("caja 1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> LoginIdentifier.toStoredEmail("caja/1"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("an empty identifier is rejected instead of becoming @daleventa.invalid")
    void blankIdentifier_isRejected() {
        assertThatThrownBy(() -> LoginIdentifier.toStoredEmail("  "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> LoginIdentifier.toStoredEmail(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // Nadie debe poder reclamar el dominio reservado a mano y chocar con el
    // username de otro negocio.
    @Test
    @DisplayName("the reserved domain cannot be typed by hand")
    void reservedDomain_cannotBeClaimedDirectly() {
        assertThatThrownBy(() -> LoginIdentifier.toStoredEmail("caja1@daleventa.invalid"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
