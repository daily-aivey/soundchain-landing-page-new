/**
 * Shows a toast notification - exactly like original
 */
export function showToast({ title, message, icon }: { title: string, message: string, icon: string }) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const displayIcon = typeof icon === "string" ? icon : "🎉";
  toast.innerHTML = `
    <div class="toast-icon">${displayIcon}</div>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-text">${message}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Close">&times;</button>
    <div class="toast-progress"></div>
  `;
  document.body.appendChild(toast);

  // enable interactions (CSS base had pointer-events: none)
  toast.style.pointerEvents = 'auto';

  // start show animation
  // use rAF to ensure the element is in the DOM before toggling the class
  requestAnimationFrame(() => {
    toast.classList.add('show');
    const bar = toast.querySelector('.toast-progress') as HTMLElement;
    if (bar) bar.classList.add('run');
    // Set the progress bar animation duration to 6000ms
    if (bar) bar.style.setProperty('animation-duration', '6000ms');
  });

  // --- improved lifecycle so the toast never gets stuck ---
  const DURATION = 6000;
  let hideTimer: NodeJS.Timeout;

  const pause = () => {
    const bar = toast.querySelector('.toast-progress') as HTMLElement;
    if (bar) bar.style.animationPlayState = 'paused';
    if (hideTimer) clearTimeout(hideTimer);
  };

  const resume = () => {
    const bar = toast.querySelector('.toast-progress') as HTMLElement;
    if (bar) bar.style.animationPlayState = 'running';
    // give the user ~1.5s to move the mouse away, then hide
    hideTimer = setTimeout(close, 1500);
  };

  const close = () => {
    // cleanup listeners & timers to avoid leaks
    toast.removeEventListener('mouseenter', pause);
    toast.removeEventListener('mouseleave', resume);
    if (hideTimer) clearTimeout(hideTimer);
    toast.classList.remove('show');
    toast.classList.add('hide'); // matches `.toast.hide` in CSS
    setTimeout(() => toast.remove(), 260);
  };

  const closeBtn = toast.querySelector('.toast-close') as HTMLElement;
  if (closeBtn) closeBtn.addEventListener('click', close);

  // auto-hide after DURATION (same as progress bar)
  hideTimer = setTimeout(close, DURATION);

  // pause on hover, resume on mouse leave
  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', resume);

  // hard safety: if something pauses forever, force close later
  setTimeout(() => {
    if (document.body.contains(toast)) close();
  }, DURATION + 3000);
}
