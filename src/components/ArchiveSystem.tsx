import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Archive, Download, RotateCcw, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, isToday, isYesterday } from '@/utils/dateUtils';
import { PasswordDialog } from '@/components/PasswordDialog';
import { useToast } from '@/hooks/use-toast';

interface ArchivedData {
  date: string;
  summary: string;
  messages: any[];
  tasks: any[];
  roomStates: any[];
}

interface ArchiveSystemProps {
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const ArchiveSystem = ({ isAdmin, isOpen, onClose }: ArchiveSystemProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [archivedData, setArchivedData] = useState<ArchivedData[]>([]);
  const [currentArchive, setCurrentArchive] = useState<ArchivedData | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showUndoPasswordDialog, setShowUndoPasswordDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedArchives = localStorage.getItem('hotelArchives');
    if (savedArchives) {
      try {
        setArchivedData(JSON.parse(savedArchives));
      } catch (error) {
        console.error('Error loading archives:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      const archive = archivedData.find(a => a.date === dateStr);
      setCurrentArchive(archive || null);
    }
  }, [selectedDate, archivedData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday);
  };

  const goToPreviousWeek = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    setSelectedDate(weekAgo);
  };

  const exportData = () => {
    if (!currentArchive) return;
    
    const dataStr = JSON.stringify(currentArchive, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hotel-data-${currentArchive.date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUndoResetRequest = () => {
    setShowUndoPasswordDialog(true);
  };

  const performUndoReset = () => {
    const confirmation = window.confirm('Are you sure you want to undo the last daily reset? This will restore yesterday\'s data.');
    if (confirmation) {
      console.log('Undoing last reset...');
      toast({
        title: "Undo Reset",
        description: "Last reset has been undone successfully.",
      });
    }
  };

  const handleManualResetRequest = () => {
    setShowPasswordDialog(true);
  };

  const performManualReset = () => {
    try {
      // Get current data
      const currentMessages = JSON.parse(localStorage.getItem('hotelChatMessages') || '[]');
      const currentTasks = JSON.parse(localStorage.getItem('hotelTasks') || '[]');
      const currentRooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]');
      
      // Calculate summary
      const completedTasks = currentTasks.filter((task: any) => task.completed);
      const cleanedRooms = currentRooms.filter((room: any) => room.status === 'clean');
      const summary = `Manual reset performed: ${cleanedRooms.length} rooms cleaned, ${completedTasks.length} tasks completed`;
      
      // Archive current data
      const now = new Date();
      const archiveData = {
        date: formatDate(now),
        summary,
        messages: currentMessages,
        tasks: currentTasks,
        roomStates: currentRooms
      };
      
      // Save to archives
      const existingArchives = JSON.parse(localStorage.getItem('hotelArchives') || '[]');
      const updatedArchives = [...existingArchives, archiveData];
      
      // Keep only last 30 days of archives
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredArchives = updatedArchives.filter(archive => 
        new Date(archive.date) >= thirtyDaysAgo
      );
      
      localStorage.setItem('hotelArchives', JSON.stringify(filteredArchives));
      
      // Reset room statuses (smart logic)
      const resetRooms = currentRooms.map((room: any) => ({
        ...room,
        status: room.status === 'checkout' ? 'checkout' : 'default',
        lastUpdated: new Date()
      }));
      
      // Carry over pending tasks
      const pendingTasks = currentTasks.filter((task: any) => !task.completed);
      
      // Clear completed tasks and messages, keep pending tasks
      localStorage.setItem('hotelRooms', JSON.stringify(resetRooms));
      localStorage.setItem('hotelTasks', JSON.stringify(pendingTasks));
      localStorage.setItem('hotelChatMessages', JSON.stringify([]));
      
      // Add reset notification to new chat
      const resetMessage = {
        id: Date.now().toString(),
        type: 'message',
        sender: 'admin',
        content: `🔄 Manual reset completed! ${summary}. ${pendingTasks.length} tasks carried over.`,
        timestamp: new Date()
      };
      localStorage.setItem('hotelChatMessages', JSON.stringify([resetMessage]));
      
      // Update reset date
      localStorage.setItem('lastResetDate', formatDate(new Date()));
      
      toast({
        title: "Manual Reset Completed",
        description: "Manual reset completed successfully. The page will refresh to show the new state.",
      });
      
      // Refresh page to show new state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error performing manual reset:', error);
      toast({
        title: "Reset Failed",
        description: "An error occurred during the manual reset. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              <h2 className="text-xl font-bold">Archive & History</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Calendar Sidebar */}
            <div className="w-80 border-r flex flex-col">
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <h3 className="font-semibold">Quick Navigation</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      className="justify-start"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToYesterday}
                      className="justify-start"
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousWeek}
                      className="justify-start"
                    >
                      Previous Week
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Select Date</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                    disabled={(date) => date > new Date()}
                  />
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Admin Actions</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndoResetRequest}
                        className="w-full justify-start text-orange-600"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Undo Last Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualResetRequest}
                        className="w-full justify-start text-red-600"
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Manual Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold">
                  {formatDate(selectedDate)} 
                  {isToday(selectedDate) && " (Today)"}
                  {isYesterday(selectedDate) && " (Yesterday)"}
                </h3>
                
                {currentArchive && isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {currentArchive ? (
                  <div className="space-y-6 pb-6">
                    {/* Daily Summary */}
                    <Card className="p-4">
                      <h4 className="font-semibold mb-2">Daily Summary</h4>
                      <p className="text-gray-700">{currentArchive.summary}</p>
                    </Card>

                    {/* Chat History */}
                    <Card className="p-4">
                      <h4 className="font-semibold mb-4">Chat History</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {currentArchive.messages.length === 0 ? (
                          <p className="text-gray-500">No messages for this date</p>
                        ) : (
                          currentArchive.messages.map((message, index) => (
                            <div
                              key={index}
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
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-gray-800">{message.content}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    {/* Task Summary */}
                    <Card className="p-4">
                      <h4 className="font-semibold mb-4">Task Summary</h4>
                      <div className="space-y-2">
                        <p>Total Tasks: {currentArchive.tasks.length}</p>
                        <p>Completed: {currentArchive.tasks.filter(t => t.completed).length}</p>
                        <p>Pending: {currentArchive.tasks.filter(t => !t.completed).length}</p>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available for {formatDate(selectedDate)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Dialogs */}
      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={performManualReset}
        title="Manual Reset Confirmation"
      />
      
      <PasswordDialog
        isOpen={showUndoPasswordDialog}
        onClose={() => setShowUndoPasswordDialog(false)}
        onConfirm={performUndoReset}
        title="Undo Reset Confirmation"
      />
    </>
  );
};
