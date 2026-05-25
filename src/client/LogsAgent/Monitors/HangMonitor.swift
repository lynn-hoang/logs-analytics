//
//  HangMonitor.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/22/26.
//

import Foundation

class HangMonitor: BaseMonitor {
    private let hangReportsPath: String
    private var directoryMonitor: DispatchSourceFileSystemObject?
    private var fileDescriptor: Int32 = -1
    private var processedFiles: Set<String> = []

    override init() {
        hangReportsPath = Constants.crashReportsPath
    }

    func startMonitoring() {
        consoleLog("[HangMonitor] Starting to monitor: \(hangReportsPath)")

        // Scan existing hangs first
        scanExistingHangs()

        // Watch for new hangs
        watchDirectory()
    }

    func stopMonitoring() {
        directoryMonitor?.cancel()
        directoryMonitor = nil
        if fileDescriptor != -1 {
            close(fileDescriptor)
            fileDescriptor = -1
        }
        consoleLog("[HangMonitor] Stopped monitoring")
    }

    private func scanExistingHangs() {
        let fileManager = FileManager.default

        guard let files = try? fileManager.contentsOfDirectory(atPath: hangReportsPath) else {
            consoleLog("[HangMonitor] Cannot read DiagnosticReports directory")
            return
        }

        let hangFiles = files.filter { isBestVPNHangFile($0) }
        consoleLog("[HangMonitor] Found \(hangFiles.count) existing BestVPN hang(s)")

        for file in hangFiles {
            processedFiles.insert(file)
        }
    }

    private func watchDirectory() {
        fileDescriptor = open(hangReportsPath, O_EVTONLY)
        guard fileDescriptor != -1 else {
            consoleLog("[HangMonitor] Failed to open directory for monitoring")
            return
        }

        directoryMonitor = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask: .write,
            queue: DispatchQueue.global(qos: .utility)
        )

        directoryMonitor?.setEventHandler { [weak self] in
            self?.handleDirectoryChange()
        }

        directoryMonitor?.setCancelHandler { [weak self] in
            if let fd = self?.fileDescriptor, fd != -1 {
                close(fd)
                self?.fileDescriptor = -1
            }
        }

        directoryMonitor?.resume()
        consoleLog("[HangMonitor] Watching for new hangs...")
    }

    private func handleDirectoryChange() {
        let fileManager = FileManager.default

        guard let files = try? fileManager.contentsOfDirectory(atPath: hangReportsPath) else {
            return
        }

        let hangFiles = files.filter { isBestVPNHangFile($0) }

        for file in hangFiles {
            if !processedFiles.contains(file) {
                processedFiles.insert(file)
                let fullPath = "\(hangReportsPath)/\(file)"
                handleNewHangReport(at: URL(fileURLWithPath: fullPath))
            }
        }
    }

    private func isBestVPNHangFile(_ filename: String) -> Bool {
        let lowercased = filename.lowercased()
        return lowercased.contains(Constants.productName) &&
               (lowercased.hasSuffix(".spin") || lowercased.hasSuffix(".hang"))
    }

    private func handleNewHangReport(at url: URL) {
        consoleLog("[HangMonitor] New hang detected: \(url.lastPathComponent)")

        // Collect diagnostics for hang
        consoleLog("[HangMonitor] Collecting diagnostics...")
        let diagnostics = LogsAgentConfigs.shared.collectDiagnostics(forCrash: false)
        consoleLog("[HangMonitor] Collected \(diagnostics.count) diagnostic results")

        // Read hang content
        guard var content = try? String(contentsOf: url, encoding: .utf8) else {
            consoleLog("[HangMonitor] Failed to read hang file")
            return
        }

        consoleLog("[HangMonitor] Total hang file size: \(content.count) bytes")

        // Append diagnostics to content if any
        if !diagnostics.isEmpty {
            content += "\n\n===== DIAGNOSTICS =====\n"
            for (name, output) in diagnostics {
                content += "\n--- \(name) ---\n\(output)\n"
            }
            consoleLog("[HangMonitor] Appended diagnostics to hang content")
        }

        // Send to server
        sendToServer(type: "hang", content: content, filename: url.lastPathComponent)
    }
}
