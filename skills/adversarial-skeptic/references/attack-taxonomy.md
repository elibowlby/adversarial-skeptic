# Attack Taxonomy and Falsification Reference

Concrete bug patterns and test assertions to try against your branch or feature. Every finding requires a reproducible, failing test case.

---

## Vector 1: Boundary and Stream Ingestion

Parsers frequently assume well-formed, non-empty, in-memory payloads. Real streams can be empty, truncated, or split across chunk buffers.

### 1. 0-Byte Input Files
- **Failure Mode:** Parsers (`JSON.parse`, Zod, YAML) crash on empty files or 0-byte reads.
- **Vulnerable Pattern:**
  ```ts
  const raw = fs.readFileSync(path, 'utf8');
  const data = MySchema.parse(JSON.parse(raw)); // SyntaxError or ZodError
  ```
- **Test Assertion:**
  Write an empty file (`fs.writeFileSync(tmp, '')`). Assert ingestion returns an empty batch or typed error instead of crashing.

### 2. Literal `null`, `""`, or `[]` Lines in JSONL
- **Failure Mode:** Code splits lines with `.split('\n')` and runs `JSON.parse(line)`. When `line` is `"null"`, downstream access throws `TypeError: Cannot read properties of null`.
- **Vulnerable Pattern:**
  ```ts
  for (const line of stream.split('\n')) {
    if (!line) continue;
    const item = JSON.parse(line);
    handleEvent(item.type, item.data); // item is null if line was "null"
  }
  ```
- **Test Assertion:**
  Feed `{"type":"init"}\nnull\n\n[]\n{"type":"end"}`. Verify the parser ignores non-object lines without throwing.

### 3. Split UTF-8 Sequences Across Buffer Chunks
- **Failure Mode:** 4-byte Unicode characters (such as emojis) split across chunk boundaries decode into replacement characters (`\uFFFD`) when decoded chunk-by-chunk without `StringDecoder`.
- **Vulnerable Pattern:**
  ```ts
  readable.on('data', chunk => {
    str += chunk.toString(); // Slices multi-byte UTF-8 sequence
  });
  ```
- **Test Assertion:**
  Split a 4-byte emoji (`🚀`, `[0xf0, 0x9f, 0x9a, 0x80]`) across 2-byte chunk boundaries. Assert decoded string matches `🚀` exactly without corruption.

### 4. Burst Memory Saturation Without Backpressure
- **Failure Mode:** Pushing unbuffered chunks into an in-memory array causes out-of-memory crashes on large bursts.
- **Test Assertion:**
  Stream a high-volume synthetic batch while asserting heap memory usage remains bounded (O(1) streaming rather than O(N) allocation).

### 5. Missing Trailing Newline
- **Failure Mode:** Parsers that split on newlines buffer the final record indefinitely or drop it if the file lacks an EOF newline (`\n`).
- **Test Assertion:**
  Feed records ending abruptly without a trailing newline. Assert the final record is completely parsed.

---

## Vector 2: Graph and State Machine Invariants

Systems often work on linear chains (A -> B -> C), but fail on cycles, broken references, or inverted event order.

### 1. Circular Parent References (`A -> B -> A`)
- **Failure Mode:** Hierarchical structures traversed with recursion or `while(node.parent)` hit maximum call stack errors or infinite loops on cycles.
- **Vulnerable Pattern:**
  ```ts
  function getRoot(node: Node): Node {
    if (!node.parentId) return node;
    return getRoot(store.get(node.parentId)!);
  }
  ```
- **Test Assertion:**
  Create a cycle: `node1.parentId = node2.id; node2.parentId = node1.id;`. Assert `getRoot` detects the cycle and throws a specific error instead of crashing the process.

### 2. Orphaned Pointer References After Deletion
- **Failure Mode:** When parent nodes are removed, child collections or secondary index lookups keep dangling IDs.
- **Vulnerable Pattern:**
  ```ts
  delete nodes[parentId];
  // Failed to prune: childrenMap[parentId], edgeIndex
  ```
- **Test Assertion:**
  Insert a hierarchy, prune the parent, and query child lookups. Verify no dangling references or `undefined` access errors occur.

### 3. Out-of-Order Events and Timestamps
- **Failure Mode:** State machine transitions assume ordered timestamps. Network retries emit events out of sequence (for example, `COMPLETED` before `STARTED`).
- **Test Assertion:**
  Deliver an `ACK` event prior to `INIT`. Verify the state machine buffers or rejects invalid transitions deterministically.

