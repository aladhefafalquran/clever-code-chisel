
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Send, CheckCircle, Clock, User, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  roomNumber: string;
  message: string;
  timestamp: Date;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

interface ChatMessage {
  id: string;
  type: 'message' | 'task';
  sender: 'admin' | 'housekeeping';
  content: string;
  timestamp: Date;
  task?: Task;
}

interface ChatSystemProps {
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (roomNumber: string, hasTask: boolean) => void;
}

export const ChatSystem = ({ isAdmin, isOpen, onClose, onTaskUpdate }: ChatSystemProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

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
      addTask(roomNumber, message);
    };

    window.addEventListener('addTask', handleAddTask as EventListener);
    return () => window.removeEventListener('addTask', handleAddTask as EventListener);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hotelChatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('hotelTasks', JSON.stringify(tasks));
    
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
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'message',
      sender: isAdmin ? 'admin' : 'housekeeping',
      content: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const addTask = (roomNumber: string, taskMessage: string) => {
    const task: Task = {
      id: Date.now().toString(),
      roomNumber,
      message: taskMessage,
      timestamp: new Date(),
      completed: false
    };

    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'task',
      sender: 'admin',
      content: `🏠 Room ${roomNumber}: ${taskMessage}`,
      timestamp: new Date(),
      task
    };

    setTasks(prev => [...prev, task]);
    setMessages(prev => [...prev, message]);
  };

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: true, completedBy: 'housekeeping', completedAt: new Date() }
        : task
    ));

    setMessages(prev => prev.map(msg => 
      msg.task?.id === taskId 
        ? { ...msg, task: { ...msg.task, completed: true, completedBy: 'housekeeping', completedAt: new Date() } }
        : msg
    ));

    // Find the task to get room number for notification
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        type: 'message',
        sender: 'housekeeping',
        content: `✅ Task completed for Room ${task.roomNumber}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
    }
  };

  const undoTaskCompletion = (taskId: string) => {
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
        sender: 'housekeeping',
        content: `↩️ Task reopened for Room ${task.roomNumber}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
    }
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
                  "flex gap-3 p-3 rounded-lg",
                  message.sender === 'admin' ? "bg-blue-50" : "bg-green-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                  message.sender === 'admin' ? "bg-blue-500" : "bg-green-500"
                )}>
                  {message.sender === 'admin' ? 'A' : 'H'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {message.sender === 'admin' ? 'Admin' : 'Housekeeping'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-gray-800">{message.content}</div>
                  
                  {/* Task completion checkbox */}
                  {message.type === 'task' && message.task && !message.task.completed && !isAdmin && (
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
                      {!isAdmin && (
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
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
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
        </div>
      </div>
    </div>
  );
};
