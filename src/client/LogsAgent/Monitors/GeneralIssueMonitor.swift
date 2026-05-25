//
//  GeneralIssueMonitor.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/23/26.
//

import Foundation
import CoreServices

class GeneralIssueMonitor: BaseMonitor {
    private let generalIssuesLogPath: String
    private var eventStream: FSEventStreamRef?
    private var lastReadPosition: UInt64 = 0
    private var processedLines: Set<String> = []

    override init() {
        generalIssuesLogPath = "/tmp/bestvpn-general-issues.log"
    }

    func startMonitoring() {
        consoleLog("[GeneralIssueMonitor] Starting to monitor: \(generalIssuesLogPath)")
        consoleLog("[GeneralIssueMonitor] File exists: \(FileManager.default.fileExists(atPath: generalIssuesLogPath))")

        // Mark existing content as processed
        markExistingContentAsProcessed()

        // Watch for changes
        startFSEventStream()
    }

    func stopMonitoring() {
        if let stream = eventStream {
            FSEventStreamStop(stream)
            FSEventStreamInvalidate(stream)
            FSEventStreamRelease(stream)
            eventStream = nil
        }
        consoleLog("[GeneralIssueMonitor] Stopped monitoring")
    }

    private func markExistingContentAsProcessed() {
        guard FileManager.default.fileExists(atPath: generalIssuesLogPath) else {
            consoleLog("[GeneralIssueMonitor] Log file does not exist yet")
            return
        }

        guard let content = try? String(contentsOfFile: generalIssuesLogPath, encoding: .utf8) else {
            return
        }

        let lines = content.components(separatedBy: .newlines).filter { !$0.isEmpty }
        for line in lines {
            processedLines.insert(line)
        }
        consoleLog("[GeneralIssueMonitor] Marked \(processedLines.count) existing lines as processed")
    }

    private func startFSEventStream() {
        var context = FSEventStreamContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil,
            release: nil,
            copyDescription: nil
        )

        let callback: FSEventStreamCallback = { (stream, clientCallBackInfo, numEvents, eventPaths, eventFlags, eventIds) in
            guard let info = clientCallBackInfo else { return }
            let monitor = Unmanaged<GeneralIssueMonitor>.fromOpaque(info).takeUnretainedValue()
            monitor.consoleLog("[GeneralIssueMonitor] FSEvent callback triggered")
            monitor.checkForNewIssues()
        }

        let directory = (generalIssuesLogPath as NSString).deletingLastPathComponent
        let pathsToWatch = [directory] as CFArray

        eventStream = FSEventStreamCreate(
            nil,
            callback,
            &context,
            pathsToWatch,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            1.0,
            FSEventStreamCreateFlags(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes)
        )

        guard let stream = eventStream else {
            consoleLog("[GeneralIssueMonitor] Failed to create FSEventStream")
            return
        }

        FSEventStreamSetDispatchQueue(stream, DispatchQueue.global(qos: .utility))
        FSEventStreamStart(stream)
        consoleLog("[GeneralIssueMonitor] FSEventStream started for: \(directory)")
    }

    private func checkForNewIssues() {
        guard FileManager.default.fileExists(atPath: generalIssuesLogPath) else {
            return
        }

        let content: String
        do {
            content = try String(contentsOfFile: generalIssuesLogPath, encoding: .utf8)
        } catch {
            consoleLog("[GeneralIssueMonitor] Failed to read log file: \(error.localizedDescription)")
            return
        }

        var lines = content.components(separatedBy: .newlines).filter { !$0.isEmpty }
        var linesToRemove: [String] = []

        for line in lines {
            if !processedLines.contains(line) {
                consoleLog("[GeneralIssueMonitor] New issue detected: \(line)")
                sendIssueToServer(line)
                linesToRemove.append(line)
            }
        }

        // Remove sent lines from file
        if !linesToRemove.isEmpty {
            for line in linesToRemove {
                lines.removeAll { $0 == line }
                processedLines.insert(line)
            }
            rewriteLogFile(lines)
        }
    }

    private func sendIssueToServer(_ issueText: String) {
        consoleLog("[GeneralIssueMonitor] Sending general issue to server")

        // Collect diagnostics for general issues (use hang diagnostics - non-crash)
        consoleLog("[GeneralIssueMonitor] Collecting diagnostics...")
        let diagnostics = LogsAgentConfigs.shared.collectDiagnostics(forCrash: false)
        consoleLog("[GeneralIssueMonitor] Collected \(diagnostics.count) diagnostic results")

        var content = issueText

        // Append diagnostics to content if any
        if !diagnostics.isEmpty {
            content += "\n\n===== DIAGNOSTICS =====\n"
            for (name, output) in diagnostics {
                content += "\n--- \(name) ---\n\(output)\n"
            }
            consoleLog("[GeneralIssueMonitor] Appended diagnostics to issue content")
        }

        sendToServer(type: "general", content: content, filename: "bestvpn-general-issues.log")
    }

    private func rewriteLogFile(_ remainingLines: [String]) {
        let newContent = remainingLines.joined(separator: "\n") + (remainingLines.isEmpty ? "" : "\n")
        do {
            try newContent.write(toFile: generalIssuesLogPath, atomically: true, encoding: .utf8)
            consoleLog("[GeneralIssueMonitor] Removed sent issues from log file")
        } catch {
            consoleLog("[GeneralIssueMonitor] Failed to rewrite log file: \(error.localizedDescription)")
        }
    }
}