---

## Vector 3: Schema and Environment Drift

Assumptions about host machine configuration (timezone, OS line endings, paths) cause subtle production failures.

### 1. Local Timezone Offsets (`+02:00` vs `Z`)
- **Failure Mode:** Parsing dates with string splitting (`timestamp.split('T')[0]`) drops timezone offsets, shifting dates near midnight by a full day.
- **Vulnerable Pattern:**
  ```ts
  const isoDate = timestamp.split('T')[0];
  ```
- **Test Assertion:**
  Supply ISO timestamps with extreme offsets (`+14:00`, `-11:00`, `+02:00`). Validate canonical UTC conversions regardless of the host machine's `TZ` environment variable.

### 2. Windows CRLF (`\r\n`) vs Unix LF (`\n`)
- **Failure Mode:** Splitting on `\n` on Windows files leaves trailing `\r` carriage returns. String equality checks (`line === 'DONE'`) fail silently (`'DONE\r' !== 'DONE'`).
- **Vulnerable Pattern:**
  ```ts
  const lines = rawText.split('\n');
  const headers = lines[0].split(':'); // headers[1] ends with '\r'
  ```
- **Test Assertion:**
  Process a fixture encoded with `\r\n`. Assert parsed string values match the Unix `\n` equivalent without trailing `\r`.

### 3. Relative Path Resolution and Directory Traversal
- **Failure Mode:** Functions accepting paths fail when given `../../` or when `process.cwd()` changes.
- **Test Assertion:**
  Pass traversal paths (`../../etc/passwd`). Verify path sanitization confines access to designated directories.

### 4. Polymorphic Union Types
- **Failure Mode:** APIs accepting `string | string[]` or `{ key: string } | Array<{ key: string }>` fail when receiving arrays or objects because only scalar string inputs were tested.
- **Test Assertion:**
  Exercise each union type variant (scalar, array, nested object, null).

---

## Vector 4: State Contamination

Tests running in isolation can mask state leaks across operations.

### 1. Interleaved Operations Across Disjoint Targets
- **Failure Mode:** Global variables, module singletons, or process environment changes leak between concurrent requests.
- **Test Assertion:**
  Execute alternating operations against two distinct tenants concurrently using `Promise.all`. Verify Tenant A's state is not altered by Tenant B's operations.

### 2. Unscoped In-Memory Caches
- **Failure Mode:** Caches with shared keys without tenant or session namespaces return stale data from earlier operations.
- **Test Assertion:**
  Execute two sequential workflows with different input configurations but matching item IDs. Verify cache isolation between workflows.

---

## Vector 5: Security and Redaction

Naive sanitizers often handle simple keys (`KEY=value`) but miss multiline blocks, quotes, or command execution boundaries.

### 1. Multiline PEM Private Keys
- **Failure Mode:** Single-line regex patterns (`/KEY=\w+/`) miss multiline PEM certificate blocks:
  ```
  -----BEGIN RSA PRIVATE KEY-----
  MIIEowIBAAKCAQEA0...
  -----END RSA PRIVATE KEY-----
  ```
- **Test Assertion:**
  Pass a multiline PEM key to the sanitizer. Assert none of the key body or headers remain in the output.

### 2. Quoted Secrets with Symbols
- **Failure Mode:** Regexes like `/Bearer\s+([a-zA-Z0-9]+)/` miss tokens in quotes or tokens containing characters like `+`, `/`, `=`, `_`, or `-`.
- **Test Assertion:**
  Pass `Bearer "token+with/special=chars=="`. Assert the token payload is redacted.

### 3. Shell Metacharacter Injection
- **Failure Mode:** Running commands with `child_process.exec` and string interpolation allows command chaining (`foo; rm -rf /` or `$(whoami)`).
- **Vulnerable Pattern:**
  ```ts
  exec(`git commit -m "${commitMessage}"`);
  ```
- **Test Assertion:**
  Pass arguments containing `$()`, `;`, `&&`, and quotes. Assert `child_process.execFile` or `spawn` with argument arrays is used to prevent shell interpretation.

---

## Core Rule

Assert what the specification demands, not what the current implementation returns. If a test passes against buggy code, the test is incomplete.
