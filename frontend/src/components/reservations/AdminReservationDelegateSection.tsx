import * as React from "react";
import { UserSelector } from "@/components/admin/UserSelector";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { UserListItem } from "@/types";

/**
 * Props for the AdminReservationDelegateSection component.
 */
export interface AdminReservationDelegateSectionProps {
  /** Currently selected user ID */
  selectedUserId: string | null;
  /** Callback when user is selected from the dropdown */
  onSelectUser: (user: UserListItem) => void;
  /** Whether the reservation should be created free of charge */
  isFreeReservation: boolean;
  /** Callback when free reservation checkbox changes */
  onToggleFreeReservation: (checked: boolean) => void;
}

/**
 * Component for admin checkout delegation.
 * Renders the user selection dropdown and the free reservation checkbox.
 */
export function AdminReservationDelegateSection({
  selectedUserId,
  onSelectUser,
  isFreeReservation,
  onToggleFreeReservation,
}: AdminReservationDelegateSectionProps) {
  return (
    <section className="bg-card rounded-lg border shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Utwórz Rezerwację Dla</h2>
      <QueryProvider>
        <UserSelector
          selectedUserId={selectedUserId}
          onSelect={onSelectUser}
          label="Wybierz użytkownika dla tej rezerwacji"
        />
      </QueryProvider>
      {!selectedUserId && (
        <p className="text-sm text-muted-foreground mt-2">
          Musisz wybrać użytkownika przed dokończeniem rezerwacji.
        </p>
      )}

      <div className="mt-6 flex items-center space-x-2 border-t pt-4">
        <Checkbox
          id="free-reservation"
          checked={isFreeReservation}
          onCheckedChange={(checked) => onToggleFreeReservation(checked === true)}
          data-testid="free-reservation-checkbox"
        />
        <Label htmlFor="free-reservation" className="cursor-pointer font-medium">
          Utwórz jako Darmową Rezerwację
        </Label>
      </div>
      {isFreeReservation && (
        <p className="text-sm text-muted-foreground mt-2">
          Ta rezerwacja nie obciąży konta użytkownika godzinkami.
        </p>
      )}
    </section>
  );
}
