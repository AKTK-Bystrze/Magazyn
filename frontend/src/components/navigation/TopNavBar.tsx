/**
 * TopNavBar Component
 * 
 * Main application navigation bar with responsive design.
 * Shows role-based navigation links and user actions.
 * 
 * @example
 * <TopNavBar 
 *   user={{ email: 'user@example.com', id: '123' }}
 *   role="user"
 *   currentPath="/dashboard"
 *   creditBalance={100}
 * />
 */
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DesktopLinks } from './DesktopLinks';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';

interface TopNavBarProps {
  /** User information for avatar and menu */
  user: {
    email: string;
    id: string;
  } | null;
  /** User role for navigation link rendering */
  role: string;
  /** Current path for active state detection */
  currentPath: string;
  /** User credit balance (shown for non-admin users) */
  creditBalance?: number;
}

/**
 * Main responsive navigation bar component
 */
export function TopNavBar({ user, role, currentPath, creditBalance }: TopNavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <a 
          href={isAdmin ? '/admin' : '/dashboard'} 
          className="flex items-center gap-2 mr-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="font-bold hidden sm:inline-block">Magazyn</span>
        </a>

        {/* Desktop Navigation */}
        <DesktopLinks role={role} currentPath={currentPath} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Credit Balance (User only) */}
          {!isAdmin && creditBalance !== undefined && (
            <Badge variant="secondary" className="hidden sm:flex">
              Credits: {creditBalance}
            </Badge>
          )}

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* User Menu */}
          <UserMenu user={user} />

          {/* Mobile Menu Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        role={role}
        currentPath={currentPath}
        creditBalance={creditBalance}
      />
    </header>
  );
}
