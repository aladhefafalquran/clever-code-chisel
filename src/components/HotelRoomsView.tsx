
import { Room, RoomStatus } from '@/types/room';
import { RoomCard } from './RoomCard';

interface HotelRoomsViewProps {
  rooms: Room[];
  isAdmin: boolean;
  selectedRooms: string[];
  showSelection: boolean;
  onRoomStatusChange: (roomNumber: string, status: RoomStatus) => void;
  onGuestStatusChange: (roomNumber: string, hasGuests: boolean) => void;
  onRoomSelect: (roomNumber: string, selected: boolean) => void;
}

export const HotelRoomsView = ({
  rooms,
  isAdmin,
  selectedRooms,
  showSelection,
  onRoomStatusChange,
  onGuestStatusChange,
  onRoomSelect
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
    <div className="space-y-8">
      {[5, 4, 3, 2, 1].map(floor => {
        const floorRooms = roomsByFloor[floor] || [];
        if (floorRooms.length === 0) return null;

        return (
          <div key={floor} className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="bg-gray-800 text-white px-6 py-2 rounded-full text-lg font-bold">
                Floor {floor}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
              {floorRooms
                .sort((a, b) => a.number.localeCompare(b.number))
                .map(room => (
                  <RoomCard
                    key={room.number}
                    room={room}
                    isAdmin={isAdmin}
                    isSelected={selectedRooms.includes(room.number)}
                    showSelection={showSelection}
                    onStatusChange={onRoomStatusChange}
                    onGuestStatusChange={onGuestStatusChange}
                    onSelect={onRoomSelect}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
