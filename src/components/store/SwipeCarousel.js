'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../ui/Icons';

export function SwipeCarousel({
  children,
  className = '',
  itemClassName = '',
  label = 'Carousel',
  previousLabel = 'Previous items',
  nextLabel = 'Next items',
  hint = 'Swipe to explore more',
}) {
  const scrollerRef = useRef(null);
  const dragRef = useRef({ pointerId: null, startX: 0, startLeft: 0, dragging: false, moved: false });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hintHidden, setHintHidden] = useState(false);

  const DRAG_THRESHOLD = 8;

  const items = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);

  const updateState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.max(0, el.scrollLeft);
    setCanPrev(left > 4);
    setCanNext(left < max - 4);
    setProgress(max > 0 ? Math.min(1, left / max) : 1);
  }, []);

  useEffect(() => {
    updateState();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      updateState();
      if (el.scrollLeft > 8) setHintHidden(true);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateState);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateState);
    };
  }, [updateState, items.length]);

  const scrollByCard = useCallback((direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstItem = el.querySelector('.swipe-carousel__item');
    const gap = parseFloat(window.getComputedStyle(el).columnGap || window.getComputedStyle(el).gap || '0') || 0;
    const amount = firstItem ? firstItem.getBoundingClientRect().width + gap : el.clientWidth * 0.85;
    setHintHidden(true);
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }, []);

  const handlePointerDown = (event) => {
    const el = scrollerRef.current;
    if (!el || event.pointerType === 'touch') return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startLeft: el.scrollLeft,
      dragging: false,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    const el = scrollerRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (!drag.dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      drag.dragging = true;
      drag.moved = true;
      el.classList.add('swipe-carousel__track--dragging');
      try { el.setPointerCapture?.(event.pointerId); } catch {}
      setHintHidden(true);
    }
    el.scrollLeft = drag.startLeft - delta;
  };

  const finishDrag = (event) => {
    const el = scrollerRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== event.pointerId) return;
    if (drag.dragging) {
      try { el.releasePointerCapture?.(event.pointerId); } catch {}
      el.classList.remove('swipe-carousel__track--dragging');
    }
    dragRef.current = { ...drag, pointerId: null, dragging: false };
    updateState();
  };

  const handleClickCapture = (event) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  if (!items.length) return null;

  return (
    <div className={`swipe-carousel ${className}`}>
      <div className="swipe-carousel__topbar">
        <span className={`swipe-carousel__hint ${hintHidden ? 'swipe-carousel__hint--hidden' : ''}`}>
          {hint} <ChevronRight size={14} />
        </span>
        <div className="swipe-carousel__controls" aria-label={`${label} controls`}>
          <button
            type="button"
            className="swipe-carousel__btn"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label={previousLabel}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="swipe-carousel__btn"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label={nextLabel}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="swipe-carousel__frame">
        <div
          ref={scrollerRef}
          className="swipe-carousel__track"
          role="region"
          aria-label={label}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') scrollByCard(-1);
            if (event.key === 'ArrowRight') scrollByCard(1);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={finishDrag}
          onClickCapture={handleClickCapture}
        >
          {items.map((child, index) => (
            <div className={`swipe-carousel__item ${itemClassName}`} key={child.key || index}>
              {child}
            </div>
          ))}
        </div>
      </div>

      <div className="swipe-carousel__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.12, progress)})` }} />
      </div>
    </div>
  );
}
