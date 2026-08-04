# CCaaS Migration Suite — Product Requirements Document (PRD)

**Product Owner:** EXL Services  
**Version:** 1.0  
**Last Updated:** July 31, 2026  
**Status:** In Progress

---

## 1. Executive Summary

The CCaaS Migration Suite is an enterprise-grade, multi-tenant web platform that automates end-to-end migration of contact center configurations from legacy/source CCaaS platforms to modern target CCaaS platforms. The core pipeline: **Connect → Discover → Analyze → Map → Convert → Deploy → Test → Cutover**.

---

## 2. Platform Research & Technical Requirements

### 2.1 TARGET PLATFORMS (Modern Cloud CCaaS)

---

#### 2.1.1 Genesys Cloud CX ✅ RESEARCHED

**Export/Import Capabilities:**
- Architect flows export as `.i3flow` files (JSON-based) or YAML format via Archy CLI
- Archy CLI enables bulk export of all Architect flows programmatically
- CX as Code (Terraform provider) supports full infrastructure-as-code deployment
- Platform API: `/api/v2/flows/{flowId}` returns full flow JSON
- Flows can be imported, but imports overwrite existing configurations (no merge)
- Data actions with similar names need remapping on import
- Validation errors detected automatically on import

**Objects Available via API:**
- [x] Inbound/Outbound/In-Queue call flows (Architect)
- [x] Queues, Skills, Wrap-up codes
- [x] DNIS / DID routing
- [x] IVR menus, prompts (audio/TTS)
- [x] Data Actions (REST integrations)
- [x] Schedules & schedule groups
- [x] Agent groups, divisions
- [x] Edge/BYOC trunk configurations
- [x] Outbound campaigns & contact lists
- [x] Quality evaluation forms
- [x] Workforce management configs

**Connector Requirements:**
- Auth: OAuth 2.0 (Client Credentials grant)
- Region-specific endpoints (mypurecloud.com, .de, .jp, .au, etc.)
- Rate limits: 300 requests/min for most APIs
- SDK: JavaScript, Python, Java SDKs available

**SME Input Needed:**
- Division/org structure mapping (Genesys divisions ≠ source org structure)
- Edge/BYOC carrier SIP trunk configs (voice path, no API migration)
- Custom data actions need rebuild (REST endpoint mapping)
- Genesys Predictive Routing model retraining

---

#### 2.1.2 Amazon Connect ✅ RESEARCHED

**Export/Import Capabilities:**
- Contact flows export as JSON via console UI or API (`describe-contact-flow`)
- **Important:** Console export JSON format ≠ API JSON format — they are incompatible
- Programmatic import via `create-contact-flow` / `update-contact-flow` API
- Contact flow JSON contains ARN references — all ARNs must be remapped per instance
- contact-flow-parser (AWS open source) parameterizes ARNs with mustache templates
- Export limit: <200 blocks per flow, <1MB total size
- Large flows must be split before export

**Objects Available via API:**
- [x] Contact flows (inbound, outbound, customer queue, whisper, hold)
- [x] Queues & routing profiles
- [x] Hours of operation
- [x] Prompts (audio files via S3)
- [x] Contact flow modules (reusable sub-flows)
- [x] Quick connects
- [x] Phone numbers (DID/toll-free)
- [x] Agent hierarchy & security profiles
- [x] Lambda function references
- [x] Lex bot associations
- [x] Instance-level settings

**Connector Requirements:**
- Auth: AWS IAM (Access Key + Secret) or IAM Role/STS
- Region-specific Connect instances
- CloudFormation/CDK for infrastructure deployment
- S3 for prompt/recording storage

**SME Input Needed:**
- Lambda function code (custom business logic — cannot auto-migrate)
- Lex bot definitions (NLU models need rebuild per target)
- Connect instance ID & region mapping
- Security profile & permission mapping
- Third-party CRM integrations (Salesforce CTI adapter config)
- Contact Lens analytics configuration

---

#### 2.1.3 Twilio Flex ✅ RESEARCHED

**Export/Import Capabilities:**
- Twilio Flex is API/code-first — no visual flow export like Genesys/Connect
- Studio Flows export as JSON via REST API
- TaskRouter configuration exportable via API (workflows, task queues, workers)
- Flex configuration managed via REST API + Plugins (React components)
- Flex Plugins deployed as Serverless Assets or via Flex Plugins CLI

**Objects Available via API:**
- [x] Studio Flows (visual IVR builder — JSON)
- [x] TaskRouter Workspaces, Workflows, Task Queues, Workers
- [x] Phone numbers (Twilio Numbers API)
- [x] TwiML Apps & SIP trunks
- [x] Flex Insights (analytics config)
- [x] Flex Plugins (custom UI — React code)
- [x] Serverless Functions
- [x] Messaging services (SMS/WhatsApp)

