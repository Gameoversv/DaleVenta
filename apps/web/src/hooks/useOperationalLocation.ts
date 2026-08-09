import { useState } from "react";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useSoleRegister } from "@/hooks/useSoleRegister";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

interface UseOperationalLocationOptions {
  enabled?: boolean;
  requireRegister?: boolean;
}

export interface OperationalLocation {
  branches: BranchResponse[];
  registers: RegisterResponse[];
  branchId: string;
  registerId: string;
  selectedBranch: BranchResponse | undefined;
  selectedRegister: RegisterResponse | undefined;
  branchesLoading: boolean;
  registersLoading: boolean;
  branchesError: boolean;
  registersError: boolean;
  hasMultipleBranches: boolean;
  hasMultipleRegisters: boolean;
  hasNoBranches: boolean;
  hasNoRegisters: boolean;
  needsBranchSelection: boolean;
  needsRegisterSelection: boolean;
  selectBranch: (branchId: string) => void;
  selectRegister: (registerId: string) => void;
}

/**
 * Keeps the branch/register choice consistent across every operational screen. A single visible
 * location is selected automatically; several locations require an explicit, safe choice.
 */
/**
 * Which of the visible options is selected.
 *
 * A single option selects itself. Several require an explicit choice, and that choice only holds
 * while it is still on offer: a cashier whose assignment is revoked mid-session would otherwise
 * keep operating against a location they no longer have.
 */
function selectedId<T extends { id: string }>(
  hasMultiple: boolean,
  options: T[],
  manualId: string,
  soleId: string
): string {
  if (!hasMultiple) return soleId;
  return options.some((option) => option.id === manualId) ? manualId : "";
}

function branchState(branchQuery: ReturnType<typeof useSoleBranch>, branchId: string) {
  return {
    branches: branchQuery.branches,
    branchId,
    selectedBranch: branchQuery.branches.find((branch) => branch.id === branchId),
    branchesLoading: branchQuery.isLoading,
    branchesError: branchQuery.isError,
    hasMultipleBranches: branchQuery.hasMultiple,
    hasNoBranches: !branchQuery.isLoading && branchQuery.branches.length === 0,
    needsBranchSelection: branchQuery.hasMultiple && !branchId,
  };
}

function registerState(
  registerQuery: ReturnType<typeof useSoleRegister>,
  requireRegister: boolean,
  branchId: string,
  registerId: string
) {
  // Nothing is asked about registers on a screen that does not need one, nor before a branch is
  // settled: the registers on offer are the ones belonging to that branch.
  const asking = requireRegister && !!branchId;
  return {
    registers: requireRegister ? registerQuery.registers : [],
    registerId,
    selectedRegister: registerQuery.registers.find((register) => register.id === registerId),
    registersLoading: requireRegister && registerQuery.isLoading,
    registersError: requireRegister && registerQuery.isError,
    hasMultipleRegisters: requireRegister && registerQuery.hasMultiple,
    hasNoRegisters: asking && !registerQuery.isLoading && registerQuery.registers.length === 0,
    needsRegisterSelection: asking && registerQuery.hasMultiple && !registerId,
  };
}

export function useOperationalLocation({
  enabled = true,
  requireRegister = true,
}: UseOperationalLocationOptions = {}): OperationalLocation {
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");

  const branchQuery = useSoleBranch(enabled);
  const branchId = selectedId(
    branchQuery.hasMultiple,
    branchQuery.branches,
    manualBranchId,
    branchQuery.soleBranchId
  );

  const registerQuery = useSoleRegister(branchId, enabled && requireRegister);
  const registerId = requireRegister
    ? selectedId(
        registerQuery.hasMultiple,
        registerQuery.registers,
        manualRegisterId,
        registerQuery.soleRegisterId
      )
    : "";

  const selectBranch = (nextBranchId: string) => {
    setManualBranchId(nextBranchId);
    // The registers on offer belong to the branch, so the old pick cannot survive the move.
    setManualRegisterId("");
  };

  return {
    ...branchState(branchQuery, branchId),
    ...registerState(registerQuery, requireRegister, branchId, registerId),
    selectBranch,
    selectRegister: setManualRegisterId,
  };
}
