import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchBar from "@/components/search/SearchBar";

describe("SearchBar", () => {
  it("renders the search input", () => {
    render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);

    expect(screen.getByPlaceholderText("Hľadať výroky...")).toBeInTheDocument();
  });

  it("calls onChange while typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<SearchBar value="" onChange={onChange} onSearch={() => {}} />);

    await user.type(screen.getByRole("textbox"), "test");

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("t");
  });

  it("calls onSearch on Enter", () => {
    const onSearch = vi.fn();

    render(<SearchBar value="test" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("does not call onSearch on Space", () => {
    const onSearch = vi.fn();

    render(<SearchBar value="test" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: " " });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows and uses the clear button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<SearchBar value="test" onChange={onChange} onSearch={() => {}} />);
    await user.click(screen.getByRole("button", { name: /Vymazať dopyt/i }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("hides the clear button when the value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);

    expect(screen.queryByRole("button", { name: /Vymazať dopyt/i })).toBeNull();
  });

  it("keeps typing enabled while disabling submit during loading", () => {
    render(
      <SearchBar value="test" onChange={() => {}} onSearch={() => {}} loading />,
    );

    expect(screen.getByRole("textbox")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Vyhľadáva sa/i })).toBeDisabled();
  });
});