**Connector Requirements:**
- Auth: Account SID + Auth Token or API Keys
- REST API for all configuration objects
- No SDK required (REST-native)
- Multi-region via Twilio Regions

**SME Input Needed:**
- Custom Flex Plugins (React code — must be rebuilt)
- Serverless Functions (custom JavaScript — cannot auto-migrate)
- TaskRouter workflow routing logic (JSON but complex expressions)
- Custom CRM/integration middleware
- Twilio Pay / compliance recording setup

**Migration Complexity: HIGH** — Twilio Flex is fundamentally code-first; migration requires development effort, not just config transfer.

---

#### 2.1.4 Five9 ✅ RESEARCHED

**Export/Import Capabilities:**
- Five9 Admin Console allows export of IVR scripts
- Configuration API (SOAP/REST) for programmatic access
- VCC (Virtual Contact Center) configuration exportable
- IVR scripts use proprietary visual builder — export as XML

**Objects Available via API:**
- [x] IVR scripts (XML format)
- [x] Campaigns (inbound/outbound/autodial)
- [x] Skills & skill groups
- [x] Queues
- [x] Agent groups & users
- [x] DNIS configurations
- [x] Prompts (audio files)
- [x] Dispositions & disposition plans
- [x] Speed dial numbers
- [x] Contact lists & DNC lists
- [x] Reporting schedules

**Connector Requirements:**
- Auth: Basic Auth (username/password) or OAuth 2.0
- SOAP API (legacy) + REST API (newer features)
- Domain-specific endpoints

**SME Input Needed:**
- Custom CRM integrations (Five9 Agent Desktop Plus configs)
- Campaign pacing/dialing algorithms
- Custom IVR modules with external web service calls
- Five9 WFM settings and adherence rules
- Speech recognition grammar files

---

### 2.2 SOURCE PLATFORMS (Legacy/On-Prem)

---

#### 2.2.1 Avaya Aura / Communication Manager / Elite ✅ RESEARCHED

**Export/Import Capabilities:**
- **No native bulk export tool** for call vectors — Avaya doesn't provide one
- Vectors viewable via ASA (Avaya Site Administration) or GEDI
- Third-party tools like Utilacall can export vector steps
- Avaya Orchestration Designer exports VXML/CCXML applications
- System Manager Data Migration Utility available for Aura-to-Aura migrations
- CMS (Call Management System) — reporting data export only (CSV/ODBC)
- AEP (Avaya Experience Platform) and AAMS now at end-of-life

**Objects Requiring Manual Collection:**
- [x] Vectors (call routing scripts) — manually via `display vector N` CLI
- [x] VDNs (Vector Directory Numbers) — `list vdn` CLI command
- [x] Hunt Groups / Skills — `list hunt-group` or `list agent-loginID`
- [x] Announcements/Audio files — manual export from announcement board
- [x] ACD configurations — `display system-parameters features`
- [x] Station configurations — manual or via bulk admin tool
- [x] Trunk groups — `display trunk-group N`
- [x] Coverage paths — `display coverage path N`
- [x] Holiday tables — `display holiday-table N`
- [x] Feature Access Codes (FACs)

**Connector Approach:**
- **Primary: File upload** (no live API for most legacy Avaya systems)
- OSSI (Operation Support System Interface) — command-line data extraction
- Avaya DMCC/TSAPI for limited real-time data
- ASA bulk export (CSV format for station/agent data)
- For Avaya IR (Interactive Response): VXML/CCXML file export

**SME Input Needed (CRITICAL):**
- Vector logic interpretation (proprietary scripting language)
- VDN-to-vector mapping tables
- Adjunct routing (ASAI/CTI links) documentation
- Coverage path priority logic
- Best Service Routing (BSR) configurations
- EAS (Expert Agent Selection) skill assignments
- CLAN/IPSI network topology
- Announcement board audio file locations
- CMS custom reports and thresholds

**Migration Complexity: VERY HIGH** — Avaya's proprietary vector language has no standard export format. Most data requires SSH/ASA screen-scraping or manual documentation.

---

#### 2.2.2 Cisco UCCE / UCCX / ICM ✅ RESEARCHED

**Export/Import Capabilities:**
- ICM Scripts exportable as `.ICMS` files via Script Editor
- On import, Script Editor identifies missing objects (call types, skill groups, routes)
- UCCX scripts stored as `.aef` files (Cisco UCCX Script Editor format)
- UPLINX Report Tool can auto-document UCCX scripts to HTML/Word
- Enhanced Database Migration Tool (EDMT) for database migrations
- Regutil Tool exports Cisco registry from source machines
- User Migration Tool for AD security group migrations

