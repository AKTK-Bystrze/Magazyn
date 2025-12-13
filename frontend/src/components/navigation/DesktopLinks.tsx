/**
 * DesktopLinks Component
 * 
 * Renders navigation links for desktop viewport.
 * Conditionally renders based on user role.
 * 
 * @example
 * <DesktopLinks role="user" currentPath="/dashboard" />
 */
import { USER_NAV_ITEMS, ADMIN_NAV_ITEMS, type NavItem } from '@/lib/config/nav-config';
import { cn } from '@/lib/utils';

interface DesktopLinksProps {
  /** User role determines which navigation items to show */
  role: string;
  /** Current path for active state detection */
  currentPath: string;
}

/**
 * Desktop navigation links with active state styling
 */
export function DesktopLinks({ role, currentPath }: DesktopLinksProps) {
  const isAdmin = role === 'admin' || role === 'super_admin';
  const navItems: NavItem[] = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = item.activePattern.test(currentPath);
        
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-accent/50 text-accent-foreground underline underline-offset-4'
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
