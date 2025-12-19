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
import { Fragment, useState, useEffect } from 'react';

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
 * Breadcrumb trail navigation component
 */
export function Breadcrumbs({ currentPath, isAdmin = false }: BreadcrumbsProps) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleUpdate = (event: CustomEvent<{ path: string; label: string }>) => {
      const { path, label } = event.detail;
      setDynamicLabels(prev => ({ ...prev, [path]: label }));
    };

    window.addEventListener('magazyn:breadcrumb-label' as any, handleUpdate);
    return () => window.removeEventListener('magazyn:breadcrumb-label' as any, handleUpdate);
  }, []);

  if (BREADCRUMB_HIDDEN_PATHS.includes(currentPath)) {
    return null;
  }

  /**
   * Parses URL path into breadcrumb segments
   */
  const segments: BreadcrumbSegment[] = [];
  const parts = currentPath.split('/').filter(Boolean);
  let currentHref = '';
  
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    currentHref += `/${segment}`;
    
    // Check dynamic labels first, then static config, then fallback to capitalized segment
    const label = dynamicLabels[currentHref] || BREADCRUMB_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    segments.push({
      label,
      href: currentHref,
      isLast: i === parts.length - 1,
    });
  }

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
