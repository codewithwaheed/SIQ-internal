// src/components/chat/AlwaysVisibleScrollbar.tsx
import { useEffect, useRef, useState } from 'react';

type Props = {
  containerRef: React.RefObject<HTMLElement>;
  watch?: number | string;
};

export default function AlwaysVisibleScrollbar({ containerRef, watch }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [thumb, setThumb] = useState<{ h: number; top: number }>({ h: 48, top: 0 });
  const thumbHRef = useRef(48); // used for drag math

  // --- compute thumb position/size ---
  const update = () => {
    const el = containerRef.current;
    const rail = railRef.current;
    if (!el || !rail) return;

    const { scrollHeight, clientHeight, scrollTop } = el;
    const scrollable = scrollHeight > clientHeight + 1;

    rail.style.opacity = scrollable ? '1' : '0';

    // If not scrollable, keep a small visible thumb at top so users know what it is
    if (!scrollable) {
      thumbHRef.current = 48;
      setThumb({ h: 48, top: 0 });
      return;
    }

    const ratio = clientHeight / Math.max(scrollHeight, 1);
    const h = Math.max(36, Math.round(clientHeight * ratio)); // min thumb size
    const maxTopPx = Math.max(clientHeight - h, 0);
    const maxScroll = Math.max(scrollHeight - clientHeight, 1);
    const top = Math.round((scrollTop / maxScroll) * maxTopPx);

    thumbHRef.current = h;
    setThumb({ h, top });
  };

  // mount + events
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // First paint: show a thumb, then recalc next frame to avoid 0px
    requestAnimationFrame(update);

    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    // Light polling to catch DOM changes that don't resize container
    const t = setInterval(update, 400);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      window.removeEventListener('resize', update);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // run update when message count changes
  useEffect(() => {
    requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  // --- dragging ---
  const dragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    dragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = el.scrollTop;
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const el = containerRef.current;
    const rail = railRef.current;
    if (!el || !rail) return;

    const rect = rail.getBoundingClientRect();
    const maxTrack = Math.max(rect.height - thumbHRef.current, 1);
    const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 1);

    const deltaY = e.clientY - startY.current;
    const scrollDelta = (deltaY / maxTrack) * maxScroll;
    el.scrollTop = startScrollTop.current + scrollDelta;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onRailClick = (e: React.MouseEvent) => {
    // Ignore clicks originating from the thumb itself
    if (thumbRef.current && thumbRef.current.contains(e.target as Node)) return;

    const el = containerRef.current;
    const rail = railRef.current;
    if (!el || !rail) return;

    const rect = rail.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 1);
    const maxTrack = Math.max(rect.height - thumbHRef.current, 1);
    const targetTop = Math.min(Math.max(y - thumbHRef.current / 2, 0), maxTrack);
    const dest = (targetTop / maxTrack) * maxScroll;

    el.scrollTo({ top: dest, behavior: 'smooth' });
  };

  return (
    <div className="custom-scrollbar-rail" ref={railRef} onClick={onRailClick}>
      <div
        ref={thumbRef}
        className="custom-scrollbar-thumb"
        style={{
          height: `${thumb.h}px`,
          transform: `translateY(${thumb.top}px)`,
          willChange: 'transform',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
