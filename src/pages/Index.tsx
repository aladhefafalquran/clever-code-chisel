
import { useState, useEffect } from 'react';
import { HotelRoomsView } from '@/components/HotelRoomsView';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';
import { FilterPanel } from '@/components/FilterPanel';
import { BulkSelectionPanel } from '@/components/BulkSelectionPanel';
import { OCRImport } from '@/components/OCRImport';
import { useRoomStore } from '@/hooks/useRoomStore';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, Filter, Upload, AlertCircle, Wrench, DoorClosed } from 'lucide-react';
import { RoomStatus } from '@/types/room';

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOCRImport, setShowOCRImport] = useState(false);
  const [currentView, setCurrentView] = useState<RoomStatus | 'all'>('all');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const { rooms, updateRoomStatus, updateGuestStatus, initializeRooms } = useRoomStore();

  useEffect(() => {
    initializeRooms();
  }, [initializeRooms]);

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
    setShowOCRImport(false);
  };

  const filteredRooms = currentView === 'all' 
    ? rooms
    : rooms.filter(room => room.status === currentView);

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

  const getViewIcon = (view: RoomStatus | 'all') => {
    switch (view) {
      case 'checkout': return <AlertCircle className="w-4 h-4" />;
      case 'dirty': return <Wrench className="w-4 h-4" />;
      case 'closed': return <DoorClosed className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const getViewLabel = (view: RoomStatus | 'all') => {
    switch (view) {
      case 'checkout': return `Checkout (${checkoutRoomsCount})`;
      case 'dirty': return `Dirty (${dirtyRoomsCount})`;
      case 'closed': return `Closed (${closedRoomsCount})`;
      default: return 'All Rooms';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            Hotel Housekeeping
          </h1>
          
          <div className="flex items-center gap-3">
            {/* Priority View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('all')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                All Rooms
              </Button>
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

            {/* Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOCRImport(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import Room Status
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
        {/* Priority Alert for Checkout Rooms */}
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
          onRoomStatusChange={updateRoomStatus}
          onGuestStatusChange={updateGuestStatus}
          onRoomSelect={handleRoomSelect}
        />
      </div>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* OCR Import Modal */}
      <OCRImport
        isOpen={showOCRImport}
        onClose={() => setShowOCRImport(false)}
        onRoomStatusUpdate={updateRoomStatus}
      />
    </div>
  );
};

export default Index;
