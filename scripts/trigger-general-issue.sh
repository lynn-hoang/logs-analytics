#!/bin/bash

# Trigger a general issue using BestVPN CLI
# Usage: ./trigger-general-issue.sh "Failed to connect to VPN server"

BESTVPN_PATH="${BESTVPN_PATH:-/Users/lynn.hoang/Documents/Personal/PAN/src/client/Build/Products/Debug/BestVPN.app/Contents/MacOS/BestVPN}"

if [ ! -f "$BESTVPN_PATH" ]; then
    echo "Error: BestVPN CLI not found at $BESTVPN_PATH"
    echo "Set BESTVPN_PATH environment variable or build the CLI first."
    exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: $0 \"<issue description>\""
    echo "Example: $0 \"Failed to connect to VPN server\""
    exit 1
fi

ISSUE_TEXT="$1"

echo "Triggering general issue via BestVPN CLI..."
printf "3\n%s\n4\n" "$ISSUE_TEXT" | "$BESTVPN_PATH"
echo "Done."
