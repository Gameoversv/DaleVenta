package rd.dalventa.api.purchase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Los @Size reflejan el ancho de las columnas de suppliers (V42, telefono
// ensanchado en V47). Sin ellos el valor llega a Postgres y el rechazo del
// motor sale como un error generico que no dice que campo acortar.
public record SupplierRequest(
        @NotBlank(message = "El nombre del proveedor es obligatorio")
        @Size(max = 180, message = "El nombre del proveedor no puede pasar de 180 caracteres")
        String name,
        @Size(max = 150, message = "El nombre de contacto no puede pasar de 150 caracteres") String contactName,
        @Size(max = 50, message = "El telefono no puede pasar de 50 caracteres") String phone,
        @Size(max = 255, message = "El correo no puede pasar de 255 caracteres") String email,
        String address,
        @Size(max = 30, message = "El RNC no puede pasar de 30 caracteres") String taxId,
        String notes,
        Boolean active
) {}
