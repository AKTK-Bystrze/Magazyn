import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignificantExtensionWarning } from "../SignificantExtensionWarning";

describe("SignificantExtensionWarning", () => {
  it("renders Polish additional credits charge message when creditAdjustment is negative", () => {
    render(<SignificantExtensionWarning creditAdjustment={-15} />);

    expect(screen.getByText("Wymagane dodatkowe godzinki")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Zostaniesz obciążony\/a kwotą 15 godzinek za przedłużenie tej rezerwacji\./i
      )
    ).toBeInTheDocument();
  });

  it("renders Polish refund message when creditAdjustment is positive", () => {
    render(<SignificantExtensionWarning creditAdjustment={10} />);

    expect(screen.getByText("Zwrot godzinek")).toBeInTheDocument();
    expect(
      screen.getByText(/Otrzymasz zwrot 10 godzinek za skrócenie tej rezerwacji\./i)
    ).toBeInTheDocument();
  });

  it("renders null when creditAdjustment is 0", () => {
    const { container } = render(<SignificantExtensionWarning creditAdjustment={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
