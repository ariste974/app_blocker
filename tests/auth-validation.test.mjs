import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAuthErrorMessage,
  getSupabaseConfigurationError,
  validateCredentials,
} from '../src/features/auth/validation.ts';

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

test('Supabase site URL is rejected with instructions for the project API URL', () => {
  assert.match(
    getSupabaseConfigurationError('https://supabase.com', 'public-key'),
    /Project Settings → API/,
  );
});

test('project API URL and public key pass configuration validation', () => {
  assert.equal(
    getSupabaseConfigurationError('https://tempo-test.supabase.co', 'public-key'),
    null,
  );
});

test('empty Supabase configuration is reported before making a request', () => {
  assert.match(getSupabaseConfigurationError('', ''), /n’est pas configuré/);
});

test('JSON parsing errors explain how to verify the Supabase API URL', () => {
  assert.match(
    getAuthErrorMessage(new SyntaxError('Unexpected end of JSON input')),
    /URL API de ton projet/,
  );
});
