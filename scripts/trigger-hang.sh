#!/bin/bash

# Simulate a hang report for BestVPN
# Note: macOS only generates .spin/.hang files for GUI apps that block the main run loop.
# Since BestVPN is a CLI, we simulate the hang report for demo purposes.

REPORTS_DIR="$HOME/Library/Logs/DiagnosticReports"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
FILENAME="BestVPN_${TIMESTAMP}.spin"
FILEPATH="${REPORTS_DIR}/${FILENAME}"

# Ensure directory exists
mkdir -p "$REPORTS_DIR"

# Create simulated spin report
cat > "$FILEPATH" << 'EOF'
Spin Report: BestVPN

Date/Time:       TIMESTAMP_PLACEHOLDER
OS Version:      macOS VERSION_PLACEHOLDER
Architecture:    arm64

Command:         BestVPN
Path:            /Applications/BestVPN.app/Contents/MacOS/BestVPN
Parent:          launchd [1]

Responsible:     BestVPN
User:            demo

Duration:        10.02s
Duration (Sampling): 10.02s

Event:           hang
Action taken:    none

Heaviest stack for the main thread of the target process:
  10  ??? (BestVPN + 12345) [0x100003039]
  10  ??? (BestVPN + 23456) [0x100005ba0]
  10  CFRunLoopRunSpecific + 560 (CoreFoundation + 534324) [0x1a0627734]
  10  __CFRunLoopRun + 1212 (CoreFoundation + 537416) [0x1a0628348]
  10  __CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__ + 16 (CoreFoundation + 630120) [0x1a063e968]
  10  _dispatch_main_queue_callback_4CF + 44 (libdispatch.dylib + 74168) [0x1a0267ab8]
  10  _dispatch_lane_invoke + 392 (libdispatch.dylib + 48552) [0x1a0261db8]
  10  _dispatch_lane_serial_drain + 376 (libdispatch.dylib + 45296) [0x1a02610f0]
  10  _dispatch_client_callout + 20 (libdispatch.dylib + 16612) [0x1a025a0e4]
  10  _dispatch_call_block_and_release + 32 (libdispatch.dylib + 13488) [0x1a02594b0]
  10  VPNConnectionManager.connect() + 156 (BestVPN + 34567) [0x100008707]
  10  NetworkTunnel.establishTunnel() + 88 (BestVPN + 45678) [0x10000b26e]
  10  sleep + 44 (libsystem_c.dylib + 123456) [0x1a03e1234]

Thread 0x12345 (Main Thread):
  10  start + 2360 (dyld + 24324) [0x1000a5f04]
  10  main + 52 (BestVPN + 12345) [0x100003039]
  10  VPNApp.run() + 200 (BestVPN + 23456) [0x100005ba0]

Binary Images:
       0x100000000 -        0x10003ffff  BestVPN (1.0.0) <UUID-PLACEHOLDER>
EOF

# Replace placeholders
sed -i '' "s/TIMESTAMP_PLACEHOLDER/$(date '+%Y-%m-%d %H:%M:%S.%3N %z')/" "$FILEPATH"
sed -i '' "s/VERSION_PLACEHOLDER/$(sw_vers -productVersion) ($(sw_vers -buildVersion))/" "$FILEPATH"

echo "Created simulated hang report: $FILEPATH"
echo "The DiagnosticService should detect this file."
