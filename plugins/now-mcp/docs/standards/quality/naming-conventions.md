# Naming Conventions

## When to use this doc

Load this when creating any new ServiceNow artifact — tables, fields, scripts, roles, properties, events, or files. Consistent naming is critical for maintainability.

## Tables

```
{scope}_{descriptive_name}
```

Examples:
- `sn_wsd_visitor_visitor`
- `sn_wsd_visitor_invitation`
- `sn_wsd_kiosk_configuration`

Junction tables (M2M): `{scope}_m2m_{entity1}_{entity2}` or `{scope}_{entity1}_{entity2}`

## Fields

Use snake_case, descriptive names:

| Good | Bad |
|------|-----|
| `assigned_to` | `assignedTo` |
| `start_date` | `sd` |
| `is_active` | `active_flag_status` |
| `visitor_count` | `cnt` |

Boolean fields: prefix with `is_` or `has_` when it improves readability.

## Script Includes

Class name: PascalCase, prefixed with app abbreviation:

```
{AppPrefix}{ClassName}
```

Examples:
- `WSDVMVisitorService`
- `WSDVMUtils`
- `WSDVMAjaxProcessor`

API name: `{scope}.{ClassName}` (e.g., `sn_wsd_visitor.WSDVMVisitorService`)

## Roles

```
{scope}.{suffix}
```

Standard suffixes: `admin`, `user`, `viewer`, `operator`

Examples:
- `sn_wsd_visitor.admin`
- `sn_wsd_kiosk.operator`

## System Properties

```
{scope}.{category}.{name}
```

Categories: `feature`, `default`, `integration`, `notification`, `batch`, `api`, `ui`, `debug`

Examples:
- `sn_wsd_visitor.feature.self_registration.enabled`
- `sn_wsd_visitor.default.visit.duration_minutes`
- `sn_wsd_visitor.integration.api_key`

## Events

```
{scope}.{action}_{subject}
```

Examples:
- `sn_wsd_visitor.notify_created`
- `sn_wsd_visitor.invitation_cancelled`
- `sn_myapp.record_approved`

## Business Rules

Descriptive name reflecting what the rule does:

| Good | Bad |
|------|-----|
| `Send cancellation email` | `BR_001` |
| `Validate visitor record` | `Before update` |
| `Fire record created event` | `After insert script` |

## File Names

```
{table}_{sys_id}.xml
```

Examples:
- `sys_script_include_abc123def456.xml`
- `sys_script_abc123def456.xml`
- `sys_security_acl_abc123def456.xml`

## JavaScript Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `VisitorService` |
| Methods | camelCase | `getVisitor()` |
| Private methods | _camelCase | `_toObject()` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Variables | camelCase | `visitorGr` |
| GlideRecord vars | suffix with `Gr` | `userGr`, `incidentGr` |

## Task Types This Doc Supports

- Creating any new ServiceNow artifact
- Code reviews (checking naming consistency)
- Setting up new applications
- Adding fields, properties, events, or roles
