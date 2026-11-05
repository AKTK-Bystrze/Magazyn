import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EQUIPMENT_MANAGER_UI_STRINGS } from "@/lib/config/constants";
import type { EquipmentSearchItem } from "@/types";
import { EquipmentDetailsContent } from "./EquipmentDetailsContent";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for EquipmentDetailsSheet component
 */
interface EquipmentDetailsSheetProps {
  /** Whether sheet is open */
  isOpen: boolean;
  /** Equipment item to show details for (passed from list for initial display) */
  equipment: EquipmentSearchItem | null;
  /** Callback when sheet closes */
  onClose: () => void;
}

/**
 * Side sheet showing full equipment details including maintenance history.
 * Reuses EquipmentDetailsContent for presentation.
 */
export function EquipmentDetailsSheet({ isOpen, equipment, onClose }: EquipmentDetailsSheetProps) {
  if (!equipment) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto overflow-x-hidden max-w-[95%]"
        >
          <SheetHeader>
            <SheetTitle>{UI.DETAILS_TITLE}</SheetTitle>
          </SheetHeader>
          <div className="py-8 text-center text-muted-foreground">Nie wybrano sprzętu</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto overflow-x-hidden max-w-[95%]"
        data-testid="equipment-details-sheet"
      >
        <SheetHeader className="border-b pb-4 px-4 pt-4 sm:px-6 sm:pt-6">
          <SheetTitle>{UI.DETAILS_TITLE}</SheetTitle>
          <SheetDescription>
            {equipment.internalId} • {equipment.type.name}
          </SheetDescription>
        </SheetHeader>

        <EquipmentDetailsContent equipment={equipment} />
      </SheetContent>
    </Sheet>
  );
}
