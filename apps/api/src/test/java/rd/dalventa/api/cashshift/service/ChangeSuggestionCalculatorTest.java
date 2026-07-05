package rd.dalventa.api.cashshift.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ChangeSuggestionCalculatorTest {

    @Test
    void suggest_exactCombinationExists_returnsMinimalPieceCount() {
        var d500 = UUID.randomUUID();
        var d100 = UUID.randomUUID();
        var d50 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d500, 50000, 5),
                new ChangeSuggestionCalculator.AvailableDenomination(d100, 10000, 5),
                new ChangeSuggestionCalculator.AvailableDenomination(d50, 5000, 5)
        );

        // Change needed: RD$650.00 = 65000 cents -> 1x500 + 1x100 + 1x50 (3 pieces)
        var result = ChangeSuggestionCalculator.suggest(65000, available);

        assertThat(result.exact()).isTrue();
        assertThat(result.combination()).containsEntry(d500, 1).containsEntry(d100, 1).containsEntry(d50, 1);
        assertThat(result.combination().values().stream().mapToInt(Integer::intValue).sum()).isEqualTo(3);
    }

    @Test
    void suggest_noExactCombination_returnsNotExact() {
        var d500 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d500, 50000, 1)
        );

        // Change needed: RD$700.00 = 70000 cents -> cannot be made from a single 500 (only 1 available)
        var result = ChangeSuggestionCalculator.suggest(70000, available);

        assertThat(result.exact()).isFalse();
        assertThat(result.combination()).isEmpty();
    }

    @Test
    void suggest_respectsQuantityLimits_perDenomination() {
        var d100 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d100, 10000, 2)
        );

        // Change needed: RD$300.00 = 30000 cents, needs 3x100 but only 2 available
        var result = ChangeSuggestionCalculator.suggest(30000, available);

        assertThat(result.exact()).isFalse();
    }

    @Test
    void suggest_zeroChange_returnsExactEmptyCombination() {
        var result = ChangeSuggestionCalculator.suggest(0, List.of());

        assertThat(result.exact()).isTrue();
        assertThat(result.combination()).isEmpty();
    }
}
