//
//  LogsAgentConfigs.swift
//  LogsAgent
//
//  Created by Lynn Hoang on 5/23/26.
//

import Foundation

struct LogsAgentConfigs {

    enum Frequency {
        case immediately
        case interval(TimeInterval)

        var isImmediate: Bool {
            if case .immediately = self { return true }
            return false
        }

        var seconds: TimeInterval {
            switch self {
            case .immediately: return 0
            case .interval(let t): return t
            }
        }
    }

    struct MonitoringInterval {
        let crash: Frequency
        let hang: Frequency
        let general: Frequency
    }

    struct DiagnosticCommand {
        let name: String
        let command: String
        let arguments: [String]
        let includeWithCrash: Bool
        let includeWithHang: Bool
    }

    let appName: String
    let productIdentifier: String
    let monitoringInterval: MonitoringInterval
    let additionalCommands: [DiagnosticCommand]

    private(set) static var shared: LogsAgentConfigs = {
        if let config = loadFromJSON() {
            return config
        }
        return defaultConfig
    }()

    static func reload() {
        if let config = loadFromJSON() {
            shared = config
            print("[LogsAgentConfigs] Config reloaded")
        }
    }

    private static var defaultConfig: LogsAgentConfigs {
        LogsAgentConfigs(
            appName: "BestVPN",
            productIdentifier: "bestvpn",
            monitoringInterval: MonitoringInterval(
                crash: .immediately,
                hang: .immediately,
                general: .interval(300.0)
            ),
            additionalCommands: []
        )
    }

    private static func loadFromJSON() -> LogsAgentConfigs? {
        var json: [String: Any]?

        // First try to load from Application Support (pushed config)
        let fileManager = FileManager.default
        if let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            let pushedConfig = appSupport
                .appendingPathComponent("LogsAgent")
                .appendingPathComponent("diagnostic-config.json")

            if fileManager.fileExists(atPath: pushedConfig.path),
               let data = try? Data(contentsOf: pushedConfig),
               let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                json = parsed
                print("[LogsAgentConfigs] Loaded config from Application Support")
            }
        }

        // Fall back to bundle
        if json == nil {
            guard let url = Bundle.main.url(forResource: "diagnostic-config", withExtension: "json"),
                  let data = try? Data(contentsOf: url),
                  let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("[LogsAgentConfigs] Failed to load diagnostic-config.json from bundle")
                return nil
            }
            json = parsed
            print("[LogsAgentConfigs] Loaded config from bundle")
        }

        guard let json = json else { return nil }

        let appName = json["appName"] as? String ?? "BestVPN"
        let productIdentifier = json["productIdentifier"] as? String ?? "bestvpn"

        // Parse monitoring intervals
        var crashFreq: Frequency = .immediately
        var hangFreq: Frequency = .immediately
        var generalFreq: Frequency = .interval(300.0)

        if let intervals = json["monitoringInterval"] as? [String: Any] {
            crashFreq = parseFrequency(intervals["crash"] as? [String: Any])
            hangFreq = parseFrequency(intervals["hang"] as? [String: Any])
            generalFreq = parseFrequency(intervals["general"] as? [String: Any])
        }

        // Parse commands
        var commands: [DiagnosticCommand] = []
        if let commandsArray = json["additionalCommands"] as? [[String: Any]] {
            for cmdJson in commandsArray {
                if let name = cmdJson["name"] as? String,
                   let command = cmdJson["command"] as? String {
                    let arguments = cmdJson["arguments"] as? [String] ?? []
                    let includeWithCrash = cmdJson["includeWithCrash"] as? Bool ?? false
                    let includeWithHang = cmdJson["includeWithHang"] as? Bool ?? false

                    commands.append(DiagnosticCommand(
                        name: name,
                        command: command,
                        arguments: arguments,
                        includeWithCrash: includeWithCrash,
                        includeWithHang: includeWithHang
                    ))
                }
            }
        }

        print("[LogsAgentConfigs] Loaded config: appName=\(appName), commands=\(commands.count)")

        return LogsAgentConfigs(
            appName: appName,
            productIdentifier: productIdentifier,
            monitoringInterval: MonitoringInterval(
                crash: crashFreq,
                hang: hangFreq,
                general: generalFreq
            ),
            additionalCommands: commands
        )
    }

    private static func parseFrequency(_ dict: [String: Any]?) -> Frequency {
        guard let dict = dict, let frequency = dict["frequency"] as? String else {
            return .immediately
        }

        if frequency == "interval", let seconds = dict["seconds"] as? Double {
            return .interval(seconds)
        }

        return .immediately
    }

    func runCommand(_ cmd: DiagnosticCommand) -> String? {
        print("[LogsAgentConfigs] Running command: \(cmd.name) - \(cmd.command) \(cmd.arguments.joined(separator: " "))")

        let process = Process()
        process.executableURL = URL(fileURLWithPath: cmd.command)
        process.arguments = cmd.arguments

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()

            // Set a 60 second timeout to allow network tests to complete
            let timeout: TimeInterval = 60
            let deadline = Date().addingTimeInterval(timeout)

            while process.isRunning && Date() < deadline {
                Thread.sleep(forTimeInterval: 0.1)
            }

            if process.isRunning {
                print("[LogsAgentConfigs] Command '\(cmd.name)' timed out after \(Int(timeout))s, terminating...")
                process.terminate()
                return "[Command timed out after \(Int(timeout)) seconds]"
            }

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8)
            print("[LogsAgentConfigs] Command '\(cmd.name)' output length: \(output?.count ?? 0) bytes")
            return output
        } catch {
            print("[LogsAgentConfigs] Command '\(cmd.name)' failed: \(error.localizedDescription)")
            return nil
        }
    }

    func collectDiagnostics(forCrash: Bool) -> [String: String] {
        print("[LogsAgentConfigs] collectDiagnostics called, forCrash: \(forCrash), commands count: \(additionalCommands.count)")
        var results: [String: String] = [:]

        for cmd in additionalCommands {
            let shouldInclude = forCrash ? cmd.includeWithCrash : cmd.includeWithHang
            print("[LogsAgentConfigs] Command '\(cmd.name)' - shouldInclude: \(shouldInclude) (includeWithCrash: \(cmd.includeWithCrash), includeWithHang: \(cmd.includeWithHang))")
            if shouldInclude, let output = runCommand(cmd) {
                results[cmd.name] = output
            }
        }

        print("[LogsAgentConfigs] collectDiagnostics returning \(results.count) results")
        return results
    }
}
