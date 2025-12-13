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
  USER_ROLE,
  USER_VALIDATION_MESSAGES,
  USER_VALIDATION_PATTERNS,
} from "@/lib/config/constants";
import type { CreateUserCommand } from "@/types";
import type { Enums } from "@/db/database.types";

/**
 * Props for CreateUserDialog component
 */
interface CreateUserDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (command: CreateUserCommand) => Promise<void>;
}

/**
 * Initial form state
 */
const INITIAL_FORM_STATE = {
  email: "",
  username: "",
  role: USER_ROLE.USER as Enums<"user_role">,
  creditBalance: 0,
};

/**
 * Modal dialog for creating new user accounts
 * Contains form with validation for email, username, role, and initial credit balance
 *
 * @param isOpen - Whether dialog is open
 * @param isSubmitting - Whether form is submitting
 * @param onClose - Close callback
 * @param onSubmit - Submit callback
 */
export function CreateUserDialog({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateUserDialogProps) {
  const [formData, setFormData] = React.useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Generate unique IDs for form fields
  const emailId = React.useId();
  const usernameId = React.useId();
  const roleId = React.useId();
  const creditsId = React.useId();

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_STATE);
      setErrors({});
    }
  }, [isOpen]);

  // Handle input change
  const handleInputChange = React.useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          field === "creditBalance"
            ? Math.max(0, parseInt(e.target.value) || 0)
            : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when field is modified
        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: "" }));
        }
      },
    [errors]
  );

  // Handle role change
  const handleRoleChange = React.useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, role: value as Enums<"user_role"> }));
  }, []);

  // Validate form
  const validateForm = React.useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = USER_VALIDATION_MESSAGES.EMAIL_REQUIRED;
    } else if (!USER_VALIDATION_PATTERNS.EMAIL.test(formData.email)) {
      newErrors.email = USER_VALIDATION_MESSAGES.EMAIL_INVALID;
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = USER_VALIDATION_MESSAGES.USERNAME_REQUIRED;
    } else if (!USER_VALIDATION_PATTERNS.USERNAME.test(formData.username)) {
      newErrors.username = USER_VALIDATION_MESSAGES.USERNAME_INVALID;
    }

    // Credit balance validation
    if (formData.creditBalance < 0) {
      newErrors.creditBalance = USER_VALIDATION_MESSAGES.CREDIT_BALANCE_INVALID;
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
          email: formData.email.trim(),
          username: formData.username.trim(),
          role: formData.role,
          creditBalance: formData.creditBalance,
        });
        onClose();
      } catch (err) {
        // Handle API errors (e.g., email already exists)
        const message =
          err instanceof Error ? err.message : USER_VALIDATION_MESSAGES.CREATE_FAILED;
        if (message.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, email: message }));
        } else if (message.toLowerCase().includes("username")) {
          setErrors((prev) => ({ ...prev, username: message }));
        } else {
          setErrors((prev) => ({ ...prev, form: message }));
        }
      }
    },
    [formData, validateForm, onSubmit, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will receive login instructions
            via email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Email Field */}
            <div className="grid gap-2">
              <Label htmlFor={emailId}>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id={emailId}
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleInputChange("email")}
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

            {/* Username Field */}
            <div className="grid gap-2">
              <Label htmlFor={usernameId}>
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id={usernameId}
                type="text"
                placeholder="john_doe"
                value={formData.username}
                onChange={handleInputChange("username")}
                aria-invalid={!!errors.username}
                aria-describedby={
                  errors.username ? `${usernameId}-error` : undefined
                }
                disabled={isSubmitting}
              />
              {errors.username && (
                <p
                  id={`${usernameId}-error`}
                  className="text-sm text-destructive"
                >
                  {errors.username}
                </p>
              )}
            </div>

            {/* Role Field */}
            <div className="grid gap-2">
              <Label htmlFor={roleId}>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id={roleId}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_ROLE.USER}>User</SelectItem>
                  <SelectItem value={USER_ROLE.ADMIN}>Admin</SelectItem>
                  <SelectItem value={USER_ROLE.SUPER_ADMIN}>
                    Super Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credit Balance Field */}
            <div className="grid gap-2">
              <Label htmlFor={creditsId}>Initial Credit Balance</Label>
              <Input
                id={creditsId}
                type="number"
                min="0"
                placeholder="0"
                value={formData.creditBalance}
                onChange={handleInputChange("creditBalance")}
                aria-invalid={!!errors.creditBalance}
                aria-describedby={
                  errors.creditBalance ? `${creditsId}-error` : undefined
                }
                disabled={isSubmitting}
              />
              {errors.creditBalance && (
                <p
                  id={`${creditsId}-error`}
                  className="text-sm text-destructive"
                >
                  {errors.creditBalance}
                </p>
              )}
            </div>

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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
