import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useCreditHistory } from "@/hooks/useCreditHistory";
import { CreditHistoryTable } from "./CreditHistoryTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wallet } from "lucide-react";
import { CREDIT_HISTORY_UI_STRINGS, ICON_SIZE_SM } from "@/lib/config/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * Inner component that uses the useCreditHistory hook
 */
function CreditHistoryContainerInner() {
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCreditHistory();

  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      {/* Page Header & Balance Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {CREDIT_HISTORY_UI_STRINGS.CURRENT_BALANCE}
            </CardTitle>
            <Wallet className={ICON_SIZE_SM + " text-muted-foreground"} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                `${data?.currentBalance ?? 0}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">Available credits for reservations</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {isError && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className={ICON_SIZE_SM} />
          <AlertDescription>
            {error?.message || CREDIT_HISTORY_UI_STRINGS.ERROR_FETCHING}
          </AlertDescription>
        </Alert>
      )}

      {/* Credit History Table */}
      <div className="space-y-4">
        <CreditHistoryTable data={data?.history ?? []} isLoading={isLoading} />

        {/* Intersection Observer Target */}
        <div ref={observerTarget} className="h-10 w-full mt-4 flex items-center justify-center">
          {isFetchingNextPage && (
            <span className="text-sm text-muted-foreground">Ładowanie kolejnych...</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main container for the Credit History view
 * Wraps the inner component with QueryProvider for data fetching
 */
export function CreditHistoryContainer() {
  return (
    <QueryProvider>
      <CreditHistoryContainerInner />
    </QueryProvider>
  );
}
