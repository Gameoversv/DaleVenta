package rd.dalventa.api.announcement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.BaseEntity;

/** Single global banner message shown to all talleres when {@code active}. */
@Entity
@Table(name = "platform_announcement")
@Getter
@Setter
@NoArgsConstructor
public class PlatformAnnouncement extends BaseEntity {

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** INFO | WARNING — controls the banner tone. */
    @Column(nullable = false, length = 20)
    private String level = "INFO";

    @Column(nullable = false)
    private boolean active = false;
}