**Objects Available for Export:**
- [x] ICM Routing Scripts (`.icms` format — references DB objects by name)
- [x] UCCX Call Flow Scripts (`.aef` format — Cisco Editor native)
- [x] Skill Groups & Precision Queues
- [x] Call Types & Dialed Numbers
- [x] Agent Teams & Agent Desk Settings
- [x] CTI Route Points & CTI Ports (CUCM config)
- [x] Media Resource Groups
- [x] CVP (Customer Voice Portal) VXML applications
- [x] Finesse Desktop layouts (XML)
- [x] Enterprise Data routing variables

**Connector Approach:**
- ICM Config Manager / Web Admin for bulk configuration export
- UCCX Admin API (REST) for runtime configuration
- CUCM AXL (Administrative XML) API for telephony objects
- CVP VXML Studio projects — file-based export
- Finesse Admin API for desktop layouts

**SME Input Needed:**
- ICM script logic documentation (visual flowchart → logic mapping)
- Precision Queue routing rules (attribute-based routing logic)
- CVP VXML custom Java classes and external DB calls
- Outbound Option (dialer) campaign configurations
- CUIC (Cisco Unified Intelligence Center) custom report templates
- SIP dial-peer routing on CUBE/gateway
- Multi-site ICM deployment topology

**Migration Complexity: HIGH** — Multiple interdependent components (ICM, CVP, CUCM, Finesse, CUIC) each with different export formats and APIs.

---

#### 2.2.3 Genesys Engage (PureEngage) ✅ RESEARCHED

**Export/Import Capabilities:**
- IRD (Interaction Routing Designer) exports strategies as XML files
- Composer imports IRD XML strategies into workflow diagrams
- Bulk export supported via Solution Export wizard
- Composer generates SCXML from visual diagrams
- GVP (Genesys Voice Platform) VXML applications — file-based
- GAX (Genesys Administrator Extension) for configuration export

**Objects Available for Export:**
- [x] Routing Strategies (IRD XML or Composer SCXML)
- [x] IVR Applications (GVP VXML)
- [x] Virtual Queues & Routing Points
- [x] Skills & Agent Groups
- [x] Interaction Queues
- [x] DNs (Directory Numbers) & Switches
- [x] Business Hours / Schedules
- [x] Stat Server configurations
- [x] Outbound Contact campaigns
- [x] WDE (Workspace Desktop Edition) configs

**Connector Approach:**
- Platform SDK (Java/.NET) for Configuration Server access
- GAX REST API for configuration objects
- Composer project file export (file-based)
- GVP VXML application directory export

**SME Input Needed:**
- URS (Universal Routing Server) strategy logic interpretation
- ORS (Orchestration Server) SCXML custom blocks
- Custom Java extensions in Composer
- Stat Server statistics and thresholds configuration
- T-Server switch configurations and DN assignments
- Multi-tenant deployment configurations (CME editions)

**Migration Complexity: MEDIUM-HIGH** — Well-structured XML exports but complex routing logic and deep customizations common.

---

#### 2.2.4 Mitel (MiContact Center) / Interactive Intelligence (PureConnect / ININ) ✅ RESEARCHED

**Mitel MiContact Center:**
- Configuration exportable via MiContact Center Admin tools
- IVR flows (MiContact Center IVR) — proprietary format
- Limited API availability for bulk export
- Most configuration requires manual documentation

**Interactive Intelligence PureConnect (ININ):**
- Interaction Attendant data exportable as XML via DSEditU.exe
- Interaction Administrator bulk export capabilities
- Handlers (call flow logic) stored in proprietary `.ihd` format
- CallFlowVisualizer tool can generate draw.io flowcharts from IA data
- IC (Interaction Center) configuration exportable via admin tools

**SME Input Needed:**
- Handler logic interpretation (proprietary language)
- Interaction Attendant menu trees
- Workgroup routing logic and priorities
- Custom IceLib/ICWS integrations
- Media Server prompt file locations
- Status definitions and ACD configurations

**Migration Complexity: MEDIUM** — PureConnect has better exportability than Mitel; both require significant manual documentation.

---

## 3. Feature Requirements Tracker

