import * as React from "react";
import { ROUTES } from "@/lib/config/routes";

/**
 * Return type of useReturnNavigation hook.
 */
export interface UseReturnNavigationReturn {
  /** Resolved safe URL for href fallback attribute */
  backHref: string;
  /** Click handler that executes browser history back or navigates to fallback */
  handleBack: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Validates whether the document referrer originates from a valid, non-self, non-auth same-origin page.
 */
function isValidReturnReferrer(): boolean {
  if (typeof window === "undefined" || !document.referrer) return false;
  try {
    const refUrl = new URL(document.referrer);
    if (refUrl.origin !== window.location.origin) return false;
    if (refUrl.pathname === window.location.pathname) return false;
    if (refUrl.pathname.startsWith(ROUTES.PUBLIC.LOGIN)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook providing smart back navigation for detail pages.
 * Prioritizes window.history.back() when coming from same-origin pages (e.g. cart or filtered list),
 * and defaults safely to defaultPath.
 *
 * @param defaultPath - Default fallback path (e.g. /equipment or /reservations)
 * @returns { backHref, handleBack }
 */
export function useReturnNavigation(defaultPath: string): UseReturnNavigationReturn {
  const [backHref, setBackHref] = React.useState<string>(defaultPath);

  React.useEffect(() => {
    if (isValidReturnReferrer()) {
      const refUrl = new URL(document.referrer);
      setBackHref(refUrl.pathname + refUrl.search);
    }
  }, [defaultPath]);

  const handleBack = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1 && isValidReturnReferrer()) {
      e.preventDefault();
      window.history.back();
    }
  }, []);

  return { backHref, handleBack };
}
