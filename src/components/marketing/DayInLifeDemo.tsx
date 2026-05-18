'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SARA_RECOVERY_TIMELINE } from '@/lib/marketing/saraTimeline';
import styles from './DayInLifeDemo.module.css';

export function DayInLifeDemo() {
  const { intro, beats, closing } = SARA_RECOVERY_TIMELINE;
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const nodeMapRef = useRef<Record<string, HTMLElement | null>>({});

  const beatIds = useMemo(() => beats.map((beat) => beat.id), [beats]);

  useLayoutEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(Object.fromEntries(beatIds.map((id) => [id, true])));
      return;
    }

    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          setVisible((prev) => {
            const next = { ...prev };
            for (const entry of entries) {
              const id = (entry.target as HTMLElement).dataset.beatId;
              if (!id) continue;
              if (entry.isIntersecting) next[id] = true;
            }
            return next;
          });
        },
        { root: null, threshold: 0.22, rootMargin: '0px 0px -6% 0px' }
      );
    } catch {
      setVisible(Object.fromEntries(beatIds.map((id) => [id, true])));
      return;
    }

    for (const id of beatIds) {
      const node = nodeMapRef.current[id];
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [beatIds]);

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Sara er {intro.age}. Diagnose: {intro.diagnosisLabel}. Bor på et {intro.locationLabel}.{' '}
        {intro.summary}
      </p>

      <ol className={styles.timeline} aria-label="Saras recovery-forløb, uge 1–3">
        {beats.map((beat, index) => (
          <li key={beat.id} className={styles.timelineItem}>
            <article
              ref={(node) => {
                nodeMapRef.current[beat.id] = node;
              }}
              data-beat-id={beat.id}
              className={`${styles.beat} ${visible[beat.id] ? styles.beatInView : ''}`}
            >
              <p className={styles.period}>{beat.periodLabel}</p>
              <div className={styles.narrative}>
                <p>{beat.body}</p>
                {beat.quote ? (
                  <p className={styles.quote}>
                    <em>{beat.quote}</em>
                  </p>
                ) : null}
              </div>
              <p className={styles.outcome}>
                <ArrowRight size={16} className={styles.outcomeIcon} aria-hidden />
                <span>
                  <em>{beat.outcome}</em>
                </span>
              </p>
            </article>
            {index < beats.length - 1 ? (
              <div className={styles.connector} aria-hidden>
                <span className={styles.connectorLine} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <p className={styles.closing}>{closing}</p>

      <p className={styles.ctaRow}>
        <Link href="/institutioner" className={styles.ctaLink}>
          Se hvordan personalet ser Sara →
        </Link>
      </p>
    </div>
  );
}
