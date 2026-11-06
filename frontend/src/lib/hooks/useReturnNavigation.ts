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
 * Hook providing smart back navigation for detail pages.
 * Prioritizes window.history.back() when coming from same-origin pages (e.g. cart or filtered list),
 * supports explicit returnUrl/from query parameters, and defaults safely to defaultPath.
 *
 * @param defaultPath - Default fallback path (e.g. /equipment or /reservations)
 * @returns { backHref, handleBack }
 */
export function useReturnNavigation(defaultPath: string): UseReturnNavigationReturn {
  const getSafeReturnUrl = React.useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("returnUrl") || params.get("from");
    if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
      return returnUrl;
    }

    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin) {
          return refUrl.pathname + refUrl.search;
        }
      } catch {
        // ignore invalid URL
      }
    }

    return null;
  }, []);

  const [backHref, setBackHref] = React.useState<string>(defaultPath);

  React.useEffect(() => {
    const safeUrl = getSafeReturnUrl();
    if (safeUrl) {
      setBackHref(safeUrl);
    } else {
      setBackHref(defaultPath);
    }
  }, [defaultPath, getSafeReturnUrl]);

  const handleBack = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window !== "undefined" && window.history.length > 1 && document.referrer) {
        try {
          const refUrl = new URL(document.referrer);
          if (refUrl.origin === window.location.origin) {
            e.preventDefault();
            window.history.back();
            return;
          }
        } catch {
          // ignore invalid referrer
        }
      }

      const safeUrl = getSafeReturnUrl();
      if (safeUrl) {
        e.preventDefault();
        window.location.href = safeUrl;
      }
    },
    [getSafeReturnUrl]
  );

  return { backHref, handleBack };
}
