import { Room, RoomStatus } from '@/types/room';
import { Task, ChatMessage, SimpleChatMessage } from '@/types/common';

interface ArchivedData {
  date: string;
  summary: string;
  messages: SimpleChatMessage[];
  tasks: Task[];
  roomStates: Room[];
}

const API_BASE_URL = '/api';

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// API service object
export const apiService = {
  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    return apiRequest<{ status: string; timestamp: string; database: string }>('/health');
  },

  // Room operations
  async getRooms(): Promise<Room[]> {
    return apiRequest<Room[]>('/rooms');
  },

  async updateRoomStatus(roomNumber: string, status: RoomStatus): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/rooms/${roomNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async updateGuestStatus(roomNumber: string, hasGuests: boolean): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/rooms/${roomNumber}/guests`, {
      method: 'PUT',
      body: JSON.stringify({ hasGuests }),
    });
  },

  // Task operations
  async getTasks(): Promise<Task[]> {
    return apiRequest<Task[]>('/tasks');
  },

  async addTask(task: Omit<Task, 'timestamp'>): Promise<{ success: boolean; task: Task }> {
    return apiRequest<{ success: boolean; task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async completeTask(taskId: string, completedBy: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/tasks/${taskId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completedBy }),
    });
  },

  // Message operations
  async getMessages(): Promise<ChatMessage[]> {
    return apiRequest<ChatMessage[]>('/messages');
  },

  async addMessage(message: Omit<ChatMessage, 'timestamp'>): Promise<{ success: boolean; message: ChatMessage }> {
    return apiRequest<{ success: boolean; message: ChatMessage }>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  },

  // Archive operations
  async getArchives(): Promise<ArchivedData[]> {
    return apiRequest<ArchivedData[]>('/archives');
  },

  async archiveData(date: string, summary: string, data: ArchivedData): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/archive', {
      method: 'POST',
      body: JSON.stringify({ date, summary, data }),
    });
  },
};

// Connection status checker
export async function checkConnection(): Promise<boolean> {
  try {
    await apiService.healthCheck();
    return true;
  } catch (error) {
    console.error('API connection failed:', error);
    return false;
  }
}

// Error handler for API calls
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}