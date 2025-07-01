import { useState, useEffect } from 'react';
import { HotelRoomsView } from '@/components/HotelRoomsView';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';
import { FilterPanel } from '@/components/FilterPanel';
import { BulkSelectionPanel } from '@/components/BulkSelectionPanel';
import { OCRImport } from '@/components/OCRImport';
import { useRoomStore } from '@/hooks/useRoomStore';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, Filter, Upload } from 'lucide-react';

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOCRImport, setShowOCRImport] = useState(false);
  const [currentView, setCurrentView] = useState<'all' | 'dirty'>('all');
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

  const filteredRooms = currentView === 'dirty' 
    ? rooms.filter(room => room.status === 'dirty')
    : rooms;

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

  const dirtyRoomsCount = rooms.filter(room => room.status === 'dirty').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            Hotel Housekeeping
          </h1>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
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
                variant={currentView === 'dirty' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('dirty')}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Dirty ({dirtyRoomsCount})
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
