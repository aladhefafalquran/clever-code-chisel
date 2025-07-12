import { useCallback, useEffect } from 'react';
import { Room, RoomStatus } from '@/types/room';
import { Task, SimpleChatMessage } from '@/types/common';
import { formatDate } from '@/utils/dateUtils';
import { apiService, handleApiError } from '@/services/api';

interface DailyResetData {
  date: string;
  summary: string;
  messages: SimpleChatMessage[];
  tasks: Task[];
  roomStates: Room[];
}

export const useDailyReset = () => {
  const performDailyReset = useCallback(async () => {
    console.log('Performing daily reset...');
    
    try {
      // Get current data from API
      const currentMessages = await apiService.getMessages();
      const currentTasks = await apiService.getTasks();
      const currentRooms = await apiService.getRooms();
      
      // Calculate summary
      const completedTasks = currentTasks.filter((task: Task) => task.completed);
      const cleanedRooms = currentRooms.filter((room: Room) => room.status === 'clean');
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
      
      // Save to archives via API
      await apiService.archiveData(formatDate(yesterday), summary, archiveData);
      
      // Reset room statuses (smart logic) - would need API endpoint
      const resetRooms = currentRooms.map((room: Room) => ({
        ...room,
        status: room.status === 'checkout' ? 'checkout' : 'default' as RoomStatus,
        lastUpdated: new Date()
      }));
      
      // For now, reset rooms individually via existing API
      for (const room of resetRooms) {
        if (room.status !== currentRooms.find(r => r.number === room.number)?.status) {
          await apiService.updateRoomStatus(room.number, room.status);
        }
      }
      
      // Add reset notification to new day's chat
      const resetMessageData = {
        id: Date.now().toString(),
        type: 'message' as const,
        sender: 'System',
        senderType: 'admin' as const,
        content: `🌅 New day started! ${summary}. Data archived successfully.`
      };
      
      await apiService.addMessage(resetMessageData);
      
      // Store reset date in sessionStorage for current session tracking
      sessionStorage.setItem('lastResetDate', formatDate(new Date()));
      
      console.log('Daily reset completed successfully');
      
    } catch (error) {
      console.error('Daily reset failed:', handleApiError(error));
    }
  }, []);

  const checkAndPerformReset = useCallback(() => {
    const today = formatDate(new Date());
    const lastResetDate = sessionStorage.getItem('lastResetDate');
    
    if (lastResetDate !== today) {
      performDailyReset();
    }
  }, [performDailyReset]);

  const manualReset = useCallback(async () => {
    const confirmation = window.confirm('Are you sure you want to perform a manual daily reset? This will archive current data and reset room statuses.');
    if (confirmation) {
      await performDailyReset();
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
