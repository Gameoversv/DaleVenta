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
export function useOperationalLocation({
  enabled = true,
  requireRegister = true,
}: UseOperationalLocationOptions = {}): OperationalLocation {
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");
  const branchQuery = useSoleBranch(enabled);

  const branchId = branchQuery.hasMultiple
    ? branchQuery.branches.some((branch) => branch.id === manualBranchId)
      ? manualBranchId
      : ""
    : branchQuery.soleBranchId;
  const registerQuery = useSoleRegister(branchId, enabled && requireRegister);
  const registerId = requireRegister
    ? registerQuery.hasMultiple
      ? registerQuery.registers.some((register) => register.id === manualRegisterId)
        ? manualRegisterId
        : ""
      : registerQuery.soleRegisterId
    : "";

  const selectBranch = (nextBranchId: string) => {
    setManualBranchId(nextBranchId);
    setManualRegisterId("");
  };

  return {
    branches: branchQuery.branches,
    registers: requireRegister ? registerQuery.registers : [],
    branchId,
    registerId,
    selectedBranch: branchQuery.branches.find((branch) => branch.id === branchId),
    selectedRegister: registerQuery.registers.find((register) => register.id === registerId),
    branchesLoading: branchQuery.isLoading,
    registersLoading: requireRegister && registerQuery.isLoading,
    branchesError: branchQuery.isError,
    registersError: requireRegister && registerQuery.isError,
    hasMultipleBranches: branchQuery.hasMultiple,
    hasMultipleRegisters: requireRegister && registerQuery.hasMultiple,
    hasNoBranches: !branchQuery.isLoading && branchQuery.branches.length === 0,
    hasNoRegisters: requireRegister && !!branchId && !registerQuery.isLoading && registerQuery.registers.length === 0,
    needsBranchSelection: branchQuery.hasMultiple && !branchId,
    needsRegisterSelection: requireRegister && !!branchId && registerQuery.hasMultiple && !registerId,
    selectBranch,
    selectRegister: setManualRegisterId,
  };
}
