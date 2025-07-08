
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, User } from 'lucide-react';
import { useUser } from '@/hooks/useUserContext';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface SimpleChatSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimpleChatSystem = ({ isOpen, onClose }: SimpleChatSystemProps) => {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: currentUser.name,
      content: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
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
            <h2 className="text-xl font-bold">Hotel Communication</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 p-3 rounded-lg border ${getSenderColor(message.sender)}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getSenderAvatarColor(message.sender)}`}>
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
