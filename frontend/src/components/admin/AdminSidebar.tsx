import { 
  LayoutDashboard, 
  CalendarDays, 
  Wrench, 
  Users, 
  BarChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/config/routes';

interface AdminSidebarProps {
  currentPath: string;
  className?: string;
  onNavigate?: () => void;
}

const sidebarItems = [
  {
    title: 'Overview',
    href: ROUTES.PROTECTED.ADMIN,
    icon: LayoutDashboard // Changed from generic Overview to Dashboard icon
  },
  {
    title: 'Reservations',
    href: ROUTES.PROTECTED.ADMIN_RESERVATIONS,
    icon: CalendarDays
  },
  {
    title: 'Equipment',
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT,
    icon: Wrench
  },
  {
    title: 'Users',
    href: ROUTES.PROTECTED.ADMIN_USERS,
    icon: Users
  },
  {
    title: 'Analytics',
    href: ROUTES.PROTECTED.ADMIN_ANALYTICS,
    icon: BarChart
  }
];

export function AdminSidebar({ currentPath, className, onNavigate }: AdminSidebarProps) {
  // Function to check if a link is active
  // Since some paths like /admin/reservations/123 should also activate /admin/reservations
  const isActive = (href: string) => {
    if (href === ROUTES.PROTECTED.ADMIN) {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  return (
    <div className={cn("pb-12 h-full border-r bg-sidebar", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-2 px-4 flex items-center gap-2">
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
            <h2 className="text-lg font-semibold tracking-tight">Magazyn</h2>
          </div>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer / Settings area could go here */}
    </div>
  );
}