### 3.1 Core Pipeline Features

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-001 | Login / SSO / SAML / Tenant Selector | ✅ Built | P0 | |
| F-002 | Multi-tenant app shell with RBAC | ✅ Built | P0 | |
| F-003 | Migration Projects Dashboard | ✅ Built | P0 | |
| F-004 | Project Overview with Pipeline Tracker | ✅ Built | P0 | |
| F-005 | Source Connection — Live Connector | ✅ Built | P0 | |
| F-006 | Source Connection — File Upload | ✅ Built | P0 | |
| F-007 | Discovery & Gap Analysis | ✅ Built | P0 | |
| F-008 | Visual Call Flow Viewer (graph) | ✅ Built | P0 | |
| F-009 | Mapping Workspace (source↔target) | ✅ Built | P0 | |
| F-010 | Deployment Wizard + Live Logs | ✅ Built | P0 | |
| F-011 | Test Suite Builder + Results | ✅ Built | P0 | |
| F-012 | Reports & Stakeholder Sign-off | ✅ Built | P0 | |
| F-013 | Super Admin — Tenant Management | ✅ Built | P0 | |
| F-014 | Super Admin — Feature Flags | ✅ Built | P0 | |
| F-015 | Super Admin — Connector Catalog | ✅ Built | P0 | |
| F-016 | Super Admin — Usage Analytics | ✅ Built | P0 | |

### 3.2 Platform-Specific Connector Features

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-100 | Avaya Vector Parser (CLI output → normalized model) | 📋 Planned | P1 | No API; parse screen-scrape/CLI output |
| F-101 | Avaya VXML/CCXML File Parser | 📋 Planned | P1 | Orchestration Designer exports |
| F-102 | Cisco ICMS Script Importer | 📋 Planned | P1 | Parse .icms format, resolve references |
| F-103 | Cisco UCCX AEF Script Parser | 📋 Planned | P1 | Parse .aef + auto-document |
| F-104 | Cisco AXL/CUCM API Connector | 📋 Planned | P1 | Telephony object extraction |
| F-105 | Genesys Engage IRD XML Importer | 📋 Planned | P1 | Strategy XML → normalized model |
| F-106 | Genesys Engage Composer SCXML Parser | 📋 Planned | P2 | |
| F-107 | PureConnect Attendant XML Parser | 📋 Planned | P2 | DSEditU.exe export format |
| F-108 | Mitel Configuration Importer | 📋 Planned | P3 | Limited export capabilities |
| F-109 | Genesys Cloud Architect API Connector | 📋 Planned | P1 | i3flow + YAML via Archy |
| F-110 | Amazon Connect Flow API Connector | 📋 Planned | P1 | JSON + ARN remapping |
| F-111 | Twilio Flex Studio Flow API Connector | 📋 Planned | P1 | Studio JSON + TaskRouter |
| F-112 | Five9 Configuration API Connector | 📋 Planned | P2 | SOAP + REST hybrid |

### 3.3 Integrations & Help Features

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-300 | Integrations Hub — card catalog | ✅ Built | P0 | CRM, ITSM, Cloud, Notifications |
| F-301 | Integration Config Modal — OAuth/API Key/Token | ✅ Built | P0 | Per-integration auth + endpoint config |
| F-302 | Salesforce CRM Integration | ✅ Built | P1 | OAuth 2.0, REST API |
| F-303 | Jira ITSM Integration | ✅ Built | P1 | API Token, REST API, MCP |
| F-304 | ServiceNow Integration | ✅ Built | P1 | OAuth 2.0, REST API, MCP |
| F-305 | AWS CloudFormation Integration | ✅ Built | P1 | IAM Keys, AWS SDK |
| F-306 | Terraform / CX as Code Integration | ✅ Built | P1 | OAuth 2.0, CLI/API |
| F-307 | Slack Notifications Integration | ✅ Built | P2 | Bot Token, Webhook, MCP |
| F-308 | Microsoft Teams Integration | ✅ Built | P2 | OAuth 2.0, Graph API, MCP |
| F-309 | PagerDuty Integration | ✅ Built (Beta) | P2 | API Key, REST API |
| F-310 | Azure DevOps Integration | 📋 Planned | P3 | PAT, REST API |
| F-311 | Help Center — searchable documentation | ✅ Built | P0 | Categories, SOPs, prerequisites |
| F-312 | Help — Quick Start Walkthrough | ✅ Built | P0 | Step-by-step guide |
| F-313 | Help — Platform Prerequisites | ✅ Built | P1 | Per-platform requirements list |
| F-314 | Help — Feature Documentation | ✅ Built | P1 | 8 categories, articles per section |

