import { Keypair } from "@stellar/stellar-sdk";
const recipient = Keypair.random().publicKey();
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransferOwnershipModal } from "./TransferOwnershipModal.js";
import { useTransferOwnership } from "../hooks/useTransferOwnership.js";
import "../i18n/config.js";

vi.mock("../hooks/useTransferOwnership.js", () => ({
  useTransferOwnership: vi.fn(),
}));

const renderWithI18n = (ui: React.ReactElement) =>
  render(<>{ui}</>);

describe("TransferOwnershipModal", () => {
  const onClose = vi.fn();
  const onConfirmed = vi.fn();
  const mockTransfer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransferOwnership).mockReturnValue({
      status: "idle",
      newOwner: null,
      error: null,
      networkWarning: null,
      transferOwnership: mockTransfer,
    });
  });

  it("renders with labeled owner address input", () => {
    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    expect(screen.getByRole("heading", { name: /transfer ownership/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new owner address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review transfer/i })).toBeDisabled();
  });

  it("submits new owner on happy path", async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    await user.type(screen.getByLabelText(/new owner address/i), recipient);
    await user.click(screen.getByRole("button", { name: /review transfer/i }));

    expect(mockTransfer).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /confirm transfer/i }));
    expect(mockTransfer).toHaveBeenCalledWith(recipient);
  });

  it("shows in-progress status labels", () => {
    vi.mocked(useTransferOwnership).mockReturnValue({
      status: "submitting",
      newOwner: null,
      error: null,
      networkWarning: null,
      transferOwnership: mockTransfer,
    });

    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    expect(screen.getByText(/submitting transaction/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /working/i })).toBeDisabled();
  });

  it("shows error state", () => {
    vi.mocked(useTransferOwnership).mockReturnValue({
      status: "error",
      newOwner: null,
      error: "Invalid Stellar address",
      networkWarning: null,
      transferOwnership: mockTransfer,
    });

    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    expect(screen.getByText("Invalid Stellar address")).toBeInTheDocument();
  });

  it("calls onConfirmed when transfer succeeds", async () => {
    vi.mocked(useTransferOwnership).mockReturnValue({
      status: "confirmed",
      newOwner: recipient,
      error: null,
      networkWarning: null,
      transferOwnership: mockTransfer,
    });

    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    await waitFor(() => {
      expect(onConfirmed).toHaveBeenCalledWith(recipient);
    });
    expect(screen.getByText(`Ownership transferred to ${recipient}`)).toBeInTheDocument();
  });

  it("closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <TransferOwnershipModal
        resourceId="res-1" resourceTitle="Test resource"
        apiKey="key-1"
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
