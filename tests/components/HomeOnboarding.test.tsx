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
    document.documentElement.dataset.theme = "light";
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
  }, 20_000);

  it("navigates forward and backward across steps", async () => {
    render(<HomeOnboarding />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Dva režimy. Jeden jednoduchý začiatok.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Základ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Pýtajte sa tak, ako by ste sa pýtali kolegu.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2. Vyhľadávanie")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Späť" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Dva režimy. Jeden jednoduchý začiatok.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Základ")).toBeInTheDocument();
  }, 20_000);

  it("navigates directly through progress dots", async () => {
    render(<HomeOnboarding />);

    fireEvent.click(await screen.findByRole("button", { name: "Prejsť na krok 3" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Najprv zistite, či už výrok nebol overený.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("3. Detekcia duplicít")).toBeInTheDocument();
  });

  it("dismisses from the close button and persists the dismissed status", async () => {
    render(<HomeOnboarding />);

    fireEvent.click(await screen.findByRole("button", { name: "Zavrieť návod" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("dismissed");
  });

  it("switches onboarding media to dark assets when the active theme is dark", async () => {
    document.documentElement.dataset.theme = "dark";

    render(<HomeOnboarding />);

    fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));

    const image = await screen.findByAltText(
      "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
    );

    expect(image).toHaveAttribute("src", expect.stringContaining("step-02-search-dark.png"));
  });

  it("uses dark assets for all image-backed onboarding steps", async () => {
    document.documentElement.dataset.theme = "dark";

    render(<HomeOnboarding includeOptionalSteps />);

    const expectedAssets = [
      {
        alt: "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
        file: "step-02-search-dark.png",
      },
      {
        alt: "Detekcia duplicít s vloženým výrokom, rýchlym režimom a výsledkom s akciou Pridať výrok.",
        file: "step-03-detect-dark.png",
      },
      {
        alt: "Preskúmať s analýzou výroku, článkami Demagogu a overovacími podkladmi na jednom mieste.",
        file: "step-04-research-dark.png",
      },
      {
        alt: "Formulár na pridanie nového výroku s predvyplneným textom a pripravenými poliami.",
        file: "step-05-add-dark.png",
      },
    ];

    for (const asset of expectedAssets) {
      fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));

      const image = await screen.findByAltText(asset.alt);
      expect(image).toHaveAttribute("src", expect.stringContaining(asset.file));
    }
  }, 20_000);
});
