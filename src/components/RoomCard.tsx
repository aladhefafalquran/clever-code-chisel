
import { useState } from 'react';
import { Room, RoomStatus, ROOM_STATUS_CONFIG, getWorkflowPriority } from '@/types/room';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, UserCheck, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomCardProps {
  room: Room;
  isAdmin: boolean;
  isSelected: boolean;
  showSelection: boolean;
  hasTask: boolean;
  onStatusChange: (roomNumber: string, status: RoomStatus) => void;
  onGuestStatusChange: (roomNumber: string, hasGuests: boolean) => void;
  onSelect: (roomNumber: string, selected: boolean) => void;
  onAddTask: (roomNumber: string) => void;
}

export const RoomCard = ({
  room,
  isAdmin,
  isSelected,
  showSelection,
  hasTask,
  onStatusChange,
  onGuestStatusChange,
  onSelect,
  onAddTask
}: RoomCardProps) => {
  const statusConfig = ROOM_STATUS_CONFIG[room.status];
  const workflowPriority = getWorkflowPriority(room);
  
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

  const handleAddTask = () => {
    onAddTask(room.number);
  };

  // Get border style based on occupancy and workflow priority
  const getBorderStyle = () => {
    let borderClass = statusConfig.borderColor;
    
    if (workflowPriority === 'immediate') {
      borderClass += ' border-4 shadow-elevated'; // Thicker border for immediate priority
    } else if (room.hasGuests) {
      borderClass += ' border-dashed border-2'; // Dashed border for occupied rooms
    } else {
      borderClass += ' border-2';
    }
    
    return borderClass;
  };

  return (
    <div className="relative group">
      <div
        className={cn(
          "relative rounded-2xl border overflow-hidden transition-all duration-300 ease-out transform",
          getBorderStyle(),
          isSelected && "ring-4 ring-blue-300/50 scale-105",
          "min-h-[130px] md:min-h-[150px] h-full shadow-soft hover:shadow-elevated",
          !showSelection && "hover:scale-102 hover:-translate-y-1"
        )}
      >
        {/* Task Indicator */}
        {hasTask && (
          <div className="absolute top-3 left-3 z-30 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-elevated animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Admin Guest Toggle (only for admin) */}
        {isAdmin && (
          <button
            onClick={handleGuestToggle}
            className="absolute top-3 right-3 z-20 p-2 h-8 w-8 rounded-xl bg-black/20 hover:bg-black/40 transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-110"
          >
            {room.hasGuests ? (
              <Users className="w-4 h-4 text-white drop-shadow-sm" />
            ) : (
              <User className="w-4 h-4 text-white/80 drop-shadow-sm" />
            )}
          </button>
        )}

        {/* Selection Checkbox - Only shown when showSelection is true */}
        {showSelection && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white/90 border-2 shadow-soft backdrop-blur-sm h-5 w-5 rounded-lg"
            />
          </div>
        )}

        {/* Workflow Priority Indicator */}
        {workflowPriority === 'immediate' && (
          <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-elevated animate-bounce">
            PRIORITY
          </div>
        )}

        {/* Main Room Content - Either clickable for selection or dropdown for status */}
        {showSelection ? (
          <button
            onClick={handleCardClick}
            className={cn(
              "w-full h-full min-h-[130px] md:min-h-[150px] p-6 flex flex-col items-center justify-center text-white font-bold text-base transition-all duration-300",
              statusConfig.bgColor,
              "hover:brightness-110 active:scale-95 relative overflow-hidden"
            )}
          >
            {/* Background Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            
            <div className="relative z-10 text-center">
              <div className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg tracking-wide">
                {room.number}
              </div>
              
              {/* Enhanced Occupancy Display */}
              <div className="flex items-center justify-center gap-2 text-sm opacity-95 bg-black/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
                {room.hasGuests ? (
                  <>
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">Occupied</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span className="font-semibold">Vacant</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full h-full min-h-[130px] md:min-h-[150px] p-6 flex flex-col items-center justify-center text-white font-bold text-base transition-all duration-300",
                  statusConfig.bgColor,
                  "hover:brightness-110 active:scale-95 relative overflow-hidden group-hover:shadow-2xl"
                )}
              >
                {/* Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                
                <div className="relative z-10 text-center">
                  <div className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg tracking-wide">
                    {room.number}
                  </div>
                  
                  {/* Enhanced Occupancy Display */}
                  <div className="flex items-center justify-center gap-2 text-sm opacity-95 bg-black/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/30">
                    {room.hasGuests ? (
                      <>
                        <Users className="w-4 h-4" />
                        <span className="font-semibold">Occupied</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        <span className="font-semibold">Vacant</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56 bg-white/95 backdrop-blur-sm border border-white/20 shadow-elevated z-50 rounded-xl">
              {/* Guest option - only show for admins */}
              {isAdmin && (
                <DropdownMenuItem
                  onClick={handleGuestStatusToggle}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {room.hasGuests ? (
                      <Users className="w-4 h-4 text-green-600" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="font-medium">
                    {room.hasGuests ? 'Mark as Vacant' : 'Mark as Occupied'}
                  </span>
                </DropdownMenuItem>
              )}

              {/* Add Task option - only show for admins */}
              {isAdmin && (
                <DropdownMenuItem
                  onClick={handleAddTask}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Add Task</span>
                </DropdownMenuItem>
              )}
              
              {/* Status options */}
              {statusOptions.map(({ status, label }) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full shadow-soft",
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
