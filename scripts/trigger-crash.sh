#!/bin/bash

# Generate a crash using BestVPN CLI
# This script sends "1" to trigger the crash option

BESTVPN_PATH="${BESTVPN_PATH:-/Users/lynn.hoang/Documents/Personal/PAN/src/client/Build/Products/Debug/BestVPN.app/Contents/MacOS/BestVPN}"

if [ ! -f "$BESTVPN_PATH" ]; then
    echo "Error: BestVPN CLI not found at $BESTVPN_PATH"
    echo "Set BESTVPN_PATH environment variable or build the CLI first."
    exit 1
fi

echo "Triggering crash via BestVPN CLI..."
echo "1" | "$BESTVPN_PATH" &
sleep 3
echo "Crash triggered."
