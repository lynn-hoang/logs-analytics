//
//  BaseMonitor.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/22/26.
//

import Foundation
import os.log

class BaseMonitor {
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.pan.bestvpn", category: "BestVPN-Diagnostic")

    func consoleLog(_ message: String) {
        // Print to terminal (stdout) and system Console
        print(message)
        fflush(stdout)
        logger.info("\(message, privacy: .public)")
    }

    func sendToServer(type: String, content: String, filename: String) {
        let e2eTraceId = UUID().uuidString
        consoleLog("[BaseMonitor] === sendToServer START === [traceId: \(e2eTraceId)]")
        consoleLog("[BaseMonitor] Type: \(type), Filename: \(filename), Content size: \(content.count) bytes")

        let serverURL = "\(Constants.serverBaseURL)/logs"
        consoleLog("[BaseMonitor] Target URL: \(serverURL)")

        guard let url = URL(string: serverURL) else {
            consoleLog("[BaseMonitor] Invalid server URL: \(serverURL)")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "type": type,
            "e2eTraceId": e2eTraceId,
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
            "tenantId": "acme-corp",
            "machineId": Host.current().localizedName ?? "unknown",
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "content": content,
            "metadata": [
                "filename": filename
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            consoleLog("[BaseMonitor] Payload serialized, size: \(request.httpBody?.count ?? 0) bytes")
        } catch {
            consoleLog("[BaseMonitor] Failed to serialize payload: \(error)")
            return
        }

        consoleLog("[BaseMonitor] Sending HTTP request...")
        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                self?.consoleLog("[BaseMonitor] HTTP Error: \(error.localizedDescription)")
                return
            }

            if let httpResponse = response as? HTTPURLResponse {
                self?.consoleLog("[BaseMonitor] HTTP Status: \(httpResponse.statusCode)")
            }

            if let data = data, let responseString = String(data: data, encoding: .utf8) {
                self?.consoleLog("[BaseMonitor] Response body: \(responseString)")
            }
            self?.consoleLog("[BaseMonitor] === sendToServer COMPLETE ===")
        }
        task.resume()
        consoleLog("[BaseMonitor] HTTP request initiated (async)")
    }
}
