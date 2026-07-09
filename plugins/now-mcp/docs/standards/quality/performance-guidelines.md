# Performance Guidelines

> **TODO**: Expand with concrete performance patterns from our projects. Outline extracted from skill audit.

## When to use this doc

Load this when optimizing query performance, reviewing server-side scripts for efficiency, or designing tables with performance in mind.

## Query Optimization

- **Add indexes** on fields used in `addQuery()`, `addEncodedQuery()`, and filter conditions
- **Use `setLimit()`** when you only need a fixed number of results
- **Use `GlideAggregate`** for counts and sums instead of iterating and counting
- **Avoid deep dot-walking** (max 2 levels) — each level is an additional join
- **Use encoded queries** for complex conditions — they're optimized at the database level
- **Use `chooseWindow()`** for pagination instead of loading all records

## Script Performance

- **Delegate to Script Includes** — Keep Business Rules and Scheduled Jobs thin
- **Avoid synchronous GlideAjax** — `getXMLWait()` blocks the UI thread
- **Batch GlideRecord updates** — Use `setLimit()` to process in chunks
- **Minimize DOM operations** in client scripts
- **Use conditions on client scripts** to limit when they execute

## Table Design

- Index fields that appear in common queries and filter conditions
- Use composite indexes for multi-field queries
- Keep choice field sequences spaced (increments of 10) for flexibility
- Use `reference_cascade_rule` to avoid orphaned records

## Business Rule Performance

- Use `filter_condition` instead of script-based checks (evaluated at DB level)
- Use `before` rules for validation (avoid unnecessary saves)
- Use `async` for heavy processing (doesn't block the save)
- Set appropriate `order` to avoid unnecessary rule evaluation

## Outline for Future Content

- Specific index patterns for common query shapes
- Memory management in scheduled jobs
- Client script performance profiling
- Widget rendering optimization
- Cache usage and `ignore_cache` property settings

## Task Types This Doc Supports

- Performance optimization of server-side code
- Index design for custom tables
- Query optimization
- Code reviews focused on performance
