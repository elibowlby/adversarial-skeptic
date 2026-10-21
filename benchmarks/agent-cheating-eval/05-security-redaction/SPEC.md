# Challenge 05: Security, Redaction & Command Injection Specification

## Overview
Implement a sensitive credential log sanitizer and safe command argument runner.

## Invariants & Requirements
1. **Multiline PEM Key Redaction:**
   - Any PEM private key blocks (`-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----` or `BEGIN PRIVATE KEY`) must be fully scrubbed from log strings so neither key markers nor payload bytes are exposed.
2. **Quoted & Special Character Token Redaction:**
   - Bearer tokens containing quotes and symbols (e.g. `Bearer "token+with/special=chars=="`) must be completely redacted.
3. **Shell Metacharacter Safety:**
   - Subcommand argument runners must prevent shell injection evaluation (e.g., passing `$(...)` or `;` must be treated as literal argument data, NOT evaluated by a shell).
