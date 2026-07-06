# now-mcp — Codex project notes

A Model Context Protocol server (`now-mcp`, v1): **Codex's hands and eyes on a
*running* ServiceNow instance.** Config-as-code lives in Fluent; workflows live
in skills. User-facing docs live in `README.md`; this file is working notes for
Codex in this codebase.

## The three layers — who does what

Don't mix these up; it's the source of most "where does this belong?" questions.
They aren't competing options — they stack.

- **Fluent SDK (`now-sdk`) — AUTHOR.** Defines what the application *is*: tables,
  business rules, UI policies, workflows, ACLs, script includes. Written as
  TypeScript source (`*.now.ts`) → `build` → `deploy`. The **source of truth is
  git**; the instance is a deployment artifact.
- **now-mcp (this server) — OPERATE.** Acts on the *running* instance: read data
  (query/aggregate/schema), **write data rows** (create/update/delete/batch),
  run scripts, move files. It never defines the application. Data yes, config no.
- **Workflow rules + skills — ORCHESTRATE.** Know *how* to combine the two to get
  work done (order, judgement, when to use which). They add no new capability —
  just method. The Fluent author→deploy→verify→drift division of labour ships as
  a standing block a SessionStart hook injects into a Fluent project's `AGENTS.md`
  (`scripts/bootstrap-fluent-claudemd.mjs`) — always-on, not a skill you can miss.
  On-demand skills live in `skills/` (e.g. `sn-docs-search`).

```
Skill (orchestrate) ──drives──▶ SDK (author config)  +  MCP (operate runtime)
                                        │                        │
                                        └──── both act on ───────┘
                                              the instance
```

### The load-bearing line: data vs. config

In ServiceNow *everything* is a row — including config (a business rule is a row
in `sys_script`). So the Table API *can* POST config. It must not, here:

- **Data rows** (incident, user, cmdb_ci) = runtime state → **OPERATE → MCP.**
  `create_record` is fine: making an incident is using the running instance.