### 3.4 Enhanced Features (From User Request)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-200 | System Architecture Viewer | ✅ Built | P1 | Source env → Suite → target env + artifacts strip |
| F-201 | Manual Review Gate before Publishing | ✅ Built | P1 | Approve/Changes per item + Migrate/Consolidate/Retire disposition |
| F-202 | Data Sense-Making Dashboard | ✅ Built | P1 | Covered by Architecture Viewer |
| F-203 | Platform-specific field collection forms | ✅ Built | P1 | SME fields per platform in connection wizard |
| F-204 | Dependency Graph Visualization | ✅ Built | P2 | Chain on Discovery: flow→prompts→queues→skills→numbers |
| F-205 | Audio Prompt Management | ✅ Built | P2 | Reuse/TTS/Re-record per prompt with quality flags |
| F-206 | Transformation Rules Engine UI | 📋 Planned | P2 | Custom rules for object transformation |
| F-207 | Deployment Version History | 📋 Planned | P2 | Every deploy tracked, diffable |
| F-208 | Jira Integration for Defect Export | 📋 Planned | P3 | Test failures → Jira tickets |
| F-209 | Audit Trail (per-object change log) | ✅ Built | P2 | Tenant Admin → Audit Log tab |
| F-210 | Migration Summary PDF Generator | 📋 Planned | P2 | Exportable report |

### 3.5 Feature Flags (Admin-Controlled)

| Flag | Default | Scope | Description |
|------|---------|-------|-------------|
| discovery_engine | ON | Global | Auto-parse and inventory source artifacts |
| callflow_viewer | ON | Global | Interactive node graph with minimap |
| mapping_workspace | ON | Global | Source-to-target object mapping |
| deployment_engine | ON | Global | Convert and deploy to targets |
| test_suite | ON | Global | Automated IVR test execution |
| audio_management | ON | Global | Prompt re-record/TTS/reuse |
| jira_integration | OFF | Per-tenant | Defect export to Jira |
| deployment_rollback | ON | Global | One-click rollback |
| bulk_operations | ON | Global | Multi-select map/convert |
| diff_view | ON | Per-tenant | Source/target flow comparison |
| auto_mapping | ON | Global | AI-assisted suggestions |
| manual_review_gate | ON | Global | Require approval before deploy |

---

## 4. Object Mapping Matrix (Source → Target)

| Source Object | Avaya | Cisco UCCE | Cisco UCCX | Genesys Engage | → | Genesys Cloud | Amazon Connect | Twilio Flex | Five9 |
|---|---|---|---|---|---|---|---|---|---|
| IVR/Call Flow | Vector + VDN | ICM Script (.icms) | Handler (.aef) | IRD Strategy (XML) | → | Architect Flow (.i3flow) | Contact Flow (JSON) | Studio Flow (JSON) | IVR Script (XML) |
| Queue | Skill/Split | Skill Group | CSQ | Virtual Queue | → | Queue | Queue | TaskQueue | Skill |
| Routing Skill | Skill | Precision Attr | Resource Skill | Skill | → | ACD Skill | Routing Profile | Worker Attribute | Skill |
| Agent | Agent LoginID | Agent | Resource | Agent | → | User | User | Worker | Agent |
| Audio Prompt | Announcement | CVP Audio | Prompt | GVP Prompt | → | Architect Prompt | S3 Prompt | Twilio Asset | Prompt |
| Schedule | Holiday Table | -- | -- | Business Hours | → | Schedule | Hours of Operation | -- | Schedule |
| Phone Number | VDN/DNIS | Dialed Number | Trigger | DN/Route Point | → | DID | Phone Number | Twilio Number | DNIS |
| Data Dip | Adjunct Route | DB Lookup node | HTTP/DB step | Data Access block | → | Data Action | Lambda Invoke | Twilio Function | Web Service |
| Wrap-up Code | AUX Reason Code | Wrap-Up | Wrap-Up | Disposition | → | Wrap-Up Code | Contact Attribute | Disposition | Disposition |

---

## 5. Prototype Screens — Build Status

