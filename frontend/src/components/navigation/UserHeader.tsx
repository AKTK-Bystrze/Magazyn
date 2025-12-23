/**
 * UserHeader Component
 * 
 * Header component for user layout containing:
 * - Mobile sidebar trigger
 * - Breadcrumb navigation
 * - User profile menu
 * - Credits display
 * 
 * @example
 * <UserHeader 
 *   user={{ email: "user@example.com", id: "123" }} 
 *   currentPath="/dashboard" 
 *   creditBalance={100} 
 * />
 */
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { UserMenu } from '@/components/navigation/UserMenu';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';
import { UserSidebar } from './UserSidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface UserHeaderProps {
  /** User information object */
  user: {
    email: string;
    id: string;
  } | null;
  /** Current URL path */
  currentPath: string;
  /** User credit balance to display */
  creditBalance?: number;
  /** Whether the user is an admin (determines which sidebar to show in mobile view) */
  isAdmin?: boolean;
}

/**
 * Responsive header for user pages
 */
export function UserHeader({ user, currentPath, creditBalance, isAdmin }: UserHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6" data-testid="topbar">
      {/* Mobile Menu Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
           <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation items for the user area</SheetDescription>
          </SheetHeader>
          {isAdmin ? (
            <AdminSidebar
              currentPath={currentPath}
              className="h-full border-r-0"
              onNavigate={() => setIsOpen(false)}
            />
          ) : (
              <UserSidebar
                currentPath={currentPath}
                className="h-full border-r-0"
                onNavigate={() => setIsOpen(false)}
              />
          )}
        </SheetContent>
      </Sheet>
      
      {/* Breadcrumbs */}
      <div className="flex-1">
        <Breadcrumbs currentPath={currentPath} />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {creditBalance !== undefined && (
           <Badge variant="secondary" className="hidden sm:flex">
             Credits: {creditBalance}
           </Badge>
        )}
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
