//
//  ConfigUpdateService.swift
//  LogsAgent
//
//  Maintains SSE connection to server for config push notifications
//

import Foundation

protocol ConfigUpdateServiceDelegate: AnyObject {
    func configUpdateService(_ service: ConfigUpdateService, didReceiveConfigUpdate configId: String)
}

class ConfigUpdateService: NSObject, URLSessionDataDelegate {
    static let shared = ConfigUpdateService()

    weak var delegate: ConfigUpdateServiceDelegate?

    private let serverURL = "http://localhost:3000"
    private let tenantId = "acme-corp"
    private var urlSession: URLSession?
    private var dataTask: URLSessionDataTask?
    private var isConnected = false
    private var reconnectTimer: Timer?
    private var buffer = Data()

    private override init() {
        super.init()
    }

    func startListening() {
        guard !isConnected else { return }

        // Fetch latest config from server on startup
        print("[ConfigUpdateService] Fetching latest config on startup...")
        pullAndApplyConfig()

        // Then connect to SSE for future updates
        connect()
    }

    func stopListening() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        dataTask?.cancel()
        dataTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        isConnected = false
        print("[ConfigUpdateService] Stopped listening")
    }

    private func connect() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = TimeInterval(INT_MAX)
        config.timeoutIntervalForResource = TimeInterval(INT_MAX)

        urlSession = URLSession(configuration: config, delegate: self, delegateQueue: .main)

        guard let url = URL(string: "\(serverURL)/configs/subscribe/\(tenantId)") else {
            print("[ConfigUpdateService] Invalid URL")
            return
        }

        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")

        dataTask = urlSession?.dataTask(with: request)
        dataTask?.resume()

        print("[ConfigUpdateService] Connecting to \(url)")
    }

    private func scheduleReconnect() {
        guard reconnectTimer == nil else { return }
        print("[ConfigUpdateService] Scheduling reconnect in 5 seconds...")
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            self?.reconnectTimer = nil
            self?.connect()
        }
    }

    private func processEvent(_ eventData: String) {
        guard let data = eventData.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        switch type {
        case "connected":
            isConnected = true
            print("[ConfigUpdateService] Connected to server")

        case "heartbeat":
            // print("[ConfigUpdateService] Heartbeat received")
            break

        case "config_update":
            if let configId = json["configId"] as? String {
                print("[ConfigUpdateService] Config update notification received: \(configId)")
                delegate?.configUpdateService(self, didReceiveConfigUpdate: configId)
                pullAndApplyConfig()
            }

        default:
            break
        }
    }

    private func pullAndApplyConfig() {
        guard let url = URL(string: "\(serverURL)/configs/\(tenantId)") else {
            print("[ConfigUpdateService] Invalid config URL")
            return
        }

        print("[ConfigUpdateService] Pulling config from: \(url)")

        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            if let error = error {
                print("[ConfigUpdateService] Failed to pull config: \(error.localizedDescription)")
                return
            }

            if let httpResponse = response as? HTTPURLResponse {
                print("[ConfigUpdateService] Server response: \(httpResponse.statusCode)")
                if httpResponse.statusCode == 404 {
                    print("[ConfigUpdateService] No config found for tenant, using defaults")
                    return
                }
            }

            guard let data = data else {
                print("[ConfigUpdateService] No data received")
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    self?.saveConfigLocally(json)
                    print("[ConfigUpdateService] Config pulled and saved successfully")

                    // Log the commands that were loaded
                    if let commands = json["additionalCommands"] as? [[String: Any]] {
                        print("[ConfigUpdateService] Loaded \(commands.count) diagnostic commands:")
                        for cmd in commands {
                            if let name = cmd["name"] as? String {
                                print("[ConfigUpdateService]   - \(name)")
                            }
                        }
                    }

                    DispatchQueue.main.async {
                        // Reload the shared config
                        LogsAgentConfigs.reload()
                        NotificationCenter.default.post(name: .configDidUpdate, object: nil)
                    }
                }
            } catch {
                print("[ConfigUpdateService] Failed to parse config: \(error)")
            }
        }
        task.resume()
    }

    private func saveConfigLocally(_ config: [String: Any]) {
        let fileManager = FileManager.default
        guard let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return
        }

        let configDir = appSupport.appendingPathComponent("LogsAgent")
        try? fileManager.createDirectory(at: configDir, withIntermediateDirectories: true)

        let configFile = configDir.appendingPathComponent("diagnostic-config.json")

        do {
            let data = try JSONSerialization.data(withJSONObject: config, options: .prettyPrinted)
            try data.write(to: configFile)
            print("[ConfigUpdateService] Config saved to: \(configFile.path)")
        } catch {
            print("[ConfigUpdateService] Failed to save config: \(error)")
        }
    }

    // MARK: - URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        buffer.append(data)

        while let range = buffer.range(of: Data("\n\n".utf8)) {
            let eventData = buffer.subdata(in: 0..<range.lowerBound)
            buffer.removeSubrange(0..<range.upperBound)

            if let eventString = String(data: eventData, encoding: .utf8) {
                let lines = eventString.components(separatedBy: "\n")
                for line in lines {
                    if line.hasPrefix("data: ") {
                        let jsonString = String(line.dropFirst(6))
                        processEvent(jsonString)
                    }
                }
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        isConnected = false
        if let error = error {
            print("[ConfigUpdateService] Connection error: \(error.localizedDescription)")
        } else {
            print("[ConfigUpdateService] Connection closed")
        }
        scheduleReconnect()
    }
}

extension Notification.Name {
    static let configDidUpdate = Notification.Name("configDidUpdate")
}
