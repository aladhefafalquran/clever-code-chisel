
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, Loader2, CheckCircle, Plus, FileText, Camera, Type } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedRooms, setDetectedRooms] = useState<DetectedRoom[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [showPDFMessage, setShowPDFMessage] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setShowPDFMessage(true);
        setDetectedRooms([]);
        setShowMapping(false);
      } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
        setSelectedFile(file);
        setShowPDFMessage(false);
        setDetectedRooms([]);
        setShowMapping(false);
      } else {
        alert('Please select a JPG, PNG, or PDF file.');
      }
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

  const parseRoomStatusFromText = (text: string, roomNumber: string): RoomStatus => {
    const lowerText = text.toLowerCase();
    
    // Find the context around the room number (within 100 characters)
    const roomIndex = text.indexOf(roomNumber);
    if (roomIndex === -1) return 'default';
    
    const contextStart = Math.max(0, roomIndex - 50);
    const contextEnd = Math.min(text.length, roomIndex + roomNumber.length + 50);
    const roomContext = text.substring(contextStart, contextEnd).toLowerCase();
    
    console.log(`Room ${roomNumber} context:`, roomContext);
    
    // Turkish status words (prioritized for better detection)
    if (roomContext.includes('temiz')) {
      return 'clean';
    }
    if (roomContext.includes('kirli')) {
      return 'dirty';
    }
    if (roomContext.includes('kapalı') || roomContext.includes('kapali')) {
      return 'closed';
    }
    if (roomContext.includes('dolu')) {
      return 'checkout'; // Map 'Dolu' (Occupied) to checkout for now
    }
    if (roomContext.includes('boş') || roomContext.includes('bos')) {
      return 'default'; // Map 'Boş' (Vacant) to default
    }
    
    // English status words
    if (roomContext.includes('clean') && !roomContext.includes('unclean')) {
      return 'clean';
    }
    if (roomContext.includes('dirty')) {
      return 'dirty';
    }
    if (roomContext.includes('closed')) {
      return 'closed';
    }
    if (roomContext.includes('occupied')) {
      return 'checkout'; // Map 'Occupied' to checkout for now
    }
    if (roomContext.includes('available') || roomContext.includes('vacant')) {
      return 'default'; // Map 'Available/Vacant' to default
    }
    
    // Special markers (works for both languages)
    if (roomContext.includes(' c ') || roomContext.includes('checkout')) {
      return 'checkout';
    }
    if (roomContext.includes(' b ') || roomContext.includes('daily clean')) {
      return 'dirty';
    }
    
    return 'default';
  };

  const parseRoomStatus = (text: string, roomNumber: string): RoomStatus => {
    const lowerText = text.toLowerCase();
    const roomContext = text.substring(Math.max(0, text.indexOf(roomNumber) - 50), text.indexOf(roomNumber) + 50).toLowerCase();
    
    // Look for status indicators near the room number
    if (roomContext.includes('c') || roomContext.includes('checkout')) {
      return 'checkout';
    }
    if (roomContext.includes('b') || roomContext.includes('daily clean')) {
      return 'dirty';
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

  const handleProcessText = () => {
    if (!textInput.trim()) {
      alert('Please enter some text to parse.');
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      console.log('Processing text input...');
      console.log('Input text:', textInput);
      
      // Parse room numbers from text
      const roomNumbers = parseRoomNumbers(textInput);
      console.log('Detected room numbers:', roomNumbers);
      
      // Create room mapping structure with bilingual status detection
      const rooms: DetectedRoom[] = roomNumbers.map(number => ({
        number,
        status: parseRoomStatusFromText(textInput, number)
      }));
      
      console.log('Parsed rooms with statuses (bilingual):', rooms);
      
      setDetectedRooms(rooms);
      setShowMapping(true);
      setIsProcessing(false);
    }, 1000);
  };

  const handleProcessImage = async () => {
    if (!selectedFile || selectedFile.type === 'application/pdf') return;

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
      
      console.log('OCR processing complete');
      console.log('Detected text:', text);
      
      // Parse room numbers from extracted text
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
      console.error('Processing failed:', error);
      alert('Image processing failed. Please try again.');
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
      if (room.status !== '') {
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
    setInputMode('image');
    setSelectedFile(null);
    setTextInput('');
    setIsProcessing(false);
    setProgress(0);
    setDetectedRooms([]);
    setShowMapping(false);
    setNewRoomNumber('');
    setShowPDFMessage(false);
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
            {/* Input Mode Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Choose Input Method
              </label>
              <ToggleGroup 
                type="single" 
                value={inputMode} 
                onValueChange={(value) => value && setInputMode(value as 'image' | 'text')}
                className="justify-start"
              >
                <ToggleGroupItem value="image" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Upload Image
                </ToggleGroupItem>
                <ToggleGroupItem value="text" className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Paste Text
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Image Upload Mode */}
            {inputMode === 'image' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Image or PDF (JPG/PNG/PDF)
                  </label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                    className="w-full"
                  />
                </div>

                {selectedFile && !showPDFMessage && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    Selected: {selectedFile.name} (Image)
                  </div>
                )}

                {showPDFMessage && selectedFile && (
                  <div className="space-y-3">
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">PDF Support Coming Soon</span>
                      </div>
                      <p className="text-xs">
                        Selected: {selectedFile.name} - PDF processing is temporarily unavailable due to technical issues.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Workaround Options:</span>
                      </div>
                      <ul className="text-xs text-blue-700 space-y-1 ml-6">
                        <li>• Take screenshots of your PDF report pages</li>
                        <li>• Export/print PDF pages as JPG or PNG images</li>
                        <li>• Upload the converted images using the image OCR above</li>
                        <li>• Or use the "Paste Text" option to copy-paste from your PDF</li>
                      </ul>
                    </div>
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

                {!showPDFMessage && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    OCR will detect room numbers from images, then you can manually assign statuses.
                  </div>
                )}
              </>
            )}

            {/* Text Input Mode */}
            {inputMode === 'text' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Paste Hotel Report Text (Turkish/English)
                  </label>
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your hotel report text here...&#10;&#10;Turkish Examples:&#10;101 DELUXE ROOM Temiz&#10;102 STANDARD ROOM Kirli&#10;103 SUITE Kapalı&#10;104 DELUXE ROOM Dolu&#10;105 STANDARD ROOM Boş&#10;&#10;English Examples:&#10;201 DELUXE ROOM Clean&#10;202 STANDARD ROOM Dirty&#10;203 SUITE Closed&#10;204 DELUXE ROOM Occupied&#10;205 STANDARD ROOM Available"
                    className="min-h-[120px] w-full"
                    disabled={isProcessing}
                  />
                </div>

                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing bilingual text...
                  </div>
                )}

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-1">Bilingual text parsing detects:</div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="font-medium text-blue-700 mb-1">Turkish:</div>
                      <ul className="space-y-1 ml-2 text-xs">
                        <li>• 'Temiz' → Clean</li>
                        <li>• 'Kirli' → Dirty</li>
                        <li>• 'Kapalı' → Closed</li>
                        <li>• 'Dolu' → Occupied</li>
                        <li>• 'Boş' → Vacant</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-green-700 mb-1">English:</div>
                      <ul className="space-y-1 ml-2 text-xs">
                        <li>• 'Clean' → Clean</li>
                        <li>• 'Dirty' → Dirty</li>
                        <li>• 'Closed' → Closed</li>
                        <li>• 'Occupied' → Occupied</li>
                        <li>• 'Available/Vacant' → Vacant</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium">Special markers:</span> 'C' → Checkout, 'B' → Daily Clean
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              {inputMode === 'image' ? (
                <Button 
                  onClick={handleProcessImage}
                  disabled={!selectedFile || isProcessing || showPDFMessage}
                  className="flex-1 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Detect Rooms from Image'}
                </Button>
              ) : (
                <Button 
                  onClick={handleProcessText}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex-1 flex items-center gap-2"
                >
                  <Type className="w-4 h-4" />
                  {isProcessing ? 'Parsing...' : 'Parse Text for Rooms'}
                </Button>
              )}
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
                Detected {detectedRooms.length} rooms from {inputMode === 'image' ? 'image' : 'text'} - Assign statuses below
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
                Add any room numbers that {inputMode === 'image' ? 'OCR' : 'text parsing'} missed
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
                  {room.status !== '' && (
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
