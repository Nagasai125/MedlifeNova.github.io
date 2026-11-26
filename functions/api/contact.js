const RECIPIENT = 'medlifenorthernva@gmail.com';
const SENDER = 'contact@medlifenova.org';
const ORIGINS = new Set([
  'https://medlifenova.org',
  'https://www.medlifenova.org',
  'https://medlifenova.pages.dev',
]);
const MAX_BYTES = 65536;
const UNAVAILABLE = 'Your message could not be sent. Please email medlifenorthernva@gmail.com or try again later.';

function reply(status, message) {
  return Response.json({ ok: status === 200, message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply(405, 'Please submit the contact form.');
  const origin = request.headers.get('Origin');
  if (!ORIGINS.has(origin) || new URL(request.url).origin !== origin) {
    return reply(403, 'Please submit the form from the MEDLIFE NoVA website.');
  }
  if (env.CONTACT_EMAIL_ENABLED !== 'true' || !env.CLOUDFLARE_ACCOUNT_ID ||
      !env.CLOUDFLARE_EMAIL_API_TOKEN || !env.TURNSTILE_SECRET_KEY) {
    return reply(503, UNAVAILABLE);
  }
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/x-www-form-urlencoded') {
    return reply(415, 'Please submit the contact form.');
  }

  let form;
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of request.body) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) return reply(413, 'Please shorten your message.');
      chunks.push(chunk);
    }
    form = new URLSearchParams(await new Blob(chunks).text());
  } catch {
    return reply(400, 'Please check the form and try again.');
  }
  const name = (form.get('name') || '').trim();
  const email = (form.get('email') || '').trim();
  const message = (form.get('message') || '').trim();
  const token = form.get('cf-turnstile-response') || '';
  if (!name || name.length > 120 || /[\r\n\x00-\x1f]/.test(name) ||
      email.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email) ||
      /[\x00-\x1f\x7f]/.test(email) || !message || message.length > 5000) {
    return reply(400, 'Please enter a name, valid email address, and message of up to 5,000 characters.');
  }
  if (!token || token.length > 2048) return reply(400, 'Please complete the verification and try again.');

  try {
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!check.ok) return reply(503, UNAVAILABLE);
    const verification = await check.json();
    if (!verification.success || verification.action !== 'contact' ||
        verification.hostname !== new URL(origin).hostname) {
      return reply(400, 'Verification expired or failed. Please complete it again.');
    }
    const sent = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: RECIPIENT,
        from: SENDER,
        reply_to: email,
        subject: 'MEDLIFE NoVA website inquiry',
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await sent.json();
    const accepted = [...(result.result?.delivered || []), ...(result.result?.queued || [])];
    if (!sent.ok || !result.success || !accepted.includes(RECIPIENT)) {
      return reply(502, UNAVAILABLE);
    }
    return reply(200, 'Thank you! Your message has been submitted to our team.');
  } catch {
    // Do not log names, addresses, message contents, API responses, or secrets.
    return reply(502, UNAVAILABLE);
  }
}
