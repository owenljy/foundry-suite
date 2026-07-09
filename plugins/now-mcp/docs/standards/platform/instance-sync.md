# Instance Sync

## When to use this doc

Load this whenever you create or update a record via MCP on a ServiceNow instance and need to sync the full XML back to the local project. This applies to ALL non-dictionary record types. Every agent that makes code changes (task-agent, defect-agent, implementation-agent) must follow these rules.

## The Mandatory Rule

> **After EVERY MCP create or update operation, you MUST pull the full record XML back from the instance.**

The instance is the authority for metadata. When you push a record, the instance may add or modify:

- `sys_updated_on` / `sys_created_on` timestamps
- `sys_mod_count`
- `sys_update_name` (the canonical record identifier)
- Computed display values and default field values set by business logic
- `sys_updated_by`, `sys_created_by`

**Never trust your local edit as the final state.** Always pull the complete record back and overwrite the local file with the full payload.

## How to Pull XML Back

### Step 1: Get the `sys_update_name`

- **New records:** Extract from the MCP create response — the response includes a `sys_update_name` field.
- **Existing records:** Derive from the local filename (the filename without `.xml` IS the `sys_update_name`).

### Step 2: Query `sys_update_xml` for the full payload

```javascript
mcp__snow-instance-mcp__get_table_data(
  table: "sys_update_xml",
  query: "name=<sys_update_name>",
  limit: 1
)
```

### Step 3: Extract the `payload` field

The `payload` field in the response contains the complete XML for the record. This is the authoritative content — use it in its entirety.

### Step 4: Determine the correct local file path

