import * as React from "react";

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
 * Validates whether the document referrer originates from the same site.
 */
function isSameOriginReferrer(): boolean {
  if (typeof window === "undefined" || !document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
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
    if (isSameOriginReferrer()) {
      const refUrl = new URL(document.referrer);
      setBackHref(refUrl.pathname + refUrl.search);
    }
  }, [defaultPath]);

  const handleBack = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1 && isSameOriginReferrer()) {
      e.preventDefault();
      window.history.back();
    }
  }, []);

  return { backHref, handleBack };
}
