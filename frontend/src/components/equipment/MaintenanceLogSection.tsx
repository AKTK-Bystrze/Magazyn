import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, ArrowRight } from "lucide-react";
import {
  ICON_SIZE_SM,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import { formatDateLocalized } from "@/lib/utils/date-utils";
import type { MaintenanceLog, CreateMaintenanceLogCommand } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for MaintenanceLogSection component
 */
interface MaintenanceLogSectionProps {
  /** List of maintenance logs */
  logs: MaintenanceLog[];
  /** Equipment ID for adding logs */
  equipmentId: string;
  /** Callback when adding a new log */
  onAddLog: (command: CreateMaintenanceLogCommand) => Promise<MaintenanceLog>;
  /** Whether add log is in progress */
  isSubmitting: boolean;
  /** Whether the section is in read-only mode */
  readOnly?: boolean;
}

/**
 * Returns badge variant based on equipment status
 */
function getStatusVariant(
  status: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  switch (status) {
    case "ok":
      return "default";
    case "broken":
      return "destructive";
    case "blocked":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Maintenance history section with timeline and add log capability
 */
export function MaintenanceLogSection({
  logs,
  equipmentId,
  onAddLog,
  isSubmitting,
  readOnly = false,
}: MaintenanceLogSectionProps) {
  const [isAddingLog, setIsAddingLog] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const notesInputId = React.useId();

  // Silence unused warning - equipmentId may be used in future
  void equipmentId;

  // Handle add log toggle
  const handleToggleAdd = React.useCallback(() => {
    setIsAddingLog((prev) => !prev);
    setNotes("");
  }, []);

  // Handle notes input change
  const handleNotesChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNotes(e.target.value);
    },
    []
  );

  // Handle add log submit
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await onAddLog({ notes: notes.trim() || undefined });
        setIsAddingLog(false);
        setNotes("");
      } catch {
        // Error handling is done by parent
      }
    },
    [notes, onAddLog]
  );

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    setIsAddingLog(false);
    setNotes("");
  }, []);

  return (
    <div className="space-y-4">
      {/* Add Log Button / Form */}
      {!readOnly && (
        isAddingLog ? (
          <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3">
            <div className="space-y-2">
              <label htmlFor={notesInputId} className="text-sm font-medium">
                Maintenance Notes
              </label>
              <Input
                id={notesInputId}
                type="text"
                placeholder="e.g., Replaced battery, cleaned lens..."
                value={notes}
                onChange={handleNotesChange}
                disabled={isSubmitting}
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Note"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAdd}
            className="w-full"
          >
            <Plus className={ICON_SIZE_SM + " mr-2"} />
            {UI.ADD_MAINTENANCE_LOG}
          </Button>
          )
      )}

      {/* Maintenance Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{UI.NO_MAINTENANCE_HISTORY}</p>
        </div>
      ) : (
        <div className="relative space-y-4 pl-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {logs.map((log) => (
            <div key={log.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-6 top-2 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Wrench className="h-3 w-3 text-primary" />
              </div>

              {/* Log content */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                {/* Status change */}
                <div className="flex items-center gap-2 flex-wrap">
                  {log.previousStatus && (
                    <>
                      <Badge variant={getStatusVariant(log.previousStatus)} className="text-xs">
                        {EQUIPMENT_STATUS_LABELS[log.previousStatus] || log.previousStatus}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <Badge variant={getStatusVariant(log.newStatus)} className="text-xs">
                    {EQUIPMENT_STATUS_LABELS[log.newStatus] || log.newStatus}
                  </Badge>
                </div>

                {/* Notes */}
                {log.notes && (
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {log.adminUsername ? `by ${log.adminUsername}` : "System"}
                  </span>
                  <span>{formatDateLocalized(log.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
