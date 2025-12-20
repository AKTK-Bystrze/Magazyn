/**
 * MobileMenu Component
 *
 * Sheet-based mobile navigation drawer.
 * Contains user profile, navigation links, and theme toggle.
 *
 * @example
 * <MobileMenu
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   user={{ email: 'user@example.com' }}
 *   role="user"
 *   currentPath="/dashboard"
 * />
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { USER_NAV_ITEMS, ADMIN_NAV_ITEMS, type NavItem } from "@/lib/config/nav-config";
import { handleLogout } from "@/lib/auth/logout";
import { getInitials } from "@/lib/utils/user-utils";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** User information */
  user: {
    email: string;
    id: string;
  } | null;
  /** User role */
  role: string;
  /** Current path for active state */
  currentPath: string;
  /** User credit balance */
  creditBalance?: number;
}

/**
 * Mobile navigation drawer with user profile and navigation links
 */
export function MobileMenu({
  isOpen,
  onClose,
  user,
  role,
  currentPath,
  creditBalance,
}: MobileMenuProps) {
  const isAdmin = role === "admin" || role === "super_admin";
  const navItems: NavItem[] = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80" data-testid="mobile-menu">
        <SheetHeader className="text-left">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        {user && (
          <div className="flex items-center gap-3 py-4 border-b">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium">{user.email}</p>
              {creditBalance !== undefined && !isAdmin && (
                <p className="text-xs text-muted-foreground">Credits: {creditBalance}</p>
              )}
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1 py-4">
          {navItems.map((item) => {
            const isActive = item.activePattern.test(currentPath);

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )}
                data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t pt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
