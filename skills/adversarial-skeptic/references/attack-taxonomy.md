# Adversarial Skeptic: Attack Taxonomy & Falsification Reference

This reference catalog provides concrete bug patterns, attack vectors, and proof-by-execution blueprints for the **Adversarial Skeptic**. When auditing any implementation against its specification, evaluate the codebase against each of the five core falsification vectors. Every suspected vulnerability must be proven with an executable test case.

---

## Vector 1: Boundary & Malformed Stream Ingestion

Standard unit tests almost universally pass well-formed, small, in-memory payloads. Real-world systems crash when streams are empty, truncated, unbuffered, or malformed.

### 1. 0-Byte Input Files
- **Failure Mode:** Parsers (Zod, JSON.parse, YAML, protobuf) crash immediately when encountering an empty file (`stat.size === 0` or empty string read).
- **Vulnerable Pattern:**
  ```ts
  const raw = fs.readFileSync(path, 'utf8');
  const data = MySchema.parse(JSON.parse(raw)); // Unexpected end of JSON input
  ```
- **Adversarial Test Assertion:**
  Create an empty file (`fs.writeFileSync(tmpFile, '')`). Assert that ingestion returns a typed error, fallback empty state, or graceful exit rather than an uncaught exception or crash.

### 2. Literal `null`, `""`, or `[]` Lines in JSONL / NDJSON Streams
- **Failure Mode:** Code splits lines with `split('\n')` and calls `JSON.parse(line)`. When an empty line, literal `"null"`, or `"[]"` appears, downstream property access (`event.type`, `event.payload.id`) throws `TypeError: Cannot read properties of null (reading 'type')`.
- **Vulnerable Pattern:**
  ```ts
  for (const line of stream.split('\n')) {
    if (!line) continue;
    const item = JSON.parse(line);
    handleEvent(item.type, item.data); // item is null if line was "null"
  }
  ```
- **Adversarial Test Assertion:**
  Feed a stream containing `{"type":"init"}\nnull\n\n[]\n{"type":"end"}`. The processor must cleanly ignore or skip non-object lines without throwing unhandled exceptions.

### 3. Mid-Stream Truncated UTF-8 & Incomplete JSON Chunks
- **Failure Mode:** Multi-byte Unicode characters (e.g., 4-byte emojis or CJK characters) sliced across stream buffer boundaries produce invalid UTF-8 replacement characters (`\uFFFD`) if decoded chunk-by-chunk without a proper `StringDecoder`.
- **Vulnerable Pattern:**
  ```ts
  readable.on('data', chunk => {
    str += chunk.toString(); // May slice 4-byte UTF-8 sequence in half!
  });
  ```
- **Adversarial Test Assertion:**
  Split a payload containing 4-byte UTF-8 sequences (`🚀`, `📦`) across arbitrary 1-byte chunk boundaries. Verify reconstructed string matches exactly with no corruption or replacement glyphs.

### 4. 100MB Burst Log Spikes & Memory Saturation
- **Failure Mode:** Reading entire streams into memory (`Buffer.concat`, `stream.toArray()`, or unbounded arrays) without backpressure causes out-of-memory crashes (`heap out of memory`).
- **Adversarial Test Assertion:**
  Stream a synthetic 100MB payload or 1,000,000 rapid event chunks into the ingestion handler while tracking `process.memoryUsage().heapUsed`. Heap growth must stay bounded (O(1) memory streaming) rather than O(N).

### 5. Missing Trailing Newlines
- **Failure Mode:** Ingestion parsers relying on newline delimiters buffer the final record indefinitely or drop it completely if the file lacks an EOF newline (`\n`).
- **Adversarial Test Assertion:**
  Feed a multi-line batch where the final record terminates abruptly without `\n`. Assert the final record is completely parsed and processed.

---

## Vector 2: Graph & State Machine Invariants

Builder agents typically test linear, forward-only graphs (A -> B -> C). Production systems fail on cycles, broken references, and race conditions in event state machines.

