# Code Review Checklist

## When to use this doc

Load this when reviewing ServiceNow code (Business Rules, Script Includes, Client Scripts, etc.) or when self-reviewing before submitting a PR.

## Script Includes

- [ ] Class name matches `type` property
- [ ] `api_name` follows `{scope}.{ClassName}` pattern
- [ ] Private methods prefixed with underscore
- [ ] Client-callable includes extend `AbstractAjaxProcessor` and are `public`
- [ ] Error handling with try/catch for external calls
- [ ] Logging uses `gs.info/warn/error` with class name prefix
- [ ] `getValue()` used instead of direct field access
- [ ] Unit tests exist (see `testing/atf-patterns.md`)

## Business Rules

- [ ] Appropriate timing (before/after/async) for the use case
- [ ] At least one operation enabled (insert/update/delete)
- [ ] Filter condition set to limit scope (not running on every record)
- [ ] Script wrapped in IIFE: `(function executeRule(current, previous) { })(current, previous);`
- [ ] `previous` not accessed in async rules or insert-only rules
- [ ] `current` not updated in after rules (causes recursive saves)
- [ ] Heavy logic delegated to Script Includes
- [ ] Abort rules have `abort_action=true` and `add_message=true` in XML

## Client Scripts

- [ ] `isLoading` check present in onChange scripts
- [ ] No synchronous GlideAjax calls
- [ ] Complex logic delegated to server via GlideAjax
- [ ] `isolate_script=true` set
- [ ] Condition field used to limit execution scope
- [ ] onSubmit returns `false` to cancel (not just shows error)

## Security

- [ ] Every custom table has read/write/create/delete ACLs
- [ ] Roles follow `{scope}.{suffix}` naming
- [ ] Role containment hierarchy is logical (admin > user > viewer)
- [ ] No circular role containment
- [ ] Script-based ACLs set `answer` variable
- [ ] Tested by impersonating each role tier

## Dictionary / Tables

- [ ] Table name prefixed with scope
- [ ] `type="collection"` set on table element
- [ ] Reference fields have `reference` attribute
- [ ] Frequently queried fields have indexes
- [ ] `sys_domain` field included for domain separation
- [ ] Choice sequences use increments of 10
- [ ] `display="true"` set on the display value field

## System Properties

- [ ] Naming follows `{scope}.{category}.{name}` pattern
- [ ] Boolean properties compared to string `'true'` in code
- [ ] Integer properties parsed with `parseInt()` in code
- [ ] Default values provided in `gs.getProperty()` calls
- [ ] `write_roles` set (usually `{scope}.admin`)
- [ ] Sensitive values have `is_private=true`

## Email Notifications

- [ ] Event registration exists (for event-based)
- [ ] `event_parm_1=true` if using `event.parm1` as recipient
- [ ] `event_parm_2=true` if using `event.parm2` as recipient
- [ ] `message_html` wrapped in CDATA
- [ ] Subject does NOT use CDATA
- [ ] Mail scripts tested with various record states

## General

- [ ] No hardcoded sys_ids (use properties or Script Includes)
- [ ] No placeholders in XML (use actual values from plugin.properties)
- [ ] CDATA wrapping correct for the record type
- [ ] `sys_scope` and `sys_package` reference the correct app
- [ ] Files in correct directory (dictionary/ vs update/ vs unload.demo/)

## Task Types This Doc Supports

- Code reviews of any ServiceNow artifacts
- Self-review before submitting PRs
- Quality gates in implementation workflows
- Onboarding new developers to review standards
