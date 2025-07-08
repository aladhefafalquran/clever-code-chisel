import { useState, useEffect } from 'react';
import { HotelRoomsView } from '@/components/HotelRoomsView';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';
import { FilterPanel } from '@/components/FilterPanel';
import { BulkSelectionPanel } from '@/components/BulkSelectionPanel';
import { ChatSystem } from '@/components/ChatSystem';
import { TaskModal } from '@/components/TaskModal';
import { PasswordDialog } from '@/components/PasswordDialog';
import { useRoomStore } from '@/hooks/useRoomStore';
import { ArchiveSystem } from '@/components/ArchiveSystem';
import { useDailyReset } from '@/hooks/useDailyReset';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, Filter, MessageCircle, AlertCircle, Wrench, DoorClosed, User, Archive, RotateCcw } from 'lucide-react';
import { RoomStatus } from '@/types/room';

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChatSystem, setShowChatSystem] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskRoom, setSelectedTaskRoom] = useState<string>('');
  const [currentView, setCurrentView] = useState<RoomStatus | 'all' | 'occupied' | 'vacant'>('all');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [roomTasks, setRoomTasks] = useState<Record<string, boolean>>({});
  const [showArchiveSystem, setShowArchiveSystem] = useState(false);
  const [showManualResetPasswordDialog, setShowManualResetPasswordDialog] = useState(false);
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

  const handleAdminLogin = (success: boolean) => {
    if (success) {
      setIsAdmin(true);
      setShowLoginModal(false);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
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
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-soft border-b border-border/60 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Hotel Housekeeping
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              Professional room management system
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Enhanced View Toggle with Occupancy Filters */}
            <div className="flex bg-muted/50 rounded-xl p-1.5 gap-1 flex-wrap shadow-soft">
              <Button
                variant={currentView === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('all')}
                className="flex items-center gap-2 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <Home className="w-4 h-4" />
                All Rooms
              </Button>
              
              {/* Priority Filters */}
              <Button
                variant={currentView === 'checkout' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('checkout')}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Checkout</span> ({checkoutRoomsCount})
              </Button>
              <Button
                variant={currentView === 'dirty' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('dirty')}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Dirty</span> ({dirtyRoomsCount})
              </Button>
              
              {/* Occupancy Filters */}
              <Button
                variant={currentView === 'occupied' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('occupied')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Occupied</span> ({occupiedRoomsCount})
              </Button>
              <Button
                variant={currentView === 'vacant' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('vacant')}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Vacant</span> ({vacantRoomsCount})
              </Button>
              
              <Button
                variant={currentView === 'closed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('closed')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-smooth hover:scale-105"
              >
                <DoorClosed className="w-4 h-4" />
                <span className="hidden sm:inline">Closed</span> ({closedRoomsCount})
              </Button>
            </div>

            {/* System Actions */}
            <div className="flex items-center gap-3">
              {/* Archive System */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveSystem(true)}
                className="flex items-center gap-2 hover-lift shadow-soft bg-white/80"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden md:inline">Archive</span>
              </Button>

              {/* Communication System */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChatSystem(true)}
                className="flex items-center gap-2 hover-lift shadow-soft bg-white/80"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden md:inline">Chat & Tasks</span>
              </Button>

              {/* Admin Controls */}
              {isAdmin ? (
                <div className="flex items-center gap-3 pl-3 border-l border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualResetRequest}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 shadow-soft bg-white/80 transition-smooth hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden lg:inline">Manual Reset</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-2 hover-lift shadow-soft bg-white/80"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 hover-lift shadow-soft bg-white/80"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden md:inline">Admin Login</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Priority Alerts */}
        {checkoutRoomsCount > 0 && currentView !== 'checkout' && (
          <div className="glass-effect border border-red-200/60 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-3 text-red-800">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Urgent Attention Required</h3>
                <p className="text-red-700/80 mt-1">
                  {checkoutRoomsCount} checkout room{checkoutRoomsCount !== 1 ? 's' : ''} need{checkoutRoomsCount === 1 ? 's' : ''} immediate cleaning
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('checkout')}
                className="text-red-600 border-red-300 hover:bg-red-100 font-medium transition-smooth hover:scale-105"
              >
                View Checkout Rooms
              </Button>
            </div>
          </div>
        )}

        {/* Immediate Cleaning Priority Alert */}
        {immediateCleaningCount > 0 && currentView !== 'vacant' && (
          <div className="glass-effect border border-yellow-200/60 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-3 text-yellow-800">
              <div className="p-2 bg-yellow-100 rounded-full">
                <User className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Ready for Cleaning</h3>
                <p className="text-yellow-700/80 mt-1">
                  {immediateCleaningCount} vacant room{immediateCleaningCount !== 1 ? 's' : ''} ready for immediate cleaning
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('vacant')}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 font-medium transition-smooth hover:scale-105"
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
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-soft border border-white/20">
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

      {/* Admin Login Modal */}
      {showLoginModal && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Archive System */}
      <ArchiveSystem
        isOpen={showArchiveSystem}
        onClose={() => setShowArchiveSystem(false)}
        isAdmin={isAdmin}
      />

      {/* Chat System */}
      <ChatSystem
        isOpen={showChatSystem}
        onClose={() => setShowChatSystem(false)}
        isAdmin={isAdmin}
        onTaskUpdate={handleTaskUpdate}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        roomNumber={selectedTaskRoom}
        onClose={() => setShowTaskModal(false)}
        onAddTask={handleTaskSubmit}
      />

      {/* Password Dialog for Manual Reset */}
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
