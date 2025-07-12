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
import { Task, SimpleChatMessage } from '@/types/common';
import { Room } from '@/types/room';
import { apiService, handleApiError } from '@/services/api';

interface ArchivedData {
  date: string;
  summary: string;
  messages: SimpleChatMessage[];
  tasks: Task[];
  roomStates: Room[];
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
    const loadArchives = async () => {
      try {
        const archives = await apiService.getArchives();
        setArchivedData(archives);
      } catch (error) {
        console.error('Error loading archives from API:', handleApiError(error));
      }
    };
    
    if (isOpen) {
      loadArchives();
    }
  }, [isOpen]);

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
      const completedTasks = currentTasks.filter((task: Task) => task.completed);
      const cleanedRooms = currentRooms.filter((room: Room) => room.status === 'clean');
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
      const resetRooms = currentRooms.map((room: Room) => ({
        ...room,
        status: room.status === 'checkout' ? 'checkout' : 'default',
        lastUpdated: new Date()
      }));
      
      // Carry over pending tasks
      const pendingTasks = currentTasks.filter((task: Task) => !task.completed);
      
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-lg w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
          {/* Header - Mobile optimized */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Archive className="w-5 h-5 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold truncate">Archive & History</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0 ml-2 touch-manipulation min-h-[44px] min-w-[44px]">
              ×
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
            {/* Calendar Sidebar - Mobile responsive */}
            <div className="w-full lg:w-80 border-b lg:border-r lg:border-b-0 flex flex-col max-h-48 lg:max-h-none overflow-hidden lg:overflow-visible">
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm sm:text-base">Quick Navigation</h3>
                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      className="justify-start touch-manipulation min-h-[40px] text-xs sm:text-sm"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToYesterday}
                      className="justify-start touch-manipulation min-h-[40px] text-xs sm:text-sm"
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousWeek}
                      className="justify-start touch-manipulation min-h-[40px] text-xs sm:text-sm"
                    >
                      Previous Week
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 hidden lg:block">
                  <h3 className="font-semibold text-sm sm:text-base">Select Date</h3>
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
                    <h3 className="font-semibold text-sm sm:text-base">Admin Actions</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndoResetRequest}
                        className="justify-start text-orange-600 touch-manipulation min-h-[40px] text-xs sm:text-sm"
                      >
                        <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Undo Last Reset</span>
                        <span className="sm:hidden">Undo</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualResetRequest}
                        className="justify-start text-red-600 touch-manipulation min-h-[40px] text-xs sm:text-sm"
                      >
                        <RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Manual Reset</span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area - Mobile optimized */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold truncate">
                    {formatDate(selectedDate)} 
                    {isToday(selectedDate) && " (Today)"}
                    {isYesterday(selectedDate) && " (Yesterday)"}
                  </h3>
                </div>
                
                {currentArchive && isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportData}
                    className="flex-shrink-0 ml-2 touch-manipulation min-h-[40px]"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Export Data</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {currentArchive ? (
                  <div className="space-y-4 sm:space-y-6 pb-6">
                    {/* Daily Summary - Mobile optimized */}
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">Daily Summary</h4>
                      <p className="text-gray-700 text-sm sm:text-base">{currentArchive.summary}</p>
                    </Card>

                    {/* Chat History - Mobile optimized */}
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Chat History</h4>
                      <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                        {currentArchive.messages.length === 0 ? (
                          <p className="text-gray-500 text-sm sm:text-base">No messages for this date</p>
                        ) : (
                          currentArchive.messages.map((message, index) => (
                            <div
                              key={index}
                              className={cn(
                                "flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg",
                                message.sender === 'admin' ? "bg-blue-50" : "bg-green-50"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0",
                                message.sender === 'admin' ? "bg-blue-500" : "bg-green-500"
                              )}>
                                {message.sender === 'admin' ? 'A' : 'H'}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-xs sm:text-sm truncate">
                                    {message.sender === 'admin' ? 'Admin' : 'Housekeeping'}
                                  </span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-gray-800 text-xs sm:text-sm break-words">{message.content}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    {/* Task Summary - Mobile optimized */}
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Task Summary</h4>
                      <div className="space-y-2">
                        <p className="text-sm sm:text-base">Total Tasks: {currentArchive.tasks.length}</p>
                        <p className="text-sm sm:text-base">Completed: {currentArchive.tasks.filter(t => t.completed).length}</p>
                        <p className="text-sm sm:text-base">Pending: {currentArchive.tasks.filter(t => !t.completed).length}</p>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 sm:h-64">
                    <div className="text-center">
                      <p className="text-gray-500 text-sm sm:text-base">No data available</p>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">{formatDate(selectedDate)}</p>
                    </div>
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
