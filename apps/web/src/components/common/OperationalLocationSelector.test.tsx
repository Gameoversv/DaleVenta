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

  it("waits rather than showing an empty context while the branches load", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ branches: [], branchId: "", selectedBranch: undefined, branchesLoading: true })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText(/cargando sucursales disponibles/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Contexto operativo")).not.toBeInTheDocument();
  });

  it("reports a failed branch load instead of pretending there is no branch", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ branches: [], branchId: "", selectedBranch: undefined, branchesError: true })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText(/no se pudieron cargar las sucursales/i)).toBeInTheDocument();
    expect(screen.queryByText(/pide a un administrador/i)).not.toBeInTheDocument();
  });

  it("requires an explicit branch choice when more than one is allowed", async () => {
    const user = userEvent.setup();
    const selectBranch = vi.fn();
    renderWithProviders(
      <OperationalLocationSelector
        location={location({
          branchId: "",
          selectedBranch: undefined,
          hasMultipleBranches: true,
          needsBranchSelection: true,
          branches: [
            { id: "b-1", name: "Centro", address: null, active: true, createdAt: "" },
            { id: "b-2", name: "Norte", address: null, active: true, createdAt: "" },
          ],
          selectBranch,
        })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText("Selecciona la sucursal donde deseas operar.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Sucursal"), "b-2");

    expect(selectBranch).toHaveBeenCalledWith("b-2");
  });

  it("hides the register field entirely on a screen that does not need one", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ registers: [], registerId: "", selectedRegister: undefined })}
        idPrefix="inventory"
        requireRegister={false}
      />
    );

    expect(screen.getByText("Centro")).toBeInTheDocument();
    expect(screen.queryByText("Caja")).not.toBeInTheDocument();
  });

  it("reports a failed register load alongside the branch it belongs to", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ registers: [], registerId: "", selectedRegister: undefined, registersError: true })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText("Centro")).toBeInTheDocument();
    expect(screen.getByText(/no se pudieron cargar las cajas de esta sucursal/i)).toBeInTheDocument();
  });

  it("says the registers are still loading in place of a register name", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ registers: [], registerId: "", selectedRegister: undefined, registersLoading: true })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText(/cargando cajas/i)).toBeInTheDocument();
  });

  it("falls back to a plain marker when the branch has no register at all", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ registers: [], registerId: "", selectedRegister: undefined })}
        idPrefix="pos"
      />
    );

    expect(screen.getByText("Sin caja")).toBeInTheDocument();
  });

  it("offers the way out of a branch with no operative register", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({ registers: [], registerId: "", selectedRegister: undefined, hasNoRegisters: true })}
        idPrefix="pos"
        emptyRegisterAction={<button type="button">Administrar cajas</button>}
      />
    );

    expect(screen.getByText(/solicita una asignación de caja/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Administrar cajas" })).toBeInTheDocument();
  });

  it("keeps the register choice locked while its branch is still loading", () => {
    renderWithProviders(
      <OperationalLocationSelector
        location={location({
          branchId: "",
          registerId: "",
          selectedRegister: undefined,
          hasMultipleRegisters: true,
          registersLoading: true,
          registers: [],
        })}
        idPrefix="pos"
      />
    );

    expect(screen.getByLabelText("Caja")).toBeDisabled();
    expect(screen.getByText(/cargando cajas/i)).toBeInTheDocument();
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
