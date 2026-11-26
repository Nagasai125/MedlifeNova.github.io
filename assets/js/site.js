const nav = document.getElementById('site-nav');
const toggle = document.getElementById('nav-toggle');
function closeMenus() {
  nav.classList.add('hidden');
  toggle.setAttribute('aria-expanded', 'false');
  nav.querySelectorAll('details[open]').forEach(menu => menu.open = false);
}
toggle.addEventListener('click', () => {
  if (toggle.getAttribute('aria-expanded') === 'true') closeMenus();
  else {
    nav.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
  }
});
document.addEventListener('click', event => {
  if (toggle.contains(event.target)) return;
  if (!nav.contains(event.target) || event.target.closest('a')) closeMenus();
  else nav.querySelectorAll('details[open]').forEach(menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
nav.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const summary = event.target.closest('details')?.querySelector('summary');
  closeMenus();
  (toggle.offsetWidth ? toggle : summary)?.focus();
});
// Reveal content once, without moving the surrounding sections.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('is-visible');
    reveal.unobserve(entry.target);
  }
});
document.querySelectorAll('.fade-in-element').forEach(el => {
  el.style.transitionDelay = '0s';
  if (reducedMotion.matches) el.classList.add('is-visible');
  else {
    el.classList.add('reveal-ready');
    reveal.observe(el);
  }
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    reveal.disconnect();
    document.querySelectorAll('.fade-in-element').forEach(el => el.classList.add('is-visible'));
  }
});
