import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PurchasesDashboard } from "./PurchasesDashboard.js";
import { fetchBuyerPayments } from "../api/payments.js";

vi.mock("../api/payments.js", () => ({
  fetchBuyerPayments: vi.fn(),
  receiptUrl: (id: string) => `https://api.example.com/payments/${id}/receipt`,
}));

const ADDRESS = "GBUYER234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKL";
const OTHER_ADDRESS = "GBUYER765432ABCDEFGHIJKLMNOPQRSTUVWXYZ765432ABCDEFGHIJKL";

describe("PurchasesDashboard", () => {
  beforeEach(() => {
    vi.mocked(fetchBuyerPayments).mockReset();
  });

  it("rejects an invalid address without calling the API", async () => {
    render(<PurchasesDashboard />);

    const input = screen.getByLabelText("Wallet address");
    await userEvent.type(input, "not-an-address");
    await userEvent.click(screen.getByRole("button", { name: "Look up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid Stellar address/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(fetchBuyerPayments).not.toHaveBeenCalled();
  });

  it("uppercases a valid lowercase address and lists purchases with titles and a total", async () => {
    vi.mocked(fetchBuyerPayments).mockResolvedValue([
      {
        id: "pay-1",
        resourceId: "res-1",
        amount: "1.5",
        payerAddress: ADDRESS,
        recipientAddress: "GCREATOR34567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJ",
        paidAt: "2026-06-24T12:00:00.000Z",
      },
    ]);

    render(<PurchasesDashboard resourceTitles={{ "res-1": "Premium Dataset" }} />);

    await userEvent.type(screen.getByLabelText("Wallet address"), `  ${ADDRESS.toLowerCase()} `);
    await userEvent.click(screen.getByRole("button", { name: "Look up" }));

    expect(fetchBuyerPayments).toHaveBeenCalledWith(ADDRESS);
    expect(await screen.findByText("Premium Dataset")).toBeInTheDocument();
    expect(screen.getByText("1 purchase · 1.50 USDC total")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View receipt/ })).toHaveAttribute(
      "href",
      "https://api.example.com/payments/pay-1/receipt",
    );
  });

  it("hides the previous wallet's results when a later lookup fails", async () => {
    vi.mocked(fetchBuyerPayments).mockResolvedValueOnce([
      {
        id: "pay-1",
        resourceId: "res-1",
        amount: "1.5",
        payerAddress: ADDRESS,
        recipientAddress: "GCREATOR34567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJ",
        paidAt: "2026-06-24T12:00:00.000Z",
      },
    ]);

    render(<PurchasesDashboard resourceTitles={{ "res-1": "Premium Dataset" }} />);

    const input = screen.getByLabelText("Wallet address");
    await userEvent.type(input, ADDRESS);
    await userEvent.click(screen.getByRole("button", { name: "Look up" }));

    expect(await screen.findByText("Premium Dataset")).toBeInTheDocument();
    expect(screen.getByText("1 purchase · 1.50 USDC total")).toBeInTheDocument();

    vi.mocked(fetchBuyerPayments).mockRejectedValueOnce(new Error("Network error"));

    await userEvent.clear(input);
    await userEvent.type(input, OTHER_ADDRESS);
    await userEvent.click(screen.getByRole("button", { name: "Look up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Network error/);
    expect(fetchBuyerPayments).toHaveBeenLastCalledWith(OTHER_ADDRESS);
    expect(screen.queryByText("Premium Dataset")).not.toBeInTheDocument();
    expect(screen.queryByText("1 purchase · 1.50 USDC total")).not.toBeInTheDocument();
    expect(screen.queryByText(/No purchases/i)).not.toBeInTheDocument();
  });
});
