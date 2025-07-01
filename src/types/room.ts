
export type RoomStatus = 'clean' | 'dirty' | 'default' | 'overdue';

export interface Room {
  number: string;
  floor: number;
  status: RoomStatus;
  hasGuests: boolean;
  lastCleaned: Date | null;
  lastUpdated: Date;
}

export interface RoomStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ROOM_STATUS_CONFIG: Record<RoomStatus, RoomStatusConfig> = {
  clean: {
    label: 'Clean/Ready',
    color: 'text-green-800',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-600'
  },
  dirty: {
    label: 'Dirty/Needs Cleaning',
    color: 'text-red-800',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-600'
  },
  default: {
    label: 'Default/No Action',
    color: 'text-blue-800',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-600'
  },
  overdue: {
    label: 'Overdue for Cleaning',
    color: 'text-gray-800',
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-600'
  }
};
