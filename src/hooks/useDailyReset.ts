import { useCallback, useEffect } from 'react';
import { Room, RoomStatus } from '@/types/room';
import { formatDate } from '@/utils/dateUtils';

interface DailyResetData {
  date: string;
  summary: string;
  messages: any[];
  tasks: any[];
  roomStates: Room[];
}

export const useDailyReset = () => {
  const checkAndPerformReset = useCallback(() => {
    const today = formatDate(new Date());
    const lastResetDate = localStorage.getItem('lastResetDate');
    
    if (lastResetDate !== today) {
      performDailyReset();
    }
  }, []);

  const performDailyReset = useCallback(() => {
    console.log('Performing daily reset...');
    
    // Get current data
    const currentMessages = JSON.parse(localStorage.getItem('hotelChatMessages') || '[]');
    const currentTasks = JSON.parse(localStorage.getItem('hotelTasks') || '[]');
    const currentRooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]');
    
    // Calculate summary
    const completedTasks = currentTasks.filter((task: any) => task.completed);
    const cleanedRooms = currentRooms.filter((room: any) => room.status === 'clean');
    const summary = `Day completed: ${cleanedRooms.length} rooms cleaned, ${completedTasks.length} tasks completed`;
    
    // Archive previous day's data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const archiveData: DailyResetData = {
      date: formatDate(yesterday),
      summary,
      messages: currentMessages,
      tasks: currentTasks,
      roomStates: currentRooms
    };
    
    // Save to archives
    const existingArchives = JSON.parse(localStorage.getItem('hotelArchives') || '[]');
    const updatedArchives = [...existingArchives, archiveData];
    
    // Keep only last 30 days of archives
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filteredArchives = updatedArchives.filter(archive => 
      new Date(archive.date) >= thirtyDaysAgo
    );
    
    localStorage.setItem('hotelArchives', JSON.stringify(filteredArchives));
    
    // Reset room statuses (smart logic)
    const resetRooms = currentRooms.map((room: Room) => ({
      ...room,
      status: room.status === 'checkout' ? 'checkout' : 'default' as RoomStatus,
      // Keep occupancy status and guest information
      lastUpdated: new Date()
    }));
    
    // Carry over pending tasks
    const pendingTasks = currentTasks.filter((task: any) => !task.completed);
    
    // Clear completed tasks and messages, keep pending tasks
    localStorage.setItem('hotelRooms', JSON.stringify(resetRooms));
    localStorage.setItem('hotelTasks', JSON.stringify(pendingTasks));
    localStorage.setItem('hotelChatMessages', JSON.stringify([]));
    
    // Add reset notification to new day's chat
    const resetMessage = {
      id: Date.now().toString(),
      type: 'message',
      sender: 'admin',
      content: `🌅 New day started! ${summary}. ${pendingTasks.length} tasks carried over.`,
      timestamp: new Date()
    };
    localStorage.setItem('hotelChatMessages', JSON.stringify([resetMessage]));
    
    // Update reset date
    localStorage.setItem('lastResetDate', formatDate(new Date()));
    
    console.log('Daily reset completed successfully');
  }, []);

  const manualReset = useCallback(() => {
    const confirmation = window.confirm('Are you sure you want to perform a manual daily reset? This will archive current data and reset room statuses.');
    if (confirmation) {
      performDailyReset();
      window.location.reload(); // Refresh to show new state
    }
  }, [performDailyReset]);

  // Check for reset on component mount and every minute
  useEffect(() => {
    checkAndPerformReset();
    
    const interval = setInterval(() => {
      checkAndPerformReset();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkAndPerformReset]);

  return {
    manualReset,
    performDailyReset
  };
};
