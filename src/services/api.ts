import { Room, RoomStatus } from '@/types/room';
import { Task, ChatMessage, SimpleChatMessage } from '@/types/common';
import { StorageManager } from '@/utils/storageManager';
import { HybridStorageManager } from '@/utils/hybridStorageManager';

interface ArchivedData {
  date: string;
  summary: string;
  messages: SimpleChatMessage[];
  tasks: Task[];
  roomStates: Room[];
}

const API_BASE_URL = '/api';

// Check if backend is available
let backendAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 5000; // 5 seconds

async function checkBackendAvailability(): Promise<boolean> {
  const now = Date.now();
  
  // Only check once or if enough time has passed
  if (backendAvailable !== null && (now - lastCheckTime) < CHECK_INTERVAL) {
    return backendAvailable;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    backendAvailable = response.ok;
    lastCheckTime = now;
  } catch (error) {
    backendAvailable = false;
    lastCheckTime = now;
    console.log('Backend not available, using localStorage:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  return backendAvailable;
}

// Helper function for API requests with fallback to localStorage
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isBackendAvailable = await checkBackendAvailability();
  
  if (!isBackendAvailable) {
    // Fallback to localStorage-based operations
    return handleLocalStorageOperation<T>(endpoint, options);
  }
  
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

// localStorage fallback implementation
async function handleLocalStorageOperation<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;
  
  console.log(`Using enhanced storage for ${method} ${endpoint}`, body ? body : '');
  
  try {
    switch (endpoint) {
      case '/health':
        const status = HybridStorageManager.getStorageStatus();
        return { 
          status: 'healthy', 
          timestamp: new Date().toISOString(), 
          database: `GitHub Database (GitHub: ${status.github}, IndexedDB: ${status.indexedDB}, localStorage: ${status.localStorage})` 
        } as T;
        
      case '/rooms':
        if (method === 'GET') {
          const rooms = await HybridStorageManager.getRooms();
          return rooms as T;
        }
        break;
        
      case '/tasks':
        if (method === 'GET') {
          const tasks = await HybridStorageManager.getTasks();
          return tasks as T;
        } else if (method === 'POST') {
          const task = await HybridStorageManager.addTask(body);
          return { success: true, task } as T;
        }
        break;
        
      case '/messages':
        if (method === 'GET') {
          const messages = await HybridStorageManager.getMessages();
          return messages as T;
        } else if (method === 'POST') {
          const message = await HybridStorageManager.addMessage(body);
          return { success: true, message } as T;
        }
        break;
        
      case '/archives':
        if (method === 'GET') {
          const archives = await HybridStorageManager.getArchives();
          return archives as T;
        }
        break;
        
      case '/archive':
        if (method === 'POST') {
          await HybridStorageManager.addArchive(body);
          return { success: true, message: 'Data archived successfully' } as T;
        }
        break;
        
      default:
        // Handle room status updates and task completions
        if (endpoint.includes('/status') && method === 'PUT') {
          const roomNumber = endpoint.split('/')[2];
          await HybridStorageManager.updateRoomStatus(roomNumber, body.status);
          return { success: true, message: 'Room status updated' } as T;
        } else if (endpoint.includes('/guests') && method === 'PUT') {
          const roomNumber = endpoint.split('/')[2];
          await HybridStorageManager.updateGuestStatus(roomNumber, body.hasGuests);
          return { success: true, message: 'Guest status updated' } as T;
        } else if (endpoint.includes('/complete') && method === 'PUT') {
          const taskId = endpoint.split('/')[2];
          await HybridStorageManager.completeTask(taskId, body.completedBy);
          return { success: true, message: 'Task completed' } as T;
        } else {
          return { error: 'Operation not supported in offline mode' } as T;
        }
    }
  } catch (error) {
    console.error('Enhanced storage operation failed:', error);
    return { error: 'Storage operation failed' } as T;
  }
  
  return { error: 'Operation not supported' } as T;
}

// localStorage helper functions
async function getLocalStorageRooms() {
  const stored = await StorageManager.getItem('rooms');
  if (stored) {
    // Convert date strings back to Date objects for frontend compatibility
    return stored.map((room: any) => ({
      ...room,
      hasGuests: Boolean(room.hasGuests),
      lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : null,
      lastUpdated: new Date(room.lastUpdated)
    }));
  }
  
  // Initialize default rooms
  const defaultRooms = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (let roomNum = 1; roomNum <= 8; roomNum++) {
      const roomNumber = `${floor}0${roomNum}`;
      defaultRooms.push({
        id: (floor - 1) * 8 + roomNum,
        number: roomNumber,
        floor,
        status: 'default',
        hasGuests: false,
        lastCleaned: null,
        lastUpdated: new Date().toISOString()
      });
    }
  }
  
  await StorageManager.setItem('rooms', defaultRooms);
  // Return with proper date objects
  return defaultRooms.map((room: any) => ({
    ...room,
    lastUpdated: new Date(room.lastUpdated)
  }));
}

