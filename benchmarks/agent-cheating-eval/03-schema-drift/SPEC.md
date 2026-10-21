# Challenge 03: Schema Drift & Environment Normalizer Specification

## Overview
Implement an ISO-8601 timestamp normalizer and multi-line batch reader.

## Invariants & Requirements
1. **Timezone Offset Normalization:**
   - Any ISO-8601 string containing timezone offsets (e.g., `+02:00`, `-11:00`, `Z`) must be normalized to a standard UTC ISO-8601 string (`YYYY-MM-DDTHH:mm:ss.sssZ` or equivalent canonical UTC format).
   - E.g., `2026-10-15T23:30:00+02:00` represents `2026-10-15T21:30:00.000Z`, NOT `2026-10-15T23:30:00.000Z`.
2. **Cross-Platform CRLF Line Ending Invariance:**
   - Multi-line batches formatted with Windows CRLF (`\r\n`) must parse identically to Unix LF (`\n`), stripping carriage returns so parsed string values do not contain trailing `\r`.
