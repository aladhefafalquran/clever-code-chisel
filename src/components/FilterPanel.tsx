
import { Button } from '@/components/ui/button';
import { RoomStatus } from '@/types/room';

interface FilterPanelProps {
  activeFilter: RoomStatus | 'all';
  onFilterChange: (filter: RoomStatus | 'all') => void;
  roomCounts: Record<RoomStatus | 'all', number>;
}

export const FilterPanel = ({ activeFilter, onFilterChange, roomCounts }: FilterPanelProps) => {
  const filters = [
    { key: 'all' as const, label: 'All Rooms', color: 'bg-gray-500' },
    { key: 'dirty' as const, label: 'Dirty', color: 'bg-red-500' },
    { key: 'clean' as const, label: 'Clean', color: 'bg-green-500' },
    { key: 'default' as const, label: 'Default', color: 'bg-blue-500' },
    { key: 'overdue' as const, label: 'Overdue', color: 'bg-gray-400' }
  ];

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm border">
      {filters.map(filter => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className="flex items-center gap-2"
        >
          <div className={`w-3 h-3 rounded-full ${filter.color}`} />
          {filter.label} ({roomCounts[filter.key] || 0})
        </Button>
      ))}
    </div>
  );
};
