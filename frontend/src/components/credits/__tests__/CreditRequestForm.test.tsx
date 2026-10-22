import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreditRequestForm } from "../CreditRequestForm";
import type { PublicUser, CreditRequest } from "@/types";

vi.mock("@/lib/api", () => ({
  usersApi: {
    listPublic: vi.fn(),
  },
  creditRequestsApi: {
    createRequest: vi.fn(),
    updateRequest: vi.fn(),
  },
}));

import { usersApi, creditRequestsApi } from "@/lib/api";

describe("CreditRequestForm", () => {
  const mockUsers: PublicUser[] = [
    { id: "user-1", username: "Alice", creditBalance: 10 },
    { id: "user-2", username: "Bob", creditBalance: 20 },
    { id: "user-3", username: "Charlie", creditBalance: 0 },
  ];

  const mockInitialData: CreditRequest = {
    id: "req-101",
    title: "Naprawa sprzętu",
    description: "Wymiana linek w kajaku",
    creditsValue: 5,
    requestorId: "user-current",
    userHelpedId: "user-1",
    status: "awaiting",
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    helpers: ["user-2"],
  };

  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.listPublic).mockResolvedValue({
      users: mockUsers,
      pagination: { page: 1, perPage: 1000, totalItems: 3, totalPages: 1 },
    });
    vi.mocked(creditRequestsApi.createRequest).mockResolvedValue(mockInitialData);
    vi.mocked(creditRequestsApi.updateRequest).mockResolvedValue(mockInitialData);
  });

  it("renders form in create mode with loading state and then user options", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByText("Złóż nowy wniosek")).toBeInTheDocument();
    expect(screen.getByLabelText("Tytuł wniosku")).toBeInTheDocument();
    expect(screen.getByLabelText("Opis")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ilość godzinek/)).toBeInTheDocument();
    expect(screen.getByLabelText("Osoba, której pomagano")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Bob" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Charlie" })).toBeInTheDocument();
    });
  });

  it("allows selecting person helped from dropdown", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Osoba, której pomagano") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "user-1" } });

    expect(select.value).toBe("user-1");
  });

  it("allows toggling helper checkboxes on and off", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    const aliceCheckbox = document.getElementById("helper-user-1") as HTMLElement;
    const bobCheckbox = document.getElementById("helper-user-2") as HTMLElement;

    // Check Alice
    fireEvent.click(aliceCheckbox);
    expect(aliceCheckbox).toHaveAttribute("aria-checked", "true");

    // Check Bob
    fireEvent.click(bobCheckbox);
    expect(bobCheckbox).toHaveAttribute("aria-checked", "true");

    // Uncheck Alice
    fireEvent.click(aliceCheckbox);
    expect(aliceCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("validates positive creditsValue and requires at least one helper", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form")!;

    fireEvent.change(screen.getByLabelText("Tytuł wniosku"), {
      target: { value: "Test Title" },
    });
    fireEvent.change(screen.getByLabelText("Osoba, której pomagano"), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByLabelText(/Ilość godzinek/), {
      target: { value: "0" },
    });

    fireEvent.submit(form);

    expect(await screen.findByText("Wartość godzinek musi być większa od 0.")).toBeInTheDocument();
    expect(creditRequestsApi.createRequest).not.toHaveBeenCalled();

    // Now enter valid credits but no helpers selected
    fireEvent.change(screen.getByLabelText(/Ilość godzinek/), {
      target: { value: "5" },
    });
    fireEvent.submit(form);

    expect(
      await screen.findByText("Musisz wybrać przynajmniej jedną osobę, która pomagała.")
    ).toBeInTheDocument();
    expect(creditRequestsApi.createRequest).not.toHaveBeenCalled();
  });

  it("successfully submits create request when valid", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Tytuł wniosku"), {
      target: { value: "Prace bosmańskie" },
    });
    fireEvent.change(screen.getByLabelText("Opis"), {
      target: { value: "Malowanie dna kajaka" },
    });
    fireEvent.change(screen.getByLabelText(/Ilość godzinek/), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Osoba, której pomagano"), {
      target: { value: "user-1" },
    });

    const bobCheckbox = document.getElementById("helper-user-2") as HTMLElement;
    fireEvent.click(bobCheckbox);

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() => {
      expect(creditRequestsApi.createRequest).toHaveBeenCalledWith({
        title: "Prace bosmańskie",
        description: "Malowanie dna kajaka",
        creditsValue: 4,
        userHelpedId: "user-1",
        helpers: ["user-2"],
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("populates initial data and submits updateRequest in edit mode", async () => {
    render(
      <CreditRequestForm initialData={mockInitialData} onSuccess={onSuccess} onCancel={onCancel} />
    );

    expect(screen.getByText("Edytuj wniosek")).toBeInTheDocument();
    expect((screen.getByLabelText("Tytuł wniosku") as HTMLInputElement).value).toBe(
      "Naprawa sprzętu"
    );
    expect((screen.getByLabelText("Opis") as HTMLTextAreaElement).value).toBe(
      "Wymiana linek w kajaku"
    );
    expect((screen.getByLabelText(/Ilość godzinek/) as HTMLInputElement).value).toBe("5");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Bob" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Tytuł wniosku"), {
      target: { value: "Naprawa sprzętu zaktualizowana" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() => {
      expect(creditRequestsApi.updateRequest).toHaveBeenCalledWith(
        "req-101",
        expect.objectContaining({
          title: "Naprawa sprzętu zaktualizowana",
          creditsValue: 5,
          userHelpedId: "user-1",
          helpers: ["user-2"],
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onCancel callback when Cancel button is clicked", async () => {
    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "Anuluj" });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("displays server error message when submission fails", async () => {
    vi.mocked(creditRequestsApi.createRequest).mockRejectedValueOnce(
      new Error("Błąd zapisu w bazie danych")
    );

    render(<CreditRequestForm onSuccess={onSuccess} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Tytuł wniosku"), {
      target: { value: "Błędne zgłoszenie" },
    });
    fireEvent.change(screen.getByLabelText("Osoba, której pomagano"), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByLabelText(/Ilość godzinek/), {
      target: { value: "2" },
    });
    const bobCheckbox = document.getElementById("helper-user-2") as HTMLElement;
    fireEvent.click(bobCheckbox);

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText("Błąd zapisu w bazie danych")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
