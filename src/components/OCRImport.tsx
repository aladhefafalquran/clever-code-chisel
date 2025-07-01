import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload, Loader2, CheckCircle, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Tesseract from 'tesseract.js';
import { RoomStatus } from '@/types/room';

interface OCRImportProps {
  onClose: () => void;
  isOpen: boolean;
  onRoomStatusUpdate: (roomNumber: string, status: RoomStatus) => void;
}

interface DetectedRoom {
  number: string;
  status: RoomStatus | '';
}

export const OCRImport = ({ onClose, isOpen, onRoomStatusUpdate }: OCRImportProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedRooms, setDetectedRooms] = useState<DetectedRoom[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedFile(file);
      setDetectedRooms([]);
      setShowMapping(false);
    } else {
      alert('Please select a JPG or PNG image file.');
    }
  };

  const parseRoomNumbers = (text: string): string[] => {
    // Extract room numbers (3-4 digit numbers starting with 1-9)
    const roomPattern = /\b[1-9]\d{2,3}\b/g;
    const matches = text.match(roomPattern) || [];
    
    // Filter and sort room numbers
    const roomNumbers = matches
      .filter(num => {
        const n = parseInt(num);
        return n >= 100 && n <= 9999; // Valid room number range
      })
      .map(num => num.toString())
      .filter((num, index, arr) => arr.indexOf(num) === index) // Remove duplicates
      .sort((a, b) => parseInt(a) - parseInt(b));

    return roomNumbers;
  };

  const parseRoomStatus = (text: string, roomNumber: string): RoomStatus => {
    const lowerText = text.toLowerCase();
    const roomContext = text.substring(Math.max(0, text.indexOf(roomNumber) - 50), text.indexOf(roomNumber) + 50).toLowerCase();
    
    // Look for status indicators near the room number
    if (roomContext.includes('c') || roomContext.includes('checkout')) {
      return 'checkout';
    }
    if (roomContext.includes('dirty') || roomContext.includes('kirli')) {
      return 'dirty';
    }
    if (roomContext.includes('clean') || roomContext.includes('temiz')) {
      return 'clean';
    }
    if (roomContext.includes('closed') || roomContext.includes('kapalı') || roomContext.includes('kapali')) {
      return 'closed';
    }
    
    return 'default';
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      console.log('Starting OCR processing...');
      
      const { data: { text } } = await Tesseract.recognize(
        selectedFile,
        'tur', // Turkish language support
        {
          logger: (m) => {
            console.log(m);
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      console.log('Detected text:', text);
      console.log('OCR processing complete');
      
      // Parse room numbers from OCR text
      const roomNumbers = parseRoomNumbers(text);
      console.log('Detected room numbers:', roomNumbers);
      
      // Create room mapping structure with intelligent status detection
      const rooms: DetectedRoom[] = roomNumbers.map(number => ({
        number,
        status: parseRoomStatus(text, number)
      }));
      
      setDetectedRooms(rooms);
      setShowMapping(true);
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      alert('OCR processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleStatusChange = (roomNumber: string, status: string) => {
    setDetectedRooms(prev =>
      prev.map(room =>
        room.number === roomNumber ? { ...room, status: status as RoomStatus } : room
      )
    );
  };

  const handleAddRoom = () => {
    const roomNumber = newRoomNumber.trim();
    
    if (!roomNumber) {
      alert('Please enter a room number.');
      return;
    }

    // Validate room number format (should be 3-4 digits)
    if (!/^\d{3,4}$/.test(roomNumber)) {
      alert('Please enter a valid room number (3-4 digits).');
      return;
    }

    // Check if room already exists
    if (detectedRooms.some(room => room.number === roomNumber)) {
      alert('This room number already exists in the list.');
      return;
    }

    // Add the new room to the list
    const newRoom: DetectedRoom = {
      number: roomNumber,
      status: ''
    };

    setDetectedRooms(prev => [...prev, newRoom].sort((a, b) => parseInt(a.number) - parseInt(b.number)));
    setNewRoomNumber('');
  };

  const handleApplyChanges = () => {
    const roomsToUpdate = detectedRooms.filter(room => room.status !== '');
    
    if (roomsToUpdate.length === 0) {
      alert('Please assign statuses to at least one room before applying changes.');
      return;
    }

    // Apply all changes
    roomsToUpdate.forEach(room => {
      if (room.status) {
        onRoomStatusUpdate(room.number, room.status as RoomStatus);
      }
    });

    const statusCounts = {
      checkout: roomsToUpdate.filter(r => r.status === 'checkout').length,
      dirty: roomsToUpdate.filter(r => r.status === 'dirty').length,
      clean: roomsToUpdate.filter(r => r.status === 'clean').length,
      default: roomsToUpdate.filter(r => r.status === 'default').length,
      closed: roomsToUpdate.filter(r => r.status === 'closed').length
    };

    alert(`Applied changes to ${roomsToUpdate.length} rooms:\n${statusCounts.checkout} Checkout, ${statusCounts.dirty} Dirty, ${statusCounts.clean} Clean, ${statusCounts.default} Default, ${statusCounts.closed} Closed`);
    
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setDetectedRooms([]);
    setShowMapping(false);
    setNewRoomNumber('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Import Room Status</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1"
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!showMapping ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Image (JPG/PNG)
              </label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="w-full"
              />
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Selected: {selectedFile.name}
              </div>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing image... {progress}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              Phase 2: OCR will detect room numbers, then you can manually assign statuses.
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleProcessImage}
                disabled={!selectedFile || isProcessing}
                className="flex-1 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Detect Rooms'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Detected {detectedRooms.length} rooms - Assign statuses below
              </span>
            </div>

            {/* Add Missing Room Section */}
            <div className="border rounded-lg p-3 bg-blue-50">
              <div className="text-sm font-medium text-blue-800 mb-2">Add Missing Room</div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter room number (e.g., 507)"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRoom();
                    }
                  }}
                />
                <Button
                  onClick={handleAddRoom}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Room
                </Button>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Add any room numbers that OCR missed
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {detectedRooms.map((room) => (
                <div key={room.number} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="font-medium min-w-[60px]">
                    Room {room.number}
                  </div>
                  <Select 
                    value={room.status} 
                    onValueChange={(value) => handleStatusChange(room.number, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkout">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          Checkout (Urgent)
                        </div>
                      </SelectItem>
                      <SelectItem value="dirty">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          Dirty
                        </div>
                      </SelectItem>
                      <SelectItem value="clean">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          Clean
                        </div>
                      </SelectItem>
                      <SelectItem value="default">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          Default
                        </div>
                      </SelectItem>
                      <SelectItem value="closed">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500" />
                          Closed
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {room.status && room.status !== '' && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      room.status === 'checkout' ? 'bg-red-100 text-red-800' :
                      room.status === 'dirty' ? 'bg-orange-100 text-orange-800' :
                      room.status === 'clean' ? 'bg-green-100 text-green-800' :
                      room.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {room.status === 'checkout' ? 'Checkout' : 
                       room.status === 'dirty' ? 'Dirty' : 
                       room.status === 'clean' ? 'Clean' :
                       room.status === 'closed' ? 'Closed' : 'Default'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleApplyChanges}
                className="flex-1"
                disabled={detectedRooms.filter(r => r.status !== '').length === 0}
              >
                Apply All Changes ({detectedRooms.filter(r => r.status !== '').length} rooms)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowMapping(false)}
              >
                Back
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
