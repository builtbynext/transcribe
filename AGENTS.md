<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Documentation Rules

## Plans
After every planning session, save the plan as `docs/plans/<feature-slug>.md` inside this repo (e.g. `docs/plans/wma-transcription-upload.md`). Use kebab-case. This file is the version-controlled source of truth for the team — the `~/.claude/plans/` file is only for the Claude harness internals.

## Feature Docs
After a feature is fully implemented **and verified working**, create or update `docs/features/<feature-name>.md` using the following template. Do not create this file until the feature is tested and confirmed working.

```markdown
# Feature: <Name>

## Overview
One paragraph: what this feature does and why it exists.

## Status
Implemented | In Progress | Deprecated

## Technical Decisions
Key choices made and the reasoning behind them (alternatives considered, tradeoffs accepted).

## Frontend
- File(s) involved
- Component structure and state management approach
- UX interactions and edge cases handled

## Backend
- Service(s) involved
- Processing pipeline / business logic
- Error handling approach

## API
- Endpoint(s): method, path, request shape, response shape
- Auth requirements (if any)
- Known limitations / future work

## Dependencies Added
List any new npm or pip packages and why they were chosen over alternatives.

## How to Test
Step-by-step instructions to verify the feature works end-to-end.
```
<!-- END:nextjs-agent-rules -->
