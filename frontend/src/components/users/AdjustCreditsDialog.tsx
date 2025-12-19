import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, AlertCircle } from "lucide-react";
import { ICON_SIZE_SM } from "@/lib/config/constants";
import type { BulkAdjustCreditsCommand } from "@/types";

/**
 * Props for AdjustCreditsDialog component
 */
interface AdjustCreditsDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether operation is submitting */
  isSubmitting: boolean;
  /** IDs of users to adjust credits for */
  userIds: string[];
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when adjustment is confirmed */
  onSubmit: (command: BulkAdjustCreditsCommand) => Promise<void>;
}

/**
 * Dialog for adjusting user credit balances.
 * Allows adding or removing a specific amount of credits for one or multiple users.
 *
 * @param props - Component props
 */
export function AdjustCreditsDialog({
  isOpen,
  isSubmitting,
  userIds,
  onClose,
  onSubmit,
}: AdjustCreditsDialogProps) {
  const [amount, setAmount] = React.useState<number>(0);
  const [reason, setReason] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Generate unique IDs for accessibility
  const amountId = React.useId();
  const reasonId = React.useId();
  const descriptionId = React.useId();

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setReason("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  const handleAdjust = async (isAddition: boolean) => {
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    const finalAmount = isAddition ? amount : -amount;

    try {
      await onSubmit({
        userIds,
        amount: finalAmount,
        reason: reason.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust credits");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Credits</DialogTitle>
          <DialogDescription>
            {userIds.length === 1
              ? "Adjust credit balance for the selected user."
              : `Adjust credit balance for ${userIds.length} selected users.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Amount Field */}
          <div className="grid gap-2">
            <Label htmlFor={amountId}>Amount</Label>
            <Input
              id={amountId}
              type="number"
              min="1"
              value={amount || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="e.g. 20"
              disabled={isSubmitting}
            />
          </div>

          {/* Reason Field */}
          <div className="grid gap-2">
            <Label htmlFor={reasonId}>Reason (required)</Label>
            <Input
              id={reasonId}
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
              placeholder="e.g. Volunteer work, Holiday bonus, Correction"
              disabled={isSubmitting}
            />
          </div>

          {/* Description Field */}
          <div className="grid gap-2">
            <Label htmlFor={descriptionId}>Additional Notes (optional)</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Any extra details..."
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className={ICON_SIZE_SM} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="sm:mr-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleAdjust(false)}
            disabled={isSubmitting}
          >
            <Minus className={ICON_SIZE_SM + " mr-2"} />
            Remove Credits
          </Button>
          <Button
            type="button"
            onClick={() => handleAdjust(true)}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className={ICON_SIZE_SM + " mr-2"} />
            Add Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
