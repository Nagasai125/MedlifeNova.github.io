const homeMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scrollProgress = document.getElementById('scrollProgress');
const heroImage = document.querySelector('.hero-image');
let progressFrame;
function updateProgress() {
    const distance = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    if (scrollProgress) scrollProgress.style.transform = `scaleX(${progress})`;
    // Move within the 80px bottom buffer, preserving the centered framing at rest.
    if (heroImage) heroImage.style.transform = homeMotion.matches
        ? 'none' : `translateY(${-Math.min(64, Math.max(0, window.scrollY * 0.12))}px)`;
    progressFrame = null;
}
function scheduleProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
}
window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress);
updateProgress();
homeMotion.addEventListener('change', scheduleProgress);

const counters = document.querySelectorAll('.impact-number');
const counterFrames = new Map();
function finishCounters() {
    counterFrames.forEach(cancelAnimationFrame);
    counterFrames.clear();
    counters.forEach(el => el.textContent = el.dataset.target);
}
const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        if (homeMotion.matches) { el.textContent = el.dataset.target; return; }
        const start = performance.now();
        const target = Number(el.dataset.target);
        function tick(now) {
            const progress = Math.min((now - start) / 600, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) counterFrames.set(el, requestAnimationFrame(tick));
            else counterFrames.delete(el);
        }
        counterFrames.set(el, requestAnimationFrame(tick));
    });
}, { threshold: 0.5 });
if (homeMotion.matches) finishCounters();
else counters.forEach(el => counterObserver.observe(el));
homeMotion.addEventListener('change', () => {
    if (homeMotion.matches) { counterObserver.disconnect(); finishCounters(); }
});

// Keep profiles still while visitors read; swiping and View all remain available.
const teamView = document.getElementById('team-view');
if (teamView) {
    const track = document.getElementById('team-cards');
    function setExpanded(expanded) {
        track.classList.toggle('team-expanded', expanded);
        teamView.textContent = expanded ? 'Carousel view' : 'View all';
        teamView.setAttribute('aria-expanded', String(expanded));
        scheduleProgress();
    }
    teamView.hidden = false;
    setExpanded(homeMotion.matches);
    homeMotion.addEventListener('change', () => setExpanded(homeMotion.matches));
    teamView.addEventListener('click', () => setExpanded(!track.classList.contains('team-expanded')));
}
