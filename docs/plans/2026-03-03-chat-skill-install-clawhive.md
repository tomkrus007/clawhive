# Clawhive Chat Skill Install Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to install Skills from chat (command and natural-language intent) using the exact same analysis, risk checks, and install logic as existing CLI install.

**Architecture:** Extract the CLI skill install pipeline into a shared core module, then route all entry points (CLI, slash command, future server API) through that single pipeline. Add a two-phase chat flow (`analyze` then explicit `confirm`) backed by approval/audit records so no path can bypass scanning. Keep natural-language install as a thin translator to slash command flow rather than a separate executor.

**Tech Stack:** Rust workspace (`clawhive-cli`, `clawhive-core`, `clawhive-server`), Axum routes, existing `ApprovalRegistry`, existing JSONL audit log pattern.

---

### Task 1: Add Failing Parser Tests for `/skill` Commands

**Files:**
- Modify: `crates/clawhive-core/src/slash_commands.rs`
- Test: `crates/clawhive-core/src/slash_commands.rs` (existing `#[cfg(test)]` module)

**Step 1: Write failing tests for new command forms**

Add tests for:
- `/skill analyze <source>`
- `/skill install <source>`
- `/skill confirm <token>`
- invalid forms (`/skill`, `/skill install` without source)

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core parse_skill`
Expected: FAIL because `SlashCommand` variants and parser logic are not implemented.

**Step 3: Implement minimal parser changes**

Update `SlashCommand` enum and `parse_command` match logic in `slash_commands.rs` to parse new subcommands and payloads.

**Step 4: Run test to verify it passes**

Run: `cargo test -p clawhive-core parse_skill`
Expected: PASS.

**Step 5: Commit**

```bash
git add crates/clawhive-core/src/slash_commands.rs
git commit -m "feat(core): parse skill slash subcommands"
```

### Task 2: Extract Shared Install Pipeline From CLI Into Core

**Files:**
- Create: `crates/clawhive-core/src/skill_install.rs`
- Modify: `crates/clawhive-core/src/lib.rs`
- Modify: `crates/clawhive-cli/src/main.rs`
- Test: `crates/clawhive-core/src/skill_install.rs` (new unit tests in-file)

**Step 1: Write failing tests for pipeline behavior**

In new `skill_install.rs` tests, cover:
- source resolution returns local path for local dir
- `analyze` requires `SKILL.md`
- install rejects high-risk without explicit approval flag
- install writes audit event

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core skill_install`
Expected: FAIL (module/functions missing).

**Step 3: Move implementation with minimal signature changes**

Move and adapt from `clawhive-cli/src/main.rs`:
- `resolve_skill_source`
- `analyze_skill_source`
- risk scan helpers
- archive extraction safety helpers
- install execution and audit writing

Expose public API shaped as:
- `analyze_source(...) -> SkillAnalysisReport`
- `install_from_analysis(...) -> InstallResult`

**Step 4: Refactor CLI to call shared module**

Replace inline install/analyze logic in `SkillCommands::Analyze` and `SkillCommands::Install` to call `clawhive_core::skill_install`.

**Step 5: Run tests to verify behavior parity**

Run: `cargo test -p clawhive-core skill_install && cargo test -p clawhive-cli skill`
Expected: PASS.

**Step 6: Commit**

```bash
git add crates/clawhive-core/src/skill_install.rs crates/clawhive-core/src/lib.rs crates/clawhive-cli/src/main.rs
git commit -m "refactor(skill): share install and scan pipeline across core and cli"
```

### Task 3: Add Chat-Orchestrator Skill Install State Machine

**Files:**
- Modify: `crates/clawhive-core/src/orchestrator.rs`
- Create: `crates/clawhive-core/src/skill_install_state.rs`
- Modify: `crates/clawhive-core/src/lib.rs`
- Test: `crates/clawhive-core/tests/skill_install_chat_flow.rs`

