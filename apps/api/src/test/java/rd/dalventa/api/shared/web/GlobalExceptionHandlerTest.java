package rd.dalventa.api.shared.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Client mistakes must never be reported as server faults: a 5xx on bad input hides real outages
 * and, for {@code ResponseStatusException}, used to mask deliberate 403/404 answers.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("a missing query parameter names the parameter and stays a 400")
    void missingParameter_isReportedAsBadRequest() {
        var ex = new MissingServletRequestParameterException("branchId", "UUID");

        var response = handler.handleMissingParameter(ex);

        assertThat(response.success()).isFalse();
        assertThat(response.error()).contains("branchId");
    }

    @Test
    @DisplayName("a malformed parameter reports the name but never echoes the rejected value")
    void typeMismatch_doesNotEchoUserInput() {
        var ex = new MethodArgumentTypeMismatchException(
                "<script>alert(1)</script>", java.util.UUID.class, "registerId", null, null);

        var response = handler.handleTypeMismatch(ex);

        assertThat(response.error()).contains("registerId");
        assertThat(response.error()).doesNotContain("<script>");
    }

    @Test
    @DisplayName("an unparseable body is a client error, not a server error")
    void unreadableBody_isReportedAsBadRequest() {
        var response = handler.handleUnreadableBody(new HttpMessageNotReadableException("broken", (org.springframework.http.HttpInputMessage) null));

        assertThat(response.success()).isFalse();
        assertThat(response.error()).isNotBlank();
    }

    @Test
    @DisplayName("a ResponseStatusException keeps its own status and reason")
    void responseStatusException_keepsItsStatus() {
        var forbidden = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "Modulo no activo"));
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(forbidden.getBody()).isNotNull();
        assertThat(forbidden.getBody().error()).isEqualTo("Modulo no activo");

        var notFound = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        assertThat(notFound.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("an unexpected failure returns a generic message with no internals")
    void unexpectedFailure_doesNotLeakDetails() {
        var response = handler.handleGeneral(new RuntimeException("jdbc:postgresql://prod-db:5432 password=hunter2"));

        assertThat(response.error()).isEqualTo("Error interno del servidor");
        assertThat(response.error()).doesNotContain("postgresql");
    }
}
