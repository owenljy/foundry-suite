# Search recipes — sn-docs-search

Advanced patterns for finding content in `ServiceNow/ServiceNowDocs`. Load this only when the default flow in `SKILL.md` (static index → `gh search code` → publication `index.md`) doesn't pin down the right file, or when the user asks for something that needs a less obvious approach (cross-release diff, recently-added pages, frontmatter-filtered search).

## GitHub code-search syntax that actually helps

**Quoting gotcha (important)**: `gh search code` returns ZERO results when the query string contains **literal double-quote characters** — the trap is single-quoting a phrase so the quotes survive into the API: `gh search code '"Action Fabric"'` → `[]`. Plain shell double-quotes get stripped by the shell, so `gh search code "Action Fabric"` actually passes `Action Fabric` and works — but the safe habit is unquoted space-separated terms (spaces = AND), e.g. `gh search code 'build agent'` → hits. **If a search returns 0 hits, retry unquoted / with fewer terms before giving up.** For a TRUE exact-phrase match, don't use `gh search code`; use the REST endpoint, which honors the quotes (and also returns `.total_count`):

```bash
gh api -X GET search/code \
  -f q='"Action Fabric" repo:ServiceNow/ServiceNowDocs' \
  --jq '.items[].path'
```

Plain `gh search code 'foo'` does a fuzzy match across file contents on the default branch (the latest release — `australia` at time of writing; see SKILL.md Step 0b). It's good but blunt. Tighten it with these qualifiers (chain inside the quoted query):

```bash
# Exact phrase — use the REST endpoint (gh search code drops quoted phrases)
gh api -X GET search/code \
  -f q='"Action Fabric" repo:ServiceNow/ServiceNowDocs' \
  --jq '.items[].path'

# Restrict to a publication (path prefix)
gh search code 'build agent path:markdown/application-development/' \
  --repo=ServiceNow/ServiceNowDocs --limit=20

# Restrict to a file pattern
gh search code 'oauth filename:index.md' \
  --repo=ServiceNow/ServiceNowDocs --limit=10

# Frontmatter field hit (spaces are AND; no quotes needed)
gh search code 'topic_type: concept build agent' \
  --repo=ServiceNow/ServiceNowDocs --limit=20

# Boolean: must include both terms (spaces = AND)
gh search code 'build agent sub-agent' \
  --repo=ServiceNow/ServiceNowDocs --limit=10
```

**Limit notes**: `--limit` caps at 100. GitHub code-search applies its own ranking; the first 5–10 hits are usually the right ones. If you need to see more, paginate with `--page` or narrow the query.

**Branch limitation**: `gh search code` only indexes the **default branch** (the latest release; see SKILL.md Step 0b). It will not find pages that exist only in older release branches. For multi-release search, see "Cross-release diff" below.

## Cross-release diff (the same file path, two branches)

The cleanest comparison is when the file exists at the same path in both branches. The vast majority of files do — release-to-release renames are rare.

```bash
# Side-by-side diff
diff \
  <(curl -sL "https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/yokohama/markdown/application-development/building-applications/build-agent.md") \
  <(curl -sL "https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/markdown/application-development/building-applications/build-agent.md")
```

Note: paths are nested as `markdown/<publication>/<sub-publication>/<file>.md`. If a path 404s, it's usually nested one level deeper under a sub-publication folder — don't hand-construct a flat path; resolve the real path from the publication `index.md` (or a code-search/REST hit).

If `diff` shows the second file is missing (404 / empty), the page was either renamed or removed. To find the new name:

```bash
# Find pages in australia that mention the old title (spaces = AND; no quotes)
gh search code '<old title from yokohama>' \
  --repo=ServiceNow/ServiceNowDocs --limit=10
```

## What pages were added/removed in the latest release

Compare branch file trees:

```bash
# Australia tree (file paths only, under markdown/)
gh api 'repos/ServiceNow/ServiceNowDocs/git/trees/australia?recursive=1' \
  --jq '[.tree[] | select(.path | startswith("markdown/")) | select(.type == "blob") | .path] | sort | .[]' \
  > /tmp/australia.txt

# Yokohama tree
gh api 'repos/ServiceNow/ServiceNowDocs/git/trees/yokohama?recursive=1' \
  --jq '[.tree[] | select(.path | startswith("markdown/")) | select(.type == "blob") | .path] | sort | .[]' \
  > /tmp/yokohama.txt

# Files added in australia (not in yokohama)
comm -23 /tmp/australia.txt /tmp/yokohama.txt

# Files removed in australia (in yokohama, not in australia)
comm -13 /tmp/australia.txt /tmp/yokohama.txt
```

