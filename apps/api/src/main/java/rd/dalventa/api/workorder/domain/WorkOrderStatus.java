package rd.dalventa.api.workorder.domain;

public enum WorkOrderStatus {
    PENDIENTE,
    EN_PROGRESO,
    COMPLETADA,
    CANCELADA;

    public boolean canTransitionTo(WorkOrderStatus next) {
        return switch (this) {
            case PENDIENTE   -> next == EN_PROGRESO || next == CANCELADA;
            case EN_PROGRESO -> next == COMPLETADA  || next == CANCELADA;
            case COMPLETADA, CANCELADA -> false;
        };
    }
}
