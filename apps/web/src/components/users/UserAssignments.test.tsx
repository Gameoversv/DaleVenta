import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { UserAssignmentsDialog, UserAssignmentsSummary } from "./UserAssignments";
import type { UserAssignments, UserResponse } from "@/types/auth";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

const get = vi.fn();
const put = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function user(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: "u-1",
    name: "Ana Cajera",
    email: "ana@dalventa.test",
    role: "CASHIER",
    active: true,
    createdAt: "",
    ...overrides,
  } as UserResponse;
}

const BRANCHES: BranchResponse[] = [
  { id: "b-1", name: "Centro", address: null, active: true, createdAt: "" },
  { id: "b-2", name: "Norte", address: null, active: true, createdAt: "" },
];

const REGISTERS: Record<string, RegisterResponse[]> = {
  "b-1": [
    { id: "r-1", name: "Caja 1", branchId: "b-1", active: true },
    { id: "r-2", name: "Caja 2", branchId: "b-1", active: true },
  ],
  "b-2": [],
};

function mockApi(assignments: UserAssignments, branches: BranchResponse[] = BRANCHES) {
  get.mockImplementation((url: string, config?: { params?: { branchId?: string } }) => {
    if (url === "/api/branches") {
      return Promise.resolve({ data: { data: branches } });
    }
    if (url === "/api/registers") {
      return Promise.resolve({ data: { data: REGISTERS[config?.params?.branchId ?? ""] ?? [] } });
    }
    return Promise.resolve({ data: { data: assignments } });
  });
  put.mockResolvedValue({ data: { data: assignments } });
}

describe("UserAssignmentsSummary", () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
  });

  it("says an admin is unrestricted without asking the API", () => {
    mockApi({ branchIds: [], registerIds: [] });

    renderWithProviders(<UserAssignmentsSummary user={user({ role: "ADMIN" })} />);

    expect(screen.getByText("Sin restriccion")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("counts the assigned branches and registers", async () => {
    mockApi({ branchIds: ["b-1"], registerIds: ["r-1", "r-2"] });

    renderWithProviders(<UserAssignmentsSummary user={user()} />);

    expect(await screen.findByText("1 sucursal · 2 cajas")).toBeInTheDocument();
  });

  it("flags a cashier with a branch but no register, who cannot sell anywhere", async () => {
    mockApi({ branchIds: ["b-1"], registerIds: [] });

    renderWithProviders(<UserAssignmentsSummary user={user()} />);

    expect(await screen.findByText("Sin asignaciones")).toBeInTheDocument();
  });

  it("reports a failed lookup instead of showing the cashier as unassigned", async () => {
    get.mockRejectedValue(new Error("network"));

    renderWithProviders(<UserAssignmentsSummary user={user()} />);

    expect(await screen.findByText("No disponible")).toBeInTheDocument();
  });
});

describe("UserAssignmentsDialog", () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
  });

  async function open(assignments: UserAssignments, branches: BranchResponse[] = BRANCHES) {
    mockApi(assignments, branches);
    renderWithProviders(<UserAssignmentsDialog user={user()} />);
    await userEvent.click(screen.getByRole("button", { name: "Asignar sucursales y cajas" }));
    await waitFor(() => expect(screen.queryByText("Cargando asignaciones...")).not.toBeInTheDocument());
  }

  it("shows the registers of an assigned branch and hides those of an unassigned one", async () => {
    await open({ branchIds: ["b-1"], registerIds: ["r-1"] });

    expect(screen.getByLabelText("Caja 1")).toBeChecked();
    expect(screen.getByLabelText("Caja 2")).not.toBeChecked();
    expect(screen.getByLabelText("Centro")).toBeChecked();
    expect(screen.getByLabelText("Norte")).not.toBeChecked();
  });

  it("saves the registers the administrator ticks", async () => {
    await open({ branchIds: ["b-1"], registerIds: ["r-1"] });

    await userEvent.click(screen.getByLabelText("Caja 2"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar asignaciones" }));

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/users/u-1/assignments", {
        branchIds: ["b-1"],
        registerIds: ["r-1", "r-2"],
      })
    );
  });

  it("drops the registers of a branch when that branch is unticked", async () => {
    await open({ branchIds: ["b-1"], registerIds: ["r-1", "r-2"] });

    await userEvent.click(screen.getByLabelText("Centro"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar asignaciones" }));

    // Leaving a register behind would grant a caja whose branch the cashier can no longer see.
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/users/u-1/assignments", { branchIds: [], registerIds: [] })
    );
  });

  it("says so when an assigned branch has no active register", async () => {
    await open({ branchIds: ["b-2"], registerIds: [] });

    expect(screen.getByText("Sin cajas activas.")).toBeInTheDocument();
  });

  it("explains an empty tenant instead of rendering a blank list", async () => {
    await open({ branchIds: [], registerIds: [] }, []);

    expect(screen.getByText("No hay sucursales activas para asignar.")).toBeInTheDocument();
  });

  it("forgets an unsaved draft when the dialog is dismissed", async () => {
    await open({ branchIds: ["b-1"], registerIds: ["r-1"] });

    await userEvent.click(screen.getByLabelText("Caja 2"));
    expect(screen.getByLabelText("Caja 2")).toBeChecked();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Asignar sucursales y cajas" }));

    await waitFor(() => expect(screen.getByLabelText("Caja 2")).not.toBeChecked());
    expect(put).not.toHaveBeenCalled();
  });
});