| Screen | Status | File |
|--------|--------|------|
| Login / SSO + Tenant Selector | ✅ Complete | CCaaS Migration Suite.dc.html |
| Migration Projects Dashboard | ✅ Complete | CCaaS Migration Suite.dc.html |
| Project Overview + Pipeline | ✅ Complete | CCaaS Migration Suite.dc.html |
| Source Connection Wizard | ✅ Complete | CCaaS Migration Suite.dc.html |
| Discovery & Gap Analysis | ✅ Complete | CCaaS Migration Suite.dc.html |
| Visual Call Flow Viewer | ✅ Complete | CCaaS Migration Suite.dc.html |
| Mapping Workspace | ✅ Complete | CCaaS Migration Suite.dc.html |
| Deployment Wizard + Logs | ✅ Complete | CCaaS Migration Suite.dc.html |
| Test Suite & Results | ✅ Complete | CCaaS Migration Suite.dc.html |
| Reports & Sign-off | ✅ Complete | CCaaS Migration Suite.dc.html |
| Super Admin (Tenants) | ✅ Complete | CCaaS Migration Suite.dc.html |
| Super Admin (Feature Flags) | ✅ Complete | CCaaS Migration Suite.dc.html |
| Super Admin (Connectors) | ✅ Complete | CCaaS Migration Suite.dc.html |
| Super Admin (Usage) | ✅ Complete | CCaaS Migration Suite.dc.html |
| Integrations Hub | ✅ Complete | CCaaS Migration Suite.dc.html |
| Integration Config Modal | ✅ Complete | CCaaS Migration Suite.dc.html |
| Help Center | ✅ Complete | CCaaS Migration Suite.dc.html |
| System Architecture Viewer | ✅ Complete | CCaaS Migration Suite.dc.html |
| Vector Analysis (chains/duplicates/skills) | ✅ Complete | CCaaS Migration Suite.dc.html |
| Data Integrations Designer | ✅ Complete | CCaaS Migration Suite.dc.html |
| Manual Review / Approval Gate | ✅ Complete | CCaaS Migration Suite.dc.html |
| Tenant Admin Panel | ✅ Complete | CCaaS Migration Suite.dc.html |
| Audio Prompt Management | ✅ Complete | CCaaS Migration Suite.dc.html |

---

## 6. Key Technical Decisions

1. **Normalized Object Model:** All source platforms parse into a common intermediate model before mapping to target. This decouples source connectors from target connectors.

2. **Two Ingestion Paths:** Live API connectors for platforms with APIs (Genesys, Cisco, Connect, Twilio, Five9) + File upload for platforms without (Avaya legacy, custom exports).

3. **Confidence Scoring:** Auto-mapping uses similarity matching + rule engine. Scores: >90% = auto-mapped, 50-90% = review, <50% = manual only.

4. **Feature Flags at Two Levels:** Global defaults (Super Admin) + per-tenant overrides (Tenant Admin). Flags control both UI visibility and backend processing.

5. **Deployment Versioning:** Every deployment creates an immutable snapshot. Rollback restores previous snapshot. Audit trail tracks all changes.

---

## 7. Demo-Ready Prototype Requirements

### 7.1 Demo Scenarios (Static JSON-Driven)

Once all screens are functional, populate with realistic end-to-end demo data so the prototype can be walked through with clients as a live product demo.

| # | Demo Scenario | Source | Target | Status | Notes |
|---|--------------|--------|--------|--------|-------|
| D-001 | Enterprise Bank IVR Migration | Avaya Aura (8 vectors, 147 prompts, 24 queues) | Genesys Cloud | ✅ Built | data/demo-data.json — avaya-genesys |
| D-002 | Insurance Claims Center | Cisco UCCE (12 ICM scripts, 6 CVP apps) | Amazon Connect | ✅ Built | data/demo-data.json — cisco-connect |
| D-003 | Telecom Support Center | Genesys Engage (5 IRD strategies) | Genesys Cloud | ✅ Built | data/demo-data.json — engage-genesys |
| D-004 | Retail Omnichannel | Mitel MiCC (3 flows) | Twilio Flex | ✅ Built | data/demo-data.json — mitel-twilio |

### 7.2 Demo Artifacts Generated Per Migration

Each demo scenario should produce and display these artifacts in the prototype:

| Artifact | Screen | Description |
|----------|--------|-------------|
| Source Inventory Report | Discovery | Full object inventory with counts, types, health status |
| Gap Analysis Matrix | Discovery | Auto-mappable / manual review / unsupported breakdown |
| Dependency Graph | Discovery | Flow → prompts → queues → skills → numbers relationships |
| Visual Call Flow (Source) | Call Flow Viewer | Reconstructed IVR tree with node properties |
| Visual Call Flow (Target) | Call Flow Viewer | Converted flow in target platform's structure |
| Source↔Target Diff | Call Flow Viewer | Side-by-side comparison showing transformations |
| Mapping Report | Mapping | Full object mapping with confidence scores |
| Conflict Resolution Log | Mapping | Manual decisions with rationale |
| Deployment Manifest | Deployment | Versioned snapshot of what was deployed |
| Deployment Logs | Deployment | Timestamped log of deploy operations |
| Test Suite Results | Testing | Pass/fail per test path with latency and transcripts |
| Regression Comparison | Testing | Before/after test results across deploys |
| Migration Summary PDF | Reports | Executive summary exportable as PDF |
| Audit Trail | Reports | Who did what, when — full change log |
| Readiness Checklist | Reports | Go/no-go checklist with stakeholder sign-offs |

