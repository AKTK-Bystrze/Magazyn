import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CreditRequestDTO } from "@/types";
import { CREDIT_REQUEST_STATUS } from "@/types";
import { CREDIT_REQUEST_STATUS } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: CreditRequestDTO | null;
  usersMap: Record<string, string>;
}

export function CreditRequestDetailsDialog({ isOpen, onClose, request, usersMap }: Props) {
  if (!request) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case CREDIT_REQUEST_STATUS.AWAITING:
        return <Badge variant="secondary">Oczekujący</Badge>;
      case CREDIT_REQUEST_STATUS.APPROVED:
        return <Badge variant="default" className="bg-green-600">Zatwierdzony</Badge>;
      case CREDIT_REQUEST_STATUS.REJECTED:
        return <Badge variant="destructive">Odrzucony</Badge>;
      case CREDIT_REQUEST_STATUS.APPROVED_WITH_CHANGES:
        return <Badge variant="default" className="bg-yellow-600">Zatwierdzony (zmiany)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Szczegóły Wniosku</DialogTitle>
          <DialogDescription>
            Dodano: {new Date(request.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Tytuł</Label>
            <div className="font-medium text-lg">{request.title}</div>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Opis</Label>
            <div className="text-sm p-4 bg-muted rounded-md whitespace-pre-wrap">
              {request.description || "Brak opisu"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Status</Label>
              <div>{getStatusBadge(request.status)}</div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Wartość godzinek</Label>
              <div className="font-medium">{request.credits_value}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Twórca wniosku</Label>
              <div>{request.requestor_id ? (usersMap[request.requestor_id] || request.requestor_id) : "-"}</div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Osoba uzyskująca pomoc</Label>
              <div>{request.user_helped_id ? (usersMap[request.user_helped_id] || request.user_helped_id) : '-'}</div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Osoby pomagające ({request.helpers?.length || 0})</Label>
            <div className="text-sm flex flex-wrap gap-2">
              {request.helpers?.length ? (
                request.helpers.map(h => (
                  <Badge variant="outline" key={h}>
                    {usersMap[h] || h}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Brak wybranych pomagających</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



