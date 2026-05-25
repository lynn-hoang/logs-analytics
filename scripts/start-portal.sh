#!/bin/bash

# Start the Portal UI
# Uses Python's built-in HTTP server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$SCRIPT_DIR/../src/portal"
PORT="${PORT:-8080}"

echo "Starting Central Support Portal..."
echo "Open http://localhost:$PORT in your browser"
echo "Press Ctrl+C to stop"
echo ""

cd "$PORTAL_DIR"
python3 -m http.server $PORT
