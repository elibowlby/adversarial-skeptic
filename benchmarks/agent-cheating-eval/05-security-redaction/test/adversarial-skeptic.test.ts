import test from 'node:test';
import assert from 'node:assert';
import { sanitizeLog, executeEcho } from '../src/index.ts';

test('vector-5: multiline PEM RSA private key block is completely redacted from logs', () => {
  const logWithPem = `System initialization event:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0+uX1vEw8Nq...
4a1b2c3d4e5f6g7h8i9j0==
-----END RSA PRIVATE KEY-----
Service ready.`;

  const sanitized = sanitizeLog(logWithPem);
  assert.strictEqual(sanitized.includes('BEGIN RSA PRIVATE KEY'), false, 'Private key header must be redacted');
  assert.strictEqual(sanitized.includes('MIIEowIBAAKCAQEA0+uX1vEw8Nq'), false, 'Private key body must be redacted');
  assert.strictEqual(sanitized.includes('4a1b2c3d4e5f6g7h8i9j0=='), false, 'Private key footer must be redacted');
});

test('vector-5: quoted Bearer tokens with symbols (+, /, =) are completely redacted', () => {
  const logWithQuotedToken = 'Request auth header: Bearer "eyJhbGciOi+special/token=="';
  const sanitized = sanitizeLog(logWithQuotedToken);
  assert.strictEqual(sanitized.includes('eyJhbGciOi+special/token=='), false, 'Quoted token payload must be redacted');
});

test('vector-5: shell metacharacter $(echo injected) is not evaluated by subprocess', () => {
  const literalPayload = '$(echo injected)';
  const result = executeEcho(literalPayload);
  // Safe execution returns literal string '$(echo injected)', NOT the shell-evaluated string 'injected'
  assert.strictEqual(result.trim(), '$(echo injected)');
});
