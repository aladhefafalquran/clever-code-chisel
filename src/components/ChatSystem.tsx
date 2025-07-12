
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Send, CheckCircle, Clock, User, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUserContext';
import { Task, ChatMessage } from '@/types/common';
import { apiService, handleApiError } from '@/services/api';

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

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load tasks first
        const tasksFromApi = await apiService.getTasks();
        const parsedTasks = tasksFromApi.map((task: Task) => ({
          ...task,
          timestamp: new Date(task.timestamp),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined
        }));
        setTasks(parsedTasks);
        
        // Load messages and link them with tasks
        const messagesFromApi = await apiService.getMessages();
        const parsedMessages = messagesFromApi.map((msg: any) => {
          // Find the associated task if there's a taskId
          const associatedTask = msg.taskId ? parsedTasks.find(task => task.id === msg.taskId) : undefined;
          
          return {
            ...msg,
            timestamp: new Date(msg.timestamp),
            task: associatedTask
          };
        });
        setMessages(parsedMessages);
        
      } catch (error) {
        console.error('Error loading chat data from API:', handleApiError(error));
      }
    };
    
    loadData();
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
  }, [currentUser]); // Removed addTask dependency to prevent infinite loop

  // Update room indicators when tasks change
  useEffect(() => {
    
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) {
      console.log('Cannot send message - missing message or user:', { message: newMessage.trim(), user: currentUser });
      return;
    }

    const messageData = {
      id: Date.now().toString(),
      type: 'message' as const,
      sender: currentUser.name,
      senderType: currentUser.type,
      content: newMessage
    };

    try {
      const result = await apiService.addMessage(messageData);
      const newMessageWithTimestamp = {
        ...result.message,
        timestamp: new Date(result.message.timestamp)
      };
      
      console.log('Message sent successfully:', newMessageWithTimestamp);
      setMessages(prev => [...prev, newMessageWithTimestamp]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', handleApiError(error));
      // Optionally show error to user
    }
  };

  const addTask = useCallback(async (roomNumber: string, taskMessage: string) => {
    if (!currentUser) {
      console.log('Cannot add task - no current user');
      return;
    }

    const taskData = {
      id: Date.now().toString(),
      roomNumber,
      message: taskMessage,
      completed: false,
      createdBy: currentUser.name
    };

    try {
      // Add task to database
      const taskResult = await apiService.addTask(taskData);
      const newTask = {
        ...taskResult.task,
        timestamp: new Date(taskResult.task.timestamp)
      };
      
      // Add chat message about the task
      const messageData = {
        id: Date.now().toString(),
        type: 'task' as const,
        sender: currentUser.name,
        senderType: currentUser.type,
        content: `🏠 Room ${roomNumber}: ${taskMessage}`,
        taskId: newTask.id
      };
      
      const messageResult = await apiService.addMessage(messageData);
      const newMessage = {
        ...messageResult.message,
        timestamp: new Date(messageResult.message.timestamp),
        task: newTask
      };
      
      setTasks(prev => [...prev, newTask]);
      setMessages(prev => [...prev, newMessage]);
      
    } catch (error) {
      console.error('Failed to add task:', handleApiError(error));
    }
  }, [currentUser]);

  const completeTask = async (taskId: string) => {
    if (!currentUser) return;

    try {
      // Complete task in database
      await apiService.completeTask(taskId, currentUser.name);
      
      const completedAt = new Date();
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, completed: true, completedBy: currentUser.name, completedAt }
          : task
      ));

      setMessages(prev => prev.map(msg => 
        msg.task?.id === taskId 
          ? { ...msg, task: { ...msg.task, completed: true, completedBy: currentUser.name, completedAt } }
          : msg
      ));

      // Find the task to get room number for notification
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const notificationData = {
          id: Date.now().toString(),
          type: 'message' as const,
          sender: currentUser.name,
          senderType: currentUser.type,
          content: `✅ Task completed for Room ${task.roomNumber}`
        };
        
        const result = await apiService.addMessage(notificationData);
        const notification = {
          ...result.message,
          timestamp: new Date(result.message.timestamp)
        };
        
        setMessages(prev => [...prev, notification]);
      }
      
    } catch (error) {
      console.error('Failed to complete task:', handleApiError(error));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-lg w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">Communication & Tasks</h2>
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:inline-block">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0 ml-2 touch-manipulation min-h-[44px] min-w-[44px]">
            ×
          </Button>
        </div>

        {/* Messages - Mobile optimized */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm sm:text-base">No messages yet.</p>
              <p className="text-xs sm:text-sm mt-1">Start a conversation or add tasks to rooms!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 sm:gap-3 p-3 rounded-lg border",
                  getSenderColor(message.sender)
                )}
              >
                <div className={cn(
                  "w-8 h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                  getSenderAvatarColor(message.sender)
                )}>
                  {message.sender === 'Admin' ? 'A' : message.sender.slice(-1)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
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

        {/* Message Input - Mobile optimized */}
        <div className="p-3 sm:p-4 border-t flex-shrink-0">
          {currentUser ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message as ${currentUser.name}...`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                className="flex-1 text-sm sm:text-base min-h-[44px]"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                className="flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p className="text-sm sm:text-base">Please log in to send messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