### 1. Circular Parent UUIDs / DAG Cycles (`A -> B -> A`)
- **Failure Mode:** Hierarchical structures (message threads, parent task spans, tree nodes) traversed via recursion or `while(node.parent)` result in maximum call stack exceed errors or infinite loops.
- **Vulnerable Pattern:**
  ```ts
  function getRoot(node: Node): Node {
    if (!node.parentId) return node;
    return getRoot(store.get(node.parentId)!); // Infinite recursion if cyclic!
  }
  ```
- **Adversarial Test Assertion:**
  Construct a cycle `node1.parentId = node2.id; node2.parentId = node1.id;`. Assert `getRoot` or DAG traversal detects the cycle, rejects the mutation, or returns a cycle diagnostic error instead of crashing.

### 2. Orphaned Pointer References After Pruning or Cascade Deletion
- **Failure Mode:** When parent nodes are pruned, soft-deleted, or compacted, child indices or secondary search indices retain dangling references to non-existent UUIDs.
- **Vulnerable Pattern:**
  ```ts
  delete nodes[parentId];
  // Failed to prune: childrenMap[parentId], edgeIndex, tags
  ```
- **Adversarial Test Assertion:**
  Insert a hierarchy, prune the ancestor, then query index lookups, child iterators, and graph export functions. Verify no dangling references or `undefined` index crashes occur.

### 3. Out-of-Order Timestamps & Concurrent Event Inversions
- **Failure Mode:** State machine transitions assume monotonically increasing timestamps (`event.timestamp >= lastTimestamp`). Network retries or parallel workers emit out-of-order events, causing illegal state transitions (e.g. `COMPLETED` received before `STARTED`).
- **Adversarial Test Assertion:**
  Replay a sequence of events with inverted timestamps or deliver an `ACK` event prior to its `INIT`. Verify the state machine buffers or rejects invalid transitions deterministically.

---

## Vector 3: Schema & Environment Drift

Agents write tests under identical local environments (same timezone, same OS, clean temporary paths). Bugs emerge when inputs cross OS boundaries or timezone boundaries.

### 1. Local Timezone Offsets (`+02:00` vs `Z` in ISO-8601)
- **Failure Mode:** Code parses dates assuming UTC (`Z`) or strips offset information, causing local date shifts (e.g., `2026-10-15T23:30:00+02:00` parsed as `2026-10-15` instead of `2026-10-15T21:30:00Z`).
- **Vulnerable Pattern:**
  ```ts
  const isoDate = timestamp.split('T')[0]; // Drops timezone reality
  ```
- **Adversarial Test Assertion:**
  Supply ISO timestamps with extreme offsets (`+14:00`, `-11:00`, `+05:30`). Validate normalized UTC conversions and ensure calculations remain identical regardless of the host machine's `TZ` environment variable.

### 2. Windows CRLF (`\r\n`) vs Unix LF (`\n`)
- **Failure Mode:** Regex string splitting using `/\n/` on Windows-formatted files leaves dangling `\r` carriage returns attached to strings. String equality checks (`line === 'DONE'`) silently fail (`'DONE\r' !== 'DONE'`), and line-end anchors (`/foo$/`) fail.
- **Vulnerable Pattern:**
  ```ts
  const lines = rawText.split('\n');
  const headers = lines[0].split(':'); // headers[1] ends with '\r'
  ```
- **Adversarial Test Assertion:**
  Process a fixture encoded with `\r\n`. Assert parsed string values, trimmed tokens, and line counts match the Unix `\n` equivalent.

### 3. Non-Existent `cwd` Paths and Directory Escapes
- **Failure Mode:** APIs taking relative paths or assuming current working directory exists fail if `process.cwd()` is deleted out from underneath the process, or if paths contain directory traversal (`../../`).
- **Adversarial Test Assertion:**
  Pass traversal paths (`../../../etc/passwd` or `safe/../../file`) and verify path sanitization confines access to authorized roots.

