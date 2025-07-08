
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomStatus } from '@/types/room';

const generateRooms = (): Room[] => {
  const rooms: Room[] = [];
  
  // Generate 5 floors with 8 rooms each
  for (let floor = 1; floor <= 5; floor++) {
    for (let roomNum = 1; roomNum <= 8; roomNum++) {
      const roomNumber = `${floor}0${roomNum}`;
      rooms.push({
        number: roomNumber,
        floor,
        status: 'default',
        hasGuests: false,
        lastCleaned: null,
        lastUpdated: new Date()
      });
    }
  }
  
  console.log('Generated rooms:', rooms.length, rooms);
  return rooms;
};

const checkOverdueRooms = (rooms: Room[]): Room[] => {
  const now = new Date();
  const overdueThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  return rooms.map(room => {
    if (room.lastCleaned && room.status !== 'dirty') {
      const timeSinceLastCleaned = now.getTime() - room.lastCleaned.getTime();
      if (timeSinceLastCleaned > overdueThreshold) {
        return { ...room, status: 'overdue' as RoomStatus };
      }
    }
    return room;
  });
};

export const useRoomStore = () => {
  const [rooms, setRooms] = useState<Room[]>([]);

  const initializeRooms = useCallback(() => {
    console.log('Initializing rooms...');
    const savedRooms = localStorage.getItem('hotelRooms');
    
    if (savedRooms) {
      try {
        const parsedRooms = JSON.parse(savedRooms).map((room: any) => ({
          ...room,
          lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : null,
          lastUpdated: new Date(room.lastUpdated)
        }));
        console.log('Loaded rooms from localStorage:', parsedRooms.length);
        const checkedRooms = checkOverdueRooms(parsedRooms);
        setRooms(checkedRooms);
      } catch (error) {
        console.error('Error parsing saved rooms:', error);
        const newRooms = generateRooms();
        setRooms(newRooms);
        localStorage.setItem('hotelRooms', JSON.stringify(newRooms));
      }
    } else {
      console.log('No saved rooms found, generating new ones');
      const newRooms = generateRooms();
      setRooms(newRooms);
      localStorage.setItem('hotelRooms', JSON.stringify(newRooms));
    }
  }, []);

  // Auto-initialize rooms on mount
  useEffect(() => {
    initializeRooms();
  }, [initializeRooms]);

  const saveRooms = useCallback((updatedRooms: Room[]) => {
    localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms));
  }, []);

  const updateRoomStatus = useCallback((roomNumber: string, status: RoomStatus) => {
    console.log('Updating room status:', roomNumber, status);
    setRooms(prevRooms => {
      const updatedRooms = prevRooms.map(room => {
        if (room.number === roomNumber) {
          const updatedRoom = {
            ...room,
            status,
            lastCleaned: status === 'clean' ? new Date() : room.lastCleaned,
            lastUpdated: new Date()
          };
          return updatedRoom;
        }
        return room;
      });
      
      const checkedRooms = checkOverdueRooms(updatedRooms);
      saveRooms(checkedRooms);
      return checkedRooms;
    });
  }, [saveRooms]);

  const updateGuestStatus = useCallback((roomNumber: string, hasGuests: boolean) => {
    console.log('Updating guest status:', roomNumber, hasGuests);
    setRooms(prevRooms => {
      const updatedRooms = prevRooms.map(room => {
        if (room.number === roomNumber) {
          return {
            ...room,
            hasGuests,
            lastUpdated: new Date()
          };
        }
        return room;
      });
      
      saveRooms(updatedRooms);
      return updatedRooms;
    });
  }, [saveRooms]);

  console.log('Current rooms in store:', rooms.length);

  return {
    rooms,
    updateRoomStatus,
    updateGuestStatus,
    initializeRooms
  };
};
