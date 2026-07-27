-- Issuing the LAST NCF of an authorized range advances next_number to end_number + 1, which is how
-- the service detects an exhausted sequence. The original CHECK forbade that value, so the final
-- receipt of every range failed with a constraint violation (HTTP 500) instead of being issued.
-- Relax the upper bound to allow the exhausted marker while keeping the range itself coherent.
ALTER TABLE fiscal_receipt_sequences
    DROP CONSTRAINT IF EXISTS chk_fiscal_sequence_numbers;

ALTER TABLE fiscal_receipt_sequences
    ADD CONSTRAINT chk_fiscal_sequence_numbers CHECK (
        start_number > 0
        AND end_number >= start_number
        AND next_number >= start_number
        AND next_number <= end_number + 1
    );
