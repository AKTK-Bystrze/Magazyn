import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_FUTURE_STATUS_LABEL,
  RESERVATION_OVERDUE_STATUS_LABEL,
  MIXED_STATUS,
} from "@/lib/config/constants";

describe("StatusBadge", () => {
  it("renders mixed status badge when status is MIXED", () => {
    render(<StatusBadge status={MIXED_STATUS} data-testid="status-badge" />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Mixed");
  });

  it("renders PENDING status with standard label when within current dates", () => {
    const today = new Date().toISOString().split("T")[0];
    render(
      <StatusBadge
        status="PENDING"
        startDate={today}
        endDate="2099-01-01"
        data-testid="status-badge"
      />
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent(RESERVATION_STATUS_LABELS.PENDING);
  });

  it("renders future status label Przyszła when startDate is in the future", () => {
    render(
      <StatusBadge
        status="PENDING"
        startDate="2099-01-01"
        endDate="2099-01-05"
        data-testid="status-badge"
      />
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent(RESERVATION_FUTURE_STATUS_LABEL);
  });

  it("renders overdue status label Zaległa when endDate is in the past", () => {
    render(
      <StatusBadge
        status="PENDING"
        startDate="2020-01-01"
        endDate="2020-01-05"
        data-testid="status-badge"
      />
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent(RESERVATION_OVERDUE_STATUS_LABEL);
  });

  it("renders non-pending statuses correctly without crashing", () => {
    const { rerender } = render(<StatusBadge status="CANCELLED" data-testid="status-badge" />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Anulowana");

    rerender(<StatusBadge status="RENTED" data-testid="status-badge" />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Wypożyczona");

    rerender(<StatusBadge status="RETURNED" data-testid="status-badge" />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Zwrócona");
  });
});
