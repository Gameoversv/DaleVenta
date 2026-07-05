package rd.dalventa.api.reception.domain;

public record ChecklistSection(
        Boolean scratches,
        Boolean dents,
        Boolean lights,
        Boolean radio,
        Boolean screen,
        Boolean mats,
        Boolean oilLevel,
        Boolean coolant,
        Boolean battery
) {}