- **Config / metadata** (business rule, workflow, UI policy, table def) = the
  application's definition → **AUTHOR → Fluent source.** POSTing it from the MCP
  would create drift (a thing on the instance that git doesn't know about),
  bypass review/versioning, and give config two sources of truth. So there is no
  `create_business_rule`-style tool here, and no update-set tools (update sets are
  the pre-Fluent, instance-centric era; under Fluent, config ships as a scoped-app
  package from source).

### Where does a new capability go? (decision rule)

1. Does it *define the application* (table/BR/workflow/…)? → **Fluent SDK.** Never MCP.
2. Is it a *single atomic operation on the running instance* that no existing MCP
   tool covers? → then, and only then, a new **MCP tool**.
3. Is it *combining existing capabilities into a flow/analysis* (deploy verify,
   incident investigation, catalog optimization)? → a **skill** (multi-stage,
   needs judgement) or an **MCP prompt** (a simple one-shot report).

> **OPERATE tools only.** No metadata authoring, no update-set tools.

## Tool surface (17 always-on, +2 conditional)

- **Data:** `query_records`, `aggregate_records` (Stats API), `create_record`,
  `update_record`, `delete_record`, `batch_create`, `batch_update`
- **Comparison:** `diff_records` (field-by-field compare of two records)
- **Schema:** `get_table_schema`, `list_tables`, `get_choice_list`,
  `get_table_structure_from_data` (data-inference fallback for thin
  `sys_dictionary`)
- **Security posture:** `get_security_info` (ACLs, data policies, security BRs)
- **Execution:** `execute_background_script`
- **Attachments:** `upload_attachment`, `download_attachment`,
  `get_attachment_metadata` ("what attachments exist", no content download)
- **Conditional:** `switch_default_instance` (only with a multi-instance config),
  `sdk_status` (only when now-sdk is on PATH)

To inspect update sets on a legacy/mixed instance, there's no special tool —
just `query_records` on `sys_update_set` / `sys_update_xml`.

All tool names are prefixed `sn_`. Every tool carries MCP annotations
(`readOnlyHint`/`destructiveHint`) from `src/tools/annotations.ts`.

## Architecture

```
src/
├── index.ts                 # server entry (loads config, validates, starts)
├── server.ts                # MCP server wiring
├── client/                  # per-instance HTTP client + InstanceManager + auth
├── services/                # business logic (table, batch, schema, attachment,
│                            #   script)
├── tools/                   # one file per MCP tool + index.ts registration
│                            #   + annotations.ts (safety hints)
├── schemas/                 # Zod input schemas
├── config/                  # environment.ts (YAML config resolution),
│                            #   config-file.ts (load/save helpers), constants.ts
└── utils/                   # validators, error-handler, failure-enrichment,
                             #   audit, now-sdk-cli (the now-sdk bridge), logger
skills/                      # on-demand skills (e.g. sn-docs-search)
scripts/bootstrap-fluent-claudemd.mjs  # SessionStart hook: inject Fluent rules
test/                        # node --test suite (runs against build/)
```

Flow: `tools/` (defs + validation) → `services/` (logic) → `client/` (HTTP).
Add a tool: schema in `schemas/` → method in a `services/` class → tool file in
`tools/` → register in `tools/index.ts` → annotation in `annotations.ts`.

## Configuration — YAML file, or single-instance fast path

Resolved in `environment.ts` `loadConfig()`:
1. `SERVICENOW_CONFIG_PATH` → a YAML file at any path, else
2. `SERVICENOW_URL` (+ `_USERNAME`/`_PASSWORD`, optional `_READ_ONLY`) → the
   single-instance **fast path** (`buildSingleInstanceFromEnv`): one basic-auth
   instance synthesized from env vars, validated through the same
   `MultiInstanceConfigSchema`. This is what the plugin form feeds (password →
   keychain via the manifest's `sensitive` option). Basic-auth single-instance
   only — OAuth/multi-instance stay in YAML. Else
3. `config/servicenow-instances.yaml` (or `.yml`) in cwd, else
4. throw with **enriched** setup guidance — cwd + which sources were checked
   (password only ever reported as set/unset) — (`index.ts` then starts in
   degraded mode).

Two credential sources: a YAML file (paths 1/3, single or multi, basic or OAuth)
and the env fast path (path 2, basic single-instance). YAML is **YAML** (js-yaml;
a JSON superset, so old JSON still parses). Instance fields:
`name`, `url`, `auth` (basic/oauth), `default` (exactly one), `readOnly`
(defaults **true**), `timeout`. `name` is coerced to string (numeric PDI names
like `123456` are fine). `SERVICENOW_FOLLOW_NOW_SDK` lets now-sdk pick which
configured instance is active (`resolveNowSdkFollow`, applied in the background
after startup) — **on by default** when now-sdk is on PATH; set it to `false` to
pin the YAML `default`.

## now-sdk pairing — the rules

This server is the **senses**; `now-sdk` + Codex are the **hands**. Do not
make one reinvent the other:

- **Instance→Fluent capture → now-sdk** (`now-sdk transform`). One-off row reads
  from a terminal are also fine via `now-sdk query`.
- **Author metadata → Fluent `*.now.ts`** + `now-sdk deploy`. **Never POST
  metadata to tables** — no `create_*` metadata tool exists here, by design.
- **Aggregation, data writes, script execution → this MCP.**
- `sn_sdk_status` reports now-sdk version/profiles and whether the MCP
  and now-sdk target the same instance. Its version/feature map is the unique
  value (the skill reads it to gate Fluent capabilities); the default-alignment
  fields matter only when follow is OFF. Profiles are cached ~60s
  (`listNowSdkProfiles`) since `now-sdk auth --list` costs ~2.8s per spawn.
- Follow is **on by default**: `resolveNowSdkFollow` (run in the background after
  startup, not on the handshake path) re-points the default instance to now-sdk's
  selected profile (matched by host), so the MCP and Fluent stay on the same
  instance without a start-of-session check. Set `SERVICENOW_FOLLOW_NOW_SDK=false`
  to pin the YAML `default`; then, on a drift, realign by passing `instance`
  explicitly, editing `default:` in the YAML, or re-enabling follow (there is no
  set-default tool). now-sdk can't share its keychain password, so the YAML still
  supplies credentials.

### Why `sn_query_records` coexists with `now-sdk query`

They overlap on raw single-table reads, and that's fine — they're tuned for
different consumers, so the MCP tool is not a reinvention:

- **`now-sdk query`** is a terminal CLI for a human: it auto-paginates and has
  `--no-count`/`--view`. Reach for it in an interactive shell.
- **`sn_query_records`** is built for Codex to call in-loop. What it
  adds over the CLI: a **render guardrail** (caps rows/serialized bytes so a big
  result can't flood the context, and signals `truncated`), **accurate
  pagination** from `X-Total-Count` (`hasMore`/`totalMatching`), **empty-result
  recovery hints**, `excludeReferenceLink` on by default to cut noise, and
  **structured output**. Critically, it also stays inside the MCP's shared
  guardrails — rate limiter, circuit breaker, table allow/deny, audit log,
  multi-instance routing — which a separate `now-sdk` process (own keychain
  auth, own breaker state) does not. Routing Codex's high-frequency reads back
  out to the CLI would fork those protections, so reads that Codex issues stay
  on the MCP.

## Conventions / guardrails

- **Read-only by default.** Writes require `readOnly: false`; `validateWriteAccess`
  throws `AccessDeniedError` otherwise.
- **Table allow/deny.** `assertTableAllowed` (`utils/table-access.ts`) gates every
  table op via `validateTableName` *and* schema discovery; env
  `SERVICENOW_BLOCKED_TABLES` / `SERVICENOW_ALLOWED_TABLES`.
- **Anti-lockout.** Per-instance `RateLimiter` + `CircuitBreaker`
  (`utils/rate-limiter.ts`, `utils/circuit-breaker.ts`) wrap the client request
  path: fail fast when the breaker is open (faster on 401/403) instead of
  retrying into a ServiceNow lockout. Env `SERVICENOW_MAX_CONCURRENT`,
  `SERVICENOW_BREAKER_*`.
- **Batch tunables (not API limits).** `batch_create`/`batch_update` loop single
  Table API calls (no bulk endpoint), so their caps are self-imposed guardrails,
  not server constraints. Resolved in `config/batch-config.ts`, all env-tunable
  with sane defaults: `SERVICENOW_MAX_BATCH_SIZE` (default 50, hard-ceilinged at
  100 so a typo can't queue a runaway write), `SERVICENOW_BATCH_CONCURRENCY`
  (default 25 — records per wave), `SERVICENOW_BATCH_DELAY_MS` (default 100 —
  inter-wave pause; 0 disables). **Not transactional:** a failed batch leaves
  already-written rows in place; callers inspect `results[]`.
- **Write audit log + per-call logging.** All POST/PUT/PATCH/DELETE go through
  `recordWrite` (stderr; JSON-lines via `SERVICENOW_AUDIT_LOG`); every tool call
  logs `{tool, durationMs, ok}` (`utils/tool-log.ts`).
- **Failure enrichment.** Tools return recovery hints on 403/404/field errors and
  empty results (`utils/failure-enrichment.ts`).
- **No fake capabilities.** If a tool can't really do something, it isn't shipped.
- TypeScript strict; Zod for all input; tests are `node --test` against `build/`.

## Commands

```bash
pnpm build        # tsc
pnpm test         # build + node --test test/*.test.js
pnpm lint         # biome lint src
pnpm format       # biome format --write src
pnpm check        # biome check src (lint + format)
```
(This project uses **pnpm** — `corepack enable` to get the pinned version.
Gates: `tsc` strict, **Biome** (lint + format, `biome ci src` in CI), and the
test suite. Biome scope is `src/` only — config in `biome.json`.)
