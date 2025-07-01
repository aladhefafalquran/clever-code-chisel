
export type RoomStatus = 'checkout' | 'dirty' | 'clean' | 'default' | 'closed';

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
  checkout: {
    label: 'Checkout (Urgent)',
    color: 'text-red-800',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-600'
  },
  dirty: {
    label: 'Dirty',
    color: 'text-orange-800',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-600'
  },
  clean: {
    label: 'Clean/Ready',
    color: 'text-green-800',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-600'
  },
  default: {
    label: 'Default/No Action',
    color: 'text-blue-800',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-600'
  },
  closed: {
    label: 'Closed/Unavailable',
    color: 'text-gray-800',
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-600'
  }
};

// Helper function to get occupancy workflow priority
export const getWorkflowPriority = (room: Room): 'immediate' | 'after-checkout' | 'normal' => {
  if (!room.hasGuests && (room.status === 'dirty' || room.status === 'checkout')) {
    return 'immediate'; // Vacant + needs cleaning = immediate priority
  }
  if (room.hasGuests && (room.status === 'dirty' || room.status === 'checkout')) {
    return 'after-checkout'; // Occupied + needs cleaning = clean after checkout
  }
  return 'normal';
};
