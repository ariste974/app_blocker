import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCredentials } from '../src/features/auth/validation.ts';

test('credentials require a valid email address', () => {
  assert.deepEqual(validateCredentials('invalid-email', 'password123'), {
    email: 'Saisis une adresse e-mail valide.',
  });
});

test('credentials require a password of at least eight characters', () => {
  assert.deepEqual(validateCredentials('tempo@example.com', 'short'), {
    password: 'Le mot de passe doit contenir au moins 8 caractères.',
  });
});

test('valid credentials pass local validation', () => {
  assert.deepEqual(validateCredentials(' tempo@example.com ', 'secure-pass'), {});
});
