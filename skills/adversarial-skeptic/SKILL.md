---
name: adversarial-skeptic
description: "Execution-grounded adversarial QA and falsification skill. Use when auditing codebases, verifying specs, hunting edge-case bugs after unit tests pass, or running a no-cheating red-team/blue-team remediation loop."
---

# Adversarial Skeptic: Execution-Grounded Falsification Protocol

## Overview & The 70-Bug Reality

Single coding agents suffer from **self-affirmation bias**: when an agent authors both implementation and test suites, it tests only the scenarios it remembered to implement, achieving 100% test passes while missing critical edge cases. In Anthropic's 70-bug dynamic benchmark, single agents caught only 14–27 bugs; isolated "empty-backpack" skeptic agents caught 66/70 bugs.

`adversarial-skeptic` enforces an empirical 3-Phase protocol:
1. **Empty-Backpack Audit:** Review spec and implementation with zero prior knowledge of existing unit tests.
2. **Proof-by-Execution:** Bug claims are strictly invalid unless proven by an active failing test case (`exit_code != 0`).
3. **Cryptographic Tamper-Guard:** The test suite is cryptographically locked with SHA-256 before remediation begins; the builder agent is forbidden from editing or weakening test assertions.

---

## When to Trigger

Activate this skill when:
- Conducting post-implementation audits or pre-release verification.
- User or workflow requests `/adversarial-skeptic`.
- All standard unit tests pass, but production-grade robustness or red-team validation is required.
- Refactoring complex state machines, stream ingestion, or security-sensitive modules.

---

## Locating `tamper-guard.mjs`

To run `tamper-guard.mjs` regardless of where this skill is installed, resolve its path in order:
1. Local workspace skill path: `./skills/adversarial-skeptic/scripts/tamper-guard.mjs`
2. Agent workspace customizations: `./.agents/skills/adversarial-skeptic/scripts/tamper-guard.mjs`
3. Claude workspace skills: `./.claude/skills/adversarial-skeptic/scripts/tamper-guard.mjs`
4. Global user skill path: `~/.claude/skills/adversarial-skeptic/scripts/tamper-guard.mjs` or `~/.gemini/config/plugins/adversarial-skeptic/skills/adversarial-skeptic/scripts/tamper-guard.mjs`

Set:
```bash
TAMPER_GUARD="<resolved-path-to-tamper-guard.mjs>"
```

---

## The 3-Phase Protocol

### Phase 1: Empty-Backpack Skeptic Audit

To eliminate self-affirmation bias, establish an isolated mental model:
- **Subagent Execution (Recommended):** Spawn an isolated subagent with an empty backpack prompt:
  ```
  You are an adversarial red-team QA engineer. Read only SPEC.md (or README/types) and src/.
  DO NOT read existing test files or existing test runners yet. Identify unhandled edge cases
  and architectural invariants that violate the spec.
  ```
- **Single Context Fallback:** If running inline, deliberately inspect only `SPEC.md` and `src/`. Never read `tests/` or `test/` prior to drafting attack hypotheses.
- **Consult Taxonomy:** Read `references/attack-taxonomy.md` to target the 5 core attack vectors:
  1. Boundary & Malformed Stream Ingestion (0-byte files, `null` JSONL lines, mid-stream UTF-8 cuts).
  2. Graph & State Machine Invariants (circular DAG cycles, orphaned pointer IDs, inverted timestamps).
  3. Schema & Environment Drift (timezones with `+02:00` offsets, CRLF vs LF, union types).
  4. Cross-Feature State Contamination (interleaved actions across disjoint targets).
  5. Security & Redaction Evasion (multiline PEM keys, quoted whitespace, shell injection).

### Phase 2: Proof-by-Execution (`test/adversarial-skeptic.test.*`)

Theoretical bugs and speculative review nitpicks are prohibited. Every bug must be proven:

1. **Author the Adversarial Test Suite:**
   Create an execution-grounded test file matching the project's native runner:
   - TypeScript/JavaScript: `test/adversarial-skeptic.test.ts` (Vitest, Jest, Bun)
   - Python: `tests/test_adversarial_skeptic.py` (pytest)
   - Rust: `tests/adversarial_skeptic.rs` (cargo test)
   - Go: `adversarial_skeptic_test.go` (go test)

2. **Execute and Confirm Failure:**
   Run the test runner directly against current `src/`:
   ```bash
   # Examples:
   npx vitest run test/adversarial-skeptic.test.ts
   pytest tests/test_adversarial_skeptic.py
   cargo test --test adversarial_skeptic
   ```
   **Hard Gate:** Every test assertion MUST fail (`exit_code != 0`). If a test passes against the current codebase, either the bug does not exist or the test is written incorrectly. Refine until failure is proven.

### Phase 3: Cryptographic Tamper-Guard Remediation

Once the failing test suite proves the bugs, enforce the no-cheating remediation loop:

1. **Lock the Adversarial Test Suite:**
   Lock the test file using `tamper-guard.mjs`. This computes the SHA-256 digest, validates active test assertions, rejects any `.skip` or `.todo` markers, and writes `.adversarial-lock.json`:
   ```bash
   node "$TAMPER_GUARD" lock test/adversarial-skeptic.test.ts
   ```

2. **Hand Off to Builder Agent / Blue-Team Mode:**
   Deliver the Audit Report to the Builder agent or switch to remediation mode.
   **Strict Constraint for Builder:** The Builder agent is strictly forbidden from editing, commenting out, or deleting any lines in the adversarial test suite. All fixes must be made inside `src/`.

3. **Verify Remediation:**
   Run `tamper-guard.mjs verify` with the test runner command:
   ```bash
   node "$TAMPER_GUARD" verify test/adversarial-skeptic.test.ts --cmd "npx vitest run test/adversarial-skeptic.test.ts"
   ```
   - If the Builder agent touched the test file: `tamper-guard` detects SHA-256 mismatch or decreased test count, prints `TAMPER DETECTED`, and exits with code 1.
   - If the test file is pristine and all tests pass: exits with code 0.

4. **Cleanup:**
   Remove `.adversarial-lock.json` before committing passing fixes.

---

## Mandatory Audit Report Template

When delivering audit results, use this exact schema for every discovered bug:

```markdown
# Adversarial Skeptic Audit Report

### Module: `<module-or-subsystem-name>`

#### Bug 1: [<Concise Bug Title>]
- **Attack Vector:** [Vector 1-5 from attack-taxonomy.md]
- **Trigger:** [Exact input payload or environment state that induces failure]
- **Root Cause:** [`src/path/to/file.ts:line`](file:///abs/path) - [Concise technical explanation of the vulnerability]
- **Failing Test Trace:**
```
[Paste exact test runner output trace showing assertion failure and non-zero exit code]
```

#### Bug 2: [<Concise Bug Title>]
...
```
