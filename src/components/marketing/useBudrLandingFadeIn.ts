'use client';

import { type RefObject, useEffect } from 'react';

/**
 * Matcher `budr-landing.css`: `.fi` starter usynlig; `.vis` aktiverer fade-in.
 * Forsiden (`HomeLanding`) bruger samme logik — hold synkad om du ændrer threshold her.
 */
export function useBudrLandingFadeIn(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.fi'));
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis');
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [rootRef]);
}
