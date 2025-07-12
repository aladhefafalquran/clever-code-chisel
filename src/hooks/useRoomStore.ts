
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomStatus } from '@/types/room';
import { apiService, handleApiError } from '@/services/api';

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
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    console.log('📥 LOADING ROOMS FROM API...');
    console.log('📥 API URL will be: /api/rooms');
    
    try {
      const roomsFromApi = await apiService.getRooms();
      console.log('📥 Loaded rooms from API SUCCESS:', roomsFromApi.length, roomsFromApi);
      
      const checkedRooms = checkOverdueRooms(roomsFromApi);
      setRooms(checkedRooms);
      setIsInitialized(true);
      setError(null);
      console.log('📥 LOAD ROOMS COMPLETED - API rooms loaded:', checkedRooms.length);
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('📥 LOAD ROOMS FAILED WITH ERROR:', error);
      console.error('📥 Error message:', errorMessage);
      setError(errorMessage);
      
      // Generate default rooms if API fails - no localStorage fallback
      console.log('📥 API failed, generating default rooms...');
      const newRooms = generateRooms();
      setRooms(newRooms);
      setIsInitialized(true);
      console.log('📥 Generated new rooms due to API failure:', newRooms.length);
      return true;
    }
  }, []);


  const initializeRooms = useCallback(async () => {
    console.log('🚀 FORCE REINITIALIZE ROOMS...');
    setIsInitialized(false);
    await loadRooms();
  }, [loadRooms]);

  // Auto-initialize rooms on mount
  useEffect(() => {
    console.log('🎯 useEffect TRIGGERED - Auto-initializing rooms...');
    
    if (isInitialized) {
      console.log('🎯 Already initialized, skipping');
      return;
    }

    loadRooms();
  }, [loadRooms, isInitialized]);

  const updateRoomStatus = useCallback(async (roomNumber: string, status: RoomStatus) => {
    console.log('🔄 Updating room status via API:', roomNumber, status);
    console.log('🔄 API URL will be: /api/rooms/' + roomNumber + '/status');
    
    try {
      // Update via API first
      const result = await apiService.updateRoomStatus(roomNumber, status);
      console.log('🔄 Room status API call SUCCESS:', result);
      
      // Update local state optimistically
      setRooms(prevRooms => {
        const updatedRooms = prevRooms.map(room => {
          if (room.number === roomNumber) {
            return {
              ...room,
              status,
              lastCleaned: status === 'clean' ? new Date() : room.lastCleaned,
              lastUpdated: new Date()
            };
          }
          return room;
        });
        
        // No longer saving to localStorage - database is source of truth
        console.log('🔄 Local state updated successfully');
        return checkOverdueRooms(updatedRooms);
      });
      
      setError(null);
      
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('🔄 Failed to update room status via API:', error);
      console.error('🔄 Error message:', errorMessage);
      setError(errorMessage);
      
      // Update local state optimistically even if API fails
      setRooms(prevRooms => {
        const updatedRooms = prevRooms.map(room => {
          if (room.number === roomNumber) {
            return {
              ...room,
              status,
              lastCleaned: status === 'clean' ? new Date() : room.lastCleaned,
              lastUpdated: new Date()
            };
          }
          return room;
        });
        console.log('🔄 Local state updated despite API failure');
        return checkOverdueRooms(updatedRooms);
      });
    }
  }, []);

  const updateGuestStatus = useCallback(async (roomNumber: string, hasGuests: boolean) => {
    console.log('👥 Updating guest status via API:', roomNumber, hasGuests);
    
    try {
      // Update via API first
      await apiService.updateGuestStatus(roomNumber, hasGuests);
      
      // Update local state optimistically
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
        
        // No longer saving to localStorage - database is source of truth
        return updatedRooms;
      });
      
      setError(null);
      
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('👥 Failed to update guest status via API:', errorMessage);
      setError(errorMessage);
      
      // Update local state optimistically even if API fails
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
        return updatedRooms;
      });
    }
  }, []);

  console.log('🏨 useRoomStore render - Current rooms:', rooms.length, 'Initialized:', isInitialized, 'Error:', error);

  return {
    rooms,
    updateRoomStatus,
    updateGuestStatus,
    initializeRooms,
    error,
    isInitialized
  };
};
