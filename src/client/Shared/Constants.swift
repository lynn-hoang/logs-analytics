//
//  Constants.swift
//  BestVPN
//
//  Created by Lynn Hoang on 5/22/26.
//

import Foundation

enum Constants {
    static let productName = "bestvpn"
    static let diagnosticServiceIdentifier = "com.pan.bestvpn.diagnosticservice"
    static let serverBaseURL = "http://localhost:3000"

    static var crashReportsPath: String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return "\(home)/Library/Logs/DiagnosticReports"
    }
}
