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

// Check if backend is available
let backendAvailable: boolean | null = null;

async function checkBackendAvailability(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    backendAvailable = response.ok;
  } catch {
    backendAvailable = false;
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
function handleLocalStorageOperation<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;
  
  return new Promise((resolve) => {
    switch (endpoint) {
      case '/health':
        resolve({ status: 'healthy', timestamp: new Date().toISOString(), database: 'localStorage' } as T);
        break;
        
      case '/rooms':
        if (method === 'GET') {
          const rooms = getLocalStorageRooms();
          resolve(rooms as T);
        }
        break;
        
      case '/tasks':
        if (method === 'GET') {
          const tasks = getLocalStorageTasks();
          resolve(tasks as T);
        } else if (method === 'POST') {
          const task = addLocalStorageTask(body);
          resolve({ success: true, task } as T);
        }
        break;
        
      case '/messages':
        if (method === 'GET') {
          const messages = getLocalStorageMessages();
          resolve(messages as T);
        } else if (method === 'POST') {
          const message = addLocalStorageMessage(body);
          resolve({ success: true, message } as T);
        }
        break;
        
      case '/archives':
        if (method === 'GET') {
          const archives = getLocalStorageArchives();
          resolve(archives as T);
        }
        break;
        
      case '/archive':
        if (method === 'POST') {
          addLocalStorageArchive(body);
          resolve({ success: true, message: 'Data archived successfully' } as T);
        }
        break;
        
      default:
        // Handle room status updates and task completions
        if (endpoint.includes('/status') && method === 'PUT') {
          const roomNumber = endpoint.split('/')[2];
          updateLocalStorageRoomStatus(roomNumber, body.status);
          resolve({ success: true, message: 'Room status updated' } as T);
        } else if (endpoint.includes('/guests') && method === 'PUT') {
          const roomNumber = endpoint.split('/')[2];
          updateLocalStorageGuestStatus(roomNumber, body.hasGuests);
          resolve({ success: true, message: 'Guest status updated' } as T);
        } else if (endpoint.includes('/complete') && method === 'PUT') {
          const taskId = endpoint.split('/')[2];
          completeLocalStorageTask(taskId, body.completedBy);
          resolve({ success: true, message: 'Task completed' } as T);
        } else {
          resolve({ error: 'Operation not supported in offline mode' } as T);
        }
    }
  });
}

// localStorage helper functions
function getLocalStorageRooms() {
  const stored = localStorage.getItem('housekeeping_rooms');
  if (stored) return JSON.parse(stored);
  
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
  
  localStorage.setItem('housekeeping_rooms', JSON.stringify(defaultRooms));
  return defaultRooms;
}

function updateLocalStorageRoomStatus(roomNumber: string, status: string) {
  const rooms = getLocalStorageRooms();
  const room = rooms.find((r: any) => r.number === roomNumber);
  if (room) {
    room.status = status;
    room.lastCleaned = status === 'clean' ? new Date().toISOString() : room.lastCleaned;
    room.lastUpdated = new Date().toISOString();
    localStorage.setItem('housekeeping_rooms', JSON.stringify(rooms));
  }
}

function updateLocalStorageGuestStatus(roomNumber: string, hasGuests: boolean) {
  const rooms = getLocalStorageRooms();
  const room = rooms.find((r: any) => r.number === roomNumber);
  if (room) {
    room.hasGuests = hasGuests;
    room.lastUpdated = new Date().toISOString();
    localStorage.setItem('housekeeping_rooms', JSON.stringify(rooms));
  }
}

function getLocalStorageTasks() {
  const stored = localStorage.getItem('housekeeping_tasks');
  return stored ? JSON.parse(stored) : [];
}

function addLocalStorageTask(task: any) {
  const tasks = getLocalStorageTasks();
  const newTask = {
    ...task,
    id: task.id || Date.now().toString(),
    timestamp: new Date().toISOString(),
    completed: false
  };
  tasks.push(newTask);
  localStorage.setItem('housekeeping_tasks', JSON.stringify(tasks));
  return newTask;
}

function completeLocalStorageTask(taskId: string, completedBy: string) {
  const tasks = getLocalStorageTasks();
  const task = tasks.find((t: any) => t.id === taskId);
  if (task) {
    task.completed = true;
    task.completedBy = completedBy;
    task.completedAt = new Date().toISOString();
    localStorage.setItem('housekeeping_tasks', JSON.stringify(tasks));
  }
}

function getLocalStorageMessages() {
  const stored = localStorage.getItem('housekeeping_messages');
  return stored ? JSON.parse(stored) : [];
}

function addLocalStorageMessage(message: any) {
  const messages = getLocalStorageMessages();
  const newMessage = {
    ...message,
    id: message.id || Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  localStorage.setItem('housekeeping_messages', JSON.stringify(messages));
  return newMessage;
}

function getLocalStorageArchives() {
  const stored = localStorage.getItem('housekeeping_archives');
  return stored ? JSON.parse(stored) : [];
}

function addLocalStorageArchive(archiveData: any) {
  const archives = getLocalStorageArchives();
  const newArchive = {
    id: Date.now(),
    ...archiveData,
    createdAt: new Date().toISOString()
  };
  archives.push(newArchive);
  localStorage.setItem('housekeeping_archives', JSON.stringify(archives));
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