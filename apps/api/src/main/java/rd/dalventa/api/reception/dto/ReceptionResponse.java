package rd.dalventa.api.reception.dto;

import rd.dalventa.api.reception.domain.Reception;
import rd.dalventa.api.reception.domain.ReceptionChecklist;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReceptionResponse(
        UUID id,
        UUID vehicleId,
        String vehicleLabel,
        UUID customerId,
        String customerName,
        Integer entryKm,
        String reportedProblem,
        ReceptionChecklist checklist,
        List<String> photos,
        String notes,
        String signatureData,
        Instant signedAt,
        Instant createdAt
) {
    public static ReceptionResponse from(Reception r) {
        var vehicle = r.getVehicle();
        var customer = vehicle.getCustomer();
        return new ReceptionResponse(
                r.getId(),
                vehicle.getId(),
                vehicle.getBrand() + " " + vehicle.getModel() + " " + vehicle.getYear()
                        + (vehicle.getLicensePlate() != null ? " (" + vehicle.getLicensePlate() + ")" : ""),
                customer.getId(),
                customer.getFirstName() + " " + customer.getLastName(),
                r.getEntryKm(),
                r.getReportedProblem(),
                r.getChecklist(),
                r.getPhotos(),
                r.getNotes(),
                r.getSignatureData(),
                r.getSignedAt(),
                r.getCreatedAt()
        );
    }
}
