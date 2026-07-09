# Browser Verification Patterns (Playwright MCP)

Reference guide for agents that verify code changes on a running ServiceNow instance using the Playwright MCP (`mcp__playwright__*`).

Used by: **defect-agent** (Phase 6.5), **task-agent** (Phase 4.5), **verify-agent**, **test-agent**

---

## Playwright MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp__playwright__browser_navigate` | Navigate to URL |
| `mcp__playwright__browser_snapshot` | Read accessibility tree (PRIMARY — use this to understand the page) |
| `mcp__playwright__browser_click` | Click element by ref or selector |
| `mcp__playwright__browser_type` | Type text into focused/specified element |
| `mcp__playwright__browser_fill_form` | Bulk fill multiple form fields |
| `mcp__playwright__browser_select_option` | Select dropdown option |
| `mcp__playwright__browser_press_key` | Press keyboard key (Tab, Enter, Escape) |
| `mcp__playwright__browser_hover` | Hover over element |
| `mcp__playwright__browser_drag` | Drag element |
| `mcp__playwright__browser_take_screenshot` | Capture viewport or full page as PNG |
| `mcp__playwright__browser_wait_for` | Wait for text, element, or timeout |
| `mcp__playwright__browser_evaluate` | Run JavaScript in page context |
| `mcp__playwright__browser_console_messages` | Read browser console output |
| `mcp__playwright__browser_network_requests` | Read network activity |
| `mcp__playwright__browser_tabs` | List/switch browser tabs |
| `mcp__playwright__browser_close` | Close browser |

---

## The Observe-Act Loop

Every browser interaction follows this pattern:

```
1. OBSERVE: browser_snapshot() → read accessibility tree, understand current page state
2. PLAN:   Determine what action to take based on page state
3. ACT:    Execute action (click, type, navigate, etc.)
4. WAIT:   browser_wait_for() → wait for expected change
5. VERIFY: browser_snapshot() → confirm action succeeded
6. REPEAT: Continue until verification is complete
```

Use `browser_snapshot()` as your primary tool for understanding pages — it returns the accessibility tree which shows all interactive elements with their refs, roles, and text.

---

## What Counts as a UI Change (Mandatory Verification)

**ANY change to these record types or file types REQUIRES browser verification.** Do not skip. Do not classify as "non-UI config." When in doubt, it's a UI change — the cost of a 2-minute browser check is far less than a missed UI regression.

| Category | Record Types / Files | Table Examples |
|----------|---------------------|----------------|
| **Classic UI Scripts** | Client Scripts, UI Policies, UI Actions, UI Scripts | `sys_script_client`, `sys_ui_policy`, `sys_ui_action`, `sys_ui_script` |
| **Classic UI Structure** | Form Layouts, List Layouts, Related Lists, UI Pages, UI Macros | `sys_ui_form`, `sys_ui_list`, `sys_ui_related_list`, `sys_ui_page`, `sys_ui_macro` |
| **Service Portal** | Widgets (HTML/CSS/client/server), Portal Pages, Angular Providers/Directives | `sp_widget`, `sp_page`, `sp_angular_provider` |
| **Workspace / Next Experience** | Macroponents, UX Pages, UX Page Properties, Seismic Components, Declarative Actions, UX App Routes, UX Lists, UX Forms, UX Screen Types | `sys_ux_macroponent`, `sys_ux_page`, `sys_ux_page_property`, `sys_ux_data_broker_transform`, `sys_ux_*` |
| **Visual / Markup** | CSS changes, Jelly templates, HTML templates, Angular templates | Any file with HTML, CSS, Jelly, or Angular template content |
| **Form Behavior** | Business Rules that set field visibility/mandatory/read-only, UI Policy Actions | Server-side logic that changes what the user sees on a form |

### Workspace-specific verification notes

