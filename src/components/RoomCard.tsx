
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
  // Safety check for room status config
  const statusConfig = ROOM_STATUS_CONFIG[room.status] || ROOM_STATUS_CONFIG['default'];
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
          // Mobile-optimized minimum heights and sizing
          "min-h-[140px] sm:min-h-[150px] md:min-h-[160px] h-full shadow-soft hover:shadow-elevated",
          !showSelection && "hover:scale-102 hover:-translate-y-1",
          // Touch-friendly tap target
          "touch-manipulation"
        )}
      >
        {/* Task Indicator - Mobile optimized */}
        {hasTask && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-30 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center shadow-elevated animate-pulse">
            <AlertTriangle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </div>
        )}

        {/* Admin Guest Toggle - Mobile optimized */}
        {isAdmin && (
          <button
            onClick={handleGuestToggle}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 p-2 h-10 w-10 sm:h-8 sm:w-8 rounded-xl bg-black/20 hover:bg-black/40 transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-110 touch-manipulation"
          >
            {room.hasGuests ? (
              <Users className="w-5 h-5 sm:w-4 sm:h-4 text-white drop-shadow-sm" />
            ) : (
              <User className="w-5 h-5 sm:w-4 sm:h-4 text-white/80 drop-shadow-sm" />
            )}
          </button>
        )}

        {/* Selection Checkbox - Mobile optimized */}
        {showSelection && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white/90 border-2 shadow-soft backdrop-blur-sm h-6 w-6 sm:h-5 sm:w-5 rounded-lg touch-manipulation"
            />
          </div>
        )}

        {/* Workflow Priority Indicator - Mobile optimized */}
        {workflowPriority === 'immediate' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-3 py-2 sm:py-1.5 rounded-full font-bold shadow-elevated animate-bounce">
            PRIORITY
          </div>
        )}

        {/* Main Room Content - Mobile optimized */}
        {showSelection ? (
          <button
            onClick={handleCardClick}
            className={cn(
              "w-full h-full min-h-[140px] sm:min-h-[150px] md:min-h-[160px] p-4 sm:p-6 flex flex-col items-center justify-center text-white font-bold text-base transition-all duration-300",
              statusConfig.bgColor,
              "hover:brightness-110 active:scale-95 relative overflow-hidden touch-manipulation"
            )}
          >
            {/* Background Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            
            <div className="relative z-10 text-center">
              {/* Mobile-optimized room number */}
              <div className="text-4xl sm:text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg tracking-wide">
                {room.number}
              </div>
              
              {/* Enhanced Occupancy Display - Mobile optimized */}
              <div className="flex items-center justify-center gap-2 text-sm sm:text-xs md:text-sm opacity-95 bg-black/20 rounded-full px-4 py-2 sm:px-3 sm:py-1.5 backdrop-blur-sm">
                {room.hasGuests ? (
                  <>
                    <Users className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="font-semibold">Occupied</span>
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5 sm:w-4 sm:h-4" />
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
                  "w-full h-full min-h-[140px] sm:min-h-[150px] md:min-h-[160px] p-4 sm:p-6 flex flex-col items-center justify-center text-white font-bold text-base transition-all duration-300",
                  statusConfig.bgColor,
                  "hover:brightness-110 active:scale-95 relative overflow-hidden group-hover:shadow-2xl touch-manipulation"
                )}
              >
                {/* Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                
                <div className="relative z-10 text-center">
                  {/* Mobile-optimized room number */}
                  <div className="text-4xl sm:text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg tracking-wide">
                    {room.number}
                  </div>
                  
                  {/* Enhanced Occupancy Display - Mobile optimized */}
                  <div className="flex items-center justify-center gap-2 text-sm sm:text-xs md:text-sm opacity-95 bg-black/20 rounded-full px-4 py-2 sm:px-3 sm:py-1.5 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/30">
                    {room.hasGuests ? (
                      <>
                        <Users className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="font-semibold">Occupied</span>
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5 sm:w-4 sm:h-4" />
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
                  className="flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-gray-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  <div className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center">
                    {room.hasGuests ? (
                      <Users className="w-5 h-5 sm:w-4 sm:h-4 text-green-600" />
                    ) : (
                      <User className="w-5 h-5 sm:w-4 sm:h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="font-medium text-base sm:text-sm">
                    {room.hasGuests ? 'Mark as Vacant' : 'Mark as Occupied'}
                  </span>
                </DropdownMenuItem>
              )}

              {/* Add Task option - only show for admins */}
              {isAdmin && (
                <DropdownMenuItem
                  onClick={handleAddTask}
                  className="flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-blue-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="font-medium text-base sm:text-sm">Add Task</span>
                </DropdownMenuItem>
              )}
              
              {/* Status options - Mobile optimized */}
              {statusOptions.map(({ status, label }) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className="flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-gray-50/80 cursor-pointer rounded-lg m-1 transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  <div
                    className={cn(
                      "w-5 h-5 sm:w-4 sm:h-4 rounded-full shadow-soft",
                      ROOM_STATUS_CONFIG[status].bgColor
                    )}
                  />
                  <span className="font-medium text-base sm:text-sm">{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
