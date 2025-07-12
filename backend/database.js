const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the backend directory
const dbPath = path.join(__dirname, 'housekeeping.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Rooms table
      db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT UNIQUE NOT NULL,
        floor INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'default',
        hasGuests BOOLEAN NOT NULL DEFAULT 0,
        lastCleaned DATETIME,
        lastUpdated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tasks table
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        roomNumber TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed BOOLEAN NOT NULL DEFAULT 0,
        completedBy TEXT,
        completedAt DATETIME,
        createdBy TEXT NOT NULL
      )`);

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'message',
        sender TEXT NOT NULL,
        senderType TEXT,
        content TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        taskId TEXT,
        FOREIGN KEY (taskId) REFERENCES tasks (id)
      )`);

      // Archives table
      db.run(`CREATE TABLE IF NOT EXISTS archives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        summary TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

      // Users table (for login tracking)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT NOT NULL,
        lastLogin DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Database initialized successfully');
          initializeDefaultRooms().then(resolve).catch(reject);
        }
      });
    });
  });
}

// Initialize default rooms (5 floors, 8 rooms each)
function initializeDefaultRooms() {
  return new Promise((resolve, reject) => {
    // Check if rooms already exist
    db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log('✅ Rooms already exist in database');
        resolve();
        return;
      }

      console.log('🏨 Initializing default rooms...');
      const stmt = db.prepare("INSERT INTO rooms (number, floor, status, hasGuests) VALUES (?, ?, ?, ?)");
      
      for (let floor = 1; floor <= 5; floor++) {
        for (let roomNum = 1; roomNum <= 8; roomNum++) {
          const roomNumber = `${floor}0${roomNum}`;
          stmt.run(roomNumber, floor, 'default', 0);
        }
      }
      
      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Default rooms created successfully');
          resolve();
        }
      });
    });
  });
}

// Database query helpers
const dbHelpers = {
  // Get all rooms
  getAllRooms: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM rooms ORDER BY number", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Update room status
  updateRoomStatus: (roomNumber, status) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE rooms SET status = ?, lastCleaned = ?, lastUpdated = CURRENT_TIMESTAMP 
                     WHERE number = ?`;
      const lastCleaned = status === 'clean' ? new Date().toISOString() : null;
      
      db.run(query, [status, lastCleaned, roomNumber], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // Update guest status
  updateGuestStatus: (roomNumber, hasGuests) => {
    return new Promise((resolve, reject) => {
      db.run("UPDATE rooms SET hasGuests = ?, lastUpdated = CURRENT_TIMESTAMP WHERE number = ?", 
             [hasGuests ? 1 : 0, roomNumber], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // Get all tasks
  getAllTasks: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM tasks ORDER BY timestamp DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Add task
  addTask: (task) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO tasks (id, roomNumber, message, timestamp, completed, createdBy) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(query, [task.id, task.roomNumber, task.message, task.timestamp, 0, task.createdBy], function(err) {
        if (err) reject(err);
        else resolve({ id: task.id });
      });
    });
  },

  // Complete task
  completeTask: (taskId, completedBy) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE tasks SET completed = 1, completedBy = ?, completedAt = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
      db.run(query, [completedBy, taskId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // Get all messages
  getAllMessages: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM messages ORDER BY timestamp ASC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Add message
  addMessage: (message) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO messages (id, type, sender, senderType, content, timestamp, taskId) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(query, [
        message.id, 
        message.type || 'message', 
        message.sender, 
        message.senderType || null, 
        message.content, 
        message.timestamp, 
        message.taskId || null
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: message.id });
      });
    });
  },

  // Archive data
  archiveData: (date, summary, data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO archives (date, summary, data) VALUES (?, ?, ?)`;
      db.run(query, [date, summary, JSON.stringify(data)], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  },

  // Get archives
  getArchives: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM archives ORDER BY date DESC", (err, rows) => {
        if (err) reject(err);
        else {
          const archives = rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
          }));
          resolve(archives);
        }
      });
    });
  }
};

module.exports = { db, initializeDatabase, dbHelpers };