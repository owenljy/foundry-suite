# Publications index — sn-docs-search

Static map from topic / common query phrasing → publication slug in `ServiceNow/ServiceNowDocs`. Read this **once** at the start of a session to route fuzzy queries without hitting the GitHub API. The slug is the directory name under `markdown/` on any release branch.

Path pattern: `markdown/<slug>/index.md` (TOC) or `markdown/<slug>/<file>.md` (content). Files are **frequently nested one level deeper** under a sub-publication folder: `markdown/<slug>/<sub-publication>/<file>.md` (verified example: `markdown/application-development/building-applications/build-agent.md`). Don't guess a flat path — get the exact file path from the publication's `index.md`.

## How to use

1. Skim the **Use when** column and pick the publication whose hints best match the user's query
2. If multiple publications match, fall back to `gh search code` (Snippet A in `SKILL.md`)
3. Once you have the slug, fetch its `index.md` for the file list, or jump straight to a file you already know — but be cautious: hand-built flat paths often 404 because of the sub-publication nesting, so prefer resolving the path from `index.md`

This index is curated from the upstream `llms.txt` and README. The live, exhaustive version lives at `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/HEAD/llms.txt` (HEAD = latest release; see SKILL.md Step 0b) — fetch that only if a topic genuinely doesn't fit any row below.

## Platform & developer (start here for most platform questions)

| Slug | Title | Use when |
|---|---|---|
| `now-platform` | ServiceNow AI Platform | Anything about the platform itself: instance, scopes, applications, system properties, tables, business rules, scripts overview. The widest single publication |
| `platform-administration` | Administer the ServiceNow AI Platform | Admin tasks: users, roles, groups, instance config, upgrades, plugins, system settings |
| `platform-security` | Secure your instance | ACLs, contextual security, encryption, OAuth, MFA, certificate management, security hardening |
| `platform-user-interface` | Configure user experiences | UI policies, UI actions, form/list config, themes, Service Portal config, Workspace UI, Next Experience |
| `servicenow-platform` | Extend ServiceNow AI Platform capabilities | Extension points, custom apps, integrations framework, scoped-application internals |
| `application-development` | Building applications | **Build Agent**, Fluent SDK, App Engine Studio, low-code/pro-code app dev, vibe coding |
| `hyperautomation-low-code` | App development and low-code | Now Assist for builders, App Engine, Process Automation Designer, Decision Builder |
| `build-workflows` | Build workflows | Flow Designer, Action Designer, subflows, workflow editor |
| `api-reference` | API implementation and reference | REST/SOAP/Scripted REST APIs, GlideRecord API, server/client JS APIs, integrations |

## AI, Now Assist, agents

| Slug | Title | Use when |
|---|---|---|
| `intelligent-experiences` | Enable AI experiences | **Now Assist**, AI Agents, **Action Fabric**, MCP Server, agentic workflows, AI skills, AICT, generative AI features, AI governance |
| `conversational-interfaces` | Conversational Interfaces | Virtual Agent, NLU, conversational designer, chatbots |
| `now-intelligence` | Platform Analytics | Predictive Intelligence, Performance Analytics, ML models, classification frameworks |

## Workflows & integrations

| Slug | Title | Use when |
|---|---|---|
| `integrate-applications` | Workflow Data Fabric | **Data Fabric**, IntegrationHub, Spokes, RPA Hub, data import/sync, ETL |
| `service-bridge` | Service Exchange | Service Bridge, cross-instance data exchange |

## ITSM family

| Slug | Title | Use when |
|---|---|---|
| `it-service-management` | IT Service Management | Incident, Problem, Change, Request, Knowledge, Service Catalog, CMDB-adjacent ITSM topics |
| `it-operations-management` | IT Operations Management | Discovery, Service Mapping, Event Management, AIOps, Cloud Insights |
| `it-asset-management` | IT Asset Management | Hardware/Software Asset Management, contracts, SAM Pro |
| `cloud-observability` | Cloud Observability | Lightstep, observability features |
| `cloud-governance-suite` | Cloud Governance Suite | Cloud cost, cloud governance posture |

## Customer & employee experience

