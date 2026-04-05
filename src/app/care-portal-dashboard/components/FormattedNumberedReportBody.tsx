'use client';

import React from 'react';

type Props = {
  body: string;
  /** Tailwind klasse til punktfarve, fx bg-[#0F6E56] */
  bulletColorClass?: string;
};

export default function FormattedNumberedReportBody({
  body,
  bulletColorClass = 'bg-[#0F6E56]',
}: Props) {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const blocks = trimmed.split(/\n\n+/);
  return (
    <div className="space-y-3 text-[15px] leading-[1.55] text-gray-700">
      {blocks.map((block, i) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const allBullet =
          lines.length > 0 &&
          lines.every(
            (l) =>
              l.startsWith('· ') || l.startsWith('·') || l.startsWith('• ') || l.startsWith('- ')
          );
        if (allBullet) {
          return (
            <ul key={i} className="list-none space-y-2.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColorClass}`}
                    aria-hidden
                  />
                  <span className="min-w-0">{l.replace(/^[-·•]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[15px] leading-[1.55] text-gray-700">
            {block}
          </p>
        );
      })}
    </div>
  );
}