### 4. Polymorphic Union Payloads
- **Failure Mode:** APIs designed to accept either `string | string[]` or `{ key: string } | Array<{ key: string }>` only have unit tests for the single string case. Passing an array or nested object throws unexpected runtime errors.
- **Adversarial Test Assertion:**
  Test every union type variant defined in type signatures with polymorphic variations (scalar, list, nested object, null).

---

## Vector 4: Cross-Feature State Contamination

A builder agent tests Feature A in `featureA.test.ts` and Feature B in `featureB.test.ts`. Because tests run in isolation, bugs where Feature A's side effects corrupt Feature B remain invisible.

### 1. Interleaved Operations on Disjoint Targets
- **Failure Mode:** Global state, module-level singletons, shared temporary directories, or process environment variable changes (`process.env.FLAG = '1'`) leak across operations.
- **Real-World Scenario:**
  - Test A fails on `billing/subscriptions`
  - Builder edits `auth/session`
  - Test A suddenly passes or fails for unrelated reasons because the auth state was shared
- **Adversarial Test Assertion:**
  Create an interleaved test that executes alternating operations against Target X and Target Y simultaneously:
  ```ts
  await Promise.all([
    runOperation({ tenant: 'tenant-1', action: 'write' }),
    runOperation({ tenant: 'tenant-2', action: 'purge' })
  ]);
  // Verify tenant-1 data was not purged by tenant-2's action
  ```

### 2. Unsynchronized In-Memory Caches & Process Singletons
- **Failure Mode:** Caches with global keys without tenant/context namespaces return cached values from previous operations or unrelated users.
- **Adversarial Test Assertion:**
  Execute two sequential workflows with different input configurations but identical IDs. Verify cache isolation.

---

## Vector 5: Security, Redaction & Injection Evasion

Builder agent tests typically test simple single-line secrets like `API_KEY=xyz123`. Malicious or complex secrets evade naive redaction filters and escape execution boundaries.

### 1. Multiline `.env` and PEM RSA Private Keys
- **Failure Mode:** Secret scrubbers using single-line regex patterns (`/API_KEY=\w+/`) fail to redact multiline `.env` values or PEM certificate headers:
  ```
  -----BEGIN RSA PRIVATE KEY-----
  MIIEowIBAAKCAQEA0...
  -----END RSA PRIVATE KEY-----
  ```
- **Adversarial Test Assertion:**
  Pass a multiline PEM key and multiline `.env` string into the logger / sanitizer. Assert zero lines of the private key appear in the sanitized log output.

### 2. Quoted Secrets with Whitespace and Quotes
- **Failure Mode:** Regexes like `/(?:bearer|token)\s+([a-zA-Z0-9]+)/i` miss tokens enclosed in double quotes, tokens containing whitespace, or tokens with special characters (`+`, `/`, `=`, `_`, `-`).
- **Adversarial Test Assertion:**
  Pass `Bearer "eyJhbGciOi...=="` and `Bearer token-with_dashes+and/slashes=`. Assert all sensitive tokens are fully redacted.

### 3. Shell Metacharacter Injection in `child_process` Arguments
- **Failure Mode:** Invoking subcommands via `child_process.exec` or `sh -c` concatenating arguments allows command chaining (`foo; rm -rf /`, `foo | cat`, ``foo `whoami` ``).
- **Vulnerable Pattern:**
  ```ts
  exec(`git commit -m "${commitMessage}"`); // User supplied message with " && curl ...
  ```
- **Adversarial Test Assertion:**
  Pass argument strings containing `$()`, `;`, `&&`, `|`, and quotes. Assert that `child_process.execFile` or `spawn` with array arguments is used, preventing shell evaluation.

---

## The Golden Skeptic Rule

> **Never assert what the implementation currently does. Assert what the specification or invariant demands.**
> If the test passes against buggy code, the test is invalid. If the test fails with a real violation of system invariants, the bug is proven.
