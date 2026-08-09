import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { OperationalLocationSelector } from "./OperationalLocationSelector";
import type { OperationalLocation } from "@/hooks/useOperationalLocation";

function location(overrides: Partial<OperationalLocation> = {}): OperationalLocation {
  return {
    branches: [{ id: "b-1", name: "Centro", address: null, active: true, createdAt: "" }],
    registers: [{ id: "r-1", name: "Caja 1", branchId: "b-1", active: true }],
    branchId: "b-1",
    registerId: "r-1",
    selectedBranch: { id: "b-1", name: "Centro", address: null, active: true, createdAt: "" },
    selectedRegister: { id: "r-1", name: "Caja 1", branchId: "b-1", active: true },
    branchesLoading: false,
    registersLoading: false,
    branchesError: false,
    registersError: false,
    hasMultipleBranches: false,
    hasMultipleRegisters: false,
    hasNoBranches: false,
    hasNoRegisters: false,
    needsBranchSelection: false,
    needsRegisterSelection: false,
    selectBranch: vi.fn(),
    selectRegister: vi.fn(),
    ...overrides,
  };
}

describe("OperationalLocationSelector", () => {
  it("shows the automatically selected branch and register as the current operational context", () => {
    renderWithProviders(<OperationalLocationSelector location={location()} idPrefix="pos" />);

    expect(screen.getByLabelText("Contexto operativo")).toBeInTheDocument();
    expect(screen.getByText("Centro")).toBeInTheDocument();
    expect(screen.getByText("Caja 1")).toBeInTheDocument();
  });

  it("explains the assignment next step when no branch is available", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ branches: [], branchId: "", selectedBranch: undefined, hasNoBranches: true })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText(/pide a un administrador que te asigne/i)).toBeInTheDocument();
  });

  it("requires an explicit register choice when more than one is allowed", () => {
    const selectRegister = vi.fn();
    renderWithProviders(
      <OperationalLocationSelector
        location={location({
          registerId: "",
          selectedRegister: undefined,
          hasMultipleRegisters: true,
          needsRegisterSelection: true,
          registers: [
            { id: "r-1", name: "Caja 1", branchId: "b-1", active: true },
            { id: "r-2", name: "Caja 2", branchId: "b-1", active: true },
          ],
          selectRegister,
        })}
        idPrefix="pos"
      />
    );

    expect(screen.getByLabelText("Caja")).toHaveValue("");
    expect(screen.getByText("Selecciona la caja donde deseas operar.")).toBeInTheDocument();
  });

  it("passes an explicit register choice back to the shared location state", async () => {
    const user = userEvent.setup();
    const selectRegister = vi.fn();
    renderWithProviders(
      <OperationalLocationSelector
        location={location({
          registerId: "",
          selectedRegister: undefined,
          hasMultipleRegisters: true,
          registers: [
            { id: "r-1", name: "Caja 1", branchId: "b-1", active: true },
            { id: "r-2", name: "Caja 2", branchId: "b-1", active: true },
          ],
          selectRegister,
        })}
        idPrefix="pos"
      />
    );

    await user.selectOptions(screen.getByLabelText("Caja"), "r-2");

    expect(selectRegister).toHaveBeenCalledWith("r-2");
  });
});
