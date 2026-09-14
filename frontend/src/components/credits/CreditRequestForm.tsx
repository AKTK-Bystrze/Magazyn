import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { creditRequestsApi, usersApi } from "@/lib/api";
import type { CreditRequestDTO, PublicUser } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  initialData?: CreditRequestDTO;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CreditRequestForm({ initialData, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [creditsValue, setCreditsValue] = useState(initialData?.credits_value?.toString() || "");
  const [userHelpedId, setUserHelpedId] = useState(initialData?.user_helped_id || "");
  const [helpers, setHelpers] = useState<string[]>(initialData?.helpers || []);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await usersApi.listPublic({ perPage: 1000 });
        setUsers(res.users);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setUsersLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const value = parseInt(creditsValue);
    if (isNaN(value) || value <= 0) {
      setError("Wartość godzinek musi być większa od 0.");
      return;
    }

    if (helpers.length === 0) {
      setError("Musisz wybrać przynajmniej jedną osobę, która pomagała.");
      return;
    }

    setLoading(true);
    try {
      if (initialData) {
        await creditRequestsApi.updateRequest(initialData.id, {
          title,
          description,
          credits_value: value,
          user_helped_id: userHelpedId,
          helpers,
        });
      } else {
        await creditRequestsApi.createRequest({
          title,
          description,
          credits_value: value,
          user_helped_id: userHelpedId,
          helpers,
        });
      }
      onSuccess();
      if (!initialData) {
        setTitle("");
        setDescription("");
        setCreditsValue("");
        setUserHelpedId("");
        setHelpers([]);
      }
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const errorObj = err as Record<string, unknown>;
        const response = errorObj.response as Record<string, unknown> | undefined;
        const data = response?.data as Record<string, unknown> | undefined;
        setError((data?.message as string) || (errorObj.message as string) || "Wystąpił błąd.");
      } else {
        setError("Wystąpił błąd.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleHelper = (id: string) => {
    setHelpers((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edytuj wniosek" : "Złóż nowy wniosek"}</CardTitle>
        <CardDescription>
          Wypełnij poniższe dane, aby zawnioskować o przyznanie godzinek.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm font-medium text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="title">Tytuł wniosku</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditsValue">Ilość godzinek (dla każdej pomagającej osoby)</Label>
            <Input
              id="creditsValue"
              type="number"
              min="1"
              value={creditsValue}
              onChange={(e) => setCreditsValue(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userHelped">Osoba, której pomagano</Label>
            <select
              id="userHelped"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={userHelpedId}
              onChange={(e) => setUserHelpedId(e.target.value)}
              required
            >
              <option value="" disabled>
                Wybierz osobę...
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Osoby, które pomagały</Label>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2 bg-background">
              {usersLoading ? (
                <div className="text-sm text-muted-foreground">Ładowanie użytkowników...</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`helper-${u.id}`}
                      checked={helpers.includes(u.id)}
                      onCheckedChange={() => toggleHelper(u.id)}
                    />
                    <label
                      htmlFor={`helper-${u.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {u.username}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Anuluj
              </Button>
            )}
            <Button type="submit" disabled={loading || usersLoading}>
              {loading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
