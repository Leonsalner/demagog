import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import StatementFormFields, {
  applySourceDraftChange,
  createInitialStatementFormState,
  type StatementFormState,
} from "@/components/add/StatementFormFields";

function TestHarness() {
  const [form, setForm] = useState<StatementFormState>(() =>
    createInitialStatementFormState(),
  );

  function updateField<K extends keyof StatementFormState>(
    field: K,
    value: StatementFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <StatementFormFields
      form={form}
      status="idle"
      errorMessage={null}
      idPrefix="test"
      primaryActionLabel="Uložiť"
      onSubmit={(event) => event.preventDefault()}
      updateField={updateField}
      updateSourceField={(index, field, value) =>
        setForm((current) => ({
          ...current,
          sources: applySourceDraftChange(current.sources, index, field, value),
        }))
      }
    />
  );
}

describe("StatementFormFields", () => {
  it("adds a new empty source row only after the current last row has a valid URL", async () => {
    const user = userEvent.setup();

    render(<TestHarness />);

    expect(screen.getAllByLabelText("Štítok zdroja")).toHaveLength(1);

    await user.type(screen.getByLabelText("Štítok zdroja"), "Denník N");

    expect(screen.getAllByLabelText("Štítok zdroja")).toHaveLength(1);
    expect(screen.getAllByLabelText("URL zdroja")).toHaveLength(1);

    await user.type(screen.getByLabelText("URL zdroja"), "dennikn.sk/clanok");

    expect(screen.getAllByLabelText("Štítok zdroja")).toHaveLength(2);
    expect(screen.getAllByLabelText("URL zdroja")).toHaveLength(2);
  });

  it("marks non-critical sections as optional", () => {
    render(<TestHarness />);

    expect(screen.getAllByText("Voliteľné").length).toBeGreaterThanOrEqual(4);
  });
});
