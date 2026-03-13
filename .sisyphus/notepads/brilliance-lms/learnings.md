## Task 3: Claude SDK Client & Adaptation API Routes

### SDK Discovery
- `@anthropic-ai/claude-agent-sdk` (v0.2.74) is for **full autonomous agents** with tool use, MCP servers, sessions, file access. Exports: `query()`, `unstable_v2_createSession()`, `tool()`, etc. Way overkill for structured generation.
- Installed `@anthropic-ai/sdk` (v0.78.0) for simple `messages.create()` calls. This is the right tool for prompt-in, text-out adaptation.
- The agent SDK depends on `@anthropic-ai/sdk` as a transitive dep (for types), so both coexist fine.

### Architecture Decisions
- Client is singleton pattern with `getClaudeClient()` returning `Anthropic | null`
- `isClaudeConfigured()` checks `ANTHROPIC_API_KEY` env var
- Model: `claude-sonnet-4-20250514` — good balance of quality/speed for adaptation
- All routes return fallback responses when Claude is unavailable (no crashes)
- Zod validation on all request bodies

### Patterns Established
- API routes at `/api/adapt/{hint,explain,difficulty}` — all POST
- Error handling: invalid JSON → 400, validation fail → 400 with issues, Claude fail → fallback response
- System prompts give Claude specific role and output format constraints
- Difficulty route parses JSON from Claude response with defensive fallbacks
