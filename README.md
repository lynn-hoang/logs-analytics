# Log Analytics and Resolution System

A scalable log analytics and resolution portal that automates troubleshooting for enterprise desktop applications. The system ingests and analyzes logs from customer endpoints, matches them against known issue signatures, and provides actionable self-service resolutions.

## Problem Statement

Enterprise desktop applications run across thousands of endpoints where direct customer access for real-time troubleshooting is highly restricted. This system automates the troubleshooting lifecycle at scale by:

- Collecting and analyzing logs from enterprise endpoints
- Matching log patterns against known issue signatures
- Providing immediate, actionable resolutions for known issues
- Enabling self-service for enterprise admins (not auto-remediation)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Logs Agent    │────▶│ Backend Service │◀────│     Portal      │
│    (Client)     │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌──────────┐  ┌─────────┐
              │  Logs   │  │Signatures│  │ Issues  │
              └─────────┘  └──────────┘  └─────────┘
```

### System Components

**Logs Agent Client (macOS/Swift)**
- Detects issues (crashes, hangs, general errors)
- Collects relevant logs with PII scrubbing
- Configuration-driven collection (works for any app)
- Monitors: CrashMonitor, HangMonitor, GeneralIssueMonitor

**Backend Service (Node.js/TypeScript)**
- Log ingestion with queue-based processing
- Orchestrator routes logs by type (crash/hang/general)
- Signature matching for automatic resolution
- REST API for portal operations

**Portal (HTML/CSS/JavaScript)**
- Issues dashboard with status tracking
- Signature management (CRUD operations)
- Diagnostic configuration builder
- Role-based access control

## User Roles

| Role | Permissions |
|------|-------------|
| Enterprise Admins | View own organization's issues, push config updates |
| Support Agents | View all issues, signatures, and configs |
| Engineers | Full access: manage signatures, configs, and resolutions |

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (for macOS client)

### Backend Server

```bash
cd src/server
npm install
npm run build
npm start
```

The server runs on `http://localhost:3000` by default.

### Portal

Open `src/portal/index.html` in a browser, or serve it via:

```bash
cd src/portal
npx serve .
```

### macOS Client (LogsAgent)

Open `src/client/LogsAgent.xcodeproj` in Xcode and build/run.

## API Endpoints

### Client → Backend

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/logs` | Submit log payload |
| GET | `/configs/:tenantId` | Download diagnostic configuration |

### Portal → Backend

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/issues` | CRUD operations + batch resolve |
| GET/POST/PUT | `/signatures` | Signature management |
| GET/POST | `/configs` | Configuration management |

## Key Features

### Smart Log Collection
- Configuration-driven monitoring (customize per app/enterprise)
- Different configs per issue type (crash vs hang vs general)
- Update configs without client update via server push

### Smart Diagnostics
- Signature matching for known issue resolution
- Fuzzy matching handles slight variations
- Interpretable and controllable (vs ML black box)
- No cold start - works day one without training data

### Self-Service Resolution
- Auto-resolve matching issues when signatures have resolutions
- Notify enterprise admins with actionable KB articles
- Support can request additional data from endpoints

## Project Structure

```
logs-analytics/
├── src/
│   ├── client/                 # macOS Logs Agent
│   │   ├── LogsAgent/          # Swift agent app
│   │   └── BestVPN/            # Sample monitored app
│   ├── server/                 # Backend service
│   │   └── src/
│   │       ├── processor/      # Log processors (Crash, Hang, General)
│   │       ├── routes/         # API routes
│   │       ├── db/             # SQLite database
│   │       └── queue/          # In-memory queue
│   └── portal/                 # Web portal
├── docs/
│   ├── requirement.txt         # Project requirements
│   └── demo/                   # Demo materials
└── README.md
```

## Scale Considerations

- Designed for 100K+ endpoints × 5 logs/day = 500K logs/day
- Queue absorbs traffic bursts (e.g., 10x on OS updates)
- Auto-scaling backend workers for horizontal scaling

## Production Enhancements

For production deployment, consider adding:

- **Infrastructure**: AWS (Route53, CloudFront, API Gateway, Lambda, SQS, Step Functions)
- **Storage**: S3 for crash dumps, DynamoDB/PostgreSQL for metadata
- **Security**: WAF, rate limiting, Cognito authentication
- **Observability**: CloudWatch, CloudTrail, X-Ray
- **CI/CD pipeline**
- **Data retention & compliance policies

## License

Proprietary - All rights reserved.

## Author

Lynn Hoang
