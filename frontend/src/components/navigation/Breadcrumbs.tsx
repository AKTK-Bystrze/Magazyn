/**
 * Breadcrumbs Component
 * 
 * Auto-generated navigation breadcrumb trail.
 * Parses URL path and maps segments to readable labels.
 * 
 * @example
 * <Breadcrumbs currentPath="/reservations/create" />
 */
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { BREADCRUMB_LABELS, BREADCRUMB_HIDDEN_PATHS } from '@/lib/config/nav-config';
import { Fragment } from 'react';

interface BreadcrumbsProps {
  /** Current URL path */
  currentPath: string;
  /** Whether this is an admin page (changes home link) */
  isAdmin?: boolean;
}

interface BreadcrumbSegment {
  label: string;
  href: string;
  isLast: boolean;
}

/**
 * Parses URL path into breadcrumb segments
 */
function parsePathToSegments(path: string): BreadcrumbSegment[] {
  const segments = path.split('/').filter(Boolean);
  const result: BreadcrumbSegment[] = [];
  
  let currentHref = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentHref += `/${segment}`;
    
    const label = BREADCRUMB_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    result.push({
      label,
      href: currentHref,
      isLast: i === segments.length - 1,
    });
  }
  
  return result;
}

/**
 * Breadcrumb trail navigation component
 */
export function Breadcrumbs({ currentPath, isAdmin = false }: BreadcrumbsProps) {
  if (BREADCRUMB_HIDDEN_PATHS.includes(currentPath)) {
    return null;
  }

  const segments = parsePathToSegments(currentPath);
  
  if (segments.length === 0) {
    return null;
  }

  const homeHref = isAdmin ? '/admin' : '/dashboard';
  const homeLabel = isAdmin ? 'Admin' : 'Home';

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={homeHref}>{homeLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        
        {segments.map((segment, index) => {
          if (index === 0 && (segment.href === '/admin' || segment.href === '/dashboard')) {
            return null;
          }
          
          return (
            <Fragment key={segment.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {segment.isLast ? (
                  <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={segment.href}>{segment.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