**Step 1: Write failing integration tests**

Create tests for:
- `/skill analyze <source>` returns analysis summary and confirmation token
- `/skill install <source>` behaves as analyze+pending-confirm (no install yet)
- `/skill confirm <token>` performs install
- expired/invalid token fails safely

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core skill_install_chat_flow`
Expected: FAIL (command handling/state store absent).

**Step 3: Implement transient state store**

Add `skill_install_state.rs` to store analyzed install intents keyed by token with TTL and actor/session binding.

**Step 4: Wire orchestrator pre-LLM command handling**

In `handle_inbound` slash command branch:
- `analyze`: call shared analyzer, return report + token
- `install`: alias to analyze response + explicit confirm instruction
- `confirm`: verify token ownership/TTL, then call shared installer

**Step 5: Run tests**

Run: `cargo test -p clawhive-core skill_install_chat_flow`
Expected: PASS.

**Step 6: Commit**

```bash
git add crates/clawhive-core/src/orchestrator.rs crates/clawhive-core/src/skill_install_state.rs crates/clawhive-core/src/lib.rs crates/clawhive-core/tests/skill_install_chat_flow.rs
git commit -m "feat(core): add chat skill analyze/confirm install flow"
```

### Task 4: Enforce Authz and Human Approval for High-Risk Installs

**Files:**
- Modify: `crates/clawhive-core/src/orchestrator.rs`
- Modify: `crates/clawhive-core/src/approval.rs` (if new request metadata needed)
- Modify: `crates/clawhive-schema/src/lib.rs` (only if event payload needs extension)
- Test: `crates/clawhive-core/tests/skill_install_authz.rs`

**Step 1: Write failing tests for authorization and approval**

Cover:
- non-admin/non-owner actor cannot install
- high/critical finding requires explicit approval decision path
- deny decision blocks install

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core skill_install_authz`
Expected: FAIL.

**Step 3: Implement authorization guard**

Use `InboundMessage.user_scope` policy mapping for install privilege check before allowing `confirm`.

**Step 4: Integrate high-risk approval**

On high-risk findings:
- register pending approval via `ApprovalRegistry`
- wait for decision
- proceed only on allow

**Step 5: Run tests**

Run: `cargo test -p clawhive-core skill_install_authz`
Expected: PASS.

**Step 6: Commit**

```bash
git add crates/clawhive-core/src/orchestrator.rs crates/clawhive-core/src/approval.rs crates/clawhive-schema/src/lib.rs crates/clawhive-core/tests/skill_install_authz.rs
git commit -m "feat(security): require authz and approval for chat skill install"
```

### Task 5: Add Server Skills Endpoints Reusing Same Pipeline

**Files:**
- Create: `crates/clawhive-server/src/routes/skills.rs`
- Modify: `crates/clawhive-server/src/routes/mod.rs`
- Modify: `crates/clawhive-server/src/state.rs` (only if shared services need state injection)
- Test: `crates/clawhive-server/src/routes/skills.rs` (route tests in-module)

**Step 1: Write failing route tests**

Add tests for:
- `POST /api/skills/analyze`
- `POST /api/skills/install` (confirm token required)
- `GET /api/skills/status`

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-server skills`
Expected: FAIL.

**Step 3: Implement routes**

Create `skills.rs` route module using shared `skill_install` core APIs; mount under `/api/skills` in `routes/mod.rs`.

**Step 4: Run tests**

Run: `cargo test -p clawhive-server skills`
Expected: PASS.

**Step 5: Commit**

```bash
git add crates/clawhive-server/src/routes/skills.rs crates/clawhive-server/src/routes/mod.rs crates/clawhive-server/src/state.rs
git commit -m "feat(server): expose skills analyze/install/status endpoints"
```

### Task 6: Add Natural-Language Install Intent Bridge (No Bypass)

**Files:**
- Modify: `crates/clawhive-core/src/orchestrator.rs`
- Modify: `crates/clawhive-core/src/slash_commands.rs` (if helper formatter added)
- Test: `crates/clawhive-core/tests/skill_install_nl_bridge.rs`

**Step 1: Write failing tests for NL mapping**

Examples:
- "安装这个 skill: <url>" maps to analyze flow response
- no explicit source -> returns usage hint, no install side effects

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core skill_install_nl_bridge`
Expected: FAIL.