| Slug | Title | Use when |
|---|---|---|
| `customer-service-management` | Customer Service Management | CSM, customer accounts, contact management, case management |
| `customer-relationship-management` | Customer Relationship Management | Sales workflows, CRM-specific (see also `order-management` for quote-to-cash) |
| `industry-products` | CRM and Industry Products | Cross-industry CRM bundle, generic industry product entry |
| `employee-service-management` | Employee Service Management | HR Service Delivery, employee onboarding, ESM workflows |
| `field-service-management` | Field Service Management | FSM, work orders, dispatch, mobile field work |

## Industry verticals

| Slug | Title | Use when |
|---|---|---|
| `financial-services-operations` | Financial Services Operations (FSO) | Banking, insurance workflows |
| `healthcare-life-sciences` | Healthcare and Life Sciences | HCLS, payer/provider workflows |
| `industrial-connected-workforce` | Industrial Connected Workforce | Manufacturing frontline workforce |
| `manufacturing` | Manufacturing Commercial Operations | Manufacturing commercial / order-to-cash |
| `government-industry` | Public Sector Digital Services (PSDS) | Public sector, government industry product |
| `retail-industry` | Retail | Retail industry product |
| `telecom-media-technology` | Telecommunications, Media, and Technology (TMT) | TMT industry product (broadest of the telecom set) |
| `telecom-network-inventory` | Telecommunications Network Inventory | Telco network inventory specifically |
| `telecom-service-ops` | Telecommunications Service Operations Management | Telco service ops specifically |
| `technology` | Technology Industry | Generic technology industry product |
| `proactive-service-exp-workflows` | Product Support for Technology | Product support / proactive service workflows |
| `operational-technology` | Operational Technology | OT, ICS/SCADA-adjacent workflows |

## Finance, GRC, ESG, security

| Slug | Title | Use when |
|---|---|---|
| `source-to-pay-operations` | Finance and Supply Chain | Source-to-pay, procurement, AP automation |
| `order-management` | Sales and Order Management | Quote-to-cash, order orchestration |
| `core-business-suite` | Core Business Suite | Cross-functional business suite features |
| `governance-risk-compliance` | Governance, Risk, and Compliance | GRC, audit, policy, risk register |
| `environmental-social-governance` | Environmental, Social, and Governance Management | ESG management |
| `security-management` | Security Operations | SecOps, Security Incident Response, Vulnerability Response, Threat Intelligence |
| `impact` | Impact | ServiceNow Impact (success services) |

## Strategy & portfolio

| Slug | Title | Use when |
|---|---|---|
| `it-business-management` | Strategic Portfolio Management | SPM, ITBM, project/portfolio, demand, idea |
| `application-portfolio-management` | Enterprise Architecture (formerly APM) | Enterprise Architecture, business capability map, APM |
| `better-together` | Solutions | Cross-product "Solutions" packaging |
| `service-management-for-the-enterprise` | Service Management | Enterprise Service Management, beyond IT |

## Mobile, identity, reference

| Slug | Title | Use when |
|---|---|---|
| `mobile` | Mobile Platform | Now Mobile, mobile app development, mobile-specific features |
| `acct-lifecycle-events` | Account Lifecycle Events | ALE, account lifecycle |
| `glossary` | ServiceNow AI Platform glossary | When the user asks "what does X mean", definitions, terminology |
| `product-directory` | Product directory | A top-level catalog of every product — useful when nothing else fits |
| `release-notes` | Release notes | **"What's new in <release>"**, release highlights, RTP previews, family release notes |

## Tips for picking a slug

- "Build Agent" / "Fluent SDK" / "vibe coding" → `application-development`
- "Now Assist" / "AI Agents" / "Action Fabric" / "MCP" → `intelligent-experiences`
- "Virtual Agent" / "NLU" → `conversational-interfaces`
- "Flow Designer" / "subflow" → `build-workflows`
- "IntegrationHub" / "Spoke" / "Data Fabric" → `integrate-applications`
- "ACL" / "OAuth" / "encryption" → `platform-security`
- "what's new in Australia/Zurich/Yokohama" → `release-notes`
- "discovery" / "service mapping" / "event management" → `it-operations-management`
- "incident" / "change request" / "knowledge base" → `it-service-management`
- "CMDB" → most often `now-platform` or `it-operations-management` (configuration items live in the CMDB but Discovery populates them; check both)
- General platform "how do I do X" with no obvious vertical → start at `now-platform` or `platform-administration`

When in doubt across two candidates, run `gh search code` with the topic name scoped to `--repo=ServiceNow/ServiceNowDocs` — it disambiguates in one round-trip.
