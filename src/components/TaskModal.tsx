
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, MessageSquare } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  roomNumber: string;
  onClose: () => void;
  onAddTask: (roomNumber: string, message: string) => void;
}

export const TaskModal = ({ isOpen, roomNumber, onClose, onAddTask }: TaskModalProps) => {
  const [taskMessage, setTaskMessage] = useState('');

  const handleSubmit = () => {
    if (!taskMessage.trim()) return;
    
    onAddTask(roomNumber, taskMessage);
    setTaskMessage('');
    onClose();
  };

  const handleClose = () => {
    setTaskMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">Add Task for Room {roomNumber}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Task Description
            </label>
            <Textarea
              value={taskMessage}
              onChange={(e) => setTaskMessage(e.target.value)}
              placeholder="Enter task details...&#10;&#10;Examples:&#10;• Room needs extra cleaning&#10;• Fix AC unit - urgent&#10;• Replace towels and amenities&#10;• Maintenance issue with shower"
              className="min-h-[100px] w-full"
              autoFocus
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            This task will appear in the chat system and show a yellow indicator on the room until completed by housekeeping staff.
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit}
              disabled={!taskMessage.trim()}
              className="flex-1"
            >
              Add Task
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
