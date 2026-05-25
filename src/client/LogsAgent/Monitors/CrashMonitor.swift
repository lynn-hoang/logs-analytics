//
//  CrashMonitor.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/22/26.
//

import Foundation
import CoreServices

class CrashMonitor: BaseMonitor {
    private let crashReportsPath: String
    private var processedFiles: Set<String> = []
    private var eventStream: FSEventStreamRef?

    override init() {
        crashReportsPath = Constants.crashReportsPath
    }

    func startMonitoring() {
        consoleLog("[CrashMonitor] Starting to monitor: \(crashReportsPath)")
        consoleLog("[CrashMonitor] Directory exists: \(FileManager.default.fileExists(atPath: crashReportsPath))")

        // Scan existing crashes first
        scanExistingCrashes()

        // Watch for new crashes using FSEvents
        startFSEventStream()
    }

    func stopMonitoring() {
        if let stream = eventStream {
            FSEventStreamStop(stream)
            FSEventStreamInvalidate(stream)
            FSEventStreamRelease(stream)
            eventStream = nil
        }
        consoleLog("[CrashMonitor] Stopped monitoring")
    }

    private func scanExistingCrashes() {
        let fileManager = FileManager.default

        guard let files = try? fileManager.contentsOfDirectory(atPath: crashReportsPath) else {
            consoleLog("[CrashMonitor] Cannot read DiagnosticReports directory")
            return
        }

        let crashFiles = files.filter { isBestVPNCrashFile($0) }
        consoleLog("[CrashMonitor] Found \(crashFiles.count) existing BestVPN crash(es)")

        for file in crashFiles {
            processedFiles.insert(file)
        }
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
            let monitor = Unmanaged<CrashMonitor>.fromOpaque(info).takeUnretainedValue()
            monitor.consoleLog("[CrashMonitor] FSEvent callback triggered, numEvents: \(numEvents)")
            monitor.handleDirectoryChange()
        }

        let pathsToWatch = [crashReportsPath] as CFArray

        eventStream = FSEventStreamCreate(
            nil,
            callback,
            &context,
            pathsToWatch,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            1.0,  // 1 second latency
            FSEventStreamCreateFlags(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes)
        )

        guard let stream = eventStream else {
            consoleLog("[CrashMonitor] Failed to create FSEventStream")
            return
        }

        FSEventStreamSetDispatchQueue(stream, DispatchQueue.global(qos: .utility))
        FSEventStreamStart(stream)
        consoleLog("[CrashMonitor] FSEventStream started for: \(crashReportsPath)")
    }

    private func handleDirectoryChange() {
        consoleLog("[CrashMonitor] Directory change detected!")
        let fileManager = FileManager.default

        guard let files = try? fileManager.contentsOfDirectory(atPath: crashReportsPath) else {
            consoleLog("[CrashMonitor] Failed to read directory contents")
            return
        }

        consoleLog("[CrashMonitor] Total files in directory: \(files.count)")
        let crashFiles = files.filter { isBestVPNCrashFile($0) }
        consoleLog("[CrashMonitor] BestVPN crash files found: \(crashFiles.count)")

        for file in crashFiles {
            consoleLog("[CrashMonitor] Checking file: \(file), already processed: \(processedFiles.contains(file))")
            if !processedFiles.contains(file) {
                processedFiles.insert(file)
                let fullPath = "\(crashReportsPath)/\(file)"
                consoleLog("[CrashMonitor] Processing new crash file: \(fullPath)")
                handleNewCrashReport(at: URL(fileURLWithPath: fullPath))
            }
        }
    }

    private func isBestVPNCrashFile(_ filename: String) -> Bool {
        let lowercased = filename.lowercased()
        return lowercased.contains(Constants.productName) &&
               (lowercased.hasSuffix(".ips") || lowercased.hasSuffix(".crash"))
    }

    private func handleNewCrashReport(at url: URL) {
        consoleLog("[CrashMonitor] === handleNewCrashReport START ===")
        consoleLog("[CrashMonitor] File path: \(url.path)")
        consoleLog("[CrashMonitor] File exists: \(FileManager.default.fileExists(atPath: url.path))")

        // Collect diagnostics for crash
        consoleLog("[CrashMonitor] Collecting diagnostics...")
        let diagnostics = LogsAgentConfigs.shared.collectDiagnostics(forCrash: true)
        consoleLog("[CrashMonitor] Collected \(diagnostics.count) diagnostic results")

        // Read crash content
        do {
            var content = try String(contentsOf: url, encoding: .utf8)
            consoleLog("[CrashMonitor] Successfully read crash file, size: \(content.count) bytes")
            consoleLog("[CrashMonitor] First 200 chars: \(String(content.prefix(200)))")

            // Append diagnostics to content if any
            if !diagnostics.isEmpty {
                content += "\n\n===== DIAGNOSTICS =====\n"
                for (name, output) in diagnostics {
                    content += "\n--- \(name) ---\n\(output)\n"
                }
                consoleLog("[CrashMonitor] Appended diagnostics to crash content")
            }

            consoleLog("[CrashMonitor] Calling sendToServer...")
            sendToServer(type: "crash", content: content, filename: url.lastPathComponent)
            consoleLog("[CrashMonitor] sendToServer called")
        } catch {
            consoleLog("[CrashMonitor] Failed to read crash file: \(error.localizedDescription)")
        }
        consoleLog("[CrashMonitor] === handleNewCrashReport END ===")
    }
}
