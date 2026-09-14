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
import { creditRequestsApi, usersApi } from "@/lib/api";
import type { UserCreditLeaderboardItem, PublicUser } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export function UsersCreditsList() {
  const [leaderboard, setLeaderboard] = useState<UserCreditLeaderboardItem[]>([]);
  const [publicUsers, setPublicUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [boardRes, usersRes] = await Promise.all([
          creditRequestsApi.getLeaderboard(),
          usersApi.listPublic({ perPage: 100 }),
        ]);
        setLeaderboard(boardRes || []);
        
        // Sort public users by credit balance descending
        const sortedUsers = (usersRes.users || []).sort((a: PublicUser, b: PublicUser) => b.creditBalance - a.creditBalance);
        setPublicUsers(sortedUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Aktualne Saldo</CardTitle>
          <CardDescription>
            Lista użytkowników i ich obecne saldo godzinek.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publicUsers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.username}</TableCell>
                  <TableCell className="text-right">{item.creditBalance}</TableCell>
                </TableRow>
              ))}
              {publicUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                    Brak danych.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking Otrzymanych</CardTitle>
          <CardDescription>
            Suma godzinek przyznanych za pomoc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead className="text-right">Suma godzinek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((item) => (
                <TableRow key={item.user_id}>
                  <TableCell className="font-medium">{item.username}</TableCell>
                  <TableCell className="text-right">{item.total_credits}</TableCell>
                </TableRow>
              ))}
              {leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                    Brak danych.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
