#!/bin/bash

echo "🚀 Starting Hotel Housekeeping System with Database"
echo "=================================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "✅ Cleanup completed"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Start backend server
echo "🗄️  Starting backend database server..."
cd backend && npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting frontend server..."
cd /home/omar_wee/Projects/House-keeping && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting!"
echo "📊 Backend API: http://localhost:3001"
echo "🌐 Frontend:    http://localhost:8080" 
echo "💾 Database:    /backend/housekeeping.db"
echo ""
echo "💡 All changes are now saved permanently to the database!"
echo "💡 Data will persist between sessions - no more localStorage!"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID