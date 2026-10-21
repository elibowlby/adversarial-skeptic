---
name: adversarial-skeptic
description: "Creates bulletproof tests for your branch changes and locks them with SHA-256 so agents cannot cheat."
---

# Adversarial Skeptic Protocol

## Overview

Coding agents frequently miss their own edge cases and may edit or skip failing tests to make CI green. adversarial-skeptic prevents this with three steps:

1. **Blind Inspection:** Inspect branch changes and source code without reading existing unit tests.
2. **Proof-by-Execution:** Every bug claim must be backed by a runnable test that fails against current code (`exit_code != 0`).
3. **Cryptographic Lock:** Lock the test suite with SHA-256 before remediation begins. The builder agent can only modify implementation files in `src/`.

---

## When to Trigger

Activate this skill when:
- User prompts: `use adversarial-skeptic to create bullet proof tests on my changes in this branch`
- Checking branch changes before opening or merging a PR (`git diff main...HEAD`).
- Checking refactors, state machines, stream ingestion, or authentication modules for unhandled edge cases.
- User runs `/adversarial-skeptic`.

---

## Locating `tamper-guard.mjs`

Resolve the CLI script in order:
1. Local workspace skill path: `./skills/adversarial-skeptic/scripts/tamper-guard.mjs`
2. Agent workspace customizations: `./.agents/skills/adversarial-skeptic/scripts/tamper-guard.mjs`
3. Claude workspace skills: `./.claude/skills/adversarial-skeptic/scripts/tamper-guard.mjs`
4. Global user skill path: `~/.claude/skills/adversarial-skeptic/scripts/tamper-guard.mjs` or `~/.gemini/config/plugins/adversarial-skeptic/skills/adversarial-skeptic/scripts/tamper-guard.mjs`

Set:
```bash
TAMPER_GUARD="<resolved-path-to-tamper-guard.mjs>"
```

---

## Protocol Steps

### Step 1: Inspect Branch Changes

Avoid reading existing tests to prevent self-affirmation bias:
- **Subagent (Recommended):** Dispatch an isolated subagent:
  ```text
  You are an adversarial test engineer. Inspect what changed on this branch against main (git diff main...HEAD) and read the modified source files.
  Do not inspect existing test files. Find edge cases and write failing tests for them.
  ```
- **Single Context:** Read the branch diff and changed source files. Do not open `tests/` before writing hypotheses.
- Target common edge cases from `references/attack-taxonomy.md`:
  - Truncated or empty inputs (0-byte files, `null` JSONL records, sliced UTF-8 buffers).
  - Graph cycles (circular parents, orphaned child references after deletion).
  - Environment drift (timezone offsets, CRLF vs LF line endings).
  - Concurrent state leaks across tenants or sessions.
  - Secret leaks (multiline PEM keys, quoted Bearer tokens) and command injection.

### Step 2: Proof-by-Execution (`test/adversarial-skeptic.test.*`)

Every issue must have a reproducing test. Speculative review comments are invalid without code.

1. Write the test suite using the project's native runner:
   - TypeScript/JavaScript: `test/adversarial-skeptic.test.ts` (node --test, vitest, jest)
   - Python: `tests/test_adversarial_skeptic.py` (pytest)
   - Rust: `tests/adversarial_skeptic.rs` (cargo test)
   - Go: `adversarial_skeptic_test.go` (go test)

2. Run the suite against current `src/`:
   ```bash
   node --test test/adversarial-skeptic.test.ts
   # or: npx vitest run test/adversarial-skeptic.test.ts
   # or: pytest tests/test_adversarial_skeptic.py
   ```
   Every test must fail (`exit_code != 0`). If a test passes against the current codebase, refine it until the failure is proven.

### Step 3: Cryptographic Lock and Remediation

Once tests fail as expected, lock the suite:

1. Lock the test file:
   ```bash
   node "$TAMPER_GUARD" lock test/adversarial-skeptic.test.ts
   ```
   This generates a SHA-256 hash, checks that all tests are active (no `.skip` or `.todo`), creates a shadow lock in `os.tmpdir()`, and sets `chmod 444`.

2. Remediate in `src/`:
   Fix the bug in the source files. The test suite is read-only and must not be modified.

3. Verify fixes:
   ```bash
   node "$TAMPER_GUARD" verify test/adversarial-skeptic.test.ts --cmd "node --test test/adversarial-skeptic.test.ts"
   ```
   `tamper-guard` checks hash and test count against both the workspace lock and the shadow lock, then runs the test command.

4. Unlock when resolved:
   ```bash
   node "$TAMPER_GUARD" unlock test/adversarial-skeptic.test.ts
   ```

---

## Terminal Communication Rules

When interacting in the terminal or reporting findings:
- No receipt openers ("I have finished the inspection according to the protocol"). Start directly with the findings.
- No tool-narration footers ("Based on reading file X at line Y..."). Hand over the code and file references cleanly.
- State the finding, the failing test assertion, the root cause in `src/`, and the lock status.
- Keep output concise and readable for a peer engineer.

### Findings Report Format

```markdown
# Adversarial Skeptic Findings

### Module: `<name>`

#### Bug 1: [<Title>]
- **Vector:** [Category from attack-taxonomy.md]
- **Trigger:** [Input payload or environment state]
- **Root Cause:** [`src/path/to/file.ts:line`](file:///abs/path) - [Technical explanation]
- **Failing Trace:**
```
[Assertion failure output and exit code]
```
```
