#!/bin/bash

# Start the LogsAgent app (client)
# Connects to server via SSE for config push notifications

LOGS_AGENT_PATH="${LOGS_AGENT_PATH:-/Users/lynn.hoang/Documents/Personal/PAN/src/client/Build/Products/Debug/LogsAgent.app}"
LOGS_AGENT_EXEC="$LOGS_AGENT_PATH/Contents/MacOS/LogsAgent"
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "=== LogsAgent ==="
echo ""

# Check if server is running
echo "Checking server connection..."
if curl -s "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "  Server: $SERVER_URL (connected)"
else
    echo "  Server: $SERVER_URL (not responding)"
    echo "  Warning: Run ./start-server.sh first"
fi
echo ""

# Check if LogsAgent executable exists
if [ ! -f "$LOGS_AGENT_EXEC" ]; then
    echo "Error: LogsAgent not found at $LOGS_AGENT_EXEC"
    echo ""
    echo "Build the app first with Xcode:"
    echo "  1. Open src/client/BestVPN.xcodeproj"
    echo "  2. Select LogsAgent scheme"
    echo "  3. Build (Cmd+B)"
    echo ""
    exit 1
fi

# Kill existing LogsAgent if running
if pgrep -x "LogsAgent" > /dev/null; then
    echo "Stopping existing LogsAgent..."
    pkill -x "LogsAgent"
    sleep 1
fi

echo "Starting LogsAgent..."
echo "  - Tenant: acme-corp"
echo "  - SSE: $SERVER_URL/configs/subscribe/acme-corp"
echo ""
echo "Press Ctrl+C to stop"
echo "----------------------------------------"

# Run executable directly to see stdout in terminal
exec "$LOGS_AGENT_EXEC"
