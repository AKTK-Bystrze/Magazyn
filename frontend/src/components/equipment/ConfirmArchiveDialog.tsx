import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  ICON_SIZE_MD,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { EquipmentSearchItem } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for ConfirmArchiveDialog component
 */
interface ConfirmArchiveDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Equipment item to be archived */
  equipment: EquipmentSearchItem | null;
  /** Whether archive action is in progress */
  isSubmitting: boolean;
  /** Error message if archive failed (e.g., has active reservations) */
  error?: string | null;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when archive is confirmed */
  onConfirm: (id: string) => Promise<void>;
}

/**
 * Confirmation dialog for archiving equipment
 * Shows warning message and equipment info before confirming archive
 */
export function ConfirmArchiveDialog({
  isOpen,
  equipment,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ConfirmArchiveDialogProps) {
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Clear error when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setLocalError(null);
    }
  }, [isOpen]);

  // Handle confirm
  const handleConfirm = React.useCallback(async () => {
    if (!equipment) return;

    try {
      await onConfirm(equipment.id);
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to archive equipment";
      setLocalError(errorMessage);
    }
  }, [equipment, onConfirm, onClose]);

  // Guard: don't render if no equipment
  if (!equipment) {
    return null;
  }

  const displayError = error || localError;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[425px]" data-testid="admin-archive-equipment-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`${ICON_SIZE_MD} text-destructive`} />
            {UI.ARCHIVE_DIALOG_TITLE}
          </DialogTitle>
          <DialogDescription>{UI.ARCHIVE_DIALOG_MESSAGE}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Equipment Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{UI.INTERNAL_ID}:</span>
              <span className="font-mono font-medium">{equipment.internalId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{UI.TYPE}:</span>
              <span className="font-medium">{equipment.type.name}</span>
            </div>
            {equipment.name && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{UI.NAME}:</span>
                <span className="font-medium">{equipment.name}</span>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {displayError && (
            <Alert className="border-destructive/50 text-destructive">
              <AlertTriangle className={ICON_SIZE_MD} />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="equipment-archive-cancel-btn"
          >
            {UI.CANCEL_BUTTON}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
            data-testid="equipment-archive-confirm-btn"
          >
            {isSubmitting ? UI.LOADING : UI.ARCHIVE_BUTTON}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
