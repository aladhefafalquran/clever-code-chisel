export interface Task {
  id: string;
  roomNumber: string;
  message: string;
  timestamp: Date;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  createdBy: string;
}

export interface ChatMessage {
  id: string;
  type: 'message' | 'task';
  sender: string;
  senderType?: 'admin' | 'housekeeper';
  content: string;
  timestamp: Date;
  task?: Task;
}

export interface SimpleChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}