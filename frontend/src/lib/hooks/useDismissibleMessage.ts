import * as React from "react";
import { MESSAGE_AUTO_DISMISS_MS } from "@/lib/config/constants";

/**
 * Custom React hook for managing auto-dismissing flash messages (e.g. success or error alerts).
 * Automatically clears the message after the specified duration.
 *
 * @param timeoutMs - Milliseconds before clearing the message (defaults to MESSAGE_AUTO_DISMISS_MS)
 * @returns A tuple of [message, setMessage, clearMessage]
 */
export function useDismissibleMessage(
  timeoutMs: number = MESSAGE_AUTO_DISMISS_MS
): [string | null, React.Dispatch<React.SetStateAction<string | null>>] {
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage(null);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [message, timeoutMs]);

  return [message, setMessage];
}
