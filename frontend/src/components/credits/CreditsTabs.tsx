import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersCreditsList } from "./UsersCreditsList";
import { CreditsList } from "./CreditsList";
import { CreditRequestForm } from "./CreditRequestForm";
import { CreditHistoryContainer } from "./CreditHistoryContainer";
import type { CreditRequest } from "@/types";

interface Props {
  userId: string;
  isSuperAdmin: boolean;
}

export function CreditsTabs({ userId, isSuperAdmin }: Props) {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [editingRequest, setEditingRequest] = useState<CreditRequest | null>(null);

  const handleEditClick = (req: CreditRequest) => {
    setEditingRequest(req);
    setActiveTab("request");
  };

  const handleFormSuccess = () => {
    setEditingRequest(null);
    setActiveTab("list");
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex flex-col sm:flex-row w-full sm:w-fit !h-auto p-1 gap-1">
        <TabsTrigger value="leaderboard" className="w-full sm:w-auto !h-9">Ranking Godzinek</TabsTrigger>
        <TabsTrigger value="history" className="w-full sm:w-auto !h-9">Historia</TabsTrigger>
        <TabsTrigger value="list" className="w-full sm:w-auto !h-9">Wnioski</TabsTrigger>
        <TabsTrigger value="request" className="w-full sm:w-auto !h-9">
          {editingRequest ? "Edytuj wniosek" : "Złóż wniosek"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="leaderboard" className="mt-6">
        <UsersCreditsList />
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        {activeTab === "history" && <CreditHistoryContainer />}
      </TabsContent>

      <TabsContent value="list" className="mt-6">
        {activeTab === "list" && (
          <CreditsList isSuperAdmin={isSuperAdmin} userId={userId} onEditClick={handleEditClick} />
        )}
      </TabsContent>

      <TabsContent value="request" className="mt-6">
        {activeTab === "request" && (
          <CreditRequestForm
            initialData={editingRequest || undefined}
            onSuccess={handleFormSuccess}
            onCancel={
              editingRequest
                ? () => {
                    setEditingRequest(null);
                    setActiveTab("list");
                  }
                : undefined
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