**Step 3: Implement minimal NL bridge**

Before normal LLM loop, detect deterministic install intent patterns and translate to internal slash-command flow. Never call installer directly from free-form branch.

**Step 4: Run tests**

Run: `cargo test -p clawhive-core skill_install_nl_bridge`
Expected: PASS.

**Step 5: Commit**

```bash
git add crates/clawhive-core/src/orchestrator.rs crates/clawhive-core/src/slash_commands.rs crates/clawhive-core/tests/skill_install_nl_bridge.rs
git commit -m "feat(chat): map NL skill install intents to command pipeline"
```

### Task 7: Harden Scanner and Install Safety Parity Checks

**Files:**
- Modify: `crates/clawhive-core/src/skill_install.rs`
- Test: `crates/clawhive-core/tests/skill_install_security.rs`

**Step 1: Write failing tests for security edge cases**

Cover:
- archive traversal attempts (`../`, absolute paths)
- symlink/hardlink extraction edge cases
- remote URL to loopback/private ranges rejected
- high-risk detection threshold behavior

**Step 2: Run test to verify it fails**

Run: `cargo test -p clawhive-core skill_install_security`
Expected: FAIL.

**Step 3: Implement hardening**

Add strict path and remote target checks in shared resolver/extractor; ensure install aborts on failed security preconditions.

**Step 4: Run tests**

Run: `cargo test -p clawhive-core skill_install_security`
Expected: PASS.

**Step 5: Commit**

```bash
git add crates/clawhive-core/src/skill_install.rs crates/clawhive-core/tests/skill_install_security.rs
git commit -m "fix(security): harden skill install source and archive checks"
```

### Task 8: End-to-End Verification and Documentation

**Files:**
- Modify: `docs/clawhive-vnext-feature-planning.md` (or create targeted section)
- Create: `docs/research/skill-install-chat-rollout.md`

**Step 1: Run full verification suite**

Run:
- `cargo test -p clawhive-core`
- `cargo test -p clawhive-cli`
- `cargo test -p clawhive-server`
- `cargo clippy --workspace --all-targets -- -D warnings`

Expected: all pass.

**Step 2: Manual smoke test script**

Run sequence:
1. `/skill analyze <local-path-or-url>`
2. verify findings shown
3. `/skill confirm <token>`
4. `clawhive skill list` includes installed skill

Expected: install succeeds only after confirmation/approval.

**Step 3: Document operator playbook**

Document:
- auth model
- approval model
- rollback steps (remove skill, restore previous version)
- audit log inspection path

**Step 4: Commit**

```bash
git add docs/clawhive-vnext-feature-planning.md docs/research/skill-install-chat-rollout.md
git commit -m "docs(skill): add chat install rollout and ops playbook"
```

## Rollout Notes

- Phase 1 (safe default): enable `/skill analyze` + `/skill confirm`; keep direct `/skill install` as analyze alias.
- Phase 2: enable server `/api/skills/*` endpoints for Cloud UI.
- Phase 3: enable NL bridge for selected channels/connectors only.
- Kill switch: add config flag `features.chat_skill_install=false` checked in orchestrator and routes.

## Verification Checklist

- No code path can install skill without a prior analysis report.
- High-risk findings require explicit human decision.
- CLI and chat install produce equivalent audit fields.
- Install is idempotent on same source hash and safe on retries.
- Existing slash commands (`/new`, `/model`, `/status`) remain unaffected.
