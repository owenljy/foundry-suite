# Diagnostic Scripts

## When to use this doc

Load this when generating background scripts that help engineers diagnose issues on a ServiceNow instance — during support case investigation, defect triage, or any situation where you need to check configuration, records, properties, ACLs, roles, or system state.

## When to Generate a Diagnostic Script

- Recommended actions involve checking configuration, records, properties, ACLs, roles, or system state
- The issue involves permissions, missing records, or misconfigured settings
- Manual checks would be tedious or error-prone
- The engineer needs to gather data from a customer instance before proposing a fix

**Skip script generation** only if the issue is purely conceptual or requires no instance-level investigation.

## Script Requirements

Every diagnostic script MUST follow these rules:

1. **Self-contained** — runnable in **Scripts - Background** with no dependencies
2. **Read-only** — NEVER modify data. No `insert()`, `update()`, `deleteRecord()`, `setWorkflow(true)`, or any write operation
3. **`setWorkflow(false)`** — call on EVERY `GlideRecord` query to prevent business rules from firing
4. **Clear output** — use `gs.info()` with labels explaining what each check means
5. **Null-safe** — handle missing records gracefully; don't assume records exist
6. **Header comment** — explain what the script checks, who it was generated for, and that it's read-only
7. **Under 100 lines** — keep it focused; split into multiple scripts if needed

## Script Template

```javascript
// Diagnostic Script: <brief description>
// Generated for: <case/task/defect number>
// Purpose: <what this script checks>
// READ-ONLY - does not modify any data
(function() {
    gs.info('=== Diagnostic: <title> ===');

    // Check 1: <description>
    var gr = new GlideRecord('<table>');
    gr.setWorkflow(false);
    gr.addQuery('<field>', '<value>');
    gr.query();
    if (gr.next()) {
        gs.info('Check 1: FOUND — <field>=' + gr.getValue('<field>'));
    } else {
        gs.info('Check 1: NOT FOUND — <what this means>');
    }

    // Check 2: <description>
    // ...

    gs.info('=== End Diagnostic ===');
})();
```

## Common Diagnostic Patterns

### System Properties

```javascript
var val = gs.getProperty('property.name');
gs.info('Property property.name = ' + (val || '(not set)'));
```

### ACL Checks

```javascript
var gr = new GlideRecord('sys_security_acl');
gr.setWorkflow(false);
gr.addQuery('name', 'table_name');
gr.addQuery('operation', 'read');
gr.query();
gs.info('ACLs for table_name read: ' + gr.getRowCount());
while (gr.next()) {
    gs.info('  ACL: ' + gr.getValue('name') + ' | condition: ' + gr.getValue('condition') +
            ' | script: ' + (gr.getValue('script') ? 'yes' : 'no'));
}
```

### Role Checks

```javascript
var gr = new GlideRecord('sys_user_has_role');
gr.setWorkflow(false);
gr.addQuery('user', '<user_sys_id>');
gr.addQuery('role.name', '<role_name>');
gr.query();
gs.info('User has role <role_name>: ' + gr.hasNext());
```

### Record Existence

```javascript
var gr = new GlideRecord('<table>');
gr.setWorkflow(false);
gr.addQuery('<field>', '<value>');
gr.setLimit(1);
gr.query();
gs.info('<table> record exists: ' + gr.hasNext());
if (gr.next()) {
    gs.info('  sys_id: ' + gr.getUniqueValue());
    gs.info('  <key_field>: ' + gr.getValue('<key_field>'));
}
```

### Script Include / UI Action Queries

```javascript
var gr = new GlideRecord('sys_script_include');
gr.setWorkflow(false);
gr.addQuery('name', '<ScriptIncludeName>');
gr.query();
if (gr.next()) {
    gs.info('Script Include found: ' + gr.getValue('name') +
            ' | active: ' + gr.getValue('active') +
            ' | access: ' + gr.getValue('access'));
}
```

### Dictionary / Field Configuration

```javascript
var gr = new GlideRecord('sys_dictionary');
gr.setWorkflow(false);
gr.addQuery('name', '<table>');
gr.addQuery('element', '<field>');
gr.query();
if (gr.next()) {
    gs.info('Field <table>.<field>: type=' + gr.getValue('internal_type') +
            ' | mandatory=' + gr.getValue('mandatory') +
            ' | read_only=' + gr.getValue('read_only'));
}
```

### Client Scripts / UI Policies

```javascript
var gr = new GlideRecord('sys_ui_policy');
gr.setWorkflow(false);
gr.addQuery('table', '<table>');
gr.addQuery('active', 'true');
gr.query();
gs.info('Active UI Policies on <table>: ' + gr.getRowCount());
while (gr.next()) {
    gs.info('  ' + gr.getValue('short_description') + ' | condition: ' + gr.getValue('condition'));
}
```

### Update Set History

```javascript
var gr = new GlideRecord('sys_update_xml');
gr.setWorkflow(false);
gr.addQuery('name', 'STARTSWITH', '<table>_');
gr.orderByDesc('sys_updated_on');
gr.setLimit(10);
gr.query();
gs.info('Recent updates to <table> records:');
while (gr.next()) {
    gs.info('  ' + gr.getValue('name') + ' | ' + gr.getValue('sys_updated_on') +
            ' | ' + gr.getValue('update_set'));
}
```

### Syslog / Error Checks

```javascript
var gr = new GlideRecord('syslog');
gr.setWorkflow(false);
gr.addQuery('message', 'CONTAINS', '<error keyword>');
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();
gs.info('Recent log entries matching "<error keyword>": ' + gr.getRowCount());
while (gr.next()) {
    gs.info('  [' + gr.getValue('level') + '] ' + gr.getValue('sys_created_on') +
            ' — ' + gr.getValue('message').substring(0, 200));
}
```

## Presentation Guidelines

- Present the script in a **fenced code block** so the engineer can copy it directly
- Include a brief explanation **before** the script describing what each section checks
- Include a brief explanation **after** the script describing what the output means and what to look for
- If the script is for a support case, note that it is safe to run on customer production instances

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `setWorkflow(false)` | Add to EVERY GlideRecord before `query()` |
| Using `update()` or `insert()` | Scripts must be read-only — query and report only |
| Assuming records exist | Always check `gr.next()` or `gr.hasNext()` before accessing fields |
| No output labels | Use `gs.info()` with descriptive labels for every check |
| Script too long | Keep under 100 lines; split into multiple scripts if needed |
| No header comment | Always include purpose, target case, and read-only warning |

## Task Types This Doc Supports

- Investigating support cases (support-agent)
- Diagnosing defect root causes (defect-agent)
- Generating customer-safe diagnostic scripts
- Checking configuration, ACLs, roles, properties on instances
