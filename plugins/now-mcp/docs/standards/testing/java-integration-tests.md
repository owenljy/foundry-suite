# Java Integration Tests

## When to use this doc

Load this when writing or reviewing Java integration tests for ServiceNow server-side behavior, including ACL enforcement, Business Rule logic, scheduled job execution, and data integrity checks. These tests run against a live ServiceNow instance and validate behavior that unit tests cannot cover.

## Project Setup

### Maven Profiles

Integration tests use Maven profiles to control execution. The two key profiles are:

| Profile | Purpose |
|---------|---------|
| `it` | Runs integration tests (activates the `maven-failsafe-plugin`) |
| `local` | Points at your local developer instance (sets base URL, credentials) |

Run integration tests with:

```bash
mvn verify -P it,local
```

### pom.xml Structure

The integration test module typically lives as a submodule or in the same project. Key plugin configuration:

```xml
<profile>
    <id>it</id>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-failsafe-plugin</artifactId>
                <configuration>
                    <includes>
                        <include>**/*IT.java</include>
                    </includes>
                </configuration>
                <executions>
                    <execution>
                        <goals>
                            <goal>integration-test</goal>
                            <goal>verify</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</profile>
```

Integration test classes must end with `IT` (e.g., `VisitorAclIT.java`, `ScheduleJobIT.java`).

### Test Resource Directory

```
src/test/
├── java/
│   └── com/servicenow/myapp/
│       ├── VisitorAclIT.java
│       ├── BusinessRuleIT.java
│       └── ScheduledJobIT.java
└── resources/
    └── com/servicenow/myapp/
        ├── visitor-test-data.xml
        ├── user-test-data.xml
        └── cleanup-data.xml
```

Test data XML files live alongside the test classes in the resources directory, mirroring the package structure.

## GlideScopedEvaluator Pattern

The `GlideScopedEvaluator` is the primary mechanism for calling scoped Script Includes from Java integration tests. It executes server-side JavaScript within a specific application scope.

```java
private static final String SCOPE_ID = "com.sn_wsd_visitor"; // From plugin.properties

private String evalScript(String script) {
    Object eval = new GlideScopedEvaluator()
        .withEnforcedSecurity(false)
        .evaluateScript(new ScopedGlideScriptSource(null, null, SCOPE_ID, script));
    return GlideController.getStringResult(eval, script);
}
```

### Using evalScript to Call Script Includes

```java
@Test
void shouldCreateVisitorRecord() {
    String script = "var svc = new sn_wsd_visitor.VisitorService();"
        + "var result = svc.createVisitor({ firstName: 'Test', lastName: 'User', email: 'test@example.com' });"
        + "result;";
    String sysId = evalScript(script);
    assertNotNull(sysId, "VisitorService.createVisitor should return a sys_id");
}
```

### Controlling Security Enforcement

| Method | Effect |
|--------|--------|
| `.withEnforcedSecurity(false)` | Runs as system — bypasses ACLs. Use for setup/teardown. |
| `.withEnforcedSecurity(true)` | Runs with current user's permissions. Use for ACL testing with `@WithUser`. |

## DataLoader and RecordCleaner Lifecycle

### Loading Test Data from XML

Test data is loaded from XML files in `src/test/resources/` using `DataLoader`:

```java
@BeforeAll
static void setupTestData() {
    DataLoader.load("com/servicenow/myapp/visitor-test-data.xml");
}
```

### Cleaning Up Test Data

`RecordCleaner` removes test data after tests complete. Always clean up to avoid polluting the instance:

```java
@AfterAll
static void cleanupTestData() {
    RecordCleaner.clean("sn_wsd_visitor_visitor", "emailENDSWITH@test-integration.com");
    RecordCleaner.clean("sys_user", "user_nameSTARTSWITHit_test_");
}
```

### Full Lifecycle Example

```java
class VisitorServiceIT {

    private static final String SCOPE_ID = "com.sn_wsd_visitor";

    @BeforeAll
    static void setup() {
        DataLoader.load("com/servicenow/myapp/visitor-test-data.xml");
    }

    @AfterAll
    static void teardown() {
        RecordCleaner.clean("sn_wsd_visitor_visitor", "emailENDSWITH@it-test.com");
    }

    // ... tests ...
}
```

## @WithUser Annotations

The `@WithUser` annotation impersonates a specific user for the duration of a test. This is essential for ACL and permission testing.

```java
@Test
@WithUser("visitor.admin")
void adminCanUpdateVisitorRecord() {
    String script = "var gr = new GlideRecord('sn_wsd_visitor_visitor');"
        + "gr.get('" + testVisitorSysId + "');"
        + "gr.canWrite();";
    String result = evalScript(script);
    assertEquals("true", result, "Admin should have write access to visitor records");
}

@Test
@WithUser("visitor.viewer")
void viewerCannotUpdateVisitorRecord() {
    String script = "var gr = new GlideRecord('sn_wsd_visitor_visitor');"
        + "gr.get('" + testVisitorSysId + "');"
        + "gr.canWrite();";
    String result = evalScript(script);
    assertEquals("false", result, "Viewer should not have write access to visitor records");
}
```

