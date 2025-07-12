# Hotel Housekeeping - Database Setup

## 🎯 What This Does

Your Hotel Housekeeping system now has a **permanent database** that saves all changes forever! No more losing data when you close the browser.

## 🚀 Quick Start

### Option 1: Start Everything at Once
```bash
./start-full-app.sh
```

### Option 2: Start Manually

**Terminal 1 - Backend Database Server:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 📊 What's Saved Permanently

✅ **Room Status Changes** - All room status updates (clean, dirty, checkout, etc.)  
✅ **Guest Status** - Whether rooms are occupied or vacant  
✅ **Tasks** - All tasks created, completed, and their details  
✅ **Chat Messages** - All communication between staff  
✅ **Archive Data** - Historical records and daily summaries  
✅ **Timestamps** - Exact times when changes were made  

## 💾 Database Details

- **Type:** SQLite (local file database)
- **Location:** `backend/housekeeping.db`
- **Backup:** Also saves to localStorage as fallback
- **Persistence:** Data survives computer restarts, browser restarts, everything!

## 🌐 URLs

- **Frontend (React App):** http://localhost:8080
- **Backend API:** http://localhost:3001
- **API Health Check:** http://localhost:3001/api/health

## 🔧 API Endpoints

### Rooms
- `GET /api/rooms` - Get all rooms
- `PUT /api/rooms/:roomNumber/status` - Update room status
- `PUT /api/rooms/:roomNumber/guests` - Update guest status

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:taskId/complete` - Mark task complete

### Messages
- `GET /api/messages` - Get all messages
- `POST /api/messages` - Send new message

### Archives
- `GET /api/archives` - Get all archived data
- `POST /api/archive` - Archive current data

## 🛠️ Database Schema

### Rooms Table
- Room number, floor, status, guest status
- Last cleaned time, last updated time

### Tasks Table
- Task ID, room number, message, creation time
- Completion status, completed by, completed time

### Messages Table  
- Message ID, sender, content, timestamp
- Message type (message/task), sender type

### Archives Table
- Date, summary, archived data (JSON)
- Creation timestamp

## ✅ Data Persistence Features

1. **Real-time Sync** - Changes save immediately to database
2. **Offline Fallback** - Falls back to localStorage if API fails
3. **Automatic Backup** - Database AND localStorage updated together
4. **Error Recovery** - App continues working even if database is temporarily unavailable
5. **Data Integrity** - Proper validation and error handling

## 🔍 Testing Database Persistence

1. Make changes in the app (update room status, add tasks, etc.)
2. Close browser completely
3. Restart browser and open the app
4. Your changes should still be there! 🎉

## 📁 Files Added

```
backend/
├── package.json          # Backend dependencies
├── server.js             # Express server
├── database.js           # SQLite database setup
└── housekeeping.db       # Your actual database file

src/services/
└── api.ts                # Frontend API service

start-full-app.sh         # Convenient startup script
```

## 🆘 Troubleshooting

**Backend won't start?**
```bash
cd backend
npm install
npm start
```

**Frontend can't connect to database?**
- Make sure backend is running on port 3001
- Check browser console for error messages
- App will fall back to localStorage automatically

**Database file missing?**
- It gets created automatically when backend starts
- Located at `backend/housekeeping.db`

## 🎉 You're Done!

Your hotel housekeeping system now has permanent data storage! Every change is saved forever to the SQLite database on your laptop. No more worrying about losing data! 🚀