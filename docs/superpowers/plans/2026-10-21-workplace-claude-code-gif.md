# Workplace Claude Code GIF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a realistic, animated GIF recording of an engineer using Claude Code on branch `feat/billing-webhooks` with `adversarial-skeptic`, and embed it directly at the top of the README under Usage.

**Architecture:** Create an authentic billing webhook fixture (`examples/billing-webhooks/`) with real unhandled edge cases (concurrent idempotency replay and 0-byte payload timeout crash). Build a dedicated CLI script (`scripts/record-workplace-session.mjs`) that renders a pixel-accurate Claude Code terminal interface executing real `node --test` and `tamper-guard` lock/verify commands. Record the session with Charmbracelet VHS into `assets/workplace-session.gif` and embed it prominently in `README.md`.

**Tech Stack:** Node.js (pure ESM, built-in `node:test` and `node:crypto`), Charmbracelet VHS (`vhs`), ANSI styling, Git, Markdown.

**Spec:** User uploaded screenshot reference showing the workplace session on branch `feat/billing-webhooks` running in Claude Code with adversarial-skeptic creating tests, locking with SHA-256, verifying the fix, and unlocking for PR.

## Global Constraints

- Zero external npm dependencies in core runtime scripts.
- GIF must look like an authentic workplace terminal session in Claude Code / Antigravity on a real git branch, not a toy sandbox runner.
- Commands executed within the recorded session (`node --test`, `tamper-guard lock`, `tamper-guard verify`) must be genuine executions against real fixture files with real SHA-256 hashes.
- Keep terminal styling professional, crisp, and high-contrast (Catppuccin / TokyoNight theme).

## Review Focus

1. **GIF File Size & Playback:** VHS output must remain under 4MB for fast GitHub page loads while maintaining crisp text readability.
2. **Authentic Claude Code Aesthetics:** Terminal chrome, prompt box (`╭─ Claude Code ───╮`), agent bullet actions (`●`), and command outputs must match genuine Claude Code sessions.
3. **Execution Reality:** Test failures and passes must be backed by real Node.js test executions rather than mock text strings.
4. **README Placement:** The GIF must be the primary visual asset at the top of `## Usage`, replacing static mock text while preserving an accessible collapsible transcript.
5. **No Regressions on tamper-guard:** Existing shadow lock and integrity tests must continue to pass cleanly.

---

### Task 1: Create Runnable Billing Webhooks Fixture

**Files:**
- Create: `examples/billing-webhooks/src/billing/webhook-handler.ts`
- Create: `examples/billing-webhooks/test/adversarial-skeptic.test.ts`
- Create: `examples/billing-webhooks/package.json`

**Interfaces:**
- Consumes: `skills/adversarial-skeptic/scripts/tamper-guard.mjs`
- Produces: Runnable test suite with 2 tests that fail against unpatched webhook handler and pass against patched webhook handler.

- [ ] **Step 1: Write the billing webhook handler with deliberate edge case vulnerabilities**
  Implement `handleWebhook(rawBody, headers, db)`:
  - Fails on concurrent idempotency replay (simulated in-memory store without atomic check).
  - Fails on 0-byte payload (crashes with `Unexpected end of JSON input`).
  - Provide a toggle or patch method `enableFixes()` to demonstrate fixing root causes.

- [ ] **Step 2: Write adversarial test suite exercising both failure modes**
  Create `examples/billing-webhooks/test/adversarial-skeptic.test.ts` using `node:test` and `node:assert/strict`:
  - Test 1: `idempotency key replay allows duplicate charge` (fails when unpatched).
  - Test 2: `0-byte payload crashes JSON parser with unexpected EOF` (fails when unpatched).

- [ ] **Step 3: Verify tests fail against unpatched code and pass against patched code**
  Run: `node --test examples/billing-webhooks/test/adversarial-skeptic.test.ts`
  Verify exit code is non-zero (proof-by-execution).

---

### Task 2: Build Workplace Session Terminal Runner

**Files:**
- Create: `scripts/record-workplace-session.mjs`

