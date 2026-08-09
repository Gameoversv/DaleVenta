package rd.dalventa.api.cashshift.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ChangeSuggestionCalculator {

    private ChangeSuggestionCalculator() {}

    public record AvailableDenomination(UUID denominationId, long valueCents, int quantityAvailable) {}

    public record SuggestionResult(boolean exact, Map<UUID, Integer> combination) {}

    public static SuggestionResult suggest(long changeAmountCents, List<AvailableDenomination> available) {
        if (changeAmountCents == 0) {
            return new SuggestionResult(true, Map.of());
        }

        int target = Math.toIntExact(changeAmountCents);
        int[] dp = new int[target + 1];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;

        @SuppressWarnings("unchecked")
        Map<UUID, Integer>[] usedCount = new Map[target + 1];
        usedCount[0] = new HashMap<>();

        List<AvailableDenomination> byValueDesc = new ArrayList<>(available);
        byValueDesc.sort((a, b) -> Long.compare(b.valueCents(), a.valueCents()));

        for (int amount = 1; amount <= target; amount++) {
            for (AvailableDenomination denom : byValueDesc) {
                relax(dp, usedCount, amount, denom);
            }
        }

        if (dp[target] == Integer.MAX_VALUE) {
            return new SuggestionResult(false, Map.of());
        }
        return new SuggestionResult(true, usedCount[target]);
    }

    /**
     * Improves the best combination for {@code amount} if paying one more piece of {@code denom} on
     * top of an already reachable amount beats what is recorded, respecting how many pieces of that
     * denomination the drawer still holds.
     */
    private static void relax(int[] dp, Map<UUID, Integer>[] usedCount, int amount, AvailableDenomination denom) {
        if (denom.valueCents() > amount) {
            return;
        }
        int prevAmount = amount - Math.toIntExact(denom.valueCents());
        Map<UUID, Integer> prevUsed = usedCount[prevAmount];
        if (prevUsed == null) {
            return;
        }
        int alreadyUsed = prevUsed.getOrDefault(denom.denominationId(), 0);
        if (alreadyUsed + 1 > denom.quantityAvailable()) {
            return;
        }
        int candidatePieces = dp[prevAmount] + 1;
        if (candidatePieces < dp[amount]) {
            dp[amount] = candidatePieces;
            Map<UUID, Integer> newUsed = new HashMap<>(prevUsed);
            newUsed.merge(denom.denominationId(), 1, Integer::sum);
            usedCount[amount] = newUsed;
        }
    }
}
