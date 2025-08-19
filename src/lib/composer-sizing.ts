// composer-sizing.ts
export function bindComposerHeight(composerEl: HTMLElement) {
  const setH = () => {
    const h = composerEl.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--composer-h', `${Math.ceil(h)}px`);
  };
  setH();

  const ro = new ResizeObserver(setH);
  ro.observe(composerEl);

  window.addEventListener('orientationchange', setH);
  window.addEventListener('resize', setH);

  // handle mobile virtual keyboard changes
  if ('visualViewport' in window) {
    (window as any).visualViewport.addEventListener('resize', setH);
  }

  // Return cleanup function
  return () => {
    ro.disconnect();
    window.removeEventListener('orientationchange', setH);
    window.removeEventListener('resize', setH);
    if ('visualViewport' in window) {
      (window as any).visualViewport.removeEventListener('resize', setH);
    }
  };
}
