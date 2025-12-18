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
import type { CreateEquipmentCommand, EquipmentType } from "@/types";
import type { Enums } from "@/db/database.types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;
const VALIDATION = EQUIPMENT_VALIDATION_MESSAGES;

/**
 * Props for AddEquipmentDialog component
 */
interface AddEquipmentDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Available equipment types */
  equipmentTypes: EquipmentType[];
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (command: CreateEquipmentCommand) => Promise<void>;
}

/**
 * Initial form state
 */
const INITIAL_FORM_STATE = {
  internalId: "",
  typeId: "",
  name: "",
  description: "",
  status: EQUIPMENT_STATUS.OK as Enums<"equipment_status">,
};

/**
 * Modal dialog for creating new equipment items
 * Contains form with validation for internal ID, type, name, description, and status
 */
export function AddEquipmentDialog({
  isOpen,
  isSubmitting,
  equipmentTypes,
  onClose,
  onSubmit,
}: AddEquipmentDialogProps) {
  const [formData, setFormData] = React.useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Generate unique IDs for form fields
  const internalIdFieldId = React.useId();
  const typeIdFieldId = React.useId();
  const nameFieldId = React.useId();
  const descriptionFieldId = React.useId();
  const statusFieldId = React.useId();

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_STATE);
      setErrors({});
    }
  }, [isOpen]);

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

  // Handle type change
  const handleTypeChange = React.useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, typeId: value }));
      if (errors.typeId) {
        setErrors((prev) => ({ ...prev, typeId: "" }));
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

    // Internal ID validation
    if (!formData.internalId.trim()) {
      newErrors.internalId = VALIDATION.INTERNAL_ID_REQUIRED;
    }

    // Type ID validation
    if (!formData.typeId) {
      newErrors.typeId = VALIDATION.TYPE_ID_REQUIRED;
    }

    // Name validation (optional, but max length)
    if (formData.name && formData.name.length > 200) {
      newErrors.name = VALIDATION.NAME_MAX_LENGTH;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submit
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        await onSubmit({
          internalId: formData.internalId.trim(),
          typeId: formData.typeId,
          name: formData.name.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
        });
        onClose();
      } catch (err) {
        // Handle API errors 
        const errorMessage =
          err instanceof Error ? err.message : VALIDATION.CREATE_FAILED;
        
        // Map API errors to form fields
        if (errorMessage.toLowerCase().includes("internal_id") || 
            errorMessage.toLowerCase().includes("already exists")) {
          setErrors((prev) => ({ ...prev, internalId: VALIDATION.INTERNAL_ID_EXISTS }));
        } else {
          setErrors((prev) => ({ ...prev, form: errorMessage }));
        }
      }
    },
    [formData, validateForm, onSubmit, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{UI.ADD_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>{UI.ADD_DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Internal ID Field */}
            <div className="grid gap-2">
              <Label htmlFor={internalIdFieldId}>
                {UI.FORM_INTERNAL_ID} <span className="text-destructive">*</span>
              </Label>
              <Input
                id={internalIdFieldId}
                type="text"
                placeholder={UI.FORM_INTERNAL_ID_PLACEHOLDER}
                value={formData.internalId}
                onChange={handleInputChange("internalId")}
                aria-invalid={!!errors.internalId}
                aria-describedby={
                  errors.internalId ? `${internalIdFieldId}-error` : undefined
                }
                disabled={isSubmitting}
              />
              {errors.internalId && (
                <p
                  id={`${internalIdFieldId}-error`}
                  className="text-sm text-destructive"
                >
                  {errors.internalId}
                </p>
              )}
            </div>

            {/* Equipment Type Field */}
            <div className="grid gap-2">
              <Label htmlFor={typeIdFieldId}>
                {UI.FORM_TYPE} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.typeId}
                onValueChange={handleTypeChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id={typeIdFieldId}
                  aria-invalid={!!errors.typeId}
                >
                  <SelectValue placeholder={UI.FORM_TYPE_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.creditCostPerDay} credits/day)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.typeId && (
                <p
                  id={`${typeIdFieldId}-error`}
                  className="text-sm text-destructive"
                >
                  {errors.typeId}
                </p>
              )}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? UI.SAVING : UI.CREATE_BUTTON}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