### 7.3 Static JSON Data Files

**Implemented as a single consolidated file:** `data/demo-data.json` — scenarios keyed by id (avaya-genesys, cisco-connect, engage-genesys), each containing: project meta, pipeline state, gap analysis, discovered objects, inventory, mappings, deploy logs, test results, and architecture components. Loaded at runtime via fetch; project cards switch the active scenario across all screens.

| File | Purpose | Status |
|------|---------|--------|
| `data/demo-data.json` | All demo scenarios (consolidated) | ✅ Built |
| `data/demo-audit-trail.json` | Activity log entries | 📋 Planned |

### 7.4 Quality & Responsiveness

| # | Requirement | Status | Priority |
|---|-------------|--------|----------|
| Q-001 | No JS crashes on any navigation path | ✅ Verified | P0 |
| Q-002 | All pages render within 500ms | ✅ Verified | P0 |
| Q-003 | Tablet-responsive (1024px min-width) | ✅ Built | P1 |
| Q-004 | Collapsible left nav for smaller screens | ✅ Built | P1 |
| Q-005 | Loading/skeleton states for async operations | 📋 Planned | P2 |
| Q-006 | Empty states for zero-data screens | 📋 Planned | P2 |
| Q-007 | Error states for failed connections/deploys | ✅ Built | P2 |
| Q-008 | Toast notifications for actions | ✅ Built | P2 |
| Q-009 | Keyboard navigation support | 📋 Planned | P3 |
| Q-010 | Print-friendly report views | 📋 Planned | P3 |

---

## 8. Data Integration & Dynamic Configuration Layer (NEW)

### 8.1 Requirement (research complete ✅)

**Verified platform mechanisms for data-driven logic:**

**Genesys Cloud (verified):**
- **Data Actions** — integrations that act on third-party data, invoke AWS Lambda, call the GC Platform API, or interface with JSON web services. Static + custom actions. Used in Architect for routing decisions and agent Scripts. Rate limit ~300 req/min/token — caching pattern uses Data Tables.
- **Data Tables** — key/value config tables (Reference Key + Boolean/Integer/Decimal/String columns), managed via portal or API, CSV import/export with append/replace. Read in flows via **Data Table Lookup action** (needs Architect > Data Table > All permission). Config data only — no PII.
- Integration categories: AWS Lambda, Function, Genesys Cloud, Google, MS Dynamics 365, Salesforce, web services, Zendesk.

**Amazon Connect (verified):**
- **Invoke AWS Lambda function block** — sync/async invocation, parameters static or dynamic, response STRING_MAP or JSON; results exposed under `$.External.attributeName`; must be persisted via **Set contact attributes** block or overwritten by next Lambda call.
- **Contact attribute types**: user-defined, external (Lambda), flow attributes (temporary, 32KB, not passed to modules/CCP/contact record — for sensitive data dips).
- Lambda usable in: Inbound, Customer Queue/Hold/Whisper, Agent Hold/Whisper, Transfer to Agent/Queue flow types. Lambda needs resource policy granting connect.amazonaws.com invoke.
- **Check contact attributes** block for branching on returned data.

**Avaya (source-side equivalents to map FROM):**
- Vector `adjunct routing` / ASAI (CTI-based data dip), `converse-on` step to IVR, Call Prompting digits collection, VDN variables/vector variables.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-400 | Genesys Data Actions designer | ✅ Built (UI) | P1 | Data action config w/ contract mapping |
| F-401 | Genesys Data Tables provisioning | ✅ Built (UI) | P1 | CSV/Excel upload → data table |
| F-402 | AWS Lambda function mapping | ✅ Built (UI) | P1 | Legacy data dips → Lambda + $.External attrs |
| F-403 | Custom webhook builder | ✅ Built (UI) | P2 | Generic REST for any target |
| F-404 | Dynamic API integration wizard | ✅ Built (UI) | P2 | Auth + endpoint + req/resp mapping |
| F-405 | Static config file ingestion (CSV/Excel/JSON) | ✅ Built (UI) | P1 | Upload → data table / DynamoDB / S3 |
| F-406 | Data source mapping matrix | ✅ Built (UI) | P1 | Source data dip → target mechanism recommendation |

### 8.1.1 Avaya → Genesys Cloud Deep-Dive (SME reference — verified)

