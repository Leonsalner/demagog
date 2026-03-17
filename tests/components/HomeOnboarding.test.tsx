import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import HomeOnboarding, {
  HOME_ONBOARDING_STORAGE_KEY,
} from "@/components/home/HomeOnboarding";

describe("HomeOnboarding", () => {
  let storage = new Map<string, string>();

  beforeEach(() => {
    storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });

    window.localStorage.removeItem(HOME_ONBOARDING_STORAGE_KEY);
    document.body.style.overflow = "";
  });

  it("opens automatically on first visit", async () => {
    render(<HomeOnboarding />);

    expect(
      await screen.findByRole("dialog", { name: "Rýchly návod k práci s Demagogom" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dva režimy. Jeden jednoduchý začiatok.")).toBeInTheDocument();
  });

  it("persists dismissal and supports manual reopen", async () => {
    render(<HomeOnboarding />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Preskočiť",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("dismissed");

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť návod" }));

    expect(
      await screen.findByRole("dialog", { name: "Rýchly návod k práci s Demagogom" }),
    ).toBeInTheDocument();
  });

  it("does not reopen automatically after completion", async () => {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "completed");

    render(<HomeOnboarding />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("button", { name: "Otvoriť návod" })).toBeInTheDocument();
  });

  it("stores completion on the last step", async () => {
    render(<HomeOnboarding />);

    fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Hotovo" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("completed");
  });
});
