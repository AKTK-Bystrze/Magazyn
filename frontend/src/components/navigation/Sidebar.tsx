/**
 * Sidebar Component
 *
 * Unified sidebar navigation component for standard and admin users.
 * Uses centralized navigation configuration for consistency.
 *
 * @example
 * <Sidebar currentPath="/dashboard" />
 * <Sidebar currentPath="/admin" isAdmin />
 */
import { cn } from "@/lib/utils";
import { USER_NAV_ITEMS, ADMIN_NAV_ITEMS, type NavItem } from "@/lib/config/nav-config";

export interface SidebarProps {
  /** Current URL path for active state highlighting */
  currentPath: string;
  /** Optional class name override */
  className?: string;
  /** Callback when navigation occurs (used for mobile menu closing) */
  onNavigate?: () => void;
  /** Whether to render admin navigation items instead of standard user items */
  isAdmin?: boolean;
  /** Optional custom navigation items override */
  items?: NavItem[];
}

/**
 * Responsive sidebar navigation component
 */
export function Sidebar({
  currentPath,
  className,
  onNavigate,
  isAdmin = false,
  items,
}: SidebarProps) {
  const navItems = items ?? (isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS);

  const isActive = (activePattern: RegExp) => {
    return activePattern.test(currentPath);
  };

  return (
    <div className={cn("pb-12 h-full border-r bg-sidebar", className)} data-testid="sidebar">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-2 px-4 flex items-center gap-2">
            <img
              src="/logo-bystrze-kolor.png"
              alt="Bystrze Logo"
              className="h-6 w-auto object-contain block dark:hidden"
            />
            <img
              src="/bystrze-logo-czarno-biale.png"
              alt="Bystrze Logo"
              className="h-6 w-auto object-contain hidden dark:block"
            />
            <h2 className="text-lg font-semibold tracking-tight">Magazyn</h2>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  isActive(item.activePattern)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                data-testid={`sidebar-nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
