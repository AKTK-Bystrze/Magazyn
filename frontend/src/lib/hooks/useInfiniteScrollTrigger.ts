import * as React from "react";

/**
 * Configuration options for the `useInfiniteScrollTrigger` hook.
 */
export interface UseInfiniteScrollTriggerOptions {
  /** Whether additional pages of data are available */
  hasNextPage: boolean;
  /** Whether a page fetch operation is currently in flight */
  isFetchingNextPage: boolean;
  /** Callback invoked to fetch the next page */
  fetchNextPage: () => void;
  /** Intersection threshold at which callback is triggered (defaults to 0.1) */
  threshold?: number;
}

/**
 * Custom React hook for triggering infinite pagination on DOM element intersection.
 * Standardizes IntersectionObserver lifecycle, thresholding, and cleanup across lists and tables.
 *
 * @template T - The HTML element type to observe
 * @param options - Configuration options for infinite scrolling
 * @returns Ref object to attach to the sentinel element
 */
export function useInfiniteScrollTrigger<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.1,
}: UseInfiniteScrollTriggerOptions): React.RefObject<T | null> {
  const observerTarget = React.useRef<T>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold]);

  return observerTarget;
}