**Interfaces:**
- Consumes: `examples/billing-webhooks/` fixture, `skills/adversarial-skeptic/scripts/tamper-guard.mjs`
- Produces: Realistic interactive terminal session output with Claude Code styling and real command execution.

- [ ] **Step 1: Implement Claude Code terminal styling and typing simulation**
  - Render terminal prompt: `developer@workstation:~/billing-service (feat/billing-webhooks) $ git status`
  - Show modified file `src/billing/webhook-handler.ts`.
  - Render Claude Code prompt box:
    ```text
    ╭─ Claude Code ─────────────────────────────────────────────────────────────╮
    │ > use adversarial-skeptic to create bullet proof tests on my changes in   │
    │   this branch                                                             │
    ╰───────────────────────────────────────────────────────────────────────────╯
    ```
  - Animate typing or step progression with realistic timing pauses (200ms - 600ms).

- [ ] **Step 2: Wire real command executions into the session steps**
  - Step 1: Branch inspection diff summary.
  - Step 2: Proof-by-execution: execute `node --test test/adversarial-skeptic.test.ts` and capture real output (2 tests failed).
  - Step 3: Cryptographic lock: execute `node skills/adversarial-skeptic/scripts/tamper-guard.mjs lock ...` and capture real SHA-256 output.
  - Step 4: Fix implementation (toggle patched mode).
  - Step 5: Verification: execute `node skills/adversarial-skeptic/scripts/tamper-guard.mjs verify ... --cmd "node --test ..."` and capture verified pass output.
  - Step 6: Unlock: execute `tamper-guard unlock` and print clean PR ready status.

- [ ] **Step 3: Test runner standalone in terminal**
  Run: `node scripts/record-workplace-session.mjs`
  Verify clean layout, proper ANSI colors, and correct exit code.

---

### Task 3: Configure VHS Tape and Record Workplace GIF

**Files:**
- Create: `assets/workplace-session.tape`
- Create: `assets/workplace-session.gif`

**Interfaces:**
- Consumes: `scripts/record-workplace-session.mjs`, `/opt/homebrew/bin/vhs`
- Produces: `assets/workplace-session.gif`

- [ ] **Step 1: Create VHS tape definition**
  Configure `assets/workplace-session.tape`:
  - Shell: `bash`
  - Theme: `Catppuccin Mocha` or `TokyoNight`
  - Font size: `14`
  - Window dimensions: `1100x720`
  - Padding: `20`
  - Line height: `1.25`
  - Command: `node scripts/record-workplace-session.mjs` followed by realistic pause.

- [ ] **Step 2: Generate GIF using VHS**
  Run: `/opt/homebrew/bin/vhs assets/workplace-session.tape`
  Expected: Generated `assets/workplace-session.gif`.

- [ ] **Step 3: Validate GIF asset**
  Check size: ensure under 4MB.
  Verify animation loops cleanly and text is sharp.

---

### Task 4: Integrate Workplace GIF into README.md & Clean Up

**Files:**
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `assets/workplace-session.gif`
- Produces: Polished top-of-README presentation and updated package scripts.

- [ ] **Step 1: Embed workplace GIF in README.md**
  Under `## Usage -> ### Workplace Example: Verifying Branch Changes`:
  - Embed `<p align="center"><img src="./assets/workplace-session.gif" alt="adversarial-skeptic workplace session in Claude Code" width="850" /></p>`
  - Wrap the raw terminal text in `<details><summary><b>View terminal transcript</b></summary>...</details>` for accessibility and grepability.

- [ ] **Step 2: Remove redundant demo section at bottom of README**
  Replace or clean up the old bottom demo section so there is a single, authoritative, high-impact workplace recording.

- [ ] **Step 3: Add convenience npm script**
  Add `"record:workplace": "vhs assets/workplace-session.tape"` in `package.json`.

- [ ] **Step 4: Verify test suite and git diff**
  Run: `npm test`
  Run: `node benchmarks/agent-cheating-eval/run-eval.mjs score`
  Confirm all tests pass and documentation links are intact.
