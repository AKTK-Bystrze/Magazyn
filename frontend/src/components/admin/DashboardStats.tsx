import {
  Users,
  CalendarDays,
  Wrench,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  // Mock data - would be replaced by real data fetching later
  const stats = [
    {
      title: "Total Reservations",
      value: "145",
      description: "+20% from last month",
      icon: CalendarDays
    },
    {
      title: "Active Equipment",
      value: "45",
      description: "12 currently in use",
      icon: Wrench
    },
    {
      title: "Total Users",
      value: "2,350",
      description: "+180 new users",
      icon: Users
    },
    {
      title: "Active Now",
      value: "12",
      description: "Users currently online",
      icon: Activity
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
