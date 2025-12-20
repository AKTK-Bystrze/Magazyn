/**
 * UserMenu Component
 *
 * Avatar dropdown menu with user profile and logout actions.
 * Uses Shadcn DropdownMenu and Avatar components.
 *
 * @example
 * <UserMenu user={{ email: 'user@example.com' }} />
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, CreditCard } from "lucide-react";
import { handleLogout } from "@/lib/auth/logout";
import { getInitials } from "@/lib/utils/user-utils";
import { ROUTES } from "@/lib/config/routes";

interface UserMenuProps {
  /** User information */
  user: {
    email: string;
    id: string;
  } | null;
}

/**
 * User avatar dropdown menu with profile and logout options
 */
export function UserMenu({ user }: UserMenuProps) {
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="user-menu-trigger">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount data-testid="user-menu-dropdown">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={ROUTES.PROTECTED.CREDITS_HISTORY} className="flex w-full items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Credit History</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-button">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
