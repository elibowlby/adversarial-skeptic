# 11 Edge Cases Caught in Agent CLI Framework

11 edge cases caught during adversarial testing of `@agent-framework/cli` v2.4.0, verified with test suite `test/adversarial-skeptic.test.ts`.

---

## Summary

- **Target Package:** `@agent-framework/cli` v2.4.0
- **Test Suite:** `test/adversarial-skeptic.test.ts`
- **Lock Hash:** `e8b28f1025a1f6a19f9b5c3e56f772ba827439169002a249cc8b7cf7098e9821`
- **Initial Run:** 11 failing test assertions
- **Post-Fix Run:** 11 passing assertions verified with `tamper-guard.mjs verify`

---

### Module: `src/storage/state-store.ts`

#### Bug 1: 0-Byte State File Unhandled Zod Crash
- **Attack Vector:** Vector 1 (Boundary & Malformed Stream Ingestion)
- **Trigger:** Reading an existing but 0-byte state file created by an interrupted write or OS truncate (`touch ~/.agent/state.json`).
- **Root Cause:** [`src/storage/state-store.ts:44`](file:///src/storage/state-store.ts#L44) parses the raw file contents with `JSON.parse(fs.readFileSync(path, 'utf8'))` and feeds it directly to `StateSchema.parse()` without checking for empty string or `stat.size === 0`.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > StateStore > should gracefully handle 0-byte state file
ZodError: [
  {
    "code": "invalid_type",
    "expected": "object",
    "received": "undefined",
    "path": [],
    "message": "Expected object, received undefined"
  }
]
 ❯ Object.parse node_modules/zod/lib/index.mjs:583:23
 ❯ StateStore.load src/storage/state-store.ts:44:27
 ❯ test/adversarial-skeptic.test.ts:38:18
```

---

### Module: `src/telemetry/stream-reader.ts`

#### Bug 2: Literal `null` in JSONL Stream Throws TypeError
- **Attack Vector:** Vector 1 (Boundary & Malformed Stream Ingestion)
- **Trigger:** Streaming NDJSON logs containing an empty or literal `null` line: `{"type":"heartbeat"}\nnull\n{"type":"step"}`.
- **Root Cause:** [`src/telemetry/stream-reader.ts:89`](file:///src/telemetry/stream-reader.ts#L89) splits chunks by newline and calls `const record = JSON.parse(line)` followed immediately by `if (record.type === ...)` without checking `record !== null`.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TelemetryStream > handles null NDJSON lines
TypeError: Cannot read properties of null (reading 'type')
 ❯ StreamReader.processChunk src/telemetry/stream-reader.ts:89:19
 ❯ StreamReader.write src/telemetry/stream-reader.ts:112:12
 ❯ test/adversarial-skeptic.test.ts:74:14
```

#### Bug 3: Mid-Stream Multi-Byte UTF-8 Slicing Causes JSON SyntaxError
- **Attack Vector:** Vector 1 (Boundary & Malformed Stream Ingestion)
- **Trigger:** Slicing a JSON log event containing a 4-byte Unicode emoji (`🚀` / `0xF0 0x9F 0x9A 0x80`) directly across a 1024-byte stream chunk boundary.
- **Root Cause:** [`src/telemetry/stream-reader.ts:103`](file:///src/telemetry/stream-reader.ts#L103) converts raw stream buffers using `chunk.toString('utf8')` before assembling lines, replacing sliced byte sequences with replacement glyphs (`\uFFFD`) and corrupting JSON string boundaries.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TelemetryStream > parses multi-byte UTF-8 split across chunks
SyntaxError: Unexpected token  in JSON at position 1023
 ❯ JSON.parse (<anonymous>)
 ❯ StreamReader.processChunk src/telemetry/stream-reader.ts:105:22
 ❯ test/adversarial-skeptic.test.ts:118:14
```

#### Bug 4: 100MB Log Burst Memory Saturation Without Backpressure
- **Attack Vector:** Vector 1 (Boundary & Malformed Stream Ingestion)
- **Trigger:** A rapid burst of 100,000 log events sent in a tight loop into `StreamReader`.
- **Root Cause:** [`src/telemetry/stream-reader.ts:145`](file:///src/telemetry/stream-reader.ts#L145) pushes chunks into an unbounded in-memory array (`this.queue.push(item)`) instead of respecting stream `.write()` backpressure return values.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TelemetryStream > enforces bounded memory during burst ingestion
Error: Memory threshold exceeded: heap used grew from 38MB to 412MB (+374MB)
 ❯ test/adversarial-skeptic.test.ts:162:13
```

---

### Module: `src/graph/task-dag.ts`

#### Bug 5: Circular `parentUuid` Reference Induces Stack Overflow
- **Attack Vector:** Vector 2 (Graph & State Machine Invariants)
- **Trigger:** Linking task nodes in a mutual cycle: `Task A (parent: B)` and `Task B (parent: A)`.
- **Root Cause:** [`src/graph/task-dag.ts:62`](file:///src/graph/task-dag.ts#L62) traverses ancestor lineages using unbounded recursion `getAncestors(node.parentId)` without a visited `Set` or cycle check.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TaskDAG > detects circular parent UUID cycles
RangeError: Maximum call stack size exceeded
 ❯ TaskDAG.getAncestors src/graph/task-dag.ts:62:31
 ❯ TaskDAG.getAncestors src/graph/task-dag.ts:64:12
 ❯ TaskDAG.getAncestors src/graph/task-dag.ts:64:12
 ❯ test/adversarial-skeptic.test.ts:205:11
```

#### Bug 6: Orphaned References in Secondary Index After Cascade Delete
- **Attack Vector:** Vector 2 (Graph & State Machine Invariants)
- **Trigger:** Deleting a root task node with multiple child tasks.
- **Root Cause:** [`src/graph/task-dag.ts:118`](file:///src/graph/task-dag.ts#L118) removes the parent node from `this.nodes` but fails to clean up entries in `this.tagIndex` and `this.dependencyMap`, leaving dangling UUID pointers that throw `undefined` access errors on query.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TaskDAG > cascades deletion across all indices
AssertionError: expected index [ 'task-child-02' ] to be empty after parent prune
 ❯ test/adversarial-skeptic.test.ts:241:19
```

---

### Module: `src/utils/date-formatter.ts`

#### Bug 7: ISO-8601 Offset Drop (`+02:00` vs `Z`)
- **Attack Vector:** Vector 3 (Schema & Environment Drift)
- **Trigger:** Ingesting an event timestamp formatted as `2026-10-15T23:30:00+02:00`.
- **Root Cause:** [`src/utils/date-formatter.ts:27`](file:///src/utils/date-formatter.ts#L27) performs string truncation `timestamp.substring(0, 10)` to extract the date, assuming UTC `Z`. On timestamps with timezone offsets near midnight, this shifts the event date by a full day.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > DateFormatter > normalizes timestamps across offsets
AssertionError: expected '2026-10-15' to equal '2026-10-15T21:30:00.000Z'
 ❯ test/adversarial-skeptic.test.ts:280:23
```

#### Bug 8: CRLF Line Endings Inject Spurious Null Records
- **Attack Vector:** Vector 3 (Schema & Environment Drift)
- **Trigger:** Parsing configuration files checked out on Windows (`\r\n`).
- **Root Cause:** [`src/utils/config-parser.ts:51`](file:///src/utils/config-parser.ts#L51) splits with `.split('\n')`. Each resulting entry contains a trailing `\r`. Key-value comparisons (`key === 'HOST'`) evaluate to false (`'HOST\r' !== 'HOST'`).
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > ConfigParser > handles Windows CRLF line endings
AssertionError: expected { 'HOST\r': '127.0.0.1\r' } to deeply equal { HOST: '127.0.0.1' }
 ❯ test/adversarial-skeptic.test.ts:312:21
```

---

### Module: `src/execution/task-runner.ts`

#### Bug 9: Concurrent Task Runner State Contamination Across Disjoint Targets
- **Attack Vector:** Vector 4 (Cross-Feature State Contamination)
- **Trigger:** Running parallel runner tasks targeting two disjoint workspace paths (`/repo-a` and `/repo-b`).
- **Root Cause:** [`src/execution/task-runner.ts:32`](file:///src/execution/task-runner.ts#L32) maintains a module-scoped singleton variable `activeContext` instead of scoping state per `TaskRunner` instance.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > TaskRunner > isolates state between concurrent runs
AssertionError: expected context for repo-a to retain workspace path '/repo-a', got '/repo-b'
 ❯ test/adversarial-skeptic.test.ts:358:19
```

---

### Module: `src/security/sanitizer.ts`

#### Bug 10: Multiline PEM RSA Private Key Leaked in Sanitized Logs
- **Attack Vector:** Vector 5 (Security, Redaction & Injection Evasion)
- **Trigger:** Logging an error object containing a PEM-encoded RSA private key:
  `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----`
- **Root Cause:** [`src/security/sanitizer.ts:77`](file:///src/security/sanitizer.ts#L77) runs single-line regex replacements (`/(?:KEY|SECRET)=\w+/g`) without multiline or DOTALL flags, allowing the multiline PEM payload to pass through completely unredacted.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > Sanitizer > redacts multiline PEM keys
AssertionError: expected sanitized output to not contain 'MIIEowIBAAKCAQEA0...'
 ❯ test/adversarial-skeptic.test.ts:394:21
```

---

### Module: `src/process/command-executor.ts`

#### Bug 11: Shell Metacharacter Injection in Command Execution
- **Attack Vector:** Vector 5 (Security, Redaction & Injection Evasion)
- **Trigger:** Passing a commit message or file path containing shell metacharacters: `feat: initial commit"; touch pwned.txt; echo "`.
- **Root Cause:** [`src/process/command-executor.ts:19`](file:///src/process/command-executor.ts#L19) executes commands using string template concatenation with `child_process.exec()` instead of passing arguments as a safe array via `child_process.execFile()` or `spawn()`.
- **Failing Test Trace:**
```text
FAIL test/adversarial-skeptic.test.ts > CommandExecutor > executes git commands safely without shell injection
AssertionError: expected file 'pwned.txt' not to exist after executing git command
 ❯ test/adversarial-skeptic.test.ts:430:20
```

---

## Remediation Verification

```bash
$ node ./skills/adversarial-skeptic/scripts/tamper-guard.mjs verify test/adversarial-skeptic.test.ts --cmd "npx vitest run test/adversarial-skeptic.test.ts"

Verified test/adversarial-skeptic.test.ts (11 tests, sha256 match).
Running: npx vitest run test/adversarial-skeptic.test.ts

 ✓ test/adversarial-skeptic.test.ts (11 tests) 412ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  610ms

Verification passed: all tests passed without test tampering.
```
