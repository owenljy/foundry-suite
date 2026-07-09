# Scripted REST API

> **TODO**: This doc needs content. Our existing skills don't cover Scripted REST API patterns directly. Outline below.

## When to use this doc

Load this when building Scripted REST APIs, designing endpoint versioning, or handling request/response patterns.

## Outline

- Scripted REST Service setup (sys_ws_definition)
- Resource endpoints (sys_ws_operation)
- Request handling: `request.body.data`, `request.queryParams`, `request.pathParams`
- Response patterns: `response.setBody()`, `response.setStatus()`, status codes
- Versioning conventions (v1, v2 in base path)
- Authentication and ACL integration
- Error response format standardization
- Pagination patterns (limit/offset via query params)
- Rate limiting considerations
- Common mistakes: not setting content type, missing error responses, not validating input

## Task Types This Doc Supports

- Building REST API endpoints
- Designing API versioning strategies
- Code reviews of REST API implementations
