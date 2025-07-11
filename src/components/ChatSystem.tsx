
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Send, CheckCircle, Clock, User, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUserContext';

interface Task {
  id: string;
  roomNumber: string;
  message: string;
  timestamp: Date;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  createdBy: string;
}

interface ChatMessage {
  id: string;
  type: 'message' | 'task';
  sender: string;
  senderType: 'admin' | 'housekeeper';
  content: string;
  timestamp: Date;
  task?: Task;
}

interface ChatSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (roomNumber: string, hasTask: boolean) => void;
}

export const ChatSystem = ({ isOpen, onClose, onTaskUpdate }: ChatSystemProps) => {
  const { currentUser, isAdmin } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

  console.log('ChatSystem - currentUser:', currentUser);
  console.log('ChatSystem - isAdmin:', isAdmin);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('hotelChatMessages');
    const savedTasks = localStorage.getItem('hotelTasks');
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          task: msg.task ? {
            ...msg.task,
            timestamp: new Date(msg.task.timestamp),
            completedAt: msg.task.completedAt ? new Date(msg.task.completedAt) : undefined
          } : undefined
        }));
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    }
    
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks).map((task: any) => ({
          ...task,
          timestamp: new Date(task.timestamp),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined
        }));
        setTasks(parsedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    }
  }, []);

  // Handle task events from other components
  useEffect(() => {
    const handleAddTask = (event: CustomEvent) => {
      const { roomNumber, message } = event.detail;
      if (currentUser) {
        addTask(roomNumber, message);
      }
    };

    window.addEventListener('addTask', handleAddTask as EventListener);
    return () => window.removeEventListener('addTask', handleAddTask as EventListener);
  }, [currentUser]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('hotelChatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save tasks and update room indicators
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('hotelTasks', JSON.stringify(tasks));
    }
    
    // Update room task indicators
    const tasksByRoom = tasks.reduce((acc, task) => {
      acc[task.roomNumber] = !task.completed;
      return acc;
    }, {} as Record<string, boolean>);
    
    // Notify parent about task status changes
    Object.keys(tasksByRoom).forEach(roomNumber => {
      onTaskUpdate(roomNumber, tasksByRoom[roomNumber]);
    });
    
    // Also notify about rooms that no longer have tasks
    const allRoomNumbers = ['101', '102', '103', '104', '105', '106', '107', '108',
                           '201', '202', '203', '204', '205', '206', '207', '208',
                           '301', '302', '303', '304', '305', '306', '307', '308',
                           '401', '402', '403', '404', '405', '406', '407', '408',
                           '501', '502', '503', '504', '505', '506', '507', '508'];
    
    allRoomNumbers.forEach(roomNumber => {
      if (!tasksByRoom[roomNumber]) {
        onTaskUpdate(roomNumber, false);
      }
    });
  }, [tasks, onTaskUpdate]);

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser) {
      console.log('Cannot send message - missing message or user:', { message: newMessage.trim(), user: currentUser });
      return;
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'message',
      sender: currentUser.name,
      senderType: currentUser.type,
      content: newMessage,
      timestamp: new Date()
    };

    console.log('Sending message:', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const addTask = (roomNumber: string, taskMessage: string) => {
    if (!currentUser) {
      console.log('Cannot add task - no current user');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      roomNumber,
      message: taskMessage,
      timestamp: new Date(),
      completed: false,
      createdBy: currentUser.name
    };

    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'task',
      sender: currentUser.name,
      senderType: currentUser.type,
      content: `🏠 Room ${roomNumber}: ${taskMessage}`,
      timestamp: new Date(),
      task
    };

    setTasks(prev => [...prev, task]);
    setMessages(prev => [...prev, message]);
  };

  const completeTask = (taskId: string) => {
    if (!currentUser) return;

    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: true, completedBy: currentUser.name, completedAt: new Date() }
        : task
    ));

    setMessages(prev => prev.map(msg => 
      msg.task?.id === taskId 
        ? { ...msg, task: { ...msg.task, completed: true, completedBy: currentUser.name, completedAt: new Date() } }
        : msg
    ));

    // Find the task to get room number for notification
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        type: 'message',
        sender: currentUser.name,
        senderType: currentUser.type,
        content: `✅ Task completed for Room ${task.roomNumber}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
    }
  };

  const undoTaskCompletion = (taskId: string) => {
    if (!currentUser) return;

    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: false, completedBy: undefined, completedAt: undefined }
        : task
    ));

    setMessages(prev => prev.map(msg => 
      msg.task?.id === taskId 
        ? { ...msg, task: { ...msg.task, completed: false, completedBy: undefined, completedAt: undefined } }
        : msg
    ));

    // Find the task to get room number for notification
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        type: 'message',
        sender: currentUser.name,
        senderType: currentUser.type,
        content: `↩️ Task reopened for Room ${task.roomNumber}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
    }
  };

  const getSenderColor = (sender: string): string => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-50 border-red-200',
      'HK1': 'bg-blue-50 border-blue-200',
      'HK2': 'bg-green-50 border-green-200',
      'HK3': 'bg-purple-50 border-purple-200',
      'HK4': 'bg-orange-50 border-orange-200'
    };
    return colors[sender] || 'bg-gray-50 border-gray-200';
  };

  const getSenderAvatarColor = (sender: string): string => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-500',
      'HK1': 'bg-blue-500',
      'HK2': 'bg-green-500',
      'HK3': 'bg-purple-500',
      'HK4': 'bg-orange-500'
    };
    return colors[sender] || 'bg-gray-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h2 className="text-xl font-bold">Hotel Communication & Tasks</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start a conversation or add tasks to rooms!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg border",
                  getSenderColor(message.sender)
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                  getSenderAvatarColor(message.sender)
                )}>
                  {message.sender === 'Admin' ? 'A' : message.sender.slice(-1)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {message.sender}
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-gray-800">{message.content}</div>
                  
                  {/* Task completion checkbox */}
                  {message.type === 'task' && message.task && !message.task.completed && !isAdmin && currentUser && (
                    <div className="mt-2 flex items-center gap-2">
                      <Checkbox
                        id={`task-${message.task.id}`}
                        onCheckedChange={() => completeTask(message.task!.id)}
                      />
                      <label
                        htmlFor={`task-${message.task.id}`}
                        className="text-sm text-green-600 cursor-pointer"
                      >
                        Mark as Complete
                      </label>
                    </div>
                  )}
                  
                  {/* Completed task indicator with undo button */}
                  {message.type === 'task' && message.task && message.task.completed && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Completed by {message.task.completedBy} at {message.task.completedAt?.toLocaleTimeString()}
                        </span>
                      </div>
                      {!isAdmin && currentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => undoTaskCompletion(message.task!.id)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 h-auto"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Undo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          {currentUser ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Type your message as ${currentUser.name}...`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Please log in to send messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
