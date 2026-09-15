import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { creditRequestsApi, usersApi } from "@/lib/api";
import type { CreditRequestDTO, PublicUser, CreditRequestStatus } from "@/types";
import { CREDIT_REQUEST_STATUS } from "@/types";

interface Props {
  request: CreditRequestDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewed: () => void;
}

export function SuperAdminCreditReview({ request, open, onOpenChange, onReviewed }: Props) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [creditsValue, setCreditsValue] = useState(request.credits_value.toString());
  const [helpers, setHelpers] = useState<string[]>(request.helpers);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCreditsValue(request.credits_value.toString());
      setHelpers(request.helpers);
      usersApi
        .listPublic({ perPage: 1000 })
        .then((res) => setUsers(res.users))
        .catch(console.error);
    }
  }, [open, request]);

  const toggleHelper = (id: string) => {
    setHelpers((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
  };

  const handleReview = async (status: CreditRequestStatus) => {
    setError("");
    const value = parseInt(creditsValue);
    if (isNaN(value) || value <= 0) {
      setError("Wartość godzinek musi być większa od 0.");
      return;
    }

    if (status !== CREDIT_REQUEST_STATUS.REJECTED && helpers.length === 0) {
      setError("Musisz wybrać przynajmniej jedną osobę, która pomagała.");
      return;
    }

    // Determine final status
    let finalStatus = status;
    const isModified =
      value !== request.credits_value ||
      helpers.length !== request.helpers.length ||
      !helpers.every((h) => request.helpers.includes(h));

    if (status === CREDIT_REQUEST_STATUS.APPROVED && isModified) {
      finalStatus = CREDIT_REQUEST_STATUS.APPROVED_WITH_CHANGES;
    }

    setLoading(true);
    try {
      await creditRequestsApi.reviewRequest(request.id, {
        status: finalStatus,
        credits_value: value,
        helpers,
      });
      onReviewed();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Wystąpił błąd.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rozpatrz wniosek: {request.title}</DialogTitle>
          <DialogDescription>
            Możesz zmodyfikować wartość godzinek lub listę osób przed zatwierdzeniem.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-sm font-medium text-destructive">{error}</div>}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reviewCreditsValue">Ilość godzinek (dla każdej osoby)</Label>
            <Input
              id="reviewCreditsValue"
              type="number"
              min="1"
              value={creditsValue}
              onChange={(e) => setCreditsValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Osoby, które pomagały</Label>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2 bg-background">
              {users.length === 0 ? (
                <div className="text-sm text-muted-foreground">Ładowanie użytkowników...</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`review-helper-${u.id}`}
                      checked={helpers.includes(u.id)}
                      onCheckedChange={() => toggleHelper(u.id)}
                    />
                    <label
                      htmlFor={`review-helper-${u.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {u.username}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
          <Button variant="destructive" disabled={loading} onClick={() => handleReview(CREDIT_REQUEST_STATUS.REJECTED)}>
            Odrzuć
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button disabled={loading} onClick={() => handleReview(CREDIT_REQUEST_STATUS.APPROVED)}>
              Zatwierdź
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