These calls are heavy (the full tree is ~46k entries). Use sparingly — typically only when the user explicitly asks "what's new" at the file level.

## Filtering by frontmatter without fetching every file

Frontmatter is just text at the top of each file, so `gh search code` finds it. Useful filters:

```bash
# Pages whose topic_type is "concept" (vs reference/task/troubleshooting)
gh search code 'topic_type: concept build agent' \
  --repo=ServiceNow/ServiceNowDocs --limit=10

# Pages updated in 2026 (last_updated field starts with "2026")
gh search code 'last_updated: 2026 build agent' \
  --repo=ServiceNow/ServiceNowDocs --limit=10

# Filter by product or classification (real frontmatter fields).
# Note: there is NO `keywords` frontmatter field — don't filter on it.
gh search code 'classification: management build agent' \
  --repo=ServiceNow/ServiceNowDocs --limit=10
```

Real frontmatter fields are: `title`, `description`, `locale`, `canonical_url`, `release`, `product`, `classification`, `topic_type`, `last_updated`, `reading_time_minutes`, `breadcrumb`.

These are best-effort — GitHub's tokenizer doesn't perfectly parse YAML — but they usually surface the right pages.

## Frontmatter-only fetch (skip the body)

When you only need metadata across many files (e.g. "list every page about Now Assist updated in 2026"), parse the frontmatter without reading the body:

```bash
extract_frontmatter() {
  local url="$1"
  curl -sL "$url" | awk '/^---$/{c++; if(c==2)exit; next} c==1'
}

# Use it
extract_frontmatter "https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/markdown/application-development/building-applications/build-agent.md"
```

For batch frontmatter checks, run in parallel (`&` + `wait`).

## When a file path is unknown but you know the title

Page titles in `index.md` files are formatted as `[Title](raw URL) -- description`. Search those:

```bash
# spaces = AND; no quotes (a quoted phrase returns zero results in gh search code)
gh search code 'Build Agent filename:index.md path:markdown/' \
  --repo=ServiceNow/ServiceNowDocs --limit=10
```

If the exact phrase genuinely matters, use the REST form instead:

```bash
gh api -X GET search/code \
  -f q='"Build Agent" filename:index.md repo:ServiceNow/ServiceNowDocs' \
  --jq '.items[].path'
```

The hits will be the index pages that reference the title — open each to find the actual file URL.

## Looking up a `sys_*` table or API class

ServiceNow's API and table references live mostly in `api-reference/`. The naming is usually predictable:

```bash
# GlideRecord, GlideSystem, GlideForm etc.
curl -sL "https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/markdown/api-reference/glideRecord-api.md"
# sys_user, sys_user_group, etc — search by table name
gh search code 'sys_user_group path:markdown/' \
  --repo=ServiceNow/ServiceNowDocs --limit=10
```

## When the corpus genuinely doesn't have it

Symptoms:
- `gh search code` returns 0 hits with any reasonable query
- The publication `index.md` doesn't list the topic
- Cross-release search also empty

Likely causes:
1. **Feature is too new** — not yet in the most recent release, only in product blogs / newsroom announcements
2. **Feature is community-only** — lives in forums on `community.servicenow.com`, not in docs (and not in this repo)
3. **Feature is in `developer.servicenow.com`** (API explorer, SDK reference) — out of scope for this repo
4. **You're searching the wrong publication slug** — try `gh search code` without the `path:` qualifier

Tell the user which of these it likely is and offer a path forward, rather than fabricating a citation.

## Rate-limit awareness

The GitHub REST quota is 5000/hour for core and only ~30/minute for code search — and in this environment that budget is SHARED across every `gh` tool and every subagent. Spend it carefully:

- A recursive `git/trees` call on the full tree (~46k entries, see "What pages were added/removed") is very expensive and can exhaust the budget in just a few calls. Avoid it unless the user explicitly asks for file-level "what's new", and never run it speculatively.
- `gh search code` and `gh api search/code` both draw on the ~30/min code-search limit.
- `raw.githubusercontent.com` (curl) has a separate, effectively unlimited quota and needs NO auth — make it the default for all content fetches.

If you hit a rate limit:
- For content fetches, use `curl` raw URLs (no auth, separate quota) — this is the default, not a fallback
- For search, slow down or batch via specific path prefixes
- `gh api rate_limit` shows current usage
