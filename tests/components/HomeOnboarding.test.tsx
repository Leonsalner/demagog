import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import HomeOnboarding, {
  HOME_ONBOARDING_STORAGE_KEY,
} from "@/components/home/HomeOnboarding";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

function renderOnboarding() {
  return render(
    <FooterHelperVisibilityProvider>
      <HomeOnboarding />
    </FooterHelperVisibilityProvider>,
  );
}

describe("HomeOnboarding", () => {
  let storage = new Map<string, string>();

  beforeEach(() => {
    storage = new Map<string, string>();
    usePathnameMock.mockReturnValue("/");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
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
    renderOnboarding();

    expect(
      await screen.findByRole("dialog", { name: "Rýchly návod k práci s Demagogom" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vyhľadávanie pre kontext, Detekcia pre konkrétny výrok.")).toBeInTheDocument();
  }, 20_000);

  it("persists dismissal and supports manual reopen", async () => {
    renderOnboarding();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Zavrieť návod",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("dismissed");
    expect(screen.getByText("Máte postreh z prvého používania?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť návod" }));

    expect(
      await screen.findByRole("dialog", { name: "Rýchly návod k práci s Demagogom" }),
    ).toBeInTheDocument();
  }, 20_000);

  it("does not reopen automatically after completion", async () => {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "completed");

    renderOnboarding();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("button", { name: "Otvoriť návod" })).toBeInTheDocument();
  });

  it("keeps the guide available on /add without auto-opening the onboarding", async () => {
    usePathnameMock.mockReturnValue("/add");

    renderOnboarding();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("button", { name: "Otvoriť návod" })).toBeInTheDocument();
  });

  it("stores completion on the last step", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Ďalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Hotovo" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("completed");
    expect(screen.getByText("Máte postreh z prvého používania?")).toBeInTheDocument();
  }, 20_000);

  it("navigates forward and backward across steps", async () => {
    renderOnboarding();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Vyhľadávanie pre kontext, Detekcia pre konkrétny výrok.",
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
        name: "Vyhľadávanie pre kontext, Detekcia pre konkrétny výrok.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Základ")).toBeInTheDocument();
  }, 20_000);

  it("navigates directly through progress dots", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Prejsť na krok 3" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Rýchle overenie výroku v archíve.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("3. Detekcia duplicít")).toBeInTheDocument();
    expect(
      screen.getByText("Po odoslaní systém rýchlo prehľadá archív."),
    ).toBeInTheDocument();
  });

  it("dismisses from the close button and persists the dismissed status", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Zavrieť návod" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY)).toBe("dismissed");
    expect(screen.getByText("Máte postreh z prvého používania?")).toBeInTheDocument();
  });

  it("shows and hides the mobile scroll cue on the first step", async () => {
    renderOnboarding();

    const dialog = await screen.findByRole("dialog", {
      name: "Rýchly návod k práci s Demagogom",
    });
    expect(screen.getByText("Posuňte nižšie pre ďalšie kroky")).toBeInTheDocument();

    Object.defineProperty(dialog, "scrollTop", {
      configurable: true,
      value: 40,
      writable: true,
    });
    fireEvent.scroll(dialog);

    await waitFor(() => {
      expect(screen.queryByText("Posuňte nižšie pre ďalšie kroky")).not.toBeInTheDocument();
    });
  });

  it("switches onboarding media to dark assets when the active theme is dark", async () => {
    document.documentElement.dataset.theme = "dark";

    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));

    const image = await screen.findByAltText(
      "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
    );

    expect(image).toHaveAttribute("src", expect.stringContaining("step-02-search-dark.png"));
  });

  it("uses dark assets for all image-backed onboarding steps", async () => {
    document.documentElement.dataset.theme = "dark";

    renderOnboarding();

    const expectedAssets = [
      {
        alt: "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
        file: "step-02-search-dark.png",
      },
      {
        alt: "Detekcia duplicít po odoslaní výroku zostáva v stave prípravy súhrnného prieskumu.",
        file: "step-03-detect-dark.png",
      },
      {
        alt: "Súhrnný prieskum s podobnými výrokmi, článkami a zdrojmi otvorený priamo po detekcii.",
        file: "step-04-research-dark.png",
      },
      {
        alt: "Formulár na pridanie nového výroku otvorený priamo nad súhrnným prieskumom.",
        file: "step-05-add-dark.png",
      },
    ];

    for (const asset of expectedAssets) {
      fireEvent.click(await screen.findByRole("button", { name: "Ďalej" }));

      const image = await screen.findByAltText(asset.alt);
      expect(image).toHaveAttribute("src", expect.stringContaining(asset.file));
    }
  }, 20_000);

  it("renders guide trigger dock with side=right after dismissal", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Zavrieť návod" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const guideDock = screen.getByTestId("footer-helper-dock-guide");
    expect(guideDock).toHaveAttribute("data-side", "right");
  });

  it("renders toast dock with side=right after dismissal on first visit", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Zavrieť návod" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const toastDock = screen.getByTestId("footer-helper-dock-toast");
    expect(toastDock).toHaveAttribute("data-side", "right");
  });

  it("shows toast with updated copy referencing the top-bar button", async () => {
    renderOnboarding();

    fireEvent.click(await screen.findByRole("button", { name: "Zavrieť návod" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Máte postreh z prvého používania?")).toBeInTheDocument();
    expect(
      screen.getByText("Máte nápad alebo ste našli chybu? Napíšte nám cez tlačidlo v hlavičke."),
    ).toBeInTheDocument();
  });
});
