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

// Direct mapping dictionary for concatenated status combinations
const CONCATENATED_STATUS_MAPPINGS: Record<string, RoomStatus> = {
  // Turkish combinations
  'kapalıboş': 'closed',
  'kapalıdolu': 'closed',
  'temizboş': 'clean',
  'temizdolu': 'clean',
  'kirliboş': 'dirty',
  'kirlidolu': 'dirty',
  'kapalibos': 'closed', // Alternative spelling
  'kapalidolu': 'closed',
  // English combinations
  'cleanavailable': 'clean',
  'cleanoccupied': 'clean',
  'dirtyavailable': 'dirty',
  'dirtyoccupied': 'dirty',
  'closedavailable': 'closed',
  'closedoccupied': 'closed',
  // Common variations
  'cleanovacant': 'clean',
  'dirtyvacant': 'dirty',
  'closedvacant': 'closed'
};

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
    
    // Filter to only valid hotel room ranges: 101-108, 201-208, 301-308, 401-408, 501-508
    const roomNumbers = matches
      .filter(num => {
        const n = parseInt(num);
        const floor = Math.floor(n / 100);
        const roomInFloor = n % 100;
        
        // Only floors 1-5 and rooms 01-08 in each floor
        return floor >= 1 && floor <= 5 && roomInFloor >= 1 && roomInFloor <= 8;
      })
      .map(num => num.toString())
      .filter((num, index, arr) => arr.indexOf(num) === index) // Remove duplicates
      .sort((a, b) => parseInt(a) - parseInt(b));

    return roomNumbers;
  };

  const parseRoomStatusFromText = (text: string, roomNumber: string): RoomStatus => {
    console.log('🔍 Processing room:', roomNumber);
    
    // Create more precise regex patterns for better matching
    const patterns = [
      // Primary pattern: room number + room type + status combination
      new RegExp(`${roomNumber}\\s+[\\w\\s]*?\\s+(temizdolu|temizboş|temizbo[sš]|kirlidolu|kirliboş|kirliboš|kapalıdolu|kapalıboş|kapalibo[sš])(?=\\s|$)`, 'i'),
      // Secondary pattern: more flexible matching
      new RegExp(`${roomNumber}[\\s\\S]{0,100}?(temizdolu|temizboş|temizbo[sš]|kirlidolu|kirliboş|kirliboš|kapalıdolu|kapalıboş|kapalibo[sš])(?=\\s|$)`, 'i'),
      // Enhanced fallback pattern for individual words
      new RegExp(`${roomNumber}[\\s\\S]{0,50}?(temiz|kirli|kapalı|kapali)[\\s\\S]{0,20}?(dolu|boş|boš|bo[sš])`, 'i')
    ];
    
    let match = null;
    let patternUsed = 'none';
    
    // Try patterns in order of precision
    for (let i = 0; i < patterns.length; i++) {
      match = text.match(patterns[i]);
      if (match) {
        patternUsed = `pattern_${i + 1}`;
        break;
      }
    }
    
    if (match) {
      let detectedCombination = '';
      let detectedStatus: RoomStatus = 'default';
      let occupancyStatus = 'Unknown';
      let personIcon = '';
      
      if (patternUsed === 'pattern_3') {
        // Enhanced fallback - reconstruct combination
        const status1 = match[1]?.toLowerCase() || '';
        const status2 = match[2]?.toLowerCase() || '';
        detectedCombination = status1 + status2;
      } else {
        detectedCombination = match[1]?.toLowerCase() || '';
      }
      
      console.log('📄 Found text segment:', match[0]);
      console.log('🎯 Detected status combination:', detectedCombination);
      console.log('🔧 Pattern used:', patternUsed);
      
      // Map the detected combination to room status and occupancy
      for (const [combination, status] of Object.entries(CONCATENATED_STATUS_MAPPINGS)) {
        if (detectedCombination === combination.toLowerCase()) {
          detectedStatus = status;
          
          // Determine occupancy from the combination
          if (combination.toLowerCase().includes('boş') || combination.toLowerCase().includes('bos') || 
              combination.toLowerCase().includes('available') || combination.toLowerCase().includes('vacant')) {
            occupancyStatus = 'Vacant';
            personIcon = '👤';
          } else if (combination.toLowerCase().includes('dolu') || combination.toLowerCase().includes('occupied')) {
            occupancyStatus = 'Occupied';
            personIcon = '👥';
          }
          
          break;
        }
      }
      
      // Map status to color for logging
      const statusToColor = {
        'clean': '🟢 GREEN',
        'dirty': '🟠 ORANGE', 
        'closed': '⚫ GRAY',
        'checkout': '🔴 RED',
        'default': '🔵 BLUE'
      };
      
      const statusColor = statusToColor[detectedStatus] || '🔵 BLUE';
      console.log('🎨 Mapped to color:', statusColor, `+ ${personIcon} ${occupancyStatus}`);
      console.log('---');
      
      return detectedStatus;
    }
    
    // Enhanced fallback with better logging
    console.log(`❌ Room ${roomNumber}: No pattern match found`);
    
    // Try to find the room in the text and get context
    const roomIndex = text.toLowerCase().indexOf(roomNumber);
    if (roomIndex !== -1) {
      const contextStart = Math.max(0, roomIndex - 30);
      const contextEnd = Math.min(text.length, roomIndex + 100);
      const roomContext = text.substring(contextStart, contextEnd);
      console.log('📝 Context around room:', roomContext.trim());
      
      // Individual word matching as final fallback
      const contextLower = roomContext.toLowerCase();
      
      if (contextLower.includes('temiz')) {
        console.log('🔄 Fallback: Found "temiz" - mapping to 🟢 GREEN (Clean)');
        return 'clean';
      } else if (contextLower.includes('kirli')) {
        console.log('🔄 Fallback: Found "kirli" - mapping to 🟠 ORANGE (Dirty)');
        return 'dirty';
      } else if (contextLower.includes('kapalı') || contextLower.includes('kapali')) {
        console.log('🔄 Fallback: Found "kapalı/kapali" - mapping to ⚫ GRAY (Closed)');
        return 'closed';
      }
    }
    
    console.log('⚠️ FINAL FALLBACK: No pattern matched for room', roomNumber);
    console.log('🔵 Defaulting to BLUE (Default) status');
    console.log('---');
    
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
      console.log('🚀 Processing text input with ENHANCED DEBUG + occupancy status detection...');
      console.log('📄 Input text preview:', textInput.substring(0, 200) + '...');
      
      // Parse room numbers from text
      const roomNumbers = parseRoomNumbers(textInput);
      console.log('🏠 Detected room numbers:', roomNumbers);
      
      console.log('🔍 Starting ENHANCED DEBUG status detection with occupancy...');
      console.log('===============================================');
      
      // Create room mapping structure with enhanced status detection
      const rooms: DetectedRoom[] = roomNumbers.map(number => {
        const status = parseRoomStatusFromText(textInput, number);
        return { number, status };
      });
      
      console.log('===============================================');
      console.log('📊 FINAL SUMMARY - All rooms with detected statuses and occupancy:');
      rooms.forEach(room => {
        const statusInfo = {
          'clean': '🟢 GREEN (Clean)',
          'dirty': '🟠 ORANGE (Dirty)', 
          'closed': '⚫ GRAY (Closed)',
          'checkout': '🔴 RED (Checkout)',
          'default': '🔵 BLUE (Default)'
        };
        
        // Determine occupancy for summary
        const roomContext = textInput.toLowerCase();
        const roomPattern = new RegExp(`${room.number}[\\s\\S]{0,100}?(dolu|boş|boš|occupied|vacant)`, 'i');
        const occupancyMatch = roomContext.match(roomPattern);
        let occupancyIcon = '';
        
        if (occupancyMatch) {
          const occupancyWord = occupancyMatch[1].toLowerCase();
          if (occupancyWord.includes('dolu') || occupancyWord === 'occupied') {
            occupancyIcon = ' + 👥 Occupied';
          } else if (occupancyWord.includes('boş') || occupancyWord.includes('bos') || occupancyWord === 'vacant') {
            occupancyIcon = ' + 👤 Vacant';
          }
        }
        
        console.log(`   Room ${room.number}: ${statusInfo[room.status as RoomStatus] || room.status}${occupancyIcon}`);
      });
      
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
        status: parseRoomStatusFromText(text, number)
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
                    Paste Hotel Report Text (Turkish/English + Concatenated Combinations)
                  </label>
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your hotel report text here...&#10;&#10;Supports concatenated combinations:&#10;Turkish: KapalıBoş, TemizDolu, KirliBoş&#10;English: CleanAvailable, DirtyOccupied&#10;&#10;Turkish Examples:&#10;101 DELUXE ROOM Temiz&#10;102 STANDARD ROOM KirliBoş&#10;103 SUITE KapalıDolu&#10;&#10;English Examples:&#10;201 DELUXE ROOM CleanAvailable&#10;202 STANDARD ROOM DirtyOccupied"
                    className="min-h-[120px] w-full"
                    disabled={isProcessing}
                  />
                </div>

                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing ENHANCED DEBUG concatenated combinations + bilingual text...
                  </div>
                )}

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-1">ENHANCED DEBUG parsing with detailed logging:</div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="font-medium text-blue-700 mb-1">Turkish Combinations:</div>
                      <ul className="space-y-1 ml-2 text-xs">
                        <li>• 'TemizDolu' → GREEN + Occupied</li>
                        <li>• 'KirliBoş' → ORANGE + Vacant</li>
                        <li>• 'KapalıBoş' → GRAY + Vacant</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-green-700 mb-1">English Combinations:</div>
                      <ul className="space-y-1 ml-2 text-xs">
                        <li>• 'CleanAvailable' → GREEN + Vacant</li>
                        <li>• 'DirtyOccupied' → ORANGE + Occupied</li>
                        <li>• 'ClosedVacant' → GRAY + Vacant</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium">Enhanced:</span> Step-by-step debug logs show exact text segments and color mappings
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
                  {isProcessing ? 'Parsing...' : 'Parse Text for Rooms (ENHANCED DEBUG)'}
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
