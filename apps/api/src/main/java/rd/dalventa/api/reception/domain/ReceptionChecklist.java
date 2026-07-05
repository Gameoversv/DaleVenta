package rd.dalventa.api.reception.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public record ReceptionChecklist(
        ExteriorChecklist exterior,
        InteriorChecklist interior,
        MechanicalChecklist mechanical
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExteriorChecklist(String scratches, String dents, String lights) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record InteriorChecklist(String radio, String screen, String mats) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MechanicalChecklist(String oilLevel, String coolant, String battery) {}
}