**What exports cleanly from Avaya:**
- Communication Manager routing config as text dumps via ASA/GEDI: `list vdn`, `display vector`, hunt groups, agents, announcements, holiday/TOD tables, trunk groups
- CMS historical reports (CSV) for traffic sizing
- Orchestration Designer project source + prompt WAVs from Experience Portal (AAEP) for self-service IVR
- CCMA spreadsheets when AACC is in play

**What needs manual discovery (the critical gap):**
- Vectors export as raw text steps, **not intent** — DNIS → VDN → vector chains must be reconstructed into actual call flow diagrams
- Undocumented announcement verbiage must be transcribed
- Every data dip / CTI adjunct route cataloged with its API spec
- Hours of operation hardcoded inside vector steps must be extracted
- Tribal knowledge: emergency reroute procedures, which CMS reports the business actually depends on

**Core Avaya → Genesys Cloud object mapping:**

| Avaya | Genesys Cloud | Notes |
|---|---|---|
| VDN | DID / Call Route → Architect flow | |
| Vector | Architect Inbound Flow | Consolidate, don't 1:1 convert |
| Hunt Group / Skill | Queue + ACD Skill | Avaya skill levels 1–16 compress to Genesys proficiency 0–5 |
| Announcement | Prompt | |
| VRT (Vector Routing Table) | Data Table | |
| Holiday Table | Schedule Group | |
| Adjunct Routing (ASAI) | Data Action | |
| VOA (VDN of Origin Announcement) | Whisper audio | |
| ICR Callback | Genesys Callback | |
| + telephony, AAEP, recording, WFM, screen pop | (surrounding ecosystem mappings) | |

**Key design insight — Migrate / Consolidate / Retire disposition:**
Mature Avaya estates typically carry **hundreds of near-duplicate vectors and skills**. The winning move is *consolidation* — collapsing vector chains into fewer parameterized Architect flows driven by Data Tables, not 1:1 conversion. A per-object "Migrate / Consolidate / Retire" disposition step in the mapping workspace is the differentiator for this utility.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F-410 | Migrate/Consolidate/Retire disposition per object | ✅ Built | P1 | Shown in Review & Approval gate |
| F-411 | Vector chain reconstruction (DNIS→VDN→vector) | ✅ Built | P1 | Vector Analysis screen — chains with intent + SME flags |
| F-412 | Skill level compression mapper (1–16 → 0–5) | ✅ Built | P2 | Band table with agent counts |
| F-413 | Duplicate/near-duplicate vector detection | ✅ Built | P1 | Consolidation clusters w/ similarity % |

### 8.2 Terminology Verification (NEW)

In-depth research pass on Genesys Cloud, Amazon Connect, and Avaya to validate every term, object name, and workflow used in the prototype:

- [x] Genesys Cloud: Data Actions, Data Tables, Data Table Lookup action, integration categories verified
- [x] Amazon Connect: Lambda block, $.External namespace, flow/user-defined/external attributes, flow types verified
- [x] Avaya: vectors, VDNs, EAS skills, splits/hunt groups, announcements, adjunct routing (ASAI), CMS, BSR, VRT, VOA, ICR — verified (see 8.1.1)
- [ ] Fix all incorrect terminology found in prototype screens and demo data

---

## 9. Next Steps

- [x] Build System Architecture Viewer screen
- [x] Enhance call flow viewer with click/zoom/source-target interactivity
- [x] Add real object mapping data per source→target combination (3 scenarios)
- [x] Data Integrations designer (data actions / Lambda / webhooks / data tables)
- [x] Build Manual Review / Approval Gate screen
- [x] Build Tenant Admin panel (users/roles, credentials vault, environments, audit logs)
- [x] Wire deploy logs to scenario JSON
- [x] Add 4th demo scenario (Mitel → Twilio Flex)
- [x] Add platform-specific SME input forms per connector
- [x] Add dependency graph visualization
- [x] Build audio prompt management screen
- [x] Toast notifications
- [x] Complete Avaya terminology verification pass (see 8.1.1)
- [x] Loading/empty/error states (parse-failure example in upload; deploy live-log states)
- [x] Tablet responsiveness + collapsible nav
- [x] Vector chain reconstruction viz (F-411), skill level compression mapper (F-412), duplicate vector detection (F-413)

**Remaining backlog (lower priority):**
- [ ] Q-005 skeleton loading states, Q-006 empty states for zero-data screens
- [ ] Q-009 keyboard navigation, Q-010 print-friendly report views
- [ ] F-206 Transformation Rules Engine UI, F-207 Deployment Version History diff view
- [ ] F-208/F-310 Jira defect export flow, Azure DevOps integration
- [ ] F-210 Migration Summary PDF generator
