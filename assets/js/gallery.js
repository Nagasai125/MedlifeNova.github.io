const viewer = document.getElementById('gallery-viewer');
if (viewer) {
    const photos = [...document.querySelectorAll('[data-gallery-photo]')];
    const viewerImage = document.getElementById('viewer-image');
    const viewerStatus = document.getElementById('viewer-status');
    const previous = document.getElementById('viewer-previous');
    const next = document.getElementById('viewer-next');
    let activeIndex = 0;
    let opener;

    function showPhoto(index) {
        activeIndex = (index + photos.length) % photos.length;
        viewerImage.alt = photos[activeIndex].querySelector('img').alt;
        viewerImage.src = photos[activeIndex].href;
        viewerStatus.textContent = `Photo ${activeIndex + 1} of ${photos.length}`;
    }

    photos.forEach((photo, index) => {
        photo.addEventListener('click', event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            opener = photo;
            showPhoto(index);
            viewer.showModal();
            document.body.classList.add('gallery-viewer-open');
        });
    });

    previous.hidden = next.hidden = photos.length < 2;
    previous.addEventListener('click', () => showPhoto(activeIndex - 1));
    next.addEventListener('click', () => showPhoto(activeIndex + 1));
    document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
    viewer.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            showPhoto(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
    });
    viewer.addEventListener('click', event => {
        const bounds = viewer.getBoundingClientRect();
        if (event.target === viewer && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)) viewer.close();
    });
    viewer.addEventListener('close', () => {
        document.body.classList.remove('gallery-viewer-open');
        opener?.focus({ preventScroll: true });
    });
    viewerImage.addEventListener('error', () => {
        viewerStatus.textContent = `Photo ${activeIndex + 1} couldn't load. Please try another photo.`;
    });
}
