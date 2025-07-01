
import { useState } from 'react';
import { Room, RoomStatus, ROOM_STATUS_CONFIG } from '@/types/room';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomCardProps {
  room: Room;
  isAdmin: boolean;
  isSelected: boolean;
  showSelection: boolean;
  onStatusChange: (roomNumber: string, status: RoomStatus) => void;
  onGuestStatusChange: (roomNumber: string, hasGuests: boolean) => void;
  onSelect: (roomNumber: string, selected: boolean) => void;
}

export const RoomCard = ({
  room,
  isAdmin,
  isSelected,
  showSelection,
  onStatusChange,
  onGuestStatusChange,
  onSelect
}: RoomCardProps) => {
  const statusConfig = ROOM_STATUS_CONFIG[room.status];
  
  const statusOptions: { status: RoomStatus; label: string }[] = [
    { status: 'checkout', label: 'Checkout (Urgent)' },
    { status: 'dirty', label: 'Dirty' },
    { status: 'clean', label: 'Clean' },
    { status: 'default', label: 'Default' },
    { status: 'closed', label: 'Closed' }
  ];

  const handleStatusSelect = (status: RoomStatus) => {
    onStatusChange(room.number, status);
  };

  const handleGuestToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    onGuestStatusChange(room.number, !room.hasGuests);
  };

  const handleGuestStatusToggle = () => {
    onGuestStatusChange(room.number, !room.hasGuests);
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelect(room.number, checked);
  };

  const handleCardClick = () => {
    if (showSelection) {
      onSelect(room.number, !isSelected);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "relative rounded-lg border-2 overflow-hidden transition-all duration-200",
          statusConfig.borderColor,
          isSelected && "ring-4 ring-blue-300",
          "min-h-[120px] md:min-h-[140px] h-full"
        )}
      >
        {/* Guest Status Icon - Always shown when guest is present */}
        {room.hasGuests && (
          <div className="absolute top-2 right-2 z-10">
            <User className="w-4 h-4 text-white bg-orange-500 rounded-full p-0.5" />
          </div>
        )}

        {/* Admin Guest Toggle (only for admin) */}
        {isAdmin && (
          <button
            onClick={handleGuestToggle}
            className="absolute top-2 right-6 z-20 p-1 h-6 w-6 rounded-md bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/20"
          >
            {room.hasGuests ? (
              <UserCheck className="w-3 h-3 text-white" />
            ) : (
              <User className="w-3 h-3 text-white/70" />
            )}
          </button>
        )}

        {/* Selection Checkbox - Only shown when showSelection is true */}
        {showSelection && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white border-2"
            />
          </div>
        )}

        {/* Main Room Content - Either clickable for selection or dropdown for status */}
        {showSelection ? (
          <button
            onClick={handleCardClick}
            className={cn(
              "w-full h-full min-h-[120px] md:min-h-[140px] p-4 flex flex-col items-center justify-center text-white font-bold text-base transition-opacity duration-200",
              statusConfig.bgColor,
              "hover:opacity-90 active:opacity-80"
            )}
          >
            <div className="text-2xl md:text-3xl font-bold mb-1">
              {room.number}
            </div>
            
            {room.hasGuests && (
              <div className="text-xs opacity-90">
                Guest Present
              </div>
            )}
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full h-full min-h-[120px] md:min-h-[140px] p-4 flex flex-col items-center justify-center text-white font-bold text-base transition-opacity duration-200",
                  statusConfig.bgColor,
                  "hover:opacity-90 active:opacity-80"
                )}
              >
                <div className="text-2xl md:text-3xl font-bold mb-1">
                  {room.number}
                </div>
                
                {room.hasGuests && (
                  <div className="text-xs opacity-90">
                    Guest Present
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-48 bg-white border shadow-lg z-50">
              {/* Guest option - only show for admins */}
              {isAdmin && (
                <DropdownMenuItem
                  onClick={handleGuestStatusToggle}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {room.hasGuests ? (
                      <UserCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="font-medium">
                    {room.hasGuests ? 'Remove Guest' : 'Add Guest'}
                  </span>
                </DropdownMenuItem>
              )}
              
              {/* Status options */}
              {statusOptions.map(({ status, label }) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full",
                      ROOM_STATUS_CONFIG[status].bgColor
                    )}
                  />
                  <span className="font-medium">{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
