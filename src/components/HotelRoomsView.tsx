
import { Room, RoomStatus } from '@/types/room';
import { RoomCard } from './RoomCard';

interface HotelRoomsViewProps {
  rooms: Room[];
  isAdmin: boolean;
  selectedRooms: string[];
  showSelection: boolean;
  roomTasks: Record<string, boolean>;
  onRoomStatusChange: (roomNumber: string, status: RoomStatus) => void;
  onGuestStatusChange: (roomNumber: string, hasGuests: boolean) => void;
  onRoomSelect: (roomNumber: string, selected: boolean) => void;
  onAddTask: (roomNumber: string) => void;
}

export const HotelRoomsView = ({
  rooms,
  isAdmin,
  selectedRooms,
  showSelection,
  roomTasks,
  onRoomStatusChange,
  onGuestStatusChange,
  onRoomSelect,
  onAddTask
}: HotelRoomsViewProps) => {
  // Group rooms by floor
  const roomsByFloor = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) {
      acc[room.floor] = [];
    }
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  return (
    <div className="space-y-8 sm:space-y-10">
      {[5, 4, 3, 2, 1].map(floor => {
        const floorRooms = roomsByFloor[floor] || [];
        if (floorRooms.length === 0) return null;

        return (
          <div key={floor} className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-center">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-6 py-3 sm:px-8 sm:py-3 rounded-2xl text-lg font-bold shadow-elevated border border-gray-600/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  Floor {floor}
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* Mobile-first responsive grid - 2 columns on mobile, more on larger screens */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6">
              {floorRooms
                .sort((a, b) => a.number.localeCompare(b.number))
                .map(room => (
                  <RoomCard
                    key={room.number}
                    room={room}
                    isAdmin={isAdmin}
                    isSelected={selectedRooms.includes(room.number)}
                    showSelection={showSelection}
                    hasTask={roomTasks[room.number] || false}
                    onStatusChange={onRoomStatusChange}
                    onGuestStatusChange={onGuestStatusChange}
                    onSelect={onRoomSelect}
                    onAddTask={onAddTask}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
