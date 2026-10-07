import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceCard, StatusTag, formatPrice, shortAddress, type Resource } from "./ResourceCard.js";

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "1",
    title: "Atlas of Stellar Networks",
    price: "0.5",
    resourceType: "file",
    walletAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSWXYZ",
    verificationStatus: "verified",
    onchainStatus: "registered",
    listed: true,
    accessUrl: "https://example.com/resource/1",
    ...overrides,
  };
}

describe("formatPrice", () => {
  it("pads to at least two decimals without rounding", () => {
    expect(formatPrice("0.5")).toBe("0.50");
    expect(formatPrice("3")).toBe("3.00");
    expect(formatPrice("1.50")).toBe("1.50");
    expect(formatPrice("1.2345")).toBe("1.2345");
    expect(formatPrice(2)).toBe("2.00");
  });

  it("passes non-numeric input through unchanged", () => {
    expect(formatPrice("free")).toBe("free");
    expect(formatPrice("")).toBe("");
  });
});

describe("shortAddress", () => {
  it("truncates long addresses to GABC…WXYZ", () => {
    expect(shortAddress(resource().walletAddress)).toBe("GABC…WXYZ");
    expect(shortAddress("GSHORT")).toBe("GSHORT");
  });
});

describe("StatusTag", () => {
  it("uses distinct wording for pending verification and pending registration", () => {
    render(
      <>
        <StatusTag status="pending" type="verify" />
        <StatusTag status="pending" type="chain" />
      </>,
    );
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("Registering")).toBeInTheDocument();
  });

  it("falls back to the raw status for unknown values", () => {
    render(<StatusTag status="archived" type="chain" />);
    expect(screen.getByText("archived")).toBeInTheDocument();
  });
});

describe("ResourceCard", () => {
  it("opens the preview from the title and shows the anonymous publisher fallback", async () => {
    const onPreview = vi.fn();
    const onBuy = vi.fn();
    render(<ResourceCard resource={resource()} onPreview={onPreview} onBuy={onBuy} />);

    expect(screen.getByText("Anonymous publisher")).toBeInTheDocument();
    expect(screen.getByText("0.50")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open preview of Atlas of Stellar Networks" }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
    expect(onBuy).not.toHaveBeenCalled();
  });

  it("shows the publisher name and buys from the footer button", async () => {
    const onBuy = vi.fn();
    render(<ResourceCard resource={resource({ publisherName: "Ada" })} onPreview={vi.fn()} onBuy={onBuy} />);

    expect(screen.getByText(/by Ada/)).toBeInTheDocument();
    expect(screen.queryByText("Anonymous publisher")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Buy" }));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });
});