async function updateLocalStorageRoomStatus(roomNumber: string, status: string) {
  const stored = await StorageManager.getItem('rooms');
  if (!stored) return;
  
  const rooms = stored;
  const room = rooms.find((r: any) => r.number === roomNumber);
  if (room) {
    room.status = status;
    room.lastCleaned = status === 'clean' ? new Date().toISOString() : room.lastCleaned;
    room.lastUpdated = new Date().toISOString();
    await StorageManager.setItem('rooms', rooms);
  }
}

async function updateLocalStorageGuestStatus(roomNumber: string, hasGuests: boolean) {
  const stored = await StorageManager.getItem('rooms');
  if (!stored) return;
  
  const rooms = stored;
  const room = rooms.find((r: any) => r.number === roomNumber);
  if (room) {
    room.hasGuests = hasGuests;
    room.lastUpdated = new Date().toISOString();
    await StorageManager.setItem('rooms', rooms);
  }
}

async function getLocalStorageTasks() {
  const stored = await StorageManager.getItem('tasks');
  if (!stored) return [];
  
  // Convert date strings back to Date objects for frontend compatibility
  return stored.map((task: any) => ({
    ...task,
    timestamp: new Date(task.timestamp),
    completed: Boolean(task.completed),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined
  }));
}

async function addLocalStorageTask(task: any) {
  const stored = await StorageManager.getItem('tasks');
  const tasks = stored || [];
  
  const newTask = {
    ...task,
    id: task.id || Date.now().toString(),
    timestamp: new Date().toISOString(),
    completed: false
  };
  tasks.push(newTask);
  await StorageManager.setItem('tasks', tasks);
  
  // Return with Date object for frontend compatibility
  return {
    ...newTask,
    timestamp: new Date(newTask.timestamp)
  };
}

async function completeLocalStorageTask(taskId: string, completedBy: string) {
  const stored = await StorageManager.getItem('tasks');
  if (!stored) return;
  
  const tasks = stored;
  const task = tasks.find((t: any) => t.id === taskId);
  if (task) {
    task.completed = true;
    task.completedBy = completedBy;
    task.completedAt = new Date().toISOString();
    await StorageManager.setItem('tasks', tasks);
  }
}

async function getLocalStorageMessages() {
  const stored = await StorageManager.getItem('messages');
  if (!stored) return [];
  
  // Convert date strings back to Date objects for frontend compatibility
  return stored.map((message: any) => ({
    ...message,
    timestamp: new Date(message.timestamp)
  }));
}

async function addLocalStorageMessage(message: any) {
  const stored = await StorageManager.getItem('messages');
  const messages = stored || [];
  
  const newMessage = {
    ...message,
    id: message.id || Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  await StorageManager.setItem('messages', messages);
  
  // Return with Date object for frontend compatibility
  return {
    ...newMessage,
    timestamp: new Date(newMessage.timestamp)
  };
}

async function getLocalStorageArchives() {
  const stored = await StorageManager.getItem('archives');
  return stored || [];
}

async function addLocalStorageArchive(archiveData: any) {
  const archives = await getLocalStorageArchives();
  const newArchive = {
    id: Date.now(),
    ...archiveData,
    createdAt: new Date().toISOString()
  };
  archives.push(newArchive);
  await StorageManager.setItem('archives', archives);
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

  // Storage management
  async exportData(): Promise<string> {
    return await HybridStorageManager.exportData();
  },

  async importData(jsonData: string): Promise<boolean> {
    return await HybridStorageManager.importData(jsonData);
  },

  async getStorageInfo(): Promise<{used: number, quota: number, available: number}> {
    return StorageManager.getStorageInfo();
  },

  async clearAllData(): Promise<void> {
    await HybridStorageManager.clearAllData();
  },

  getStorageStatus(): { github: boolean, indexedDB: boolean, localStorage: boolean } {
    return HybridStorageManager.getStorageStatus();
  }
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