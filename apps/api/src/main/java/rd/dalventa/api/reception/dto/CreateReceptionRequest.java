package rd.dalventa.api.reception.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import rd.dalventa.api.reception.domain.ReceptionChecklist;

import java.util.UUID;

public record CreateReceptionRequest(
        @NotNull UUID vehicleId,
        @NotNull @Positive Integer entryKm,
        @NotBlank String reportedProblem,
        @NotNull @Valid ReceptionChecklistDto checklist,
        String notes
) {
    public record ReceptionChecklistDto(
            @Valid ExteriorDto exterior,
            @Valid InteriorDto interior,
            @Valid MechanicalDto mechanical
    ) {
        public record ExteriorDto(String scratches, String dents, String lights) {}
        public record InteriorDto(String radio, String screen, String mats) {}
        public record MechanicalDto(String oilLevel, String coolant, String battery) {}

        public ReceptionChecklist toDomain() {
            return new ReceptionChecklist(
                    exterior == null ? null : new ReceptionChecklist.ExteriorChecklist(
                            exterior.scratches(), exterior.dents(), exterior.lights()),
                    interior == null ? null : new ReceptionChecklist.InteriorChecklist(
                            interior.radio(), interior.screen(), interior.mats()),
                    mechanical == null ? null : new ReceptionChecklist.MechanicalChecklist(
                            mechanical.oilLevel(), mechanical.coolant(), mechanical.battery())
            );
        }
    }
}
