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
import type { CreditRequestDTO } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminCreditReview } from "./SuperAdminCreditReview";
import { CreditRequestDetailsDialog } from "./CreditRequestDetailsDialog";

interface Props {
  isSuperAdmin: boolean;
  userId: string;
  onEditClick: (req: CreditRequestDTO) => void;
}

export function CreditsList({ isSuperAdmin, userId, onEditClick }: Props) {
  const [data, setData] = useState<CreditRequestDTO[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState<CreditRequestDTO | null>(null);
  const [detailsItem, setDetailsItem] = useState<CreditRequestDTO | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [res, usersRes] = await Promise.all([
        creditRequestsApi.getRequests({}),
        usersApi.listPublic({ perPage: 100 }),
      ]);
      setData(res.requests || []);
      
      const map: Record<string, string> = {};
      (usersRes.users || []).forEach(u => {
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
      case "awaiting":
        return <Badge variant="secondary">Oczekujący</Badge>;
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            Zatwierdzony
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Odrzucony</Badge>;
      case "approved with changes":
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
    if (filter === "all") return true;
    if (filter === "approved") return item.status === "approved" || item.status === "approved with changes";
    return item.status === filter;
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Wszystkie
            </Button>
            <Button
              variant={filter === "awaiting" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("awaiting")}
            >
              Oczekujące
            </Button>
            <Button
              variant={filter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("approved")}
            >
              Zatwierdzone
            </Button>
            <Button
              variant={filter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("rejected")}
            >
              Odrzucone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak wniosków spełniających kryteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Kto prosił o pomoc</TableHead>
                  <TableHead>Pomagający</TableHead>
                  <TableHead>Wartość</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.user_helped_id ? usersMap[item.user_helped_id] || item.user_helped_id : '-'}</TableCell>
                    <TableCell>
                      {item.helpers?.length ? (
                        <span title={item.helpers.map(h => usersMap[h] || h).join(', ')}>
                          {item.helpers.map(h => usersMap[h] || h).join(', ')}
                        </span>
                      ) : (
                        '0 osób'
                      )}
                    </TableCell>
                    <TableCell>{item.credits_value}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {item.status === "awaiting" && item.requestor_id === userId && (
                        <Button variant="outline" size="sm" onClick={() => onEditClick(item)}>
                          Edytuj
                        </Button>
                      )}
                      {isSuperAdmin && item.status === "awaiting" && (
                        <Button size="sm" onClick={() => setReviewItem(item)}>
                          Rozpatrz
                        </Button>
                      )}
                      {!(item.status === "awaiting" && (item.requestor_id === userId || isSuperAdmin)) && (
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
