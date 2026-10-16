import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { Enums } from "@/db/database.types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for EquipmentFormFields component.
 */
export interface EquipmentFormFieldsProps {
  /** Current equipment name */
  name: string;
  /** Current equipment description */
  description: string;
  /** Current equipment status */
  status: Enums<"equipment_status">;
  /** Validation error map */
  errors: Record<string, string>;
  /** Form submission status */
  isSubmitting: boolean;
  /** Input change handler for text fields */
  onInputChange: (
    field: "name" | "description"
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Status select change handler */
  onStatusChange: (value: string) => void;
  /** Optional custom ID for name field */
  nameFieldId?: string;
  /** Optional custom ID for description field */
  descriptionFieldId?: string;
  /** Optional custom ID for status field */
  statusFieldId?: string;
}

/**
 * Shared form fields for equipment creation and editing (Name, Description, Status).
 * Eliminates duplicate field definitions across AddEquipmentDialog and EditEquipmentDialog.
 */
export function EquipmentFormFields({
  name,
  description,
  status,
  errors,
  isSubmitting,
  onInputChange,
  onStatusChange,
  nameFieldId: customNameId,
  descriptionFieldId: customDescId,
  statusFieldId: customStatusId,
}: EquipmentFormFieldsProps) {
  const generatedNameId = React.useId();
  const generatedDescId = React.useId();
  const generatedStatusId = React.useId();

  const nameFieldId = customNameId || generatedNameId;
  const descriptionFieldId = customDescId || generatedDescId;
  const statusFieldId = customStatusId || generatedStatusId;

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={nameFieldId}>{UI.FORM_NAME}</Label>
        <Input
          id={nameFieldId}
          type="text"
          placeholder={UI.FORM_NAME_PLACEHOLDER}
          value={name}
          onChange={onInputChange("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${nameFieldId}-error` : undefined}
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

      <div className="grid gap-2">
        <Label htmlFor={descriptionFieldId}>{UI.FORM_DESCRIPTION}</Label>
        <Input
          id={descriptionFieldId}
          type="text"
          placeholder={UI.FORM_DESCRIPTION_PLACEHOLDER}
          value={description}
          onChange={onInputChange("description")}
          disabled={isSubmitting}
          data-testid="equipment-form-description-input"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={statusFieldId}>{UI.FORM_STATUS}</Label>
        <Select value={status} onValueChange={onStatusChange} disabled={isSubmitting}>
          <SelectTrigger id={statusFieldId} data-testid="equipment-form-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EQUIPMENT_STATUS.OK}>{EQUIPMENT_STATUS_LABELS.ok}</SelectItem>
            <SelectItem value={EQUIPMENT_STATUS.BROKEN}>
              {EQUIPMENT_STATUS_LABELS.broken}
            </SelectItem>
            <SelectItem value={EQUIPMENT_STATUS.BLOCKED}>
              {EQUIPMENT_STATUS_LABELS.blocked}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
