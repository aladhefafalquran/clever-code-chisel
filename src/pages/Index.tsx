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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            Hotel Housekeeping
          </h1>
          
          <div className="flex items-center gap-3">
            {/* Enhanced View Toggle with Occupancy Filters */}
            <div className="flex bg-gray-100 rounded-lg p-1 flex-wrap">
              <Button
                variant={currentView === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('all')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                All Rooms
              </Button>
              
              {/* Priority Filters */}
              <Button
                variant={currentView === 'checkout' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('checkout')}
                className="flex items-center gap-2 text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                Checkout ({checkoutRoomsCount})
              </Button>
              <Button
                variant={currentView === 'dirty' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('dirty')}
                className="flex items-center gap-2 text-orange-600"
              >
                <Wrench className="w-4 h-4" />
                Dirty ({dirtyRoomsCount})
              </Button>
              
              {/* Occupancy Filters */}
              <Button
                variant={currentView === 'occupied' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('occupied')}
                className="flex items-center gap-2 text-blue-600"
              >
                <Users className="w-4 h-4" />
                Occupied ({occupiedRoomsCount})
              </Button>
              <Button
                variant={currentView === 'vacant' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('vacant')}
                className="flex items-center gap-2 text-green-600"
              >
                <User className="w-4 h-4" />
                Vacant ({vacantRoomsCount})
              </Button>
              
              <Button
                variant={currentView === 'closed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('closed')}
                className="flex items-center gap-2 text-gray-600"
              >
                <DoorClosed className="w-4 h-4" />
                Closed ({closedRoomsCount})
              </Button>
            </div>

            {/* Archive System */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveSystem(true)}
              className="flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>

            {/* Communication System */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChatSystem(true)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Chat & Tasks
            </Button>

            {/* Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualResetRequest}
                  className="flex items-center gap-2 text-orange-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  Manual Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Admin Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Enhanced Priority Alerts */}
        {checkoutRoomsCount > 0 && currentView !== 'checkout' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                {checkoutRoomsCount} checkout room{checkoutRoomsCount !== 1 ? 's' : ''} need{checkoutRoomsCount === 1 ? 's' : ''} immediate attention!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('checkout')}
                className="ml-auto text-red-600 border-red-300 hover:bg-red-100"
              >
                View Checkout Rooms
              </Button>
            </div>
          </div>
        )}

        {/* Immediate Cleaning Priority Alert */}
        {immediateCleaningCount > 0 && currentView !== 'vacant' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <User className="w-5 h-5" />
              <span className="font-medium">
                {immediateCleaningCount} vacant room{immediateCleaningCount !== 1 ? 's' : ''} ready for immediate cleaning!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('vacant')}
                className="ml-auto text-yellow-700 border-yellow-300 hover:bg-yellow-100"
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
