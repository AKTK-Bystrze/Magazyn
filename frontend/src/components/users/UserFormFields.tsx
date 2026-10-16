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
import { USER_ROLE } from "@/lib/config/constants";
import type { Enums } from "@/db/database.types";

/**
 * Props for UserFormFields component.
 */
export interface UserFormFieldsProps {
  /** Current email value */
  email: string;
  /** Current user role */
  role: Enums<"user_role">;
  /** Current credit balance */
  creditBalance: number;
  /** Validation error map */
  errors: Record<string, string>;
  /** Form submission state */
  isSubmitting: boolean;
  /** Input change handler for email and creditBalance fields */
  onInputChange: (
    field: "email" | "creditBalance"
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Role selection handler */
  onRoleChange: (value: string) => void;
  /** Optional custom ID for email input */
  emailId?: string;
  /** Optional custom ID for role select */
  roleId?: string;
  /** Optional custom ID for credit balance input */
  creditsId?: string;
  /** Label for credit balance field */
  creditLabel?: string;
  /** Optional help text below credit input */
  creditHelpText?: string;
  /** Whether email field is marked as required */
  emailRequired?: boolean;
  /** Whether role field is marked as required */
  roleRequired?: boolean;
  /** Optional test ID for role select trigger */
  roleTestId?: string;
  /** Optional slot for additional fields (e.g. username) */
  children?: React.ReactNode;
}

/**
 * Shared form fields for user creation and editing (Email, Role, Credit Balance).
 * Eliminates duplicate field definitions across CreateUserDialog and EditUserDialog.
 */
export function UserFormFields({
  email,
  role,
  creditBalance,
  errors,
  isSubmitting,
  onInputChange,
  onRoleChange,
  emailId: customEmailId,
  roleId: customRoleId,
  creditsId: customCreditsId,
  creditLabel = "Początkowe Saldo Godzinek",
  creditHelpText,
  emailRequired = false,
  roleRequired = false,
  roleTestId,
  children,
}: UserFormFieldsProps) {
  const generatedEmailId = React.useId();
  const generatedRoleId = React.useId();
  const generatedCreditsId = React.useId();

  const emailId = customEmailId || generatedEmailId;
  const roleId = customRoleId || generatedRoleId;
  const creditsId = customCreditsId || generatedCreditsId;

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={emailId}>
          Email{emailRequired && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id={emailId}
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={onInputChange("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          disabled={isSubmitting}
        />
        {errors.email && (
          <p id={`${emailId}-error`} className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      {children}

      <div className="grid gap-2">
        <Label htmlFor={roleId}>
          Rola{roleRequired && <span className="text-destructive"> *</span>}
        </Label>
        <Select value={role} onValueChange={onRoleChange} disabled={isSubmitting}>
          <SelectTrigger id={roleId} data-testid={roleTestId}>
            <SelectValue placeholder="Wybierz rolę" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={USER_ROLE.USER}>Użytkownik</SelectItem>
            <SelectItem value={USER_ROLE.ADMIN}>Administrator</SelectItem>
            <SelectItem value={USER_ROLE.SUPER_ADMIN}>Super Administrator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={creditsId}>{creditLabel}</Label>
        <Input
          id={creditsId}
          type="number"
          min="0"
          placeholder="0"
          value={creditBalance}
          onChange={onInputChange("creditBalance")}
          aria-invalid={!!errors.creditBalance}
          aria-describedby={errors.creditBalance ? `${creditsId}-error` : undefined}
          disabled={isSubmitting}
        />
        {errors.creditBalance && (
          <p id={`${creditsId}-error`} className="text-sm text-destructive">
            {errors.creditBalance}
          </p>
        )}
        {creditHelpText && <p className="text-xs text-muted-foreground">{creditHelpText}</p>}
      </div>
    </>
  );
}
