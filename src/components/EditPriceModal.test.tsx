import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditPriceModal } from "./EditPriceModal.js";
import { useEditPrice } from "../hooks/useEditPrice.js";
import { I18nProvider } from "../i18n/I18nProvider.js";
import { en } from "../i18n/locales/en.js";

vi.mock("../hooks/useEditPrice.js", () => ({
  useEditPrice: vi.fn(),
}));

function renderModal(props: {
  resourceId: string;
  currentPrice: string;
  apiKey: string;
  onClose: () => void;
  onConfirmed: (price: string) => void;
}) {
  return render(
    <I18nProvider locale="en">
      <EditPriceModal {...props} />
    </I18nProvider>,
  );
}

describe("EditPriceModal", () => {
  const onClose = vi.fn();
  const onConfirmed = vi.fn();
  const mockEditPrice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditPrice).mockReturnValue({
      status: "idle",
      newPrice: null,
      error: null,
      networkWarning: null,
      editPrice: mockEditPrice,
    });
  });

  it("renders with labeled price input and current value", () => {
    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    expect(
      screen.getByRole("heading", { name: en.editPrice.title }),
    ).toBeInTheDocument();
    const input = screen.getByLabelText(en.editPrice.newPriceLabel);
    expect(input).toHaveValue(2.5);
    expect(
      screen.getByRole("button", { name: en.editPrice.submit }),
    ).toBeInTheDocument();
  });

  it("submits new price on happy path", async () => {
    const user = userEvent.setup();
    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    const input = screen.getByLabelText(en.editPrice.newPriceLabel);
    await user.clear(input);
    await user.type(input, "3.00");
    await user.click(screen.getByRole("button", { name: en.editPrice.submit }));

    expect(mockEditPrice).toHaveBeenCalledWith("3");
  });

  it("shows in-progress status labels", () => {
    vi.mocked(useEditPrice).mockReturnValue({
      status: "signing",
      newPrice: null,
      error: null,
      networkWarning: null,
      editPrice: mockEditPrice,
    });

    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    expect(
      screen.getByText(en.editPrice.status.signing),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: en.editPrice.working }),
    ).toBeDisabled();
  });

  it("shows error state", () => {
    vi.mocked(useEditPrice).mockReturnValue({
      status: "error",
      newPrice: null,
      error: "Wallet rejected signing",
      networkWarning: null,
      editPrice: mockEditPrice,
    });

    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    expect(screen.getByText("Wallet rejected signing")).toBeInTheDocument();
  });

  it("calls onConfirmed when price is updated", async () => {
    vi.mocked(useEditPrice).mockReturnValue({
      status: "confirmed",
      newPrice: "4.00",
      error: null,
      networkWarning: null,
      editPrice: mockEditPrice,
    });

    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    await waitFor(() => {
      expect(onConfirmed).toHaveBeenCalledWith("4.00");
    });
    expect(
      screen.getByText(en.editPrice.status.confirmed.replace("{price}", "4.00")),
    ).toBeInTheDocument();
  });

  it("closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderModal({
      resourceId: "res-1",
      currentPrice: "2.50",
      apiKey: "key-1",
      onClose,
      onConfirmed,
    });

    await user.click(screen.getByRole("button", { name: en.editPrice.cancel }));
    expect(onClose).toHaveBeenCalled();
  });
});
