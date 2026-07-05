package rd.dalventa.api.shared.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import rd.dalventa.api.auth.domain.User;

import java.util.Optional;

@Component
public class CurrentUserProvider {

    public Optional<User> current() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return Optional.empty();
        }
        return Optional.of(user);
    }
}
