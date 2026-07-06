package rd.dalventa.api.tenant.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.BaseEntity;

import java.time.Instant;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
public class Tenant extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String country = "DO";

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(length = 255)
    private String website;

    @Column(length = 20)
    private String rnc;

    @Column(name = "invoice_footer_message", columnDefinition = "TEXT")
    private String invoiceFooterMessage;

    @Column(name = "invoice_print_size", nullable = false, length = 20)
    private String invoicePrintSize = "LETTER";

    @Column(name = "invoice_show_logo", nullable = false)
    private boolean invoiceShowLogo = true;

    @Column(name = "invoice_show_rnc", nullable = false)
    private boolean invoiceShowRnc = true;

    @Column(name = "invoice_show_phone", nullable = false)
    private boolean invoiceShowPhone = true;

    @Column(name = "invoice_show_email", nullable = false)
    private boolean invoiceShowEmail = true;

    @Column(name = "invoice_show_address", nullable = false)
    private boolean invoiceShowAddress = true;

    @Column(name = "invoice_show_customer", nullable = false)
    private boolean invoiceShowCustomer = true;

    @Column(name = "invoice_show_tax", nullable = false)
    private boolean invoiceShowTax = true;

    @Column(name = "fiscal_module_enabled", nullable = false)
    private boolean fiscalModuleEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TenantPlan plan = TenantPlan.STARTER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TenantStatus status = TenantStatus.PENDING;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    public Tenant(String name, String slug) {
        this.name = name;
        this.slug = slug;
        this.trialEndsAt = Instant.now().plusSeconds(14L * 24 * 60 * 60); // 14-day trial
    }
}
