#!/bin/bash

# Restart the Server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../src/server"

# Kill existing server process (running on port 3000)
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Stopping existing server..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

echo "Starting server..."
cd "$SERVER_DIR"
npm run dev
