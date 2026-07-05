package rd.dalventa.api.auth.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import rd.dalventa.api.auth.service.JwtService;
import rd.dalventa.api.shared.domain.CustomerContext;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TenantRepository tenantRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String email = jwtService.extractEmail(token);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                var userDetails = userDetailsService.loadUserByUsername(email);
                if (jwtService.isTokenValid(token, email)) {
                    var tenantId = jwtService.extractTenantId(token);

                    // Deny access when the token's tenant (taller) is suspended or
                    // cancelled. SUPER_ADMIN (incl. impersonation, whose token stays
                    // under the super-admin's email) is never blocked.
                    boolean isSuperAdmin = userDetails.getAuthorities().stream()
                            .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
                    if (tenantId != null && !isSuperAdmin
                            && tenantRepository.findById(tenantId)
                                    .map(t -> t.getStatus().blocksAccess())
                                    .orElse(false)) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write(
                                "{\"success\":false,\"error\":\"Taller suspendido\"}");
                        return;
                    }

                    var auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);

                    if (tenantId != null) {
                        TenantContext.set(tenantId);
                    }
                    var customerId = jwtService.extractCustomerId(token);
                    if (customerId != null) {
                        CustomerContext.set(customerId);
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            CustomerContext.clear();
        }
    }
}