### User Setup for @WithUser

The users referenced by `@WithUser` must exist on the instance with appropriate roles. Load them via test data XML or create them in `@BeforeAll`.

## ACL Testing Patterns

ACL tests follow a consistent pattern: impersonate a user, attempt a CRUD operation, assert allowed or denied.

### Read ACL Test

```java
@Test
@WithUser("it_test_unauthorized")
void unauthorizedUserCannotReadConfidentialRecords() {
    String script = "var gr = new GlideRecord('sn_wsd_visitor_visitor');"
        + "gr.addQuery('confidential', true);"
        + "gr.query();"
        + "gr.getRowCount();";
    String count = evalScript(script);
    assertEquals("0", count, "Unauthorized user should see zero confidential records");
}
```

### Write ACL Test

```java
@Test
@WithUser("it_test_operator")
void operatorCanUpdateAssignedRecords() {
    String script = "var gr = new GlideRecord('sn_wsd_visitor_visit');"
        + "gr.get('" + operatorVisitSysId + "');"
        + "gr.setValue('state', 'checked_in');"
        + "gr.update();";
    String result = evalScript(script);
    assertNotEquals("", result, "Operator should be able to update assigned visit");
}
```

### Create ACL Test

```java
@Test
@WithUser("it_test_viewer")
void viewerCannotCreateRecords() {
    String script = "var gr = new GlideRecord('sn_wsd_visitor_visitor');"
        + "gr.initialize();"
        + "gr.setValue('first_name', 'Unauthorized');"
        + "gr.setValue('last_name', 'Create');"
        + "gr.insert();";
    String result = evalScript(script);
    assertEquals("", result, "Viewer should not be able to create visitor records");
}
```

## Test Data in XML

### Directory Structure

```
src/test/resources/com/servicenow/myapp/
├── visitor-test-data.xml        # Visitor records for testing
├── user-roles-test-data.xml     # Users with specific role assignments
└── location-test-data.xml       # Location reference data
```

### INSERT_OR_UPDATE Format

Test data XML uses the same format as ServiceNow unload files:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<unload unload_date="2024-01-01 00:00:00">
    <sn_wsd_visitor_visitor action="INSERT_OR_UPDATE">
        <sys_id>it_test_visitor_001</sys_id>
        <first_name>Integration</first_name>
        <last_name>TestVisitor</last_name>
        <email>integration.test@it-test.com</email>
        <active>true</active>
    </sn_wsd_visitor_visitor>
    <sn_wsd_visitor_visitor action="INSERT_OR_UPDATE">
        <sys_id>it_test_visitor_002</sys_id>
        <first_name>Another</first_name>
        <last_name>TestVisitor</last_name>
        <email>another.test@it-test.com</email>
        <active>false</active>
    </sn_wsd_visitor_visitor>
</unload>
```

### User and Role Test Data

```xml
<unload unload_date="2024-01-01 00:00:00">
    <sys_user action="INSERT_OR_UPDATE">
        <sys_id>it_test_admin_user</sys_id>
        <user_name>it_test_admin</user_name>
        <first_name>IT</first_name>
        <last_name>Admin</last_name>
        <active>true</active>
    </sys_user>
    <sys_user_has_role action="INSERT_OR_UPDATE">
        <user display_value="IT Admin">it_test_admin_user</user>
        <role display_value="sn_wsd_visitor.admin" name="sn_wsd_visitor.admin">{role_sys_id}</role>
        <state>active</state>
    </sys_user_has_role>
</unload>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not cleaning up test data | Always use `RecordCleaner` in `@AfterAll` — leftover data pollutes the instance |
| Wrong scope ID in `GlideScopedEvaluator` | Read scope from `plugin.properties` — use the full `com.sn_myapp` format |
| Missing Maven profiles when running | Must pass both `-P it,local` to activate tests and point at instance |
| Test class name missing `IT` suffix | Failsafe plugin only picks up `**/*IT.java` by default |
| Using `withEnforcedSecurity(false)` for ACL tests | ACL tests must use `withEnforcedSecurity(true)` combined with `@WithUser` |
| Not loading user/role data before ACL tests | Users referenced by `@WithUser` must exist on the instance before tests run |
| Hardcoding instance URLs | Use Maven profile properties so tests work across local, dev, and CI environments |
| Test order dependencies | Each test should set up its own preconditions — don't rely on execution order |

## Task Types This Doc Supports

- Writing Java integration tests for ACL enforcement
- Writing Java integration tests for Business Rule behavior
- Writing Java integration tests for scheduled job execution
- Setting up test data XML for integration tests
- Testing Script Include behavior via GlideScopedEvaluator
- Permission boundary testing with @WithUser
- Code reviews of integration test files
- Setting up Maven profiles for integration test execution
