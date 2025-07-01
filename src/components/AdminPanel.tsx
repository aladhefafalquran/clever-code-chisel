
import { Room } from '@/types/room';
import { Card } from '@/components/ui/card';

interface AdminPanelProps {
  rooms: Room[];
}

export const AdminPanel = ({ rooms }: AdminPanelProps) => {
  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.hasGuests).length,
    clean: rooms.filter(r => r.status === 'clean').length,
    dirty: rooms.filter(r => r.status === 'dirty').length,
    overdue: rooms.filter(r => r.status === 'overdue').length
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        <div className="text-sm text-gray-600">Total Rooms</div>
      </Card>
      
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
        <div className="text-sm text-gray-600">Occupied</div>
      </Card>
      
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-green-600">{stats.clean}</div>
        <div className="text-sm text-gray-600">Clean</div>
      </Card>
      
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-red-600">{stats.dirty}</div>
        <div className="text-sm text-gray-600">Dirty</div>
      </Card>
      
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-gray-600">{stats.overdue}</div>
        <div className="text-sm text-gray-600">Overdue</div>
      </Card>
    </div>
  );
};
