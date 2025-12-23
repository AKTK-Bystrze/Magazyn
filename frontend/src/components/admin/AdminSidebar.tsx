/**
 * AdminSidebar Component
 * 
 * Renders the sidebar navigation for admin users.
 * Uses centralized navigation configuration for consistency.
 * 
 * @example
 * <AdminSidebar currentPath="/admin" />
 */
import { cn } from '@/lib/utils';
import { ADMIN_NAV_ITEMS } from '@/lib/config/nav-config';

interface AdminSidebarProps {
  /** Current URL path for active state highlighting */
  currentPath: string;
  /** Optional class name override */
  className?: string;
  /** Callback when navigation occurs (used for mobile menu closing) */
  onNavigate?: () => void;
}

/**
 * Sidebar navigation component for admin dashboard
 */
export function AdminSidebar({ currentPath, className, onNavigate }: AdminSidebarProps) {
  const isActive = (activePattern: RegExp) => {
    return activePattern.test(currentPath);
  };

  return (
    <div className={cn("pb-12 h-full border-r bg-sidebar", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          {/* Logo / Brand */}
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

          {/* Navigation Items */}
          <div className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  isActive(item.activePattern) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
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
