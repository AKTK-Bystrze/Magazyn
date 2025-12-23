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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { UserListItem, UpdateUserCommand } from "@/types";
import type { Enums } from "@/db/database.types";

/**
 * Props for EditUserDialog component
 */
interface EditUserDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** User being edited (null if none selected) */
  user: UserListItem | null;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (userId: string, command: UpdateUserCommand) => Promise<void>;
}

/**
 * Modal dialog for editing existing user accounts
 * Pre-populated with current user data
 * Allows modification of email, credit balance, and role
 *
 * @param isOpen - Whether dialog is open
 * @param user - User being edited
 * @param isSubmitting - Whether form is submitting
 * @param onClose - Close callback
 * @param onSubmit - Submit callback
 */
export function EditUserDialog({
  isOpen,
  user,
  isSubmitting,
  onClose,
  onSubmit,
}: EditUserDialogProps) {
  const [formData, setFormData] = React.useState({
    email: "",
    role: USER_ROLE.USER as Enums<"user_role">,
    creditBalance: 0,
    isEnabled: true,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Generate unique IDs for form fields
  const emailId = React.useId();
  const roleId = React.useId();
  const creditsId = React.useId();
  const statusId = React.useId();

  // Initialize form with user data when dialog opens
  React.useEffect(() => {
    if (isOpen && user) {
      setFormData({
        email: user.email,
        role: user.role,
        creditBalance: user.creditBalance,
        isEnabled: user.isEnabled,
      });
      setErrors({});
    }
  }, [isOpen, user]);

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

    // Email validation (only if changed)
    if (formData.email.trim() && !USER_VALIDATION_PATTERNS.EMAIL.test(formData.email)) {
      newErrors.email = USER_VALIDATION_MESSAGES.EMAIL_INVALID;
    }

    // Credit balance validation
    if (formData.creditBalance < 0) {
      newErrors.creditBalance = USER_VALIDATION_MESSAGES.CREDIT_BALANCE_INVALID;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Build update command with only changed fields
  const buildUpdateCommand = React.useCallback((): UpdateUserCommand | null => {
    if (!user) return null;

    const command: UpdateUserCommand = {};

    if (formData.email !== user.email) {
      command.email = formData.email.trim();
    }
    if (formData.role !== user.role) {
      command.role = formData.role;
    }
    if (formData.creditBalance !== user.creditBalance) {
      command.creditBalance = formData.creditBalance;
    }
    if (formData.isEnabled !== user.isEnabled) {
      command.isEnabled = formData.isEnabled;
    }

    // Return null if nothing changed
    return Object.keys(command).length > 0 ? command : null;
  }, [formData, user]);

  // Handle form submit
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user || !validateForm()) {
        return;
      }

      const command = buildUpdateCommand();
      if (!command) {
        // Nothing changed, just close
        onClose();
        return;
      }

      try {
        await onSubmit(user.id, command);
        onClose();
      } catch (err) {
        // Handle API errors
        const message =
          err instanceof Error ? err.message : USER_VALIDATION_MESSAGES.UPDATE_FAILED;
        if (message.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, email: message }));
        } else {
          setErrors((prev) => ({ ...prev, form: message }));
        }
      }
    },
    [user, validateForm, buildUpdateCommand, onSubmit, onClose]
  );

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto" data-testid="admin-edit-user-modal">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user profile for <strong>{user.username}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Username (read-only) */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Username</Label>
              <Input
                value={user.username}
                disabled
                className="bg-muted"
                aria-readonly="true"
              />
              <p className="text-xs text-muted-foreground">
                Username cannot be changed after creation
              </p>
            </div>

            {/* Email Field */}
            <div className="grid gap-2">
              <Label htmlFor={emailId}>Email</Label>
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

            {/* Role Field */}
            <div className="grid gap-2">
              <Label htmlFor={roleId}>Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id={roleId} data-testid="admin-user-role-select">
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
              <Label htmlFor={creditsId}>Credit Balance</Label>
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
              <p className="text-xs text-muted-foreground">
                Changes to credit balance are logged in the user&apos;s credit
                history
              </p>
            </div>

            {/* Account Status Field */}
            <div className="grid gap-2">
              <Label>Account Status</Label>
              <RadioGroup
                value={formData.isEnabled ? "active" : "disabled"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    isEnabled: value === "active",
                  }))
                }
                disabled={isSubmitting}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id={`${statusId}-active`} data-testid="admin-user-status-active" />
                  <Label htmlFor={`${statusId}-active`}>Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="disabled" id={`${statusId}-disabled`} data-testid="admin-user-status-disabled" />
                  <Label htmlFor={`${statusId}-disabled`}>Disabled</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Disabled users cannot log in to the system
              </p>
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
            <Button type="submit" disabled={isSubmitting} data-testid="admin-save-user-btn">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