See [Determining the Correct File Path](#determining-the-correct-file-path) below.

### Step 5: Write the file

Save the `payload` content to the determined path. If the file already exists, **overwrite it completely** with the pulled payload. Do not merge or patch — the full payload replaces the file.

## Determining the Correct File Path

### Directory structure

```
src/main/plugins/com.{scope}/
├── dictionary/                          # Table/field definitions (local-first)
├── update/                              # Standard records (DEFAULT target)
│   └── {table}_{sys_id}.xml
├── if/                                  # Conditional records (dependency-gated)
│   └── {dependency_plugin}/
│       └── update/
│           └── {table}_{sys_id}.xml
└── unload.demo/                         # Demo data
```

### Decision tree

```
Is this an UPDATE to an EXISTING local file?
├── YES → Use the file's current path (already known)
│
└── NO → This is a NEW record
    │
    ├── Does the implementation step/story specify a conditional
    │   plugin dependency for this record?
    │   └── YES → Place under if/{dependency_plugin}/update/
    │
    ├── Do similar records in this project already live under if/?
    │   (Check with: find src/main/plugins/com.{scope}/if/*/update/
    │    -name "{table}_*.xml")
    │   └── YES, matching pattern found → Place in the same
    │       if/{dependency}/update/ directory
    │
    └── DEFAULT → Place under update/
        Path: src/main/plugins/com.{scope}/update/{sys_update_name}.xml
```

### What is the `if/` directory?

The `if/{dependency_plugin}/update/` structure holds records that should only be applied when a specific dependency plugin is installed on the target instance. Examples:

| Path | Purpose |
|------|---------|
| `if/com.snc.i18n.french/translations/fr/` | French translations — only when French language pack is installed |
| `if/com.sn_hr_core/update/` | Records that depend on HR Core being installed |
| `if/com.snc.universal_request/update/` | Records for Universal Request integration |
| `if/com.sn_cbs_hns/update/` | Records that depend on CBS H&S being installed |

### File naming

Files are always named: `{table}_{sys_id}.xml`

The `sys_update_name` from the instance follows this pattern and can be used directly as the filename (append `.xml`).

Example: `sys_update_name` = `sys_script_include_abc123def456` → Filename: `sys_script_include_abc123def456.xml`

## Complete Workflow Examples

### Example 1: Creating a new Script Include (standard path)

```javascript
// 1. Create via MCP
mcp__snow-instance-mcp__create_table_record(
  table: "sys_script_include",
  scope: "sn_hs_rm",
  data: {
    name: "MyNewService",
    api_name: "sn_hs_rm.MyNewService",
    script: "var MyNewService = Class.create();\n...",
    active: "true",
    sys_scope: "9df2c861776d3910a2788bfa7a5a9937"
  }
)
// Response includes sys_update_name: "sys_script_include_abc123def456"

// 2. Pull full XML back
mcp__snow-instance-mcp__get_table_data(
  table: "sys_update_xml",
  query: "name=sys_script_include_abc123def456",
  limit: 1
)

// 3. Save payload to:
//    project/src/main/plugins/com.sn_hs_rm/update/sys_script_include_abc123def456.xml
```

### Example 2: Updating an existing Business Rule

```javascript
// 1. Read local file to get sys_id and current content
//    File: src/main/plugins/com.sn_hs_rm/update/sys_script_abc123def456.xml

// 2. Edit the local file with your changes

// 3. Upload to instance
mcp__snow-instance-mcp__sn_file_update(
  file_path: "/absolute/path/to/sys_script_abc123def456.xml"
)

// 4. Pull FULL XML back (instance may have modified metadata)
mcp__snow-instance-mcp__get_table_data(
  table: "sys_update_xml",
  query: "name=sys_script_abc123def456",
  limit: 1
)

// 5. Overwrite the local file with the complete payload
//    Same path: src/main/plugins/com.sn_hs_rm/update/sys_script_abc123def456.xml
```

### Example 3: Creating a record with conditional dependency

```javascript
// Story says: "Create a scope privilege record that only applies when
// com.sn_hr_core is installed"

// 1. Create via MCP (same as standard)
mcp__snow-instance-mcp__create_table_record(
  table: "sys_scope_privilege",
  scope: "sn_hs_cm",
  data: { ... }
)

// 2. Pull full XML back
mcp__snow-instance-mcp__get_table_data(
  table: "sys_update_xml",
  query: "name=sys_scope_privilege_xyz789",
  limit: 1
)

// 3. Save to the CONDITIONAL path (not update/):
//    src/main/plugins/com.snc.sn_hs_cm/if/com.sn_hr_core/update/sys_scope_privilege_xyz789.xml
//    Create the if/com.sn_hr_core/update/ directory if it doesn't exist.
```

## Record Types That Do NOT Follow This Workflow

Some record types are deployed via the plugin build pipeline rather than the update set mechanism. For these, **the local XML file is the source of truth** — edit the file directly, commit, and let CI/CD deploy it. Do NOT attempt MCP create/update + sync for these types:

| Record Type | Why |
|-------------|-----|
| `sys_ux_macroponent` | Part of the UX framework plugin bundle; never appears in `sys_update_xml`; REST API field updates return success but do not persist |
| `sys_ux_lib_component` | Same reason — deployed as plugin metadata, not update-set-tracked |
| Other UX Framework metadata | Records under `if/<plugin>/update/` that are plugin-scoped and never appear in `sys_update_xml` |

**How to identify these records:** Query `sys_update_xml` by `name=<sys_update_name>`. If the query returns 0 results, the record is file-first — edit the local XML and skip the MCP sync step.

### Verifying file-first record changes

After deploying via the plugin build pipeline (`sn-ai ws-deploy <plugin>` or `mvn clean install` + manual install), verify with a direct table query against the actual field you changed — for example:

```javascript
mcp__snow-instance-mcp__sn_query_records({
  table: "sys_ux_macroponent",
  query: "sys_id=<macroponent_sys_id>",
  fields: ["required_translations","sys_updated_on","sys_mod_count"],
  limit: 1
})
```

**Do NOT use `sys_updated_on`, `sys_mod_count`, or `sys_updated_by` as the verification signal for plugin-bundled records.** Plugin install rewrites the record bypassing the normal audit-field bump — the timestamp will look stale even when the field content has been swapped in. Only the field value itself is a reliable signal of a successful deploy.

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Saving to `update/` when the file belongs under `if/` | Record applied unconditionally instead of conditionally | Check existing repo patterns and implementation step for dependency info |
| Not pulling full XML back after MCP push | Local file missing instance-generated metadata | ALWAYS query `sys_update_xml` and save the complete `payload` |
| Trusting local edits as final metadata | `sys_updated_on`, `sys_mod_count` etc. are stale | The pulled payload is the authority — overwrite the local file entirely |
| Generating `sys_id` values manually | Invalid identifiers that break deployment | Let the instance generate them via MCP create |
| Saving only the script field back instead of full payload | Missing XML wrapper, metadata fields, CDATA markers | Save the ENTIRE `payload` XML, not just the field you edited |
| Merging or patching instead of overwriting | Partial metadata, conflicting field values | Replace the entire local file with the pulled payload |
| Attempting MCP update on a plugin-scoped UX record | API returns success but change doesn't persist; `sys_update_xml` has no entry | Check `sys_update_xml` first — if 0 results, edit the XML file directly |

## Task Types This Doc Supports

- Creating new records via MCP
- Updating existing records via MCP
- Syncing instance state back to local project files
- Determining correct file paths for new records (`update/` vs `if/`)
- Working with conditional dependency records (`if/` directories)
