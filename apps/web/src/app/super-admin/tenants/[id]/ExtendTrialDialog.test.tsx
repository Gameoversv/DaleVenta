import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { ExtendTrialDialog } from "./ExtendTrialDialog";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ default: { post: (...args: unknown[]) => post(...args) } }));

const success = vi.fn();
const error = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));

async function open() {
  const user = userEvent.setup();
  renderWithProviders(<ExtendTrialDialog tenantId="t-1" />);
  await user.click(screen.getByRole("button", { name: "Extender trial" }));
  return user;
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: { data: null } });
  success.mockReset();
  error.mockReset();
});

describe("ExtendTrialDialog", () => {
  it("proposes a month by default", async () => {
    await open();

    expect(await screen.findByLabelText("Dias")).toHaveValue(30);
  });

  it("extends the trial by the days that were typed", async () => {
    const user = await open();

    const days = await screen.findByLabelText("Dias");
    await user.clear(days);
    await user.type(days, "15");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/super-admin/tenants/t-1/extend-trial", null, {
        params: { days: "15" },
      })
    );
    await waitFor(() => expect(success).toHaveBeenCalledWith("Trial extendido"));
  });

  it("closes itself once the extension lands", async () => {
    const user = await open();

    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByLabelText("Dias")).not.toBeInTheDocument());
  });

  it("stays open and says what went wrong when the extension is refused", async () => {
    post.mockRejectedValue({ response: { data: { error: "Trial ya vencido" } } });
    const user = await open();

    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(error).toHaveBeenCalledWith("Trial ya vencido"));
    expect(screen.getByLabelText("Dias")).toBeInTheDocument();
  });
});
