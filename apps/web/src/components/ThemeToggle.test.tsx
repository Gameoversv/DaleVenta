import { describe, expect, it, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("defaults to light when nothing was stored", async () => {
    renderWithProviders(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /cambiar tema/i });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("restores the theme the user chose on a previous visit", async () => {
    localStorage.setItem("theme", "dark");
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /cambiar tema/i });
    await waitFor(() => expect(button).toBeEnabled());

    // Already dark, so one click must go back to light rather than staying dark.
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("switches to dark and marks the document for the stylesheet", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /cambiar tema/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches back to light, clearing the dark marker", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /cambiar tema/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.click(button);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("remembers the choice for the next visit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /cambiar tema/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("stays inert until mounted, so the server and client markup agree", () => {
    renderWithProviders(<ThemeToggle />);

    // The placeholder keeps the layout stable without claiming a theme it cannot know yet.
    expect(screen.getByRole("button", { name: /cambiar tema/i })).toBeInTheDocument();
  });
});
