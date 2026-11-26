(() => {
  const form = document.querySelector('[data-cloudflare-contact]');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('span');
  const status = form.querySelector('[data-contact-status]');
  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const data = new FormData(form);
    if (!data.get('cf-turnstile-response')) {
      status.textContent = 'Please complete the verification before sending.';
      return;
    }
    sending = true;
    button.disabled = true;
    label.textContent = 'Sending…';
    status.textContent = '';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams(data),
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        status.textContent = result.message || 'Your message could not be sent. Please try again.';
        return;
      }
      form.reset();
      status.textContent = 'Thank you! Your message has been submitted to our team.';
    } catch {
      status.textContent = 'We could not confirm delivery. Please try again later or email medlifenorthernva@gmail.com.';
    } finally {
      sending = false;
      button.disabled = false;
      label.textContent = 'Send Message';
      window.turnstile?.reset();
    }
  });
})();
