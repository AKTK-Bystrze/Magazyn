/**
 * UserSidebar Component
 *
 * Renders the sidebar navigation for standard users.
 * Delegates to the unified Sidebar component.
 */
import { Sidebar, type SidebarProps } from "./Sidebar";

export type UserSidebarProps = Omit<SidebarProps, "isAdmin" | "items">;

/**
 * Sidebar navigation component for user dashboard
 */
export function UserSidebar(props: UserSidebarProps) {
  return <Sidebar {...props} isAdmin={false} />;
}
