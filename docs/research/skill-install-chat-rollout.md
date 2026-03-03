# Chat Skill Install — Rollout & Operations

## Overview

Users can install Skills from chat (slash commands and natural language) using the same analyze → scan → confirm → install pipeline as the CLI `clawhive skill install` command.

## Entry Points

| Entry Point | Flow | Auth |
|------------|------|------|
| CLI: `clawhive skill install <source>` | Direct analyze → prompt → install | Local user |
| Chat: `/skill analyze <source>` | Analyze → show report + token | user_scope policy |
| Chat: `/skill install <source>` | Same as analyze (alias) | user_scope policy |
| Chat: `/skill confirm <token>` | Validate token → re-resolve → install | user_scope + conversation_scope match |
| Chat: NL intent ("安装这个 skill: <url>") | Detected → routed to analyze flow | Same as `/skill install` |
| HTTP: `POST /api/skills/analyze` | Analyze → return JSON report | None (add separately) |
| HTTP: `POST /api/skills/install` | Analyze → install → return JSON | None (add separately) |
| HTTP: `GET /api/skills` | List installed skills | None (add separately) |

## Authorization Model

- **`user_scope`** (e.g. `"user:456"`) identifies the actor. No separate admin role.
- **`SkillInstallState.allowed_scopes`**: If `None` (default), ALL users can install. If `Some(vec!["user:123", ...])`, only those scopes are permitted.
- **Token binding**: `/skill confirm` verifies that `user_scope` AND `conversation_scope` match the original analyze request.
- **Token TTL**: 900 seconds (15 minutes) by default.

## Approval Model (High-Risk)

When `has_high_risk_findings()` returns true during `/skill confirm`:

1. Orchestrator registers a pending approval via `ApprovalRegistry`
2. Publishes `BusMessage::NeedHumanApproval` to the event bus
3. TUI/Gateway picks up the approval request and presents it to the user
4. User responds with `AllowOnce`, `AlwaysAllow`, or `Deny`
5. On allow → install proceeds with `allow_high_risk: true`
6. On deny → install is blocked, user sees denial message

High-risk patterns detected by the scanner:
- `rm -rf /` (critical)
- `mkfs` (critical)
- `curl`, `wget` (high)
- `| sh` pipe-to-shell (high)
- `base64 -d` obfuscation (high)
- `sudo` privilege escalation (high)
- `~/.ssh`, `~/.aws` secret path access (medium)

## Security Hardening

### SSRF Prevention
Remote skill URLs are checked before download:
- Blocked: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0`, `::1`, `localhost`
- Only `http` and `https` schemes allowed
- Redirect limit: 5 hops

### Archive Safety
- Path traversal (`../`) blocked via `is_safe_relative_path()`
- Symlinks and hardlinks in tar archives are skipped (only Regular and Directory entries extracted)
- Zip extraction uses `enclosed_name()` for path safety
- Max download size: 20 MB

### Install Idempotency
- Content hash (DefaultHasher over relative paths + file contents) stored in `.content-hash` sidecar
- Re-installing same content is a no-op (preserves any local modifications to installed skill)

## Rollback Steps

1. **Remove installed skill**: `rm -rf ~/.clawhive/skills/<skill-name>`
2. **Restore previous version**: If backed up, copy previous version back
3. **Audit log**: Check `~/.clawhive/logs/skill-installs.jsonl` for install history

## Audit Log

All installs are recorded in `~/.clawhive/logs/skill-installs.jsonl`:

```json
{
  "ts": "2026-03-03T10:30:00Z",
  "skill": "my-skill",
  "target": "/home/user/.clawhive/skills/my-skill",
  "findings": 2,
  "high_risk": false,
  "declared_permissions": true
}
```

## Rollout Plan

| Phase | Scope | Kill Switch |
|-------|-------|------------|
| Phase 1 | `/skill analyze` + `/skill confirm` in chat | `features.chat_skill_install=false` |
| Phase 2 | Server `/api/skills/*` endpoints for Web UI | Route registration in `mod.rs` |
| Phase 3 | NL bridge for selected channels | `detect_skill_install_intent()` guard |
| Future | `skill_install` agent tool (default off, user_scope gated, approval required) | Agent tool registration |

## Files

### Core pipeline
- `crates/clawhive-core/src/skill_install.rs` — resolve, analyze, scan, install, render
- `crates/clawhive-core/src/skill_install_state.rs` — pending install state machine (token, TTL, scope binding)

### Orchestrator integration
- `crates/clawhive-core/src/orchestrator.rs` — slash command dispatch, NL bridge, approval flow
- `crates/clawhive-core/src/slash_commands.rs` — `/skill analyze|install|confirm` parsing

### Server API
- `crates/clawhive-server/src/routes/skills.rs` — REST endpoints
- `crates/clawhive-server/src/routes/mod.rs` — route registration

### Tests
- `crates/clawhive-core/src/skill_install.rs` — unit tests (4)
- `crates/clawhive-core/tests/skill_install_authz.rs` — authz + approval tests (4)
- `crates/clawhive-core/tests/skill_install_nl_bridge.rs` — NL detection tests (6)
- `crates/clawhive-core/tests/skill_install_security.rs` — security hardening tests (4)
- `crates/clawhive-server/src/routes/skills.rs` — route tests (3)
