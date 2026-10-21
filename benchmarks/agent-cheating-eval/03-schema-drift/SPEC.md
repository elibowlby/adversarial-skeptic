# Challenge 03: Schema Drift Specification

## Overview
Implement an ISO-8601 timestamp normalizer and batch reader.

## Invariants and Requirements
1. Timezone offset normalization: timestamps containing timezone offsets (such as `+02:00`, `-11:00`, `Z`) must be normalized to canonical UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`). For example, `2026-10-15T23:30:00+02:00` represents `2026-10-15T21:30:00.000Z`.
2. Line ending invariance: batches formatted with Windows CRLF (`\r\n`) must parse identically to Unix LF (`\n`), stripping carriage returns.
