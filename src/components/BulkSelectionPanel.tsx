import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomStatus, ROOM_STATUS_CONFIG } from '@/types/room';
import { CheckSquare, Square, MousePointer } from 'lucide-react';

interface BulkSelectionPanelProps {
  selectedRooms: string[];
  totalAvailableRooms: number;
  showSelection: boolean;
  isAdmin: boolean;
  onToggleSelection: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: RoomStatus) => void;
  onBulkGuestUpdate: (hasGuests: boolean) => void;
  onApplyComplete: () => void;
}

export const BulkSelectionPanel = ({
  selectedRooms,
  totalAvailableRooms,
  showSelection,
  isAdmin,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkGuestUpdate,
  onApplyComplete
}: BulkSelectionPanelProps) => {
  const [selectedAction, setSelectedAction] = useState<string>('clean');

  const handleBulkUpdate = () => {
    if (selectedRooms.length > 0) {
      if (selectedAction === 'add-guest') {
        onBulkGuestUpdate(true);
      } else if (selectedAction === 'remove-guest') {
        onBulkGuestUpdate(false);
      } else {
        onBulkStatusUpdate(selectedAction as RoomStatus);
      }
      // Clear selections and hide selection interface after applying changes
      onApplyComplete();
    }
  };

  const getActionLabel = () => {
    if (selectedAction === 'add-guest') return 'Add Guest to';
    if (selectedAction === 'remove-guest') return 'Remove Guest from';
    return 'Apply to';
  };

  if (totalAvailableRooms === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">
            {selectedRooms.length} of {totalAvailableRooms} rooms selected
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showSelection ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelection}
            className="flex items-center gap-2"
          >
            <MousePointer className="w-4 h-4" />
            Select
          </Button>

          {showSelection && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={selectedRooms.length === totalAvailableRooms}
                className="flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Select All
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
                disabled={selectedRooms.length === 0}
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Clear
              </Button>
            </>
          )}
        </div>

        {/* Bulk Update Controls */}
        {selectedRooms.length > 0 && showSelection && (
          <div className="flex items-center gap-2 ml-auto">
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Clean
                  </div>
                </SelectItem>
                <SelectItem value="dirty">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Dirty
                  </div>
                </SelectItem>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Default
                  </div>
                </SelectItem>
                {isAdmin && (
                  <>
                    <SelectItem value="add-guest">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        Add Guest
                      </div>
                    </SelectItem>
                    <SelectItem value="remove-guest">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        Remove Guest
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkUpdate}
              className="flex items-center gap-2"
            >
              {getActionLabel()} {selectedRooms.length} rooms
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
