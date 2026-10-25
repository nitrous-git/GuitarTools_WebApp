// Only trusted application copy belongs here; imported metadata uses textContent.
export function createPlaceholder({ id, title, stage, description, future }) {
  const element = document.createElement('article');
  element.className = 'placeholder-page';
  element.setAttribute('aria-labelledby', `${id}-title`);
  element.innerHTML = `
    <div class="page-heading"><p class="eyebrow">Workspace / ${title}</p>
      <h1 id="${id}-title" tabindex="-1">${title}</h1>
      <p>${description}</p></div>
    <section class="empty-state" aria-labelledby="${id}-next">
      <div class="empty-mark" aria-hidden="true">${id === 'tuning' ? '♮' : '♫'}</div>
      <span class="stage-label">${stage}</span>
      <h2 id="${id}-next">${title} is coming next</h2>
      <p>${future}</p>
      <p class="empty-note">This page is a placeholder. No library data is stored yet.</p>
      <a class="button-link" href="#/player">Open Tab Player <span aria-hidden="true">→</span></a>
    </section>
    <p class="page-note">Available now: Guitar Pro import, notation and playback in the Tab Player.</p>`;
  return { element, show() { element.hidden = false; }, hide() { element.hidden = true; } };
}
