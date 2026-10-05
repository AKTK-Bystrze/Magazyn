import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { creditRequestsApi, usersApi } from "@/lib/api";
import type { CreditRequest } from "@/types";
import { CREDIT_REQUEST_STATUS } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminCreditReview } from "./SuperAdminCreditReview";
import { CreditRequestDetailsDialog } from "./CreditRequestDetailsDialog";

interface Props {
  isSuperAdmin: boolean;
  userId: string;
  onEditClick: (req: CreditRequest) => void;
}

export function CreditsList({ isSuperAdmin, userId, onEditClick }: Props) {
  const [data, setData] = useState<CreditRequest[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState<CreditRequest | null>(null);
  const [detailsItem, setDetailsItem] = useState<CreditRequest | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    null
  );

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const load = async () => {
    setLoading(true);
    try {
      const [res, usersRes] = await Promise.all([
        creditRequestsApi.getRequests({}),
        usersApi.listPublic({ perPage: 100 }),
      ]);
      setData(res.requests || []);

      const map: Record<string, string> = {};
      (usersRes.users || []).forEach((u) => {
        map[u.id] = u.username;
      });
      setUsersMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case CREDIT_REQUEST_STATUS.AWAITING:
        return <Badge variant="secondary">Oczekujący</Badge>;
      case CREDIT_REQUEST_STATUS.APPROVED:
        return (
          <Badge variant="default" className="bg-green-600">
            Zatwierdzony
          </Badge>
        );
      case CREDIT_REQUEST_STATUS.REJECTED:
        return <Badge variant="destructive">Odrzucony</Badge>;
      case CREDIT_REQUEST_STATUS.APPROVED_WITH_CHANGES:
        return (
          <Badge variant="default" className="bg-yellow-600">
            Zatwierdzony (zmiany)
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredData = data.filter((item) => {
    let matchesStatus = true;
    if (filter !== "all") {
      if (filter === CREDIT_REQUEST_STATUS.APPROVED) {
        matchesStatus =
          item.status === CREDIT_REQUEST_STATUS.APPROVED ||
          item.status === CREDIT_REQUEST_STATUS.APPROVED_WITH_CHANGES;
      } else {
        matchesStatus = item.status === filter;
      }
    }

    let matchesSearch = true;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const userHelped = item.userHelpedId ? usersMap[item.userHelpedId] || item.userHelpedId : "";
      const helpers = item.helpers?.map((h) => usersMap[h] || h).join(", ") || "";
      matchesSearch =
        item.title.toLowerCase().includes(lowerQuery) ||
        userHelped.toLowerCase().includes(lowerQuery) ||
        helpers.toLowerCase().includes(lowerQuery);
    }
    return matchesStatus && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "userHelpedId") {
      aValue = a.userHelpedId ? usersMap[a.userHelpedId] || a.userHelpedId : "";
      bValue = b.userHelpedId ? usersMap[b.userHelpedId] || b.userHelpedId : "";
    }

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Wnioski o godzinki</CardTitle>
            <CardDescription>
              Historia i statusy wniosków o przyznanie godzinek za pomoc.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Szukaj użytkownika / tytułu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Wszystkie
              </Button>
              <Button
                variant={filter === CREDIT_REQUEST_STATUS.AWAITING ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(CREDIT_REQUEST_STATUS.AWAITING)}
              >
                Oczekujące
              </Button>
              <Button
                variant={filter === CREDIT_REQUEST_STATUS.APPROVED ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(CREDIT_REQUEST_STATUS.APPROVED)}
              >
                Zatwierdzone
              </Button>
              <Button
                variant={filter === CREDIT_REQUEST_STATUS.REJECTED ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(CREDIT_REQUEST_STATUS.REJECTED)}
              >
                Odrzucone
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak wniosków spełniających kryteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("title")}>
                    Tytuł{" "}
                    {sortConfig?.key === "title"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("userHelpedId")}>
                    Kto prosił o pomoc{" "}
                    {sortConfig?.key === "userHelpedId"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </TableHead>
                  <TableHead>Pomagający</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("creditsValue")}>
                    Wartość{" "}
                    {sortConfig?.key === "creditsValue"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("status")}>
                    Status{" "}
                    {sortConfig?.key === "status"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("createdAt")}>
                    Data{" "}
                    {sortConfig?.key === "createdAt"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      {item.userHelpedId ? usersMap[item.userHelpedId] || item.userHelpedId : "-"}
                    </TableCell>
                    <TableCell>
                      {item.helpers?.length ? (
                        <span title={item.helpers.map((h) => usersMap[h] || h).join(", ")}>
                          {item.helpers.map((h) => usersMap[h] || h).join(", ")}
                        </span>
                      ) : (
                        "0 osób"
                      )}
                    </TableCell>
                    <TableCell>{item.creditsValue}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {item.status === CREDIT_REQUEST_STATUS.AWAITING &&
                        item.requestorId === userId && (
                          <Button variant="outline" size="sm" onClick={() => onEditClick(item)}>
                            Edytuj
                          </Button>
                        )}
                      {isSuperAdmin && item.status === CREDIT_REQUEST_STATUS.AWAITING && (
                        <Button size="sm" onClick={() => setReviewItem(item)}>
                          Rozpatrz
                        </Button>
                      )}
                      {!(
                        item.status === CREDIT_REQUEST_STATUS.AWAITING &&
                        (item.requestorId === userId || isSuperAdmin)
                      ) && (
                        <Button variant="outline" size="sm" onClick={() => setDetailsItem(item)}>
                          Szczegóły
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {reviewItem && (
        <SuperAdminCreditReview
          request={reviewItem}
          open={!!reviewItem}
          onOpenChange={(open) => !open && setReviewItem(null)}
          onReviewed={() => {
            setReviewItem(null);
            load();
          }}
        />
      )}

      <CreditRequestDetailsDialog
        isOpen={!!detailsItem}
        onClose={() => setDetailsItem(null)}
        request={detailsItem}
        usersMap={usersMap}
      />
    </>
  );
}
