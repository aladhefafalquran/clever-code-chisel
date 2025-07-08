
import { useState, useEffect } from 'react';
import { HotelRoomsView } from '@/components/HotelRoomsView';
import { BulkSelectionPanel } from '@/components/BulkSelectionPanel';
// import { ChatSystem } from '@/components/ChatSystem'; // TEMPORARILY DISABLED
import { TaskModal } from '@/components/TaskModal';
import { PasswordDialog } from '@/components/PasswordDialog';
import { useRoomStore } from '@/hooks/useRoomStore';
import { ArchiveSystem } from '@/components/ArchiveSystem';
import { useDailyReset } from '@/hooks/useDailyReset';
import { useUser } from '@/hooks/useUserContext';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, MessageCircle, AlertCircle, Wrench, DoorClosed, User, Archive, RotateCcw, Menu, X } from 'lucide-react';
import { RoomStatus } from '@/types/room';

const Index = () => {
  const { currentUser, isAdmin, logout } = useUser();
  const [showChatSystem, setShowChatSystem] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskRoom, setSelectedTaskRoom] = useState<string>('');
  const [currentView, setCurrentView] = useState<RoomStatus | 'all' | 'occupied' | 'vacant'>('all');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [roomTasks, setRoomTasks] = useState<Record<string, boolean>>({});
  const [showArchiveSystem, setShowArchiveSystem] = useState(false);
  const [showManualResetPasswordDialog, setShowManualResetPasswordDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { rooms, updateRoomStatus, updateGuestStatus, initializeRooms } = useRoomStore();
  const { performDailyReset } = useDailyReset();

  useEffect(() => {
    initializeRooms();
  }, [initializeRooms]);

  // Handle task events from ChatSystem
  useEffect(() => {
    const handleAddTask = (event: CustomEvent) => {
      const { roomNumber, taskMessage } = event.detail;
      // This will be handled by the ChatSystem component
      // We just need to ensure the task modal can trigger it
    };

    window.addEventListener('addTask', handleAddTask as EventListener);
    return () => window.removeEventListener('addTask', handleAddTask as EventListener);
  }, []);

  const handleLogout = () => {
    logout();
    setSelectedRooms([]);
    setShowSelection(false);
    setShowChatSystem(false);
  };

  const handleTaskUpdate = (roomNumber: string, hasTask: boolean) => {
    setRoomTasks(prev => ({
      ...prev,
      [roomNumber]: hasTask
    }));
  };

  const handleAddTaskToRoom = (roomNumber: string) => {
    setSelectedTaskRoom(roomNumber);
    setShowTaskModal(true);
  };

  const handleTaskSubmit = (roomNumber: string, message: string) => {
    // Dispatch custom event to ChatSystem
    window.dispatchEvent(new CustomEvent('addTask', {
      detail: { roomNumber, message }
    }));
  };

  const handleManualResetRequest = () => {
    setShowManualResetPasswordDialog(true);
  };

  const performManualResetFromHeader = () => {
    performDailyReset();
    window.location.reload();
  };

  // Enhanced filtering logic
  const filteredRooms = (() => {
    switch (currentView) {
      case 'all':
        return rooms;
      case 'occupied':
        return rooms.filter(room => room.hasGuests);
      case 'vacant':
        return rooms.filter(room => !room.hasGuests);
      default:
        return rooms.filter(room => room.status === currentView);
    }
  })();

  const handleRoomSelect = (roomNumber: string, selected: boolean) => {
    if (selected) {
      setSelectedRooms([...selectedRooms, roomNumber]);
    } else {
      setSelectedRooms(selectedRooms.filter(r => r !== roomNumber));
    }
  };

  const handleToggleSelection = () => {
    setShowSelection(!showSelection);
    if (showSelection) {
      setSelectedRooms([]);
    }
  };

  const handleSelectAll = () => {
    const availableRooms = filteredRooms.map(room => room.number);
    setSelectedRooms(availableRooms);
  };

  const handleClearSelection = () => {
    setSelectedRooms([]);
  };

  const handleBulkGuestUpdate = (hasGuests: boolean) => {
    selectedRooms.forEach(roomNumber => {
      updateGuestStatus(roomNumber, hasGuests);
    });
  };

  const handleApplyComplete = () => {
    setSelectedRooms([]);
    setShowSelection(false);
  };

  const checkoutRoomsCount = rooms.filter(room => room.status === 'checkout').length;
  const dirtyRoomsCount = rooms.filter(room => room.status === 'dirty').length;
  const closedRoomsCount = rooms.filter(room => room.status === 'closed').length;
  const occupiedRoomsCount = rooms.filter(room => room.hasGuests).length;
  const vacantRoomsCount = rooms.filter(room => !room.hasGuests).length;
  const immediateCleaningCount = rooms.filter(room => !room.hasGuests && (room.status === 'dirty' || room.status === 'checkout')).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Main Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-soft border-b border-border/60 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Hotel Housekeeping
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground font-normal hidden sm:block">
                Professional room management system
              </p>
              {currentUser && (
                <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                  <div className={`w-3 h-3 rounded-full ${currentUser.color}`}></div>
                  <span className="text-xs font-medium text-blue-700">
                    Logged in as: {currentUser.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden flex items-center gap-2 shadow-soft bg-white/80 touch-manipulation min-h-[44px]"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="sr-only">Menu</span>
            </Button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              {/* System Actions */}
              <div className="flex items-center gap-3">
                {/* Archive System */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchiveSystem(true)}
                  className="flex items-center gap-2 hover-lift shadow-soft bg-white/80 touch-manipulation min-h-[44px]"
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden lg:inline">Archive</span>
                </Button>

                {/* Communication System - TEMPORARILY DISABLED */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert('Chat system temporarily disabled due to bug')}
                  className="flex items-center gap-2 hover-lift shadow-soft bg-white/80 touch-manipulation min-h-[44px] opacity-50"
                  disabled
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden lg:inline">Chat & Tasks (Disabled)</span>
                </Button>

                {/* Admin Controls */}
                {isAdmin && (
                  <div className="flex items-center gap-3 pl-3 border-l border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualResetRequest}
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 shadow-soft bg-white/80 transition-smooth hover:scale-105 touch-manipulation min-h-[44px]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden lg:inline">Manual Reset</span>
                    </Button>
                  </div>
                )}

                {/* Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover-lift shadow-soft bg-white/80 touch-manipulation min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-elevated border border-white/20">
            {/* Mobile System Actions */}
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowArchiveSystem(true);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 shadow-soft bg-white/80 touch-manipulation min-h-[44px] justify-start"
              >
                <Archive className="w-4 h-4" />
                Archive System
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Chat system temporarily disabled due to bug')}
                className="flex items-center gap-2 shadow-soft bg-white/80 touch-manipulation min-h-[44px] justify-start opacity-50"
                disabled
              >
                <MessageCircle className="w-4 h-4" />
                Chat & Tasks (Disabled)
              </Button>

              {/* Mobile Admin Controls */}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleManualResetRequest();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 shadow-soft bg-white/80 transition-smooth touch-manipulation min-h-[44px] justify-start"
                >
                  <RotateCcw className="w-4 h-4" />
                  Manual Reset
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 shadow-soft bg-white/80 touch-manipulation min-h-[44px] justify-start"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Secondary Navigation Bar - Room Filters */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-border/60 px-4 sm:px-6 py-3 sticky top-[72px] z-30 shadow-soft">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <Button
              variant={currentView === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('all')}
              className="flex items-center gap-2 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              All Rooms
            </Button>
            
            <Button
              variant={currentView === 'checkout' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('checkout')}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <AlertCircle className="w-4 h-4" />
              Checkout ({checkoutRoomsCount})
            </Button>
            
            <Button
              variant={currentView === 'dirty' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('dirty')}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" />
              Dirty ({dirtyRoomsCount})
            </Button>
            
            <Button
              variant={currentView === 'occupied' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('occupied')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              Occupied ({occupiedRoomsCount})
            </Button>
            
            <Button
              variant={currentView === 'vacant' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('vacant')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <User className="w-4 h-4" />
              Vacant ({vacantRoomsCount})
            </Button>
            
            <Button
              variant={currentView === 'closed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('closed')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] whitespace-nowrap"
            >
              <DoorClosed className="w-4 h-4" />
              Closed ({closedRoomsCount})
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
        {/* Enhanced Priority Alerts - Mobile optimized */}
        {checkoutRoomsCount > 0 && currentView !== 'checkout' && (
          <div className="glass-effect border border-red-200/60 rounded-2xl p-4 sm:p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-red-800">
              <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base sm:text-lg">Urgent Attention Required</h3>
                <p className="text-red-700/80 mt-1 text-sm sm:text-base">
                  {checkoutRoomsCount} checkout room{checkoutRoomsCount !== 1 ? 's' : ''} need{checkoutRoomsCount === 1 ? 's' : ''} immediate cleaning
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('checkout')}
                className="text-red-600 border-red-300 hover:bg-red-100 font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] w-full sm:w-auto"
              >
                View Checkout Rooms
              </Button>
            </div>
          </div>
        )}

        {/* Immediate Cleaning Priority Alert - Mobile optimized */}
        {immediateCleaningCount > 0 && currentView !== 'vacant' && (
          <div className="glass-effect border border-yellow-200/60 rounded-2xl p-4 sm:p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-yellow-800">
              <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0">
                <User className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base sm:text-lg">Ready for Cleaning</h3>
                <p className="text-yellow-700/80 mt-1 text-sm sm:text-base">
                  {immediateCleaningCount} vacant room{immediateCleaningCount !== 1 ? 's' : ''} ready for immediate cleaning
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('vacant')}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 font-medium transition-smooth hover:scale-105 touch-manipulation min-h-[44px] w-full sm:w-auto"
              >
                View Vacant Rooms
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Selection Panel */}
        <BulkSelectionPanel
          selectedRooms={selectedRooms}
          totalAvailableRooms={filteredRooms.length}
          showSelection={showSelection}
          isAdmin={isAdmin}
          onToggleSelection={handleToggleSelection}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkStatusUpdate={(status) => {
            selectedRooms.forEach(roomNumber => {
              updateRoomStatus(roomNumber, status);
            });
          }}
          onBulkGuestUpdate={handleBulkGuestUpdate}
          onApplyComplete={handleApplyComplete}
        />

        {/* Rooms Display */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 sm:p-6 shadow-soft border border-white/20">
          <HotelRoomsView
            rooms={filteredRooms}
            isAdmin={isAdmin}
            selectedRooms={selectedRooms}
            showSelection={showSelection}
            roomTasks={roomTasks}
            onRoomStatusChange={updateRoomStatus}
            onGuestStatusChange={updateGuestStatus}
            onRoomSelect={handleRoomSelect}
            onAddTask={handleAddTaskToRoom}
          />
        </div>
      </div>

      {/* Modals and Systems */}
      <ArchiveSystem
        isOpen={showArchiveSystem}
        onClose={() => setShowArchiveSystem(false)}
        isAdmin={isAdmin}
      />

      {/* ChatSystem temporarily disabled
      <ChatSystem
        isOpen={showChatSystem}
        onClose={() => setShowChatSystem(false)}
        onTaskUpdate={handleTaskUpdate}
      />
      */}

      <TaskModal
        isOpen={showTaskModal}
        roomNumber={selectedTaskRoom}
        onClose={() => setShowTaskModal(false)}
        onAddTask={handleTaskSubmit}
      />

      <PasswordDialog
        isOpen={showManualResetPasswordDialog}
        onClose={() => setShowManualResetPasswordDialog(false)}
        onConfirm={performManualResetFromHeader}
        title="Manual Reset Confirmation"
      />
    </div>
  );
};

export default Index;
