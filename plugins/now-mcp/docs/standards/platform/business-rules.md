# Business Rules

## When to use this doc

Load this when creating or modifying Business Rules (sys_script), automating record operations, validating data on save, or triggering events from record changes.

## Timing: When to Run

| Timing | Use Case | `previous` available? |
|--------|----------|-----------------------|
| `before` | Set values, validate, abort saves | Yes (except on insert) |
| `after` | Fire events, update related records, send notifications | Yes (except on insert) |
| `async` | Heavy processing, external calls | **No** — `previous` is null |
| `display` | Modify form display (rarely used) | No |

**Critical**: `previous` is always null on insert operations and in async rules.

## Operations

| Pattern | insert | update | delete | query |
|---------|--------|--------|--------|-------|
| Insert only | `true` | `false` | `false` | `false` |
| Update only | `false` | `true` | `false` | `false` |
| Insert + Update | `true` | `true` | `false` | `false` |
| Delete only | `false` | `false` | `true` | `false` |

## Script Wrapper

Always use the IIFE wrapper pattern:

```javascript
(function executeRule(current, previous /*null when async*/) {
    // Your code here
})(current, previous);
```

## Common Patterns

### Validation with Abort (before insert/update)

```javascript
(function executeRule(current, previous) {
    if (gs.nil(current.email) || gs.nil(current.first_name)) {
        current.setAbortAction(true);
        gs.addErrorMessage('Email and first name are required.');
    }
})(current, previous);
```

When using abort, set these XML fields:
- `abort_action=true`
- `add_message=true`
- `message` field with the HTML error message

### State Change Detection (before/after update)

Use `filter_condition` with `CHANGESTO` operator instead of script-based detection when possible:

```xml
<filter_condition table="my_table">stateCHANGESTO6^EQ
  <item display_value="Resolved" field="state" operator="CHANGESTO" value="6"/>
  <item endquery="true" field="" operator="=" value=""/>
</filter_condition>
```

In script, use:
```javascript
if (current.state.changesTo('resolved')) {
    // State just changed to resolved
}
```

### Fire Event (after insert/update)

```javascript
(function executeRule(current, previous) {
    gs.eventQueue('sn_myapp.record_created', current, 
        current.assigned_to, current.getValue('priority'));
})(current, previous);
```

### Cleanup Related Records (before delete)

```javascript
(function executeRule(current, previous) {
    new MyService().deleteRelatedRecords(current);
})(current, previous);
```

### Set Values (before insert)

```javascript
(function executeRule(current, previous) {
    if (gs.nil(current.assigned_to)) {
        current.assigned_to = gs.getUserID();
    }
})(current, previous);
```

## Filter Condition Syntax

Filter conditions use encoded query format with XML item elements:

### Operators

| Operator | Encoded | Description |
|----------|---------|-------------|
| Equals | `=` | Exact match |
| Not equals | `!=` | Not equal |
| Changes to | `CHANGESTO` | Field changes to specific value |
| Changes from | `CHANGESFROM` | Field changes from value |
| Value changes | `VALCHANGES` | Any value change |
| Is empty | `ISEMPTY` | Field is null/empty |
| Is not empty | `ISNOTEMPTY` | Field has value |
| In | `IN` | Value in comma-separated list |
| Contains | `LIKE` | String contains |
| Starts with | `STARTSWITH` | String starts with |

### AND conditions

```xml
<filter_condition table="incident">state=1^priority=1^EQ
  <item field="state" operator="=" value="1"/>
  <item field="priority" operator="=" value="1"/>
  <item endquery="true" field="" operator="=" value=""/>
</filter_condition>
```

### OR conditions

```xml
<filter_condition table="incident">state=1^ORstate=2^EQ
  <item field="state" operator="=" value="1"/>
  <item field="state" operator="=" or="true" value="2"/>
  <item endquery="true" field="" operator="=" value=""/>
</filter_condition>
```

## Execution Order

- `order` field controls sequence (lower = runs first, default 100)
- `priority` breaks ties within the same order
- Keep validation rules at low order numbers (e.g., 100)
- Keep event-firing rules at higher order numbers (e.g., 10000)

## Best Practices

1. **Keep scripts thin** — Delegate complex logic to Script Includes
2. **Use filter conditions** over script-based checks when possible (better performance)
3. **Use `before` for validation** — Don't use `after` to validate; the record is already saved
4. **Use `after` for side effects** — Events, related record updates, notifications
5. **Use `async` for heavy work** — External API calls, large batch operations
6. **Always check `gs.nil()`** before accessing field values
7. **Don't update `current` in `after` rules** — It causes a recursive update

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Checking `previous` in async rules | `previous` is null in async — use filter conditions instead |
| Checking `previous` on insert | `previous` is null on insert operations |
| Updating `current` in after rules | Causes recursive saves; use a flag or separate GlideRecord |
| Not setting `abort_action=true` in XML | Script `setAbortAction()` alone doesn't work without the XML flag |
| Complex logic inline | Move to Script Include, call from BR |
| Missing filter condition | BR runs on every record operation — use conditions to limit scope |

## Task Types This Doc Supports

- Creating business rules for record automation
- Building validation logic
- Firing events from record changes
- Cleaning up related records on delete
- Code reviews of business rules
