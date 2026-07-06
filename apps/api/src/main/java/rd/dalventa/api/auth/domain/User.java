package rd.dalventa.api.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import rd.dalventa.api.shared.domain.BaseEntity;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Setter
    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    private boolean active = true;

    // Nullable: SUPER_ADMIN has no tenant
    @Column(name = "tenant_id")
    private java.util.UUID tenantId;

    // Nullable: only set for CLIENT-role portal users
    @Column(name = "customer_id")
    private java.util.UUID customerId;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    public User(String name, String email, String password, java.util.UUID tenantId) {
        this(name, email, password);
        this.tenantId = tenantId;
    }

    public void setTenantId(java.util.UUID tenantId) {
        this.tenantId = tenantId;
    }

    public void setCustomerId(java.util.UUID customerId) {
        this.customerId = customerId;
    }

    public void updateProfile(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void addRole(Role role) {
        this.roles.add(role);
    }

    public void replaceRole(Role role) {
        this.roles.clear();
        this.roles.add(role);
    }

    public RoleName getPrimaryRole() {
        return roles.stream()
                .map(Role::getName)
                .findFirst()
                .orElse(RoleName.CLIENT);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(r -> new SimpleGrantedAuthority(r.getAuthority()))
                .toList();
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
