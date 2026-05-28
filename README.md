# Log Analytics and Resolution

A scalable log analytics and resolution portal that automates troubleshooting for enterprise desktop applications. The system ingests and analyzes logs from customer endpoints, matches them against known issue signatures, and provides actionable self-service resolutions.

## Problem Statement

Enterprise desktop applications run across thousands of endpoints where direct customer access for real-time troubleshooting is highly restricted. This system automates the troubleshooting lifecycle at scale by:

- **Auto-detecting issues** (crashes, hangs, general errors) on endpoints
- **Auto-classifying issues** as known vs. unknown
- **Known issues**: Provide clear self-service fixes (workarounds, updates, KB articles)
- **Unknown issues**: Auto-collect additional diagnostic data

## Goals

- **App-Agnostic**: Works across any desktop application
- **Adaptive Collection**: Backend controls what to collect at runtime
- **Automated Diagnostics**: Classify issues as known vs. unknown
- **Self-Service Resolutions**: For known issues - workarounds, uninstall competitors, app/OS updates

## Architecture

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Endpoint Monitor    │◀───▶│  Intelligent Triage  │◀───▶│  Self-Service        │
│  Agent (EMA)         │     │  Engine (ITE)        │     │  Resolution Hub      │
└──────────────────────┘     └──────────┬───────────┘     └──────────────────────┘
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼              ▼
                   ┌──────────┐   ┌──────────┐   ┌──────────┐
                   │   Logs   │   │Signatures│   │  Issues  │
                   └──────────┘   └──────────┘   └──────────┘
```

### System Components

**Endpoint Monitor Agent (EMA) - macOS/Swift**
- Detects issues (crashes, hangs, general errors)
- Configuration-driven collection (works for any app)
- Monitors: CrashMonitor, HangMonitor, GeneralIssueMonitor
- Config Service: Pulls configs on startup, listens for updates via SSE
- PII scrubbing, chunked uploads, resumable uploads, offline support

**Intelligent Triage Engine (ITE) - Node.js/TypeScript**
- Log Ingestion: Validate & normalize incoming logs
- Queue: Handle burst traffic (100K endpoints × 5 logs/day)
- Orchestrator: Route by issue type (crash/hang/general)
- Issue Processors: Fuzzy match logs against signatures
- Outputs: Known → Notify resolution; Unknown → Create issue, request additional data

**Self-Service Resolution Hub - HTML/CSS/JavaScript**
- Role-based access (Enterprise Admins, Support Agents, Engineers)
- Issues dashboard with status tracking
- Signature management (CRUD operations)
- Diagnostic configuration builder
- APIs: /issues, /signatures, /configs

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

### Smart Log Collection (Configuration-Driven)
- Ship default configs with app (collect crash, hang, app logs, metadata)
- On startup: Pull latest configs from server
- On server notification: Download updated configs via SSE
- Config defines: What app to monitor, what to collect, when to send, additional data (e.g., AV/FW status, VPN on/off, network speed)
- **Update collection behavior without client update**

### Config Update Pipeline
1. Server-side: Engineers analyze issue, determine what data is needed
2. Server-side: Update config, add diagnostic commands
3. Server-side: Trigger notification to admins
4. Desktop-side: EMA receives config push via SSE
5. Desktop-side: Agent collects additional data on next issue

### Why Signature Matching over ML?
- **Interpretable**: See exactly why an issue matched
- **Controllable**: Add/edit/remove signatures without retraining
- **No cold start**: Works day one, no training data needed
- Future: ML can catch unknown patterns once we have labeled data

### Signature Creation Pipeline
1. Support/Dev engineers investigate & fix issue
2. Create signature, add to signature store
3. Incoming logs matched against signatures → marked resolved
4. Notify admins with resolution
5. Admins deploy fixes to endpoints

### Self-Service Resolution
- Auto-resolve matching issues when signatures have resolutions
- Notify enterprise admins with actionable KB articles
- Support can request additional data from endpoints dynamically

## Project Structure

```
logs-analytics/
├── src/
│   ├── client/                 # Endpoint Monitor Agent (EMA)
│   │   ├── LogsAgent/          # Swift agent app
│   │   │   ├── Monitors/       # CrashMonitor, HangMonitor, GeneralIssueMonitor
│   │   │   └── Configs/        # ConfigUpdateService, LogsAgentConfigs
│   │   └── BestVPN/            # Sample monitored app
│   ├── server/                 # Intelligent Triage Engine (ITE)
│   │   └── src/
│   │       ├── processor/      # Issue processors (Crash, Hang, General, Signature)
│   │       ├── routes/         # API routes
│   │       ├── db/             # SQLite database
│   │       └── queue/          # In-memory queue
│   └── portal/                 # Self-Service Resolution Hub
├── docs/
│   ├── presentation.html       # System design presentation
│   └── demo/                   # Demo materials
└── README.md
```

## Scale Considerations

- 100K endpoints × 5 logs/day = 500K logs/day
- Burst: OS update could 10x traffic in 1 hour
- Queue absorbs spikes, auto-scaling processors

## Before Shipping (EMA)

- **PII Scrubbing**: Remove sensitive data (IP addresses, MAC addresses) before sending
- **Chunked Uploads**: Upload large files (e.g., crash dumps) in chunks
- **Resumable Uploads**: Resume interrupted uploads on connection failure
- **Offline Support**: Queue logs locally when offline, send when back online
- **SSE & WebSocket Support**: Configurable transport for config push

## Before Shipping (ITE)

- **Deduplication**: Group similar issues into buckets
- **Canary Deployment**: Gradual rollout of config changes
- **Rollback Strategy**: Quick rollback for log configs
- **Security**: Mitigate threats and prevent abuse
- **Fast Access**: Cache hot issues in memory
- **Availability**: Horizontal scaling on burst traffic

## Production Enhancements

For production deployment, consider adding:

- **Infrastructure**: AWS (Route53, CloudFront, API Gateway, Lambda, SQS, Step Functions)
- **Storage**: S3 for crash dumps, DynamoDB/PostgreSQL for metadata
- **Security**: WAF, rate limiting, Cognito authentication
- **Observability**: CloudWatch, CloudTrail, X-Ray
- **CI/CD pipeline**
- **Data retention & compliance policies**

## License

Proprietary - All rights reserved.

## Author

Lynn Hoang
