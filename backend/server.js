const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeDatabase, dbHelpers } = require('./database');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
initializeDatabase().then(() => {
  console.log('🚀 Database ready!');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

// API Routes

// Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await dbHelpers.getAllRooms();
    // Convert hasGuests from 0/1 to boolean
    const roomsWithBooleans = rooms.map(room => ({
      ...room,
      hasGuests: Boolean(room.hasGuests),
      lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : null,
      lastUpdated: new Date(room.lastUpdated)
    }));
    res.json(roomsWithBooleans);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Update room status
app.put('/api/rooms/:roomNumber/status', async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const { status } = req.body;
    
    const result = await dbHelpers.updateRoomStatus(roomNumber, status);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ success: true, message: 'Room status updated' });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ error: 'Failed to update room status' });
  }
});

// Update guest status
app.put('/api/rooms/:roomNumber/guests', async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const { hasGuests } = req.body;
    
    const result = await dbHelpers.updateGuestStatus(roomNumber, hasGuests);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ success: true, message: 'Guest status updated' });
  } catch (error) {
    console.error('Error updating guest status:', error);
    res.status(500).json({ error: 'Failed to update guest status' });
  }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await dbHelpers.getAllTasks();
    // Convert timestamps and boolean
    const tasksWithDates = tasks.map(task => ({
      ...task,
      timestamp: new Date(task.timestamp),
      completed: Boolean(task.completed),
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined
    }));
    res.json(tasksWithDates);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Add new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { id, roomNumber, message, createdBy } = req.body;
    
    const task = {
      id: id || Date.now().toString(),
      roomNumber,
      message,
      timestamp: new Date().toISOString(),
      createdBy
    };
    
    await dbHelpers.addTask(task);
    res.json({ success: true, task });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Complete task
app.put('/api/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completedBy } = req.body;
    
    const result = await dbHelpers.completeTask(taskId, completedBy);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true, message: 'Task completed' });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await dbHelpers.getAllMessages();
    // Convert timestamps
    const messagesWithDates = messages.map(message => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
    res.json(messagesWithDates);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add new message
app.post('/api/messages', async (req, res) => {
  try {
    const { id, type, sender, senderType, content, taskId } = req.body;
    
    const message = {
      id: id || Date.now().toString(),
      type: type || 'message',
      sender,
      senderType,
      content,
      timestamp: new Date().toISOString(),
      taskId
    };
    
    await dbHelpers.addMessage(message);
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Archive data
app.post('/api/archive', async (req, res) => {
  try {
    const { date, summary, data } = req.body;
    
    await dbHelpers.archiveData(date, summary, data);
    res.json({ success: true, message: 'Data archived successfully' });
  } catch (error) {
    console.error('Error archiving data:', error);
    res.status(500).json({ error: 'Failed to archive data' });
  }
});

// Get archives
app.get('/api/archives', async (req, res) => {
  try {
    const archives = await dbHelpers.getArchives();
    res.json(archives);
  } catch (error) {
    console.error('Error fetching archives:', error);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Reset database (for testing)
app.post('/api/reset', async (req, res) => {
  try {
    // This is a simple reset - in production you'd want more sophisticated reset logic
    res.json({ 
      success: true, 
      message: 'Reset endpoint available but not implemented for safety. Use database tools to reset.' 
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Housekeeping API server running on http://localhost:${PORT}`);
  console.log(`📊 Database file: ${__dirname}/housekeeping.db`);
  console.log(`🌐 Frontend should connect to: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n💤 Shutting down server gracefully...');
  process.exit(0);
});