import { useState, useEffect } from 'react';
import { HotelRoomsView } from '@/components/HotelRoomsView';
import { BulkSelectionPanel } from '@/components/BulkSelectionPanel';
import { TaskModal } from '@/components/TaskModal';
import { PasswordDialog } from '@/components/PasswordDialog';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';
import { useRoomStore } from '@/hooks/useRoomStore';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { ArchiveSystem } from '@/components/ArchiveSystem';
import { useDailyReset } from '@/hooks/useDailyReset';
import { useUser } from '@/hooks/useUserContext';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, AlertCircle, Wrench, DoorClosed, User, Archive, RotateCcw, Menu, X } from 'lucide-react';
import { RoomStatus } from '@/types/room';

const Index = () => {
  const { currentUser, isAdmin, logout } = useUser();
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

  // Auto-refresh functionality
  const { lastRefresh, isRefreshing, performRefresh } = useAutoRefresh({
    interval: 30000, // 30 seconds
    enabled: true,
    onRefresh: () => {
      // Refresh room data when checking for updates
      console.log('🔄 Refreshing room data...');
      // The room data will be refreshed automatically by the store
    }
  });

  // Debug logging with more detail
  useEffect(() => {
    console.log('🎯 Index component mounted');
    console.log('🎯 Current rooms count:', rooms.length);
    console.log('🎯 Current user:', currentUser?.name || 'No user');
    
    if (rooms.length === 0) {
      console.log('⚠️  WARNING: No rooms found in Index component');
    } else {
      console.log('✅ Rooms successfully loaded in Index:', rooms.length);
    }
  }, [rooms, currentUser]);

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
    console.log('Filtering rooms, total:', rooms.length, 'currentView:', currentView);
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

  console.log('Filtered rooms:', filteredRooms.length);

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

  const handleForceInitialize = () => {
    console.log('🔧 MANUAL FORCE INITIALIZE BUTTON CLICKED');
    initializeRooms();
  };

  const checkoutRoomsCount = rooms.filter(room => room.status === 'checkout').length;
  const dirtyRoomsCount = rooms.filter(room => room.status === 'dirty').length;
  const closedRoomsCount = rooms.filter(room => room.status === 'closed').length;
  const occupiedRoomsCount = rooms.filter(room => room.hasGuests).length;
  const vacantRoomsCount = rooms.filter(room => !room.hasGuests).length;
  const immediateCleaningCount = rooms.filter(room => !room.hasGuests && (room.status === 'dirty' || room.status === 'checkout')).length;

  console.log('Room counts:', {
    total: rooms.length,
    checkout: checkoutRoomsCount,
    dirty: dirtyRoomsCount,
    closed: closedRoomsCount,
    occupied: occupiedRoomsCount,
    vacant: vacantRoomsCount
  });

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
              {/* Auto-refresh indicator */}
              <AutoRefreshIndicator 
                isRefreshing={isRefreshing}
                lastRefresh={lastRefresh}
                className="hidden sm:flex"
              />
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
            {/* Mobile Auto-refresh indicator */}
            <div className="mb-3 pb-3 border-b border-border/30">
              <AutoRefreshIndicator 
                isRefreshing={isRefreshing}
                lastRefresh={lastRefresh}
              />
            </div>
            
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
              All Rooms ({rooms.length})
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
        {/* Enhanced Debug Info with more details */}
        {rooms.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-yellow-800">
            <h3 className="font-semibold">🐛 Debug: Room Loading Issue</h3>
            <div className="space-y-2 mt-2 text-sm">
              <p><strong>Total rooms:</strong> {rooms.length}</p>
              <p><strong>Current user:</strong> {currentUser?.name || 'No user logged in'}</p>
              <p><strong>Browser:</strong> {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</p>
              <p><strong>Environment:</strong> {window.location.hostname}</p>
              <p className="text-xs bg-yellow-200 p-2 rounded">
                Check browser console for detailed initialization logs (should see 🏨, 🚀, 📥, 🎯 emojis)
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleForceInitialize}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
              >
                🚀 Force Reinitialize Rooms
              </button>
              <button
                onClick={() => {
                  console.log('🔍 MANUAL CONSOLE TEST');
                  console.log('🔍 LocalStorage check:', localStorage.getItem('hotelRooms') ? 'Has data' : 'No data');
                  console.log('🔍 Current rooms state:', rooms);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                🔍 Test Console
              </button>
            </div>
          </div>
        )}

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
          {filteredRooms.length > 0 ? (
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
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Rooms Found</h3>
              <p className="text-gray-500 mb-4">
                {currentView === 'all' 
                  ? 'No rooms have been initialized yet. Click the button below or check the debug panel above.' 
                  : `No rooms match the "${currentView}" filter.`
                }
              </p>
              {currentView === 'all' && (
                <button
                  onClick={handleForceInitialize}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🏨 Initialize Rooms
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals and Systems */}
      <ArchiveSystem
        isOpen={showArchiveSystem}
        onClose={() => setShowArchiveSystem(false)}
        isAdmin={isAdmin}
      />

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