- Workspace pages do **NOT** use iframes — elements are directly in the page DOM (unlike Classic UI)
- Macroponent changes require navigating to a specific workspace page where the macroponent is rendered — check the workspace URL table under [Navigation Patterns](#next-experience--workspace) to find the right URL
- `sys_ux_*` records (macroponents, pages, data broker transforms, screen types) are XML files that define UI behavior — they are NOT "XML-only config changes"

---

## Authentication

### Local Instance (localhost:8080)

```
1. browser_navigate(url: "http://localhost:8080")
2. browser_snapshot()  → find login form
3. browser_type(element: "Username field", text: "admin")
4. browser_type(element: "Password field", text: "admin")
5. browser_click(element: "Login button")
6. browser_wait_for(text: "All")  → wait for ServiceNow to load
7. browser_snapshot()  → confirm logged in
```

### Session Dialog Handling

ServiceNow shows "Extend session" dialogs after inactivity. If encountered during verification:
```
browser_click(element: "Extend session button")
```
Then resume the verification steps.

---

## Navigation Patterns

### Classic UI (Standard Forms)

Direct record URL: `http://localhost:8080/<table>.do?sys_id=<sys_id>`
List URL: `http://localhost:8080/<table>_list.do`
Filtered list: `http://localhost:8080/<table>_list.do?sysparm_query=<encoded_query>`

**Important:** Classic UI forms live inside the `#gsft_main` iframe. Many elements will only be visible in the iframe context. If `browser_snapshot()` doesn't show form fields, you may need to interact within the iframe.

### Next Experience / Workspace

Record URL: `http://localhost:8080/now/<workspace-name>/record/<table>/<sys_id>`
List URL: `http://localhost:8080/now/<workspace-name>/list/<table>`

**Known workspaces:**
| Workspace | URL segment | Use for |
|-----------|-------------|---------|
| Health & Safety | `ohs-incident-management` | Health & Safety plugins (`hs-*`, `ohs-*` repos / `sn_ohs_*`, `sn_hs_*` scopes) |
| Workplace Central | `workplace-management` | Workplace Service Delivery plugins (`app-wsd-*` repos / `sn_wsd_*` scopes) |
| Service Operations | `sow` | Service Operations plugins |
| Customer Service | `csm` | Customer Service Management plugins |
| HR | `hr` | HR plugins |

> **Override rule:** If the defect or story specifies a particular workspace for verification, always use that workspace instead of the defaults above.

Workspace pages do NOT use iframes — elements are directly in the page DOM.

### Navigation Best Practices

- **Prefer direct URL navigation** over clicking through menus — fewer steps, fewer failures
- Always `browser_wait_for()` after navigation — pages load asynchronously
- Use `browser_snapshot()` after navigation to confirm you're on the right page
- If you have a `sys_id`, use it for direct URL — skip list navigation entirely

---

## Form Field Interactions

### Text Fields
```
browser_click(element: "Short description field")
browser_type(text: "My new value")
browser_press_key(key: "Tab")  → trigger onChange/validation
```

### Reference Fields
```
browser_click(element: "Caller field")
browser_type(text: "Abel Tuter")
browser_wait_for(text: "Abel Tuter")  → wait for suggestions dropdown
browser_click(element: "Abel Tuter suggestion")
```

### Choice / Dropdown Fields
```
browser_click(element: "Priority dropdown")
browser_wait_for(text: "1 - Critical")  → wait for dropdown options
browser_click(element: "1 - Critical option")
```

### Date Fields
```
browser_click(element: "Date field calendar icon")
browser_wait_for(text: "Today")  → wait for calendar popup
browser_click(element: "desired date")
```

### Checkbox Fields
```
browser_click(element: "Active checkbox")
```

### Form Submission
```
browser_click(element: "Save button" or "Update button")
browser_wait_for(text: "saved" or "updated")  → wait for save confirmation
browser_take_screenshot()  → capture result
```

---

## Using g_form API (Classic UI)

For programmatic form interaction in Classic UI, use `browser_evaluate` with the `g_form` API:

```javascript
// Read field value
browser_evaluate(expression: "g_form.getValue('short_description')")

// Set field value
browser_evaluate(expression: "g_form.setValue('priority', '1')")

// Check if field is mandatory
browser_evaluate(expression: "g_form.isMandatory('short_description')")

// Check if field is visible
browser_evaluate(expression: "g_form.isVisible('resolution_notes')")

// Check if field is read-only
browser_evaluate(expression: "g_form.isReadOnly('state')")
```

This is useful for:
- Validating field states without clicking through the UI
- Setting values that are hard to set via UI (e.g., hidden fields)
- Checking business rule outcomes (field visibility, mandatory state)

---

## Wait Conditions

| After this action... | Wait for... |
|---------------------|-------------|
| Page navigation | `browser_wait_for(text: "expected page element")` |
| Form save/update | `browser_wait_for(text: "saved")` or toast message |
| Modal open | `browser_wait_for(text: "modal title text")` |
| Modal close | Wait for modal text to disappear |
| List refresh | `browser_wait_for(text: "expected list content")` |
| Reference field suggestions | `browser_wait_for(text: "suggestion text")` |
| Dropdown options | `browser_wait_for(text: "option text")` |

**Timeouts:** Default 5s for most waits. Use longer (10-15s) for page loads and deployments.

---

## Screenshot Evidence

Capture screenshots at key moments and save to `verification/<TICKET_NUMBER>/` in the workspace root:

```
verification/
  DEF0821485/
    before.png          ← state before fix (defect behavior)
    after.png           ← state after fix (correct behavior)
    step3-form-saved.png  ← intermediate step evidence
```

**When to capture:**
- **Before** the critical step (showing the defect / initial state)
- **After** the critical step (showing correct behavior)
- At any step where visual evidence is useful

**How to capture:**
```
mcp__playwright__browser_take_screenshot()
```
This returns a PNG. Save it to disk with a descriptive filename.

**Log the paths** so the user knows where to find them:
```
Screenshots saved to verification/DEF0821485/
  - before.png: Form showing duplicate Compose buttons
  - after.png: Form showing contextual "Compose Initial communication" labels
```

---

## Error Recovery

When a step fails, try these approaches in order before giving up:

1. **Wait and retry** — the element might not have loaded yet; use `browser_wait_for()`
2. **Scroll into view** — element might be below the fold
3. **Alternative selector** — try a different way to identify the element (text, role, label)
4. **JavaScript fallback** — use `browser_evaluate()` to interact programmatically
5. **Navigate and retry** — refresh the page or navigate directly to the URL

**Safety limit:** Max 30 tool actions per verification attempt. If you can't verify within 30 actions, report INCONCLUSIVE.

---

## Verification Flow for Defects

```
1. Login to instance
2. Navigate to affected area (direct URL with sys_id if available)
3. browser_take_screenshot() → capture "before" state
4. Execute steps to reproduce from the defect
5. At the critical moment: verify the defect behavior is GONE
6. browser_take_screenshot() → capture "after" state
7. (Optional) browser_evaluate(g_form.getValue(...)) → API-level validation
8. Report: VERIFIED / NOT VERIFIED / INCONCLUSIVE
```

**If NOT VERIFIED:** Diagnose what went wrong → revise fix → re-deploy → re-verify (max 3 iterations)

**Skip verification if:**
- Fix is XML-only (dictionary changes) with no behavioral change
- No steps to reproduce and fix is purely logical (e.g., field name typo)
- Instance is not reachable

> **Never skip browser verification** for any code change that modifies the UI (client scripts, UI policies, UI actions, form/list layouts, portal widgets, workspace components, or any change to Jelly/HTML/CSS/Angular). UI changes must always be verified in the browser.

## Verification Flow for Stories

```
1. Login to instance
2. Navigate to the feature area
3. Execute acceptance criteria steps
4. browser_take_screenshot() → capture feature working
5. Confirm all acceptance criteria are met
6. Report result
```

**Skip if:** Story is purely server-side with no UI impact.

> **Never skip browser verification** for any code change that modifies the UI (client scripts, UI policies, UI actions, form/list layouts, portal widgets, workspace components, or any change to Jelly/HTML/CSS/Angular). UI changes must always be verified in the browser.
