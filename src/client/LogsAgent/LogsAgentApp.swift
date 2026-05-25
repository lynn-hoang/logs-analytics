//
//  LogsAgentApp.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/22/26.
//

import Foundation
import Cocoa

@main
struct LogsAgentMain {
    // Keep strong reference to prevent deallocation (NSApplication.delegate is weak)
    static var appDelegate: AppDelegate?

    static func main() {
        let app = NSApplication.shared
        appDelegate = AppDelegate()
        app.delegate = appDelegate
        app.run()
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, ConfigUpdateServiceDelegate {
    private var crashMonitor: CrashMonitor?
    private var hangMonitor: HangMonitor?
    private var generalIssueMonitor: GeneralIssueMonitor?

    func applicationDidFinishLaunching(_ notification: Notification) {
        print("[LogsAgent] Started")

        // Start monitors
        crashMonitor = CrashMonitor()
        crashMonitor?.startMonitoring()
        hangMonitor = HangMonitor()
        hangMonitor?.startMonitoring()
        generalIssueMonitor = GeneralIssueMonitor()
        generalIssueMonitor?.startMonitoring()

        // Start listening for config updates from server
        ConfigUpdateService.shared.delegate = self
        ConfigUpdateService.shared.startListening()
    }

    func applicationWillTerminate(_ notification: Notification) {
        crashMonitor?.stopMonitoring()
        hangMonitor?.stopMonitoring()
        generalIssueMonitor?.stopMonitoring()
        ConfigUpdateService.shared.stopListening()
        print("[LogsAgent] Stopped")
    }

    // MARK: - ConfigUpdateServiceDelegate

    func configUpdateService(_ service: ConfigUpdateService, didReceiveConfigUpdate configId: String) {
        print("[LogsAgent] Received config update notification, reloading config...")
    }
}
