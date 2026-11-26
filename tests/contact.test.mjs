import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { onRequest } from '../functions/api/contact.js';

const recipient = 'medlifenorthernva@gmail.com';
const env = {
  CONTACT_EMAIL_ENABLED: 'true',
  CLOUDFLARE_ACCOUNT_ID: 'test-account',
  CLOUDFLARE_EMAIL_API_TOKEN: 'test-token',
  TURNSTILE_SECRET_KEY: 'test-secret',
};
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function request(fields = {}, headers = {}) {
  return new Request('https://medlifenova.org/api/contact', {
    method: 'POST',
    headers: { Origin: 'https://medlifenova.org', ...headers },
    body: new URLSearchParams({
      name: 'Example Visitor', email: 'visitor@example.com', message: 'I would like to volunteer.',
      'cf-turnstile-response': 'test-challenge', ...fields,
    }),
  });
}

function mockServices({ verification = {}, delivery = {}, sendStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options, payload: JSON.parse(options.body) });
    if (url.includes('/siteverify')) return Response.json({
      success: true, hostname: 'medlifenova.org', action: 'contact', ...verification,
    });
    return Response.json({ success: true, result: { delivered: [recipient] }, ...delivery }, { status: sendStatus });
  };
  return calls;
}

test('valid form sends only to the fixed team inbox and uses visitor as reply-to', async () => {
  const calls = mockServices();
  const response = await onRequest({ request: request({ to: 'attacker@example.com', from: 'forged@example.com' }), env });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].payload.to, recipient);
  assert.equal(calls[1].payload.from, 'contact@medlifenova.org');
  assert.equal(calls[1].payload.reply_to, 'visitor@example.com');
  assert.match(calls[1].payload.text, /I would like to volunteer/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('disabled or unconfigured service never calls external APIs', async () => {
  const calls = mockServices();
  for (const key of Object.keys(env)) {
    assert.equal((await onRequest({ request: request(), env: { ...env, [key]: '' } })).status, 503);
  }
  assert.equal(calls.length, 0);
});

test('cross-origin submissions, malformed fields, header injection, and oversized input cannot send', async () => {
  const calls = mockServices();
  for (const origin of ['https://evil.example', 'null', 'https://medlifenova.pages.dev']) {
    assert.equal((await onRequest({ request: request({}, { Origin: origin }), env })).status, 403);
  }
  for (const fields of [{ name: '' }, { email: 'bad' }, { email: 'a@example.com\r\nBcc:bad@example.com' },
    { name: 'Hello\nInjected' }, { message: ' ' }, { message: 'x'.repeat(5001) }, { 'cf-turnstile-response': '' }]) {
    assert.equal((await onRequest({ request: request(fields), env })).status, 400);
  }
  assert.equal((await onRequest({ request: request({ message: 'x'.repeat(65537) }), env })).status, 413);
  assert.equal(calls.length, 0);
});

test('failed, expired, wrong-hostname and wrong-action challenges cannot send', async () => {
  for (const verification of [{ success: false }, { hostname: 'evil.example' }, { action: 'login' }]) {
    const calls = mockServices({ verification });
    assert.equal((await onRequest({ request: request(), env })).status, 400);
    assert.equal(calls.length, 1);
  }
});

test('bounced, suppressed and failed messages are never reported as sent', async () => {
  for (const delivery of [
    { success: false }, { result: { permanent_bounces: [recipient] } },
    { result: { suppressed_recipients: [recipient] } }, { result: {} },
  ]) {
    mockServices({ delivery });
    assert.equal((await onRequest({ request: request(), env })).status, 502);
  }
  mockServices({ sendStatus: 403 });
  assert.equal((await onRequest({ request: request(), env })).status, 502);
});

test('queued mail is acknowledged as submitted', async () => {
  mockServices({ delivery: { result: { queued: [recipient] } } });
  assert.equal((await onRequest({ request: request(), env })).status, 200);
});

test('network failures return a helpful error without exposing secrets', async () => {
  globalThis.fetch = async () => { throw new Error('test-token'); };
  const response = await onRequest({ request: request(), env });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /test-token/);
});

test('GET cannot trigger an email', async () => {
  const calls = mockServices();
  assert.equal((await onRequest({ request: new Request('https://medlifenova.org/api/contact'), env })).status, 405);
  assert.equal(calls.length, 0);
});
