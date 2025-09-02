#!/bin/bash

# Find and kill Node processes on port 5000
echo "Stopping Node server..."

# Try graceful shutdown first
PID=$(lsof -ti:5000)
if [ -n "$PID" ]; then
    echo "Found process $PID on port 5000"
    kill -SIGTERM $PID
    
    # Wait for graceful shutdown (up to 5 seconds)
    for i in {1..5}; do
        if ! lsof -ti:5000 > /dev/null 2>&1; then
            echo "Server stopped gracefully"
            exit 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    if lsof -ti:5000 > /dev/null 2>&1; then
        echo "Force killing process..."
        kill -9 $PID
    fi
else
    echo "No process found on port 5000"
fi

# Clean up any zombie Node processes
pkill -f "node dist/index.js" 2>/dev/null
pkill -f "tsx server/index.ts" 2>/dev/null

echo "Server stopped"