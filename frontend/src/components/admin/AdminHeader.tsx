import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { UserMenu } from '@/components/navigation/UserMenu';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';
import { AdminSidebar } from './AdminSidebar';

interface AdminHeaderProps {
  user: {
    email: string;
    id: string;
  } | null;
  currentPath: string;
}

export function AdminHeader({ user, currentPath }: AdminHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
           {/* Mobile Sidebar */}
           <AdminSidebar 
             currentPath={currentPath} 
             className="h-full border-r-0" 
             onNavigate={() => setIsOpen(false)}
           />
        </SheetContent>
      </Sheet>
      
      <div className="flex-1">
        <Breadcrumbs currentPath={currentPath} isAdmin />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
