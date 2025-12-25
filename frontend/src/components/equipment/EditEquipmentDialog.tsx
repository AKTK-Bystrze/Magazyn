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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EQUIPMENT_STATUS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_VALIDATION_MESSAGES,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { UpdateEquipmentCommand, EquipmentSearchItem } from "@/types";
import type { Enums } from "@/db/database.types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;
const VALIDATION = EQUIPMENT_VALIDATION_MESSAGES;

/**
 * Props for EditEquipmentDialog component
 */
interface EditEquipmentDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Equipment item being edited */
  equipment: EquipmentSearchItem | null;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (id: string, command: UpdateEquipmentCommand) => Promise<void>;
}

/**
 * Modal dialog for editing existing equipment items
 * Contains form with validation for name, description, and status
 * Note: Internal ID and type cannot be changed after creation
 */
export function EditEquipmentDialog({
  isOpen,
  equipment,
  isSubmitting,
  onClose,
  onSubmit,
}: EditEquipmentDialogProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    status: EQUIPMENT_STATUS.OK as Enums<"equipment_status">,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Generate unique IDs for form fields
  const nameFieldId = React.useId();
  const descriptionFieldId = React.useId();
  const statusFieldId = React.useId();

  // Populate form when equipment changes
  React.useEffect(() => {
    if (isOpen && equipment) {
      setFormData({
        name: equipment.name || "",
        description: equipment.description || "",
        status: equipment.status,
      });
      setErrors({});
    }
  }, [isOpen, equipment]);

  // Handle text input change
  const handleInputChange = React.useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        // Clear error when field is modified
        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: "" }));
        }
      },
    [errors]
  );

  // Handle status change
  const handleStatusChange = React.useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value as Enums<"equipment_status">,
    }));
  }, []);

  // Validate form
  const validateForm = React.useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation (optional, but max length)
    if (formData.name && formData.name.length > 200) {
      newErrors.name = VALIDATION.NAME_MAX_LENGTH;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submit
  const handleSubmit = React.useCallback(
    async (e?: React.FormEvent | React.MouseEvent) => {
      if (e) e.preventDefault();

      if (!equipment) return;

      if (!validateForm()) {
        return;
      }

      try {
        // Only include fields that have changed
        const command: UpdateEquipmentCommand = {};
        
        const trimmedName = formData.name.trim() || undefined;
        const trimmedDescription = formData.description.trim() || undefined;

        if (trimmedName !== (equipment.name || undefined)) {
          command.name = trimmedName;
        }
        if (trimmedDescription !== (equipment.description || undefined)) {
          command.description = trimmedDescription;
        }
        if (formData.status !== equipment.status) {
          command.status = formData.status;
        }

        await onSubmit(equipment.id, command);
        onClose();
      } catch (err) {
        // Handle API errors - extract message from either Error object or response body
        let errorMessage: string = VALIDATION.UPDATE_FAILED;

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'error' in err) {
          errorMessage = String(err.error);
        }

        setErrors((prev) => ({ ...prev, form: errorMessage }));
      }
    },
    [equipment, formData, validateForm, onSubmit, onClose]
  );

  // Guard: don't render if no equipment
  if (!equipment) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="admin-edit-equipment-dialog">
        <DialogHeader>
          <DialogTitle>{UI.EDIT_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>{UI.EDIT_DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Read-only Internal ID */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground">{UI.FORM_INTERNAL_ID}</Label>
              <Input
                type="text"
                value={equipment.internalId}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Internal ID cannot be changed after creation.
              </p>
            </div>

            {/* Read-only Equipment Type */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground">{UI.FORM_TYPE}</Label>
              <Input
                type="text"
                value={`${equipment.type.name} (${equipment.type.creditCostPerDay} credits/day)`}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Equipment type cannot be changed after creation.
              </p>
            </div>

            {/* Display Name Field */}
            <div className="grid gap-2">
              <Label htmlFor={nameFieldId}>{UI.FORM_NAME}</Label>
              <Input
                id={nameFieldId}
                type="text"
                placeholder={UI.FORM_NAME_PLACEHOLDER}
                value={formData.name}
                onChange={handleInputChange("name")}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? `${nameFieldId}-error` : undefined
                }
                disabled={isSubmitting}
                maxLength={200}
                data-testid="equipment-form-name-input"
              />
              {errors.name && (
                <p id={`${nameFieldId}-error`} className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div className="grid gap-2">
              <Label htmlFor={descriptionFieldId}>{UI.FORM_DESCRIPTION}</Label>
              <Input
                id={descriptionFieldId}
                type="text"
                placeholder={UI.FORM_DESCRIPTION_PLACEHOLDER}
                value={formData.description}
                onChange={handleInputChange("description")}
                disabled={isSubmitting}
              />
            </div>

            {/* Status Field */}
            <div className="grid gap-2">
              <Label htmlFor={statusFieldId}>{UI.FORM_STATUS}</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id={statusFieldId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EQUIPMENT_STATUS.OK}>
                    {EQUIPMENT_STATUS_LABELS.ok}
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUS.BROKEN}>
                    {EQUIPMENT_STATUS_LABELS.broken}
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUS.BLOCKED}>
                    {EQUIPMENT_STATUS_LABELS.blocked}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TODO: Image Upload Field - Phase 5 */}

            {/* Form-level error */}
            {errors.form && (
              <p className="text-sm text-destructive">{errors.form}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {UI.CANCEL_BUTTON}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="equipment-form-submit-btn"
            >
              {isSubmitting ? UI.SAVING : UI.SAVE_BUTTON}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
