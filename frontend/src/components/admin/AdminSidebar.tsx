/**
 * AdminSidebar Component
 *
 * Renders the sidebar navigation for admin users.
 * Delegates to the unified Sidebar component.
 */
import { Sidebar, type SidebarProps } from "@/components/navigation/Sidebar";

export type AdminSidebarProps = Omit<SidebarProps, "isAdmin" | "items">;

/**
 * Sidebar navigation component for admin dashboard
 */
export function AdminSidebar(props: AdminSidebarProps) {
  return <Sidebar {...props} isAdmin={true} />;
}
