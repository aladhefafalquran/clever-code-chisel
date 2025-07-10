
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomStatus } from '@/types/room';

const generateRooms = (): Room[] => {
  console.log('🏨 Starting room generation...');
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
  
  console.log('🏨 Generated rooms:', rooms.length, 'rooms created');
  console.log('🏨 First few rooms:', rooms.slice(0, 3));
  return rooms;
};

const checkOverdueRooms = (rooms: Room[]): Room[] => {
  console.log('🕒 Checking overdue rooms for', rooms.length, 'rooms');
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
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeRooms = useCallback(() => {
    console.log('🚀 FORCE INITIALIZE ROOMS CALLED - Starting initialization...');
    
    try {
      // Force generate new rooms
      const newRooms = generateRooms();
      console.log('🚀 Generated new rooms:', newRooms.length);
      
      // Save to localStorage
      try {
        localStorage.setItem('hotelRooms', JSON.stringify(newRooms));
        console.log('🚀 Saved rooms to localStorage successfully');
      } catch (storageError) {
        console.error('🚀 Failed to save to localStorage:', storageError);
      }
      
      // Update state
      setRooms(newRooms);
      setIsInitialized(true);
      console.log('🚀 FORCE INITIALIZE COMPLETED - Rooms set in state:', newRooms.length);
      
    } catch (error) {
      console.error('🚀 FORCE INITIALIZE FAILED:', error);
    }
  }, []);

  const loadRooms = useCallback(() => {
    console.log('📥 LOAD ROOMS CALLED - Starting room loading...');
    
    try {
      const savedRooms = localStorage.getItem('hotelRooms');
      console.log('📥 Retrieved from localStorage:', savedRooms ? 'data found' : 'no data');
      
      if (savedRooms) {
        try {
          const parsedRooms = JSON.parse(savedRooms).map((room: any) => ({
            ...room,
            lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : null,
            lastUpdated: new Date(room.lastUpdated)
          }));
          console.log('📥 Parsed rooms from localStorage:', parsedRooms.length);
          
          const checkedRooms = checkOverdueRooms(parsedRooms);
          setRooms(checkedRooms);
          setIsInitialized(true);
          console.log('📥 LOAD ROOMS COMPLETED - Loaded existing rooms:', checkedRooms.length);
          return true;
        } catch (parseError) {
          console.error('📥 Error parsing saved rooms:', parseError);
          return false;
        }
      } else {
        console.log('📥 No saved rooms found in localStorage');
        return false;
      }
    } catch (error) {
      console.error('📥 LOAD ROOMS FAILED:', error);
      return false;
    }
  }, []);

  // Auto-initialize rooms on mount with better error handling
  useEffect(() => {
    console.log('🎯 useEffect TRIGGERED - Auto-initializing rooms...');
    
    if (isInitialized) {
      console.log('🎯 Already initialized, skipping');
      return;
    }

    // Try to load existing rooms first
    const loaded = loadRooms();
    
    if (!loaded) {
      console.log('🎯 No existing rooms found, generating new ones...');
      // Generate new rooms if no saved rooms exist
      const newRooms = generateRooms();
      
      try {
        localStorage.setItem('hotelRooms', JSON.stringify(newRooms));
        console.log('🎯 Saved new rooms to localStorage');
      } catch (storageError) {
        console.error('🎯 Failed to save new rooms to localStorage:', storageError);
      }
      
      setRooms(newRooms);
      setIsInitialized(true);
      console.log('🎯 AUTO-INITIALIZE COMPLETED - New rooms created:', newRooms.length);
    }
  }, [loadRooms, isInitialized]);

  const saveRooms = useCallback((updatedRooms: Room[]) => {
    try {
      localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms));
      console.log('💾 Saved', updatedRooms.length, 'rooms to localStorage');
    } catch (error) {
      console.error('💾 Failed to save rooms:', error);
    }
  }, []);

  const updateRoomStatus = useCallback((roomNumber: string, status: RoomStatus) => {
    console.log('🔄 Updating room status:', roomNumber, status);
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
    console.log('👥 Updating guest status:', roomNumber, hasGuests);
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

  console.log('🏨 useRoomStore render - Current rooms:', rooms.length, 'Initialized:', isInitialized);

  return {
    rooms,
    updateRoomStatus,
    updateGuestStatus,
    initializeRooms
  };
};
