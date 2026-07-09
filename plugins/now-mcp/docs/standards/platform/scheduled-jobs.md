# Scheduled Jobs

## When to use this doc

Load this when creating scheduled jobs (sysauto_script), batch processing tasks, periodic syncs, cleanup routines, or any automated background work.

## Run Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `daily` | Once per day at specified time | `run_time` |
| `weekly` | Once per week on specified day | `run_dayofweek`, `run_time` |
| `monthly` | Once per month on specified day | `run_dayofmonth`, `run_time` |
| `periodically` | At regular intervals | `run_period`, `run_start` |
| `on_demand` | Manual execution only | None |

## Time Notation

Times use a 1970-01-01 base date format:

| Interval | `run_period` Value |
|----------|-------------------|
| Every 15 minutes | `1970-01-01 00:15:00` |
| Every 30 minutes | `1970-01-01 00:30:00` |
| Every 1 hour | `1970-01-01 01:00:00` |
| Every 4 hours | `1970-01-01 04:00:00` |
| Every 12 hours | `1970-01-01 12:00:00` |

## Day of Week Values

| Value | Day |
|-------|-----|
| 1 | Sunday |
| 2 | Monday |
| 3 | Tuesday |
| 4 | Wednesday |
| 5 | Thursday |
| 6 | Friday |
| 7 | Saturday |

## Script Patterns

### Simple Service Call

Keep job scripts thin — delegate to Script Includes:

```javascript
new MyCleanupService().runDailyCleanup();
```

### With Logging

```javascript
var startTime = new GlideDateTime();
gs.info('My Job started at: ' + startTime);

var count = new MyService().process();

gs.info('My Job completed. Processed: ' + count + ' records.');
```

### With Error Handling

```javascript
try {
    var service = new MyService();
    service.runBatchProcess();
    gs.info('Batch process completed successfully');
} catch (e) {
    gs.error('Batch process failed: ' + e.message);
}
```

### Batch Processing

```javascript
var gr = new GlideRecord('my_table');
gr.addQuery('state', 'pending');
gr.setLimit(1000);  // Process in batches
gr.query();

var count = 0;
while (gr.next()) {
    gr.setValue('state', 'processed');
    gr.update();
    count++;
}
gs.info('Processed ' + count + ' records');
```

## Conditional Execution

Jobs can check a condition script before running. Set `conditional=true` and provide a `condition` script:

```javascript
// Check system property
gs.getProperty('sn_myapp.job_enabled') == 'true';

// Check day of week (skip weekends)
var day = new GlideDateTime().getDayOfWeek();
day != 1 && day != 7;

// Check if not in maintenance window
!gs.getProperty('sn_myapp.maintenance_mode');
```

## Time Zone Options

| Value | Description |
|-------|-------------|
| `GMT` | Run at specified time in GMT |
| `floating` | Run at specified time in each user's timezone |
| (empty) | Use system timezone |

## Best Practices

1. **Delegate to Script Includes** — Keep job scripts as thin service calls
2. **Always add logging** — Start time, end time, record counts for monitoring
3. **Process in batches** — Use `setLimit()` to avoid timeouts on large datasets
4. **Use conditional execution** — Control jobs via system properties without deactivating
5. **Set appropriate `run_as`** — Usually System Administrator for background jobs
6. **Add error handling** — try/catch with `gs.error()` for batch jobs

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Complex logic inline in job script | Delegate to Script Include |
| No logging | Add start/end time and processed count logging |
| No batch limiting | Use `setLimit()` for large datasets |
| Hardcoded configuration | Use system properties (see `sys-properties.md`) |
| No error handling | Wrap in try/catch for batch jobs |

## Task Types This Doc Supports

- Creating scheduled cleanup jobs
- Building periodic sync processes
- Setting up batch processing
- Creating property-controlled conditional jobs
- Code reviews of scheduled jobs
