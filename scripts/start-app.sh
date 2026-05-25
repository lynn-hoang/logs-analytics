#!/bin/bash

# Start the BestVPN app

BESTVPN_PATH="${BESTVPN_PATH:-/Users/lynn.hoang/Documents/Personal/PAN/src/client/Build/Products/Debug/BestVPN.app/Contents/MacOS/BestVPN}"

if [ ! -f "$BESTVPN_PATH" ]; then
    echo "Error: BestVPN not found at $BESTVPN_PATH"
    echo ""
    echo "Build the app first with Xcode:"
    echo "  1. Open src/client/BestVPN.xcodeproj"
    echo "  2. Build (Cmd+B)"
    echo ""
    exit 1
fi

echo "Starting BestVPN..."
"$BESTVPN_PATH"
