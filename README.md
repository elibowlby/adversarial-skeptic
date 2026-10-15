# adversarial-skeptic

> **"100% Passing Unit Tests" written by the same AI that wrote your code is a lie.**
> Stop accepting self-affirmation bias. Enforce **Execution-Grounded Falsification** and a **Cryptographic No-Cheating Remediation Loop**.

[![Agent Skills 2026 Compatible](https://img.shields.io/badge/Agent%20Skills-2026%20Standard-blue.svg)](https://github.com/elibowlby/adversarial-skeptic)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin%20Ready-purple.svg)](https://github.com/elibowlby/adversarial-skeptic)
[![Gemini CLI & Antigravity](https://img.shields.io/badge/Antigravity-Supported-green.svg)](https://github.com/elibowlby/adversarial-skeptic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Node)-brightgreen.svg)](skills/adversarial-skeptic/scripts/tamper-guard.mjs)

---

## Why This Exists: The 70-Bug Reality

In Anthropic's landmark 70-bug Dynamic Workflow benchmark:
- **Standard Builder Agents** evaluating their own code caught only **14–27 out of 70 bugs**. They suffer from **Self-Affirmation Bias**: an agent only writes tests for the execution paths it already remembered to implement.
- **Isolated "Empty-Backpack" Skeptic Agents** caught **66 out of 70 bugs** simply by arriving with a clean context, refusing to read the builder's unit tests, and proving bugs exclusively through runnable failing test cases.

`adversarial-skeptic` automates this protocol for any codebase. Instead of generating hypothetical Markdown PR review comments, it generates **reproducible failing tests** and **cryptographically locks them with SHA-256** so the builder agent cannot cheat during remediation.

---

## Architecture: The 3-Phase No-Cheating Protocol

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 1: EMPTY-BACKPACK AUDIT                        │
│   • Reads SPEC.md / types / interfaces + src/                          │
│   • Strictly BLIND to existing unit tests (zero self-affirmation bias) │
│   • Scans 5 Attack Vectors: Streams, DAGs, Drift, Interleaving, Sec    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: PROOF-BY-EXECUTION                          │
│   • Writes runnable test/adversarial-skeptic.test.*                   │
│   • Mandatory: Every bug claim must fail against current src/         │
│   • exit_code != 0 required (no hypothetical claims allowed)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                PHASE 3: CRYPTOGRAPHIC TAMPER-GUARD                     │
│   • tamper-guard.mjs lock: Hashes test suite (SHA-256) & AST tests     │
│   • Blue-Team / Builder remediates src/ (test file is read-only)       │
│   • tamper-guard.mjs verify: Detects edits/weakening; asserts exit 0   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1-Command Installation

Compatible across all major agent environments adhering to the **2026 Agent Skills Standard**:

### Option 1: Agent Skills CLI (Universal)
```bash
npx skills add elibowlby/adversarial-skeptic
```

### Option 2: Claude Code
```bash
claude plugin add elibowlby/adversarial-skeptic
```
*Or clone into `.claude/skills/adversarial-skeptic`.*

### Option 3: Gemini CLI / Antigravity
Add to your project's workspace skills:
```bash
mkdir -p .agents/skills
git clone https://github.com/elibowlby/adversarial-skeptic.git .agents/skills/adversarial-skeptic
```

### Option 4: Cursor & Codex
Clone directly into `.cursor/skills/adversarial-skeptic` or reference `skills/adversarial-skeptic/SKILL.md` in `.cursorrules` / `AGENTS.md`.

---

## Quickstart & Usage

Simply prompt your agent:

```text
Use adversarial-skeptic to audit src/ against SPEC.md
```

Or run directly during pre-release review:

```text
/adversarial-skeptic
```

### What Happens:

1. **Empty Backpack:** The agent maps `SPEC.md` against `src/` without reading `tests/`.
2. **Proof-by-Execution:** The agent drafts `test/adversarial-skeptic.test.*` targeting the [Attack Taxonomy](skills/adversarial-skeptic/references/attack-taxonomy.md) and executes it using your native test runner (`vitest`, `pytest`, `cargo test`, `go test`, `bun test`).
3. **Lock:** The agent runs:
   ```bash
   node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs lock test/adversarial-skeptic.test.ts
   ```
4. **Remediation & Verify:** You (or a builder agent) fix `src/`. Once complete:
   ```bash
   node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs verify test/adversarial-skeptic.test.ts --cmd "npx vitest run test/adversarial-skeptic.test.ts"
   ```

---

## Real Terminal Showcase: 11 Bugs Caught After 100% Passing Tests

In a production TypeScript agent framework claiming 100% unit test coverage, `adversarial-skeptic` caught 11 critical defects:

```bash
$ node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs lock test/adversarial-skeptic.test.ts

🔒 Adversarial lock engaged:
  File:         test/adversarial-skeptic.test.ts
  SHA-256:      e8b28f1025a1f6a19f9b5c3e56f772ba827439169002a249cc8b7cf7098e9821
  Active Tests: 11
  Lockfile:     .adversarial-lock.json

Builder agent is now locked to fixing implementation code without touching this test suite.
```

If the builder agent attempts to weaken tests (`test.skip` or deleting assertions):

```bash
$ node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs verify test/adversarial-skeptic.test.ts

TAMPER DETECTED: Builder agent modified the adversarial test suite! Restore test/adversarial-skeptic.test.ts immediately.
  Expected SHA-256: e8b28f1025a1f6a19f9b5c3e56f772ba827439169002a249cc8b7cf7098e9821
  Current SHA-256:  a1c938f4d9b231904a43ef810934c9f13904a43ef810934c9f13904a43ef8109
  Expected tests:   11
  Current tests:    9
```

When legitimately resolved:

```bash
$ node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs verify test/adversarial-skeptic.test.ts --cmd "npx vitest run test/adversarial-skeptic.test.ts"

🛡️ Test suite verified intact:
  File:         test/adversarial-skeptic.test.ts
  SHA-256:      e8b28f1025a1f6a19f9b5c3e56f772ba827439169002a249cc8b7cf7098e9821 (MATCH)
  Active Tests: 11 (MATCH)

Executing verification command: npx vitest run test/adversarial-skeptic.test.ts
----------------------------------------------------------------
 ✓ test/adversarial-skeptic.test.ts (11 tests passed)
----------------------------------------------------------------
✅ VERIFICATION PASSED: All adversarial tests passed without test tampering.
```

Read the full breakdown in [examples/real-world-audit-report.md](examples/real-world-audit-report.md).

---

## The 5 Mandatory Falsification Vectors

`adversarial-skeptic` systematically stress-tests code against the [Attack Taxonomy](skills/adversarial-skeptic/references/attack-taxonomy.md):

| Vector | Focus Area | Example Falsification Test |
|---|---|---|
| **1. Boundary & Stream Ingestion** | 0-byte files, `null` JSONL lines, cut UTF-8, 100MB bursts | Empty state crashes Zod parser; multi-byte emoji sliced across stream buffers |
| **2. Graph & Invariants** | Circular DAGs (`A -> B -> A`), orphaned references, time inversions | `RangeError: Maximum call stack size exceeded` in ancestor traversal |
| **3. Schema & Environment Drift** | Timezones (`+02:00` vs `Z`), CRLF vs LF, union polymorphism | Local timezone offsets stripped, causing 1-day date shift |
| **4. State Contamination** | Concurrency bleed, disjoint target interference | Modifying Target A's context inadvertently satisfies Target B's test |
| **5. Security & Redaction** | Multiline `.env`/PEM keys, quoted whitespace, shell injection | PEM RSA private key bypasses single-line regex sanitizer |

---

## Repository Structure

```
adversarial-skeptic/
├── .claude-plugin/
│   ├── marketplace.json                      # Claude Code marketplace registry
│   └── plugin.json                           # Claude Code plugin manifest
├── skills/
│   └── adversarial-skeptic/
│       ├── SKILL.md                          # Core Agent Skill definition (<1,200 words)
│       ├── references/
│       │   └── attack-taxonomy.md            # In-depth 5-vector falsification guide
│       └── scripts/
│           └── tamper-guard.mjs              # Zero-dependency Node.js cryptographic lock CLI
├── examples/
│   └── real-world-audit-report.md            # Sanitized 11-bug empirical audit case study
├── package.json                              # Agent skills / npm manifest
├── LICENSE                                   # MIT
└── README.md                                 # Documentation & Quickstart
```

---

## Contributing & License

Contributions are welcome! Please open an issue or pull request.
Licensed under the [MIT License](LICENSE).
