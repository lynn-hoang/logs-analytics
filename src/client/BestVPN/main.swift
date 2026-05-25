//
//  main.swift
//  BestVPN CLI
//
//  Created by Lynn Hoang on 5/23/26.
//

import Foundation

struct BestVPNCLI {
    static let generalIssuesLogPath = "/tmp/bestvpn-general-issues.log"

    static func main() {
        printMenu()

        while true {
            print("\nEnter choice (1-4): ", terminator: "")
            guard let input = readLine()?.trimmingCharacters(in: .whitespaces) else {
                continue
            }

            switch input {
            case "1":
                triggerCrash()
            case "2":
                triggerHang()
            case "3":
                promptAndLogGeneralIssue()
            case "4":
                print("Exiting BestVPN CLI.")
                exit(0)
            default:
                print("Invalid choice. Please enter 1-4.")
            }
        }
    }

    static func printMenu() {
        print("""

        =====================================
              BestVPN CLI - Demo Tool
        =====================================
        1. Generate Crash
        2. Generate Hang
        3. Log General Issue
        4. Exit
        =====================================
        """)
    }

    static func triggerCrash() {
        print("Triggering crash in 2 seconds...")
        sleep(2)
        let array: [Int] = []
        _ = array[1]
    }

    static func triggerHang() {
        print("Triggering hang (infinite loop on main thread)...")
        print("Press Ctrl+C to force quit.")
        while true {
            // Infinite loop
        }
    }

    static func promptAndLogGeneralIssue() {
        print("Enter the issue description: ", terminator: "")
        guard let issueText = readLine(), !issueText.isEmpty else {
            print("No issue text provided.")
            return
        }

        logGeneralIssue(issueText)
    }

    static func logGeneralIssue(_ message: String) {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] \(message)\n"
        let logPath = generalIssuesLogPath
        let url = URL(fileURLWithPath: logPath)

        do {
            if FileManager.default.fileExists(atPath: logPath) {
                // Append to existing file
                let fileHandle = try FileHandle(forWritingTo: url)
                fileHandle.seekToEndOfFile()
                if let data = logEntry.data(using: .utf8) {
                    fileHandle.write(data)
                }
                fileHandle.closeFile()
            } else {
                // Create new file
                try logEntry.write(to: url, atomically: true, encoding: .utf8)
                print("Created general issues log at: \(logPath)")
            }
            print("Logged issue: \(message)")
        } catch {
            print("Failed to write to log file: \(error.localizedDescription)")
        }
    }
}

BestVPNCLI.main()
